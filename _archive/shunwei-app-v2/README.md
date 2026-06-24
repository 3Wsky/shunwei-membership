# 锦程数码会员小程序 v2（重构版）

uni-app (Vue3) 工程。重构方案见 `../docs/REBUILD_MASTER_PLAN.md`。

## 架构（方案甲）

```
小程序(本工程, uni-app Vue3)
  ├─ 登录 / 微信支付  ──→  CRMEB 网关 (https://ok.xjshunwei.cn)   ← 仅用微信相关接口
  └─ 会员/积分/商品/核销 ──→ shunwei-api (http://127.0.0.1:8787) ← 全部新业务
                                   └─ 直连同一 MySQL (so1988_shunwei)
```

- **登录连续性**：`uni.login` → CRMEB `v2/routine/auth_login` → JWT；1768 微信老用户 openid 不变
- **token 复用**：CRMEB JWT 同时被 shunwei-api 校验（`Authori-zation` 头，不加 Bearer）
- **首页自绘**：不调 CRMEB `theme_info`/DIY，规避版本不匹配

## 页面清单（P1-P3，共 12 页）

| 页面 | 路径 | 阶段 | 功能 |
|------|------|------|------|
| 首页 | `pages/index/index` | P1 | 会员权益横条 + 计划卡片 + 商品展示 |
| 登录 | `pages/login/index` | P1 | 微信一键登录 |
| 商品列表 | `pages/products/list` | P1 | 搜索 + 商品网格 + 分页 |
| 商品详情 | `pages/products/detail` | P1 | 轮播 + 参数 + 到店咨询 |
| 会员中心 | `pages/member/center` | P1 | 会员状态 + 积分总览 + 套餐列表 |
| 我的 | `pages/user/index` | P1 | 用户信息 + 会员/积分/工作台入口 |
| 会员开通 | `pages/member/purchase` | P2 | 套餐选择 + 权益展示 + 支付按钮 |
| 我的积分 | `pages/integral/index` | P2 | 积分总览(赠送/充值/即将过期) + 明细流水 |
| 积分商城 | `pages/integral/mall` | P2 | 积分余额 + 商品列表 + 缺货蒙层 + 兑换 |
| 员工工作台 | `pages/staff/workbench` | P3 | 员工信息 + 核销/查客户入口 + 核销记录 |
| 核销扫码 | `pages/staff/verify` | P3 | 输入核销码 / 扫码 + 核销结果 |
| 客户详情 | `pages/staff/customer` | P3 | 客户积分/会员信息查询 |

## API 接口清单

### CRMEB 网关（登录/支付）
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/v2/routine/auth_login` | 微信小程序登录 |
| GET | `/api/user` | 获取用户信息 |
| POST | `/api/v2/routine/auth_binding_phone` | 绑定手机号 |

### shunwei-api（业务）
| 方法 | 路径 | 用途 | 阶段 |
|------|------|------|------|
| GET | `/api/products` | 商品列表 | P1 |
| GET | `/api/products/:id` | 商品详情 | P1 |
| GET | `/api/membership/plans` | 会员计划(SW199/SW299) | P1 |
| GET | `/api/membership/me` | 我的会员 | P2 |
| POST | `/api/membership/claim-gift` | 领取开卡赠积分 | P2 |
| GET | `/api/integral/summary` | 积分总览 | P2 |
| GET | `/api/integral/log` | 积分明细(分页) | P2 |
| GET | `/api/integral-mall/products` | 积分商城商品 | P2 |
| POST | `/api/integral-mall/exchange` | 积分兑换 | P2 |
| GET | `/api/staff/me` | 员工信息 | P3 |
| GET | `/api/staff/verify-history` | 核销历史 | P3 |
| POST | `/api/staff/integral-mall/verify` | 执行核销 | P3 |
| GET | `/api/staff/customer/:uid/benefits` | 客户权益查询 | P3 |

## 本地运行

### HBuilderX（推荐）
1. 打开本目录 `shunwei-app-v2`
2. 运行 → 运行到小程序模拟器 → 微信开发者工具
3. 详情 → 本地设置 → 勾选「**不校验合法域名**」
4. 确保 shunwei-api 在跑：`cd ../CMB/shunwei-api && npm run dev`

### CLI
```bash
cd shunwei-app-v2
npm install
npm run dev:mp-weixin
# 产物在 unpackage/dist/dev/mp-weixin，用开发者工具打开
```

## 配置

`config/index.js`：
- `dev`：CRMEB → 生产域名，SHUNWEI_API → `127.0.0.1:8787`
- `prod`：上线前把 SHUNWEI_API 改为生产地址

AppID：`wxd3d9178b9414d20b`（manifest.json）

## 分期进度

| 期 | 范围 | 状态 |
|----|------|------|
| **P1** | 脚手架 + 登录 + 首页 + 商品 | ✅ 完成 |
| **P2** | 会员开通 + 积分 + 积分商城 | ✅ 完成 |
| **P3** | 员工工作台 + 核销 + 客户查询 | ✅ 完成 |
| P4 | 现金券 + 异业商家 + 结算 | 待启动 |
| P5 | 管理后台 + 上线 | 待启动 |
