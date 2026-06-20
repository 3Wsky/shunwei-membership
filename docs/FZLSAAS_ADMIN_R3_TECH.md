# FZLSaas 管理后台 · Admin-R3 技术方案

> 版本：Admin-R3 Tech v1.0（2026-06-20）  
> 维护：资深全栈架构师  
> 关联：`docs/FZLSAAS_ADMIN_PRD.md` §Admin-R3、`docs/FZLSAAS_ADMIN_R1_TECH.md`  
> 前置：Admin-R1/R2 已完成

---

## 一、范围

| 模块 | R3 交付 |
|------|---------|
| 批量发放 | 积分 / 现金券 / 会员，uid 列表 + CSV |
| 积分商城后台 | CRUD + 库存（包装 `eb_store_integral`） |
| 审计日志 | 读 `sw_admin_audit_log` |
| 前端 | 会员批量操作 + 积分商城页 + 审计日志页 |
| CSV | 模板下载 + 导入说明 |

**不在 R3**：拖拽排序、报表导出（R4）

---

## 二、批量发放

### 2.1 `POST /api/admin/members/batch-grant`

**Body**

```json
{
  "action": "integral",
  "items": [
    { "uid": 10001, "amount": 1000, "batchType": "gift", "remark": "活动" },
    { "uid": 10002, "amount": 500, "remark": "" }
  ]
}
```

| action | 必填字段 | 复用 |
|--------|----------|------|
| `integral` | uid, amount, batchType?, remark? | `IntegralService.grantManual` |
| `cash_voucher` | uid, amount, remark? | 现有 cash-voucher grant 逻辑 |
| `membership` | uid, tierCode (SW199/SW299), refId? | `MembershipService.adminGrant` |

**约束**
- 单次最多 **500** 条（PRD）
- 同步执行 + 逐条结果（R3 不做异步队列；失败不中断，汇总返回）
- 每条写 `sw_admin_audit_log`（action=`batch_grant_*`）

**Response**

```json
{
  "total": 2,
  "success": 1,
  "failed": 1,
  "results": [
    { "row": 1, "uid": 10001, "ok": true, "batchId": 123 },
    { "row": 2, "uid": 10002, "ok": false, "error": "用户不存在" }
  ]
}
```

### 2.2 `POST /api/admin/members/batch-grant/csv`

**Content-Type**：`multipart/form-data`，字段 `file`（CSV UTF-8）

**CSV 列**（首行 header）：

```csv
uid,action,amount,tier,remark
10001,integral,1000,,活动补偿
10002,cash_voucher,500,,券
10003,membership,,SW199,手动开199
```

| 列 | 说明 |
|----|------|
| uid | 必填 |
| action | integral / cash_voucher / membership |
| amount | integral、cash_voucher 必填 |
| tier | membership 时 SW199/SW299 |
| remark | 可选 |

**模板文件**：`docs/templates/batch-grant-template.csv`（静态下载或 `GET /api/admin/members/batch-grant/template`）

---

## 三、积分商城后台

### 3.1 数据源

复用 CRMEB `eb_store_integral`，字段映射：

| eb 字段 | 后台展示 |
|---------|----------|
| id | productId |
| title | 名称 |
| image | 封面 |
| price | 所需积分 |
| stock | 库存（**仅后台**） |
| is_show | 上下架 |
| sort | 排序 |
| is_del | 软删过滤 |

### 3.2 API（requireAdmin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/integral-mall/products` | 分页列表（含 stock） |
| POST | `/api/admin/integral-mall/products` | 新建 |
| PUT | `/api/admin/integral-mall/products/:id` | 更新 |
| PATCH | `/api/admin/integral-mall/products/:id/stock` | 改库存 |
| GET | `/api/admin/integral-mall/orders` | 兑换订单（读 eb_store_integral_order） |

**POST Body 示例**

```json
{
  "title": "会员福利贴膜",
  "image": "https://...",
  "price": 10000,
  "stock": 100,
  "isShow": true,
  "sort": 0,
  "unitName": "次"
}
```

**审计**：create/update/stock → `integral_mall_product_*`

---

## 四、审计日志

### 4.1 `GET /api/admin/audit-logs`

| Query | 说明 |
|-------|------|
| page, pageSize | 分页，默认 20 |
| action | 筛选 action 前缀 |
| adminUsername | 超管账号 |
| dateFrom, dateTo | YYYY-MM-DD |
| targetType, targetId | 可选 |

**Response.list[]**

```json
{
  "id": 1,
  "adminUsername": "admin",
  "action": "integral_grant",
  "targetType": "user",
  "targetId": "10001",
  "resultStatus": "success",
  "resultMessage": "",
  "ipAddress": "127.0.0.1",
  "createdAt": 1781927000,
  "payloadPreview": "{...}"
}
```

`payload_json` 列表页截断 200 字符；详情可扩展 `GET /api/admin/audit-logs/:id`（R3 可选）。

---

## 五、fzlsaas-admin 页面

| 路由 | 改动 |
|------|------|
| `/members` | 启用多选 + 「批量发积分/券/开会员」；结果 Dialog 显示成功/失败行 |
| `/integral-mall` | **新菜单** 商品 CRUD + 库存列 |
| `/audit-logs` | **新菜单** 或系统设置子页，表格 + 筛选 |

**会员批量 UX**
1. 表格 `el-table` 多选 + 顶部批量按钮
2. 弹窗表单（action + 统一 amount/tier/remark）
3. 提交后 `ElProgress` + 结果表格（失败行高亮）
4. 「CSV 导入」→ upload → 调 batch-grant/csv

**菜单顺序建议**：看板 → 会员 → 店员 → 商家 → 审批 → 积分商城 → 商品 → 抽奖 → 审计日志

---

## 六、代码组织

```
src/modules/admin/
├── admin-batch-grant.routes.js
├── admin-audit.routes.js
└── admin-integral-mall.routes.js   # 或扩展现有 integral-mall 模块

docs/templates/batch-grant-template.csv
docs/BATCH_GRANT_IMPORT.md          # CSV 说明
```

---

## 七、实施顺序（2-3 天）

| 天 | 任务 |
|----|------|
| D1 | batch-grant API + CSV + 审计读 API + 模板文件 |
| D2 | integral-mall admin CRUD + fzlsaas-admin 积分商城页 |
| D3 | 会员批量 UI + 审计日志页 + build + smoke |

---

## 八、验收标准

1. 勾选 3 名会员批量发积分，2 成功 1 失败，失败行号正确
2. CSV 导入 500 行上限校验生效
3. 积分商城后台可改 stock，小程序列表仍不展示库存数
4. 审计日志可筛 action=integral_grant
5. `npm run build` 通过

---

*Admin-R3 Tech v1.0 · 用户指令「继续 Admin-R3」*
