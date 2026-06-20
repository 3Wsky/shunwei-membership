# 顺为会员体系 · 技术方案

> 版本：Tech v1.0（2026-06-19）  
> 维护：资深全栈架构师  
> 关联 PRD：`docs/MEMBERSHIP_SYSTEM_PRD.md` v4.2  
> 迁移脚本：`CMB/shunwei-api/migrations/`

---

## 一、架构总览

```
微信小程序
  ├─ 会员购买/积分商城兑换 ──→ CRMEB（eb_user / eb_member_ship / eb_store_integral*）
  ├─ 积分批次/FIFO/开卡赠积分 ──→ shunwei-api（sw_integral_* / sw_user_membership）
  ├─ 审批/现金券/异业商家 ──→ shunwei-api（sw_approval_* / sw_cash_voucher_* / sw_merchant*）
  └─ 商品展示 ──→ shunwei-api（已有 /api/products）
```

**核心原则**：CRMEB 继续承担登录、支付、积分商城下单；shunwei-api 作为 **权益编排层**，所有积分变动走统一入口，事务内双写 `sw_integral_batch` + `eb_user.integral`。

---

## 二、真实库验证（so1988_shunwei）

### 2.1 eb_member_ship（当前生产）

| id | type | title | vip_day | pre_price | 状态 |
|----|------|-------|---------|-----------|------|
| 1-5 | month/quarter/year/ever/free | CRMEB 默认卡 | 7-365 | 0.01-899 | 演示数据 |

**结论**：尚无 199/299 档位。MVP1 通过 `005_eb_member_ship_seed.sql` 新增 `type='owner'` 自定义年卡（CRMEB `OtherOrderServices::checkPayMemberType` 已支持 `owner` 分支）。

### 2.2 eb_user（会员相关字段）

| 字段 | 用途 |
|------|------|
| `is_money_level` | 0=非付费会员, 1=微信购买, 2=卡密/领取 |
| `is_ever_level` | 是否永久会员 |
| `overdue_time` | 会员到期时间戳 |
| `integral` | 积分总余额（单字段，无批次） |
| `is_staff` / `division_id` | 店员与门店 |

### 2.3 eb_store_integral（积分商品）

- 现有 4 个商品，含「会员福利」贴膜 10000 积分
- `stock` 字段存在，**MVP1 前端不展示**，库存为 0 时返回自定义文案
- 兑换走 `eb_store_integral_order`，`delivery_type='fictitious'` + `verify_code` 自提核销

### 2.4 eb_user_bill（积分流水）

- 赠送积分写入：`category='integral'`, `type='system_add'`
- shunwei-api 发积分时 **同步写入** eb_user_bill，保持 CRMEB 后台流水一致

---

## 三、MVP1 新表 DDL

| 表名 | 用途 | 脚本 |
|------|------|------|
| `sw_system_config` | 免审开关、赠送积分配置 | mvp1/001 |
| `sw_integral_batch` | 积分批次（FIFO） | mvp1/002 |
| `sw_integral_ledger` | 积分流水审计 | mvp1/002 |
| `sw_user_membership` | 199/299 开通记录 | mvp1/003 |
| `sw_membership_ship_map` | 档位与 eb_member_ship 映射 | mvp1/003 |
| `sw_integral_mall_verify_log` | 积分兑换核销日志 | mvp1/004 |

**执行顺序**见 `migrations/README.md`。

---

## 四、CRMEB 复用与扩展点

### 4.1 复用表（无需 ALTER）

| 表 | MVP1 用途 |
|----|----------|
| `eb_member_ship` | 199/299 会员卡配置 |
| `eb_user` | 会员状态、积分余额 |
| `eb_other_order` | 微信自购会员订单 |
| `eb_store_integral` | 积分商品 |
| `eb_store_integral_order` | 积分兑换订单 |
| `eb_user_bill` | 积分流水展示 |

### 4.2 必改扩展点（CRMEB PHP）

**文件**：`crmeb/app/services/order/OtherOrderServices.php`  
**方法**：`paySuccess()`，在 `setMemberOverdueTime()` 之后

```php
// 顺为定制：通知 shunwei-api 发放开卡赠送积分
$shipId = $this->resolveMemberShipId($orderInfo); // 由 member_type+pay_price 解析
HttpService::postRequest(env('SHUNWEI_API_URL', 'http://127.0.0.1:8787') . '/api/internal/membership/pay-callback', [
    'uid' => (int)$orderInfo['uid'],
    'eb_member_ship_id' => $shipId,
    'order_id' => $orderInfo['order_id'],
    'pay_price' => (float)$orderInfo['pay_price'],
    'channel' => 'wechat_purchase',
]);
```

**环境变量**（`crmeb/.env` 新增）：
```
SHUNWEI_API_URL=http://127.0.0.1:8787
SHUNWEI_API_INTERNAL_TOKEN=<随机密钥>
```

### 4.3 会员有效期算法（shunwei-api 统一实现）

```
输入: uid, tier_code(SW199/SW299), channel
1. 查 sw_user_membership 当前有效最高档 current_tier_rank
2. 查 eb_user.overdue_time
3. 若 new_rank > current_rank → 升级，expire = now + 365d
4. 若 new_rank <= current_rank → 取高不降级，expire = max(overdue_time, now) + 365d
5. 调 CRMEB setMemberOverdueTime(365, uid, is_money_level=1, member_type='owner')
6. 写 sw_user_membership 记录
7. 发放赠送积分批次（gift, 365d 过期）
8. 若 tier 未升级，仍发积分/券，不重复降档
```

### 4.4 积分发放统一入口

```javascript
// shunwei-api: IntegralService.grant()
// 事务内:
// 1. INSERT sw_integral_batch
// 2. UPDATE eb_user SET integral = integral + :amount
// 3. INSERT eb_user_bill (system_add)
// 4. INSERT sw_integral_ledger
```

### 4.5 积分消耗 FIFO

```javascript
// shunwei-api: IntegralService.consume(amount, uid, bizRef)
// 1. SELECT batches WHERE uid AND status=1 AND remain>0 ORDER BY expire_at ASC, id ASC
// 2. 逐批扣减 remain_amount（expire_at=0 的充值批次排最后）
// 3. UPDATE eb_user.integral -= amount
// 4. INSERT eb_user_bill (system_sub) — 在 CRMEB 积分商城下单前调用
```

---

## 五、MVP1 API 路由

### 5.1 用户端（需 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/membership/me` | 当前档位、到期日、累计赠送记录 |
| GET | `/api/membership/plans` | 199/299 套餐列表（读 eb_member_ship） |
| GET | `/api/integral/summary` | 总积分 + 赠送/充值分项 + 即将过期 |
| GET | `/api/integral-mall/products` | 积分商品列表（隐藏 stock，无货文案） |

### 5.2 店员端（需 is_staff=1）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/staff/integral-mall/verify` | 核销积分兑换（免审开启时直接核销） |
| GET | `/api/staff/customer/:uid/benefits` | 查看客户会员/积分/券（只读，MVP2 完善） |

### 5.3 超管后台（/admin 会话）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/config` | 读取系统配置 |
| PUT | `/api/admin/config/integral-mall-skip-approval` | 免审开关 |
| POST | `/api/admin/membership/grant` | 手工开通（联调/补偿） |
| POST | `/api/admin/integral/grant` | 手工赠积分 |
| CRUD | `/api/admin/integral-products` | 积分商品上架（封装 eb_store_integral） |

### 5.4 内部回调（CRMEB → shunwei-api）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/internal/membership/pay-callback` | 微信购卡成功后赠积分 |
| Header | `X-Internal-Token` | 与 CRMEB .env 一致 |

---

## 六、MVP2 / MVP3 API（规划）

### MVP2

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/staff/consumption/submit` | 录入消费+凭证 |
| GET | `/api/staff/consumption/preview` | 实时预览档位匹配 |
| GET | `/api/approval/todos` | 待办列表 |
| POST | `/api/approval/:id/approve` | 审批通过 |
| POST | `/api/approval/:id/reject` | 驳回 |
| POST | `/api/approval/:id/resubmit` | 店员重提 |
| POST | `/api/admin/approval/:id/revoke` | 超管 24h 内撤销 |

### MVP3

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/cash-voucher/wallet` | 现金券余额+批次 |
| POST | `/api/cash-voucher/redeem` | 核销（任意/整百模式） |
| CRUD | `/api/admin/merchants` | 异业商家管理 |
| GET | `/api/merchant/settlement` | 商家待结算 |
| PUT | `/api/admin/merchant-settlement/:id` | 标记已结算 |
| POST | `/api/integral/recharge/create` | 创建充值订单 |
| POST | `/api/internal/integral/recharge/pay-callback` | 微信支付回调 |

---

## 七、页面改造清单

| 页面 | 路径（uni-app 源码） | 阶段 | 改造内容 |
|------|---------------------|------|---------|
| 会员中心 | `pages/user/vip_*` | MVP1 | 展示 SW199/SW299、到期日 |
| 积分明细 | `pages/users/user_integral/*` | MVP1 | 增加批次过期提示 |
| 积分商城列表 | `pages/points_mall/*` | MVP1 | 隐藏库存、无货文案 |
| 积分订单核销 | `pages/admin/order_cancellation/*` | MVP1 | 对接 sw verify API |
| 员工工作台 | 新建 `pages/staff/workbench` | MVP2 | 替代分销中心入口 |
| 消费录入 | 新建 `pages/staff/consumption_form` | MVP2 | 金额+凭证+预览 |
| 审批中心 | 新建 `pages/staff/approval_center` | MVP2 | 待办+驳回重提 |
| 现金券钱包 | 新建 `pages/user/cash_voucher` | MVP3 | 余额+流水 |
| 商家核销 | 新建 `pages/merchant/verify` | MVP3 | 扫码核销 |
| 商家结算 | 新建 `pages/merchant/settlement` | MVP3 | 待结算/已结算 |
| 积分充值 | 新建 `pages/user/integral_recharge` | MVP3 | 微信支付 |

> 小程序当前为**构建产物**，正式改造应在 `CMB-backend/template/uni-app` 完成后重编译。

---

## 八、MVP 分期与依赖

```
MVP1（2-3周）
  ├─ DDL mvp1/001-005
  ├─ shunwei-api 积分服务 + 会员回调
  ├─ CRMEB paySuccess 钩子
  ├─ 超管后台：免审开关 + 商品上架
  └─ 小程序：会员中心 + 积分商城文案

MVP2（依赖 MVP1）
  ├─ DDL mvp2/*
  ├─ 审批引擎 + 档位规则
  ├─ 员工工作台 + 消费录入
  └─ 关闭免审后的三级审批

MVP3（依赖 MVP2）
  ├─ DDL mvp3/*
  ├─ 现金券钱包 + FIFO 批次
  ├─ 异业商家 + 结算台账
  └─ 积分微信充值
```

---

## 九、数据库联调说明

### 9.1 本地开发

```powershell
# 1. 导入生产快照
F:\shunweiapp\scripts\setup-database.ps1

# 2. 执行 MVP1 迁移
cd F:\shunweiapp\CMB\shunwei-api\migrations
# 按 README 顺序执行 mvp1/*.sql

# 3. 启动 shunwei-api
cd F:\shunweiapp\CMB\shunwei-api
npm run dev
```

### 9.2 远程直连

`.env` 已配置：
- `CRMEB_DB_NAME=so1988_shunwei`
- `CRMEB_DB_USER=so1988_shunwei`

还需：**MySQL 主机地址** + **CRMEB APP_KEY**（JWT 校验）

### 9.3 最小联调数据集

| 角色 | 要求 |
|------|------|
| 超管 | CRMEB 后台管理员账号 |
| 店员 | `eb_user.is_staff=1` + `division_id` |
| 店长 | `sw_store_manager`（MVP2） |
| 测试会员 | 普通用户 uid，用于开卡/兑换 |

---

## 十、风险与对策

| 风险 | 对策 |
|------|------|
| integral_batch 与 eb_user.integral 不一致 | 统一入口 + 事务双写 + 日对账 cron |
| setMemberOverdueTime 累加天数非 max 逻辑 | shunwei-api 先算目标 expire，必要时直接 UPDATE eb_user |
| 小程序构建产物难改 | MVP1 优先后台 API + CRMEB 后台配置 |
| 生产 JWT 失败 | 必须配置生产 APP_KEY |
| 现金券合规 | MVP3 前做法务确认，不阻塞 MVP1 |

---

## 十一、变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-06-19 | v1.0 | 首版：DDL + API + CRMEB 扩展点 + 页面清单 |
