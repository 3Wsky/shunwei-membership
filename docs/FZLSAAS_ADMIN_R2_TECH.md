# FZLSaas 管理后台 · Admin-R2 技术方案

> 版本：Admin-R2 Tech v1.0（2026-06-20）  
> 维护：资深全栈架构师  
> 关联：`docs/FZLSAAS_ADMIN_PRD.md` §2.3/2.4、`docs/FZLSAAS_ADMIN_R1_TECH.md`  
> 前置：Admin-R1 已完成

---

## 一、范围

| 模块 | R2 交付 | 说明 |
|------|---------|------|
| 店员管理后台 | ✅ | list / stats / card CRUD |
| 店员名片（小程序） | ✅ | `pages/staff/card` + 公开读 API |
| 商家 CRUD 增强 | ✅ | list / detail / update / verify-logs |
| 归属绑定 | ✅ | 名片扫码/登录后写 `eb_user.spread_uid` |
| 批量发券/积分商城后台 | ❌ R3 | 不在 R2 |

---

## 二、DDL

| 脚本 | 内容 |
|------|------|
| `migrations/admin-r2/001_sw_staff_card_and_merchant_extend.sql` | `sw_staff_card` 新表 + `sw_merchant` 门店字段 ALTER |

### 2.1 sw_staff_card

存储超管在后台编辑的名片展示信息；`staff_uid` 唯一。未配置时小程序 API 回退 `eb_user` 基础字段 + `division_id`。

### 2.2 sw_merchant 扩展列

`store_address`, `province/city/district`, `latitude/longitude`, `store_images`(JSON), `business_hours`, `settlement_note`

---

## 三、归属与统计口径

| 指标 | SQL |
|------|-----|
| 发展会员数 | `COUNT(eb_user) WHERE spread_uid = :staffUid AND is_del=0` |
| 待审批 | `COUNT(sw_approval_request) WHERE staff_uid=:uid AND status IN ('manager_review','admin_review')` |
| 已通过 | `COUNT(...) WHERE staff_uid=:uid AND status='approved'` |
| 名片状态 | `sw_staff_card` 存在且 `display_name OR store_address` 非空 |

**原则**：不新建 `sw_member_attribution`；小程序隐藏佣金/提现 UI。

---

## 四、API 契约

### 4.1 店员管理（requireAdmin）

#### `GET /api/admin/staff/list`

| Query | 说明 |
|-------|------|
| page, pageSize | 分页 |
| keyword | UID/手机/昵称 |
| divisionId | 门店筛选 |

**Response.list[]**

```json
{
  "uid": 8888,
  "nickname": "李店员",
  "phone": "138****1234",
  "divisionId": 1,
  "divisionName": "顺为总店",
  "isManager": true,
  "memberCount": 42,
  "pendingApproval": 2,
  "approvedCount": 18,
  "cardConfigured": true
}
```

`divisionName`：优先查 CRMEB `eb_system_store`（`id=division_id`），无则返回 `门店#{divisionId}`。

---

#### `GET /api/admin/staff/:uid/stats`

```json
{
  "uid": 8888,
  "memberCount": 42,
  "members": [{ "uid", "nickname", "phone", "registerAt" }],
  "approvalStats": { "pending": 2, "approved": 18, "rejected": 1 },
  "approvals": [{ "requestId", "customerUid", "consumptionAmount", "status", "createdAt" }]
}
```

---

#### `GET /api/admin/staff/:uid/card`

返回 `sw_staff_card` 行；无记录时返回 `{ staffUid, displayName: nickname, ...空字段, configured: false }`。

#### `PUT /api/admin/staff/:uid/card`

**Body**：displayName, avatar, jobTitle, bio, storeName, storeAddress, storePhone, businessHours, latitude, longitude, wechatQrcode, isPublished

**审计**：`action=staff_card_update`

---

### 4.2 小程序公开（无需 JWT，限频）

#### `GET /api/staff/:uid/card`

- 仅 `is_staff=1` 且 `is_published=1` 可读
- 返回展示字段 + `contactPhone`（来自 card 或 eb_user.phone 脱敏策略：完整号仅 logged-in 用户）

#### `POST /api/staff/bind-spread`（需 JWT）

**Body**：`{ staffUid }`  
**行为**：若当前用户 `spread_uid=0`，则 `UPDATE eb_user SET spread_uid=staffUid`（幂等，已有归属不覆盖）  
**场景**：名片页登录/注册回调

---

### 4.3 商家管理增强（requireAdmin）

#### `GET /api/admin/merchant/list`

分页 + keyword（名称/联系人/电话）

#### `GET /api/admin/merchant/:id`

完整商家资料含扩展门店字段 + pending_settlement

#### `PUT /api/admin/merchant/:id`

更新基础信息 + 门店资料 + can_verify + settlement_note  
**审计**：`action=merchant_update`

#### `GET /api/admin/merchant/:id/verify-logs`

分页，数据源：`sw_cash_voucher_ledger WHERE merchant_id=:id AND direction=0`

```json
{
  "list": [{
    "id", "customerUid", "amount", "operatorUid", "remark", "createdAt", "settlementStatus"
  }],
  "total"
}
```

#### `GET /api/admin/merchant/settlement-summary`

全局或按 merchantId 汇总 pending/settled

> 现有 `POST /api/admin/merchant/create` 保留；R2 补 list/detail/update。

---

## 五、代码组织

```
src/modules/
├── staff/
│   ├── staff.routes.js          # GET /api/staff/:uid/card, POST bind-spread
│   ├── staff.service.js
│   └── admin-staff.routes.js    # /api/admin/staff/*
├── merchant/
│   ├── merchant.routes.js       # 已有小程序端
│   └── admin-merchant.routes.js # R2 admin CRUD
```

注册：`registerStaffRoutes` + `registerAdminStaffRoutes` + `registerAdminMerchantRoutes`

---

## 六、fzlsaas-admin 页面

| 路由 | 组件 | 功能 |
|------|------|------|
| `/staff` | `views/staff/index.vue` | 店员列表 + 跳转详情 |
| `/staff/:uid` | `views/staff/detail.vue` | 统计 Tab + 名片编辑 Tab |
| `/merchant` | 改造 `views/merchant/index.vue` | 列表 + 详情抽屉（基础/门店/核销记录 Tab） |

菜单：新增「店员管理」；「商家管理」改造为 CRUD。

---

## 七、小程序 `pages/staff/card`

| 项 | 说明 |
|----|------|
| 路径 | `shunwei-app-v2/pages/staff/card` |
| 入参 | `staffUid`（分享 query） |
| UI | 头像/姓名/职位/简介 + 门店地址（`uni.openLocation`）+ 营业时间 |
| 操作 | 「联系店员」→ `uni.makePhoneCall`；「加微信」→ 展示 qrcode 弹层 |
| 登录后 | 调 `POST /api/staff/bind-spread` 绑定 spread_uid |
| pages.json | 新增路由，可不进 TabBar |

---

## 八、实施顺序（3-4 天）

| 天 | 任务 |
|----|------|
| D1 | DDL + admin staff list/stats/card API |
| D2 | admin merchant list/detail/update/verify-logs + fzlsaas-admin 店员/商家页 |
| D3 | 小程序 card 页 + bind-spread + 分享链路 |
| D4 | build + smoke + 设计师走查 |

---

## 九、验收标准

1. 店员列表显示发展会员数与名片状态
2. 后台编辑名片后小程序 card 页同步展示
3. 新用户通过名片绑定后 `spread_uid` 正确
4. 商家详情可编辑门店地址/图片，核销记录可查
5. admin + 小程序 build 通过

---

*Admin-R2 Tech v1.0 · 用户指令「继续 Admin-R2」*
