# FZLSaas 管理后台 · Admin-R1 技术方案

> 版本：Admin-R1 Tech v1.0（2026-06-20）  
> 维护：资深全栈架构师  
> 关联 PRD：`docs/FZLSAAS_ADMIN_PRD.md` v2.0  
> 工程：`CMB/shunwei-api` + `fzlsaas-admin`

---

## 一、范围与原则

### 1.1 Admin-R1 交付边界

| 模块 | R1 范围 | 说明 |
|------|---------|------|
| 数据看板 | ✅ | 6 指标 + 7 日趋势序列 |
| 会员管理 | ✅ | 列表/详情/单发积分/开店员 |
| 审批管理 | ✅ | 全量记录 + 免审开关（已有 todos/review 扩展） |
| 店员/商家/积分商城/批量 | ❌ R2/R3 | 接口预留，R1 不实现 |

### 1.2 技术原则

1. **鉴权**：全部 `/api/admin/*` 走 `requireAdmin` Cookie（与现有 fzlsaas-admin 一致）
2. **归属字段**：复用 `eb_user.spread_uid`，不新建 `sw_member_attribution`
3. **积分商城数据源**：继续包装 `eb_store_integral`（R1 不涉及 CRUD）
4. **写操作审计**：统一写 `sw_admin_audit_log`（R1 新建表）
5. **响应格式**：沿用 `{ code, msg, data }`（`ok()` / `fail()`）
6. **时间戳**：Unix 秒（与现有 sw_* 表一致）

### 1.3 代码组织建议

```
CMB/shunwei-api/src/modules/
├── admin/
│   ├── admin.routes.js          # 已有：抽奖/现金券/商家创建/审批 todos
│   ├── admin-dashboard.routes.js   # 新增 R1
│   ├── admin-members.routes.js     # 新增 R1
│   ├── admin-audit.service.js      # 新增：审计日志写入
│   └── admin.auth.js
├── approval/approval.service.js    # 扩展 list/detail/revoke
└── integral/integral.service.js    # 扩展 grantManual()
```

路由注册顺序：`registerAdminRoutes` → `registerAdminManagementRoutes` → `registerAdminDashboardRoutes` → `registerAdminMembersRoutes`

---

## 二、DDL（Admin-R1 增量）

### 2.1 新建表

| 表 | 脚本 | 用途 |
|----|------|------|
| `sw_admin_audit_log` | `migrations/admin-r1/001_sw_admin_audit_log.sql` | 超管写操作审计 |

**执行时机**：生产维护窗口，在 mvp1~mvp3 之后、backfill 之前或之后均可（独立表）。

### 2.2 复用表（无 ALTER）

| 表 | R1 用途 |
|----|---------|
| `eb_user` | 会员列表、spread_uid 归属、is_staff/division_id |
| `sw_user_membership` | 199/299 档位判定 |
| `sw_integral_batch` / `sw_integral_ledger` | 积分余额、今日新增/消耗统计 |
| `sw_cash_voucher_batch` | 现金券余额汇总 |
| `sw_approval_request` / `sw_approval_step` / `sw_approval_todo` | 审批全量列表 |
| `sw_store_manager` | 店长标签 |
| `sw_merchant` | 商家标签 |
| `sw_system_config` | 免审开关 |

### 2.3 会员分类 SQL 片段（列表筛选用）

```sql
-- 有效最高档会员 tier
LEFT JOIN (
  SELECT uid, tier_code, expire_at,
         ROW_NUMBER() OVER (PARTITION BY uid ORDER BY
           CASE tier_code WHEN 'SW299' THEN 2 WHEN 'SW199' THEN 1 ELSE 0 END DESC,
           expire_at DESC) AS rn
  FROM sw_user_membership
  WHERE status = 1 AND expire_at > UNIX_TIMESTAMP()
) m ON m.uid = u.uid AND m.rn = 1

-- 标签判定（应用层或 CASE）
-- tier199:  m.tier_code = 'SW199'
-- tier299:  m.tier_code = 'SW299'
-- staff:    u.is_staff = 1
-- manager:  EXISTS sw_store_manager WHERE manager_uid = u.uid AND is_active = 1
-- merchant: EXISTS sw_merchant WHERE login_uid = u.uid AND is_active = 1
-- normal:   m.uid IS NULL
```

> MySQL 5.7 无窗口函数时，改用子查询 `MAX(tier_rank)` + `JOIN sw_membership_ship_map`。

---

## 三、API 契约（Admin-R1）

### 3.1 数据看板

#### `GET /api/admin/dashboard/summary`

**Query**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `range` | `today\|7d\|30d` | `today` | 统计区间 |

**Response `data`**

```json
{
  "range": "today",
  "updatedAt": 1781925000,
  "cards": {
    "memberTotal": 1770,
    "verifyToday": 12,
    "pendingSettlement": 5600.00,
    "pendingApproval": 3,
    "integralGrantedToday": 199000,
    "integralConsumedToday": 45000,
    "newUsersToday": 8,
    "approvalApprovedToday": 5
  },
  "trend": {
    "labels": ["06-14", "06-15", "..."],
    "integralGranted": [12000, 8000, "..."],
    "integralConsumed": [3000, 5000, "..."]
  }
}
```

**口径**

| 指标 | SQL 来源 |
|------|----------|
| `memberTotal` | `COUNT(eb_user)` WHERE `is_del=0` |
| `verifyToday` | `sw_integral_mall_verify_log` + `sw_cash_voucher_ledger`(direction=0) 当日 COUNT |
| `pendingSettlement` | `SUM(sw_merchant.pending_settlement)` |
| `pendingApproval` | `sw_approval_todo` WHERE `is_done=0` AND `todo_type='admin_review'` |
| `integralGrantedToday` | `sw_integral_ledger` WHERE `direction=1` AND `biz_type IN ('grant','gift','recharge','legacy_import','manual')` AND `created_at >= dayStart` |
| `integralConsumedToday` | `direction=0` AND `biz_type IN ('consume','exchange','expire','deduct')` |
| `newUsersToday` | `eb_user.add_time >= dayStart` |
| `approvalApprovedToday` | `sw_approval_request` WHERE `status='approved'` AND `approved_at >= dayStart` |
| `trend.*` | 按日 GROUP BY `DATE(FROM_UNIXTIME(created_at))`，最近 7/30 天 |

**实现文件**：`admin-dashboard.routes.js` + `admin-dashboard.service.js`

---

### 3.2 会员管理

#### `GET /api/admin/members/list`

**Query**

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | int | 默认 1 |
| `pageSize` | int | 默认 20，最大 100 |
| `keyword` | string | UID / 手机号 / 昵称模糊 |
| `tag` | string | 逗号分隔：`normal,tier199,tier299,staff,manager,merchant` |
| `sortBy` | string | `register_desc`(默认) / `integral_desc` / `consume_desc` |

**Response `data`**

```json
{
  "total": 1770,
  "page": 1,
  "pageSize": 20,
  "list": [{
    "uid": 10001,
    "nickname": "张三",
    "phone": "138****1234",
    "avatar": "https://...",
    "tags": ["tier199", "staff"],
    "tierCode": "SW199",
    "membershipExpireAt": 1813459200,
    "integralBalance": 199000,
    "integralFrozen": 0,
    "cashVoucherBalance": 500.00,
    "spreadUid": 8888,
    "spreadNickname": "李店员",
    "registerAt": 1700000000,
    "lastApprovalAt": 1781900000
  }]
}
```

**字段来源**

| 字段 | 来源 |
|------|------|
| `integralBalance` | `eb_user.integral` |
| `cashVoucherBalance` | `SUM(sw_cash_voucher_batch.remain_amount WHERE status=1)` |
| `spreadUid/Nickname` | `eb_user.spread_uid` JOIN `eb_user` |
| `lastApprovalAt` | `MAX(sw_approval_request.created_at WHERE customer_uid=uid)` |

---

#### `GET /api/admin/members/:uid/detail`

**Response `data`**

```json
{
  "profile": { "uid", "nickname", "phone", "avatar", "tags", "tierCode", "membershipExpireAt", "isStaff", "divisionId", "spreadUid", "spreadNickname" },
  "integralSummary": { "total", "giftRemaining", "rechargeRemaining", "nearestExpireAt", "nearestExpireAmount" },
  "integralBatches": [{ "batchId", "batchType", "totalAmount", "remainAmount", "expireAt", "sourceType", "remark", "createdAt" }],
  "cashVoucherBatches": [{ "batchId", "totalAmount", "remainAmount", "expireAt", "sourceType", "createdAt" }],
  "membershipRecords": [{ "id", "tierCode", "sourceChannel", "grantedIntegral", "startAt", "expireAt", "status" }],
  "approvalHistory": [{ "requestId", "requestNo", "consumptionAmount", "matchedTierCode", "status", "staffUid", "createdAt", "approvedAt" }],
  "isMerchant": false,
  "merchantId": null
}
```

**复用**：`IntegralService.buildSummary()`、`MembershipRepository` 现有查询。

---

#### `PUT /api/admin/members/:uid/staff-role`

**Body**

```json
{
  "action": "grant",
  "divisionId": 1
}
```

| action | 行为 |
|--------|------|
| `grant` | `UPDATE eb_user SET is_staff=1, division_id=:divisionId` |
| `revoke` | `UPDATE eb_user SET is_staff=0`（division_id 保留或清零，建议清零） |

**审计**：`action=staff_role_grant|staff_role_revoke`

**Response**：`{ uid, isStaff, divisionId }`

---

#### `POST /api/admin/integral/grant`

**Body**

```json
{
  "uid": 10001,
  "amount": 1000,
  "batchType": "gift",
  "expireDays": 365,
  "remark": "活动补偿"
}
```

| 字段 | 约束 |
|------|------|
| `batchType` | `gift` / `adjust`（R1）；`recharge` 走充值流程 |
| `expireDays` | gift 默认读 `sw_system_config.gift_integral_expire_days`；adjust 可 0=永久 |

**实现**：扩展 `IntegralService.grantManual()`，双写 batch + eb_user + eb_user_bill + ledger，`source_type='manual'`, `biz_type='manual'`。

**审计**：`action=integral_grant`

**Response**：`{ batchId, uid, amount, balanceAfter }`

> R1 **不含批量**；R3 增加 `POST /api/admin/integral/grant-batch`。

---

#### 已有接口（R1 前端直接复用）

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/admin/membership/grant` | 手动开 199/299 |
| POST | `/api/admin/cash-voucher/grant` | 单发现金券 |
| POST | `/api/admin/merchant/create` | 开商家（详情页跳转预填 uid） |

---

### 3.3 审批管理

#### `GET /api/admin/approval/list`（新增，区别于 todos）

**Query**

| 参数 | 说明 |
|------|------|
| `page`, `pageSize` | 分页 |
| `status` | `pending_store,pending_admin,approved,rejected,all` |
| `staffUid` | 发起店员 |
| `divisionId` | 门店 |
| `amountMin`, `amountMax` | 消费金额区间 |
| `tierCode` | SW199/SW299 |
| `dateFrom`, `dateTo` | 创建日期 YYYY-MM-DD |
| `receiptNo` | 小票号模糊 |

**Response `data.list[]`**

```json
{
  "requestId": 42,
  "requestNo": "AR202606200001",
  "customerUid": 10001,
  "customerNickname": "张三",
  "staffUid": 8888,
  "staffNickname": "李店员",
  "divisionId": 1,
  "consumptionAmount": 2500.00,
  "matchedTierCode": "SW199",
  "matchedVoucherAmount": 500.00,
  "matchedIntegral": 199000,
  "receiptNo": "T20260620",
  "status": "admin_review",
  "rejectReason": "",
  "createdAt": 1781920000,
  "approvedAt": 0,
  "steps": [
    { "stepRole": "staff", "operatorUid": 8888, "action": "submit", "comment": "", "createdAt": 1781920000 },
    { "stepRole": "manager", "operatorUid": 7777, "action": "approve", "comment": "", "createdAt": 1781920100 }
  ]
}
```

**status 映射**（前端展示用）

| DB status | 展示 |
|-----------|------|
| `manager_review` | pending_store（待店长初审） |
| `admin_review` | pending_admin（待超管终审） |
| `approved` | approved |
| `rejected` | rejected |
| `revoked` | revoked |

---

#### `GET /api/admin/approval/:id`（详情）

返回单条 + 完整 `steps` + `receiptImages` JSON 解析。

---

#### 已有接口（保持不变）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/approval/todos` | 超管待办（看板 pendingApproval 跳转用） |
| POST | `/api/admin/approval/review` | 终审 `{ requestId, action, reason }` |

---

#### `PUT /api/admin/config/approval-auto-pass`（新增）

**Body**

```json
{
  "enabled": true,
  "scope": "consumption"
}
```

| scope | 说明 |
|-------|------|
| `integral_mall` | 仅积分商城（已有 `integral_mall_skip_approval`） |
| `consumption` | 消费审批免审（R1 新增 key） |
| `all` | 两者均开 |

**存储**

```sql
-- sw_system_config
config_key = 'consumption_approval_auto_pass'  -- '1' | '0'
-- 或统一 JSON:
config_key = 'approval_auto_pass'
config_value = '{"integral_mall":true,"consumption":false}'
```

**行为**：`ApprovalService.createRequest()` 入口检测，若 consumption 免审开启 → 跳过 manager/admin 待办，直接 `approved` + 发权益，仍写 `sw_approval_step`。

**审计**：`action=approval_config_update`

**GET 对称接口**：`GET /api/admin/config/approval-auto-pass` 返回当前开关。

---

## 四、审计日志服务

### 4.1 `AdminAuditService.write()`

```javascript
async write({ adminUsername, action, targetType, targetId, payload, resultStatus, resultMessage, ip }) {
  await pool.query(`INSERT INTO sw_admin_audit_log (...) VALUES (...)`, [...]);
}
```

### 4.2 R1 需审计的操作

| action | 触发接口 |
|--------|----------|
| `integral_grant` | POST `/api/admin/integral/grant` |
| `membership_grant` | POST `/api/admin/membership/grant` |
| `cash_voucher_grant` | POST `/api/admin/cash-voucher/grant` |
| `staff_role_grant` / `staff_role_revoke` | PUT `/api/admin/members/:uid/staff-role` |
| `approval_review` | POST `/api/admin/approval/review` |
| `approval_config_update` | PUT `/api/admin/config/approval-auto-pass` |

---

## 五、fzlsaas-admin 对接清单

| 页面 | 调用 API | 备注 |
|------|----------|------|
| 首页 Dashboard | `GET /dashboard/summary?range=` | 替换占位 `--` |
| 会员管理（新） | `GET /members/list`, `GET /members/:uid/detail` | 新路由 `/members` |
| 会员详情抽屉 | `POST /integral/grant`, `POST /membership/grant`, `POST /cash-voucher/grant`, `PUT /members/:uid/staff-role` | 操作后 refresh detail |
| 审批管理 v2 | `GET /approval/list`, `GET /approval/todos`, `POST /approval/review` | 全量 Tab + 待办 Tab |
| 审批设置 | `GET/PUT /config/approval-auto-pass` | 页面顶部开关 |

**菜单调整**（前端 R1）：新增「会员管理」；「现金券管理」隐藏或重定向到会员详情。

---

## 六、历史会员回填 · 生产 Runbook 确认

PM 已在本地 `so1988_shunwei` 验证通过：

| 指标 | 结果 |
|------|------|
| legacy_integral_batches | 554 |
| legacy_memberships | 0（无 pay_price≥199 订单，符合拍板） |
| integral mismatch | 0 |

**生产维护窗口顺序**（已写入 `docs/DEPLOY_AND_PAYMENT_PLAN.md`）：

```
0. mysqldump 全库备份
1. 执行 mvp1~mvp3 建表
2. 执行 admin-r1/001_sw_admin_audit_log.sql
3. 执行 backfill/001_legacy_member_backfill.sql
   或 node scripts/run-backfill.js --run
4. 验证：SELECT COUNT(*) FROM sw_integral_batch WHERE source_type='legacy_import'
5. 部署 shunwei-api + fzlsaas-admin
6. 真机验收
```

**回填规则**（用户拍板）：
- 无明确 199/299 订单 → 不写入 `sw_user_membership`，超管后期 FZLSaas 手动发放
- 积分全量 → `sw_integral_batch`（legacy_import）

---

## 七、错误码与边界

| HTTP | code | 场景 |
|------|------|------|
| 401 | 401 | 未登录 / Cookie 失效 |
| 400 | 400 | 参数校验失败（zod flatten） |
| 404 | 404 | uid / requestId 不存在 |
| 409 | 409 | 重复发放（source_id 幂等） |
| 500 | 500 | 数据库/事务失败 |

**安全**：
- 手机号列表脱敏：`138****1234`
- 写操作记录 IP + admin_username
- `divisionId` 开通店员时必填且 > 0

---

## 八、实施顺序（建议 3 天）

| 天 | 后端 | 前端 |
|----|------|------|
| D1 | DDL + AdminAuditService + dashboard/summary | 看板接 API + ECharts |
| D2 | members/list + detail + integral/grant + staff-role | 会员管理页 + 详情抽屉 |
| D3 | approval/list + config/approval-auto-pass + 免审逻辑 | 审批 v2 全量表 + 开关 |

**验收标准**：
1. 看板 6 指标有真实数据，7 日趋势可切换 range
2. 会员列表多维筛选正确，详情含批次/审批历史
3. 单发积分后 `eb_user.integral` 与 batch 一致
4. 审批全量列表可筛选，免审开关生效且写审计

---

## 九、Admin-R2/R3 预留（不在 R1 实现）

| API | 阶段 |
|-----|------|
| `GET /api/admin/staff/list` | R2 |
| `GET/PUT /api/admin/staff/:uid/card` | R2 |
| `GET /api/staff/:uid/card`（小程序公开） | R2 |
| `GET/PUT /api/admin/merchant/:id` | R2 |
| `GET /api/admin/merchant/:id/verify-logs` | R2 |
| `POST /api/admin/members/batch-grant` | R3 |
| `GET/POST/PUT /api/admin/integral-mall/products` | R3 |
| `GET /api/admin/audit-logs` | R3 |

---

*文档版本 Admin-R1 Tech v1.0 · 用户已确认「按建议执行 Admin-R1」*
