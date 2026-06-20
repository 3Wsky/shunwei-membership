# 顺为会员系统 — 进度总览 & 上线清单

> 开发方：FZLSaas · 反重力人工智能工作室
> 更新：通宵自治推进期间（用户睡眠中）

---

## 一、整体进度（已完成）

### 1. 小程序 `shunwei-app-v2`（uni-app Vue3 + Pinia）— 17+ 页
| 模块 | 页面 | 状态 |
|------|------|------|
| 登录 | 微信一键登录（CRMEB v5.6.4 两步握手 auth_type→auth_login）| ✅ |
| 首页 | 自绘（会员权益+积分横条+商品网格+快捷入口，不依赖 CRMEB DIY）| ✅ |
| 商品 | 列表/详情（8 个真实商品已上架）| ✅ |
| 会员 | 会员中心 + 开通购卡（微信支付路由 user/member/card/create）| ✅ |
| 积分 | 积分总览+明细 + 积分商城+兑换 | ✅ |
| 现金券 | 钱包（余额/批次/明细，部分核销 FIFO）| ✅ |
| 异业商家 | 商家核销（**已加扫码识别客户**）+ 结算台账 | ✅ |
| 员工 | 工作台 + 核销（**已支持扫码**）+ 客户权益 | ✅ |
| 审批 | 发起开通（实时档位预览）+ 审批中心（店长/超管）| ✅ |

### 2. 业务后端 `shunwei-api`（Node + Fastify）— 30+ 路由
全部模块路由健康扫描 **18/18 通过**（公开 200 / 鉴权 401）：
membership · integral · integral-mall · products · cash-voucher · merchant · staff · approval · newcomer-lottery · admin

### 3. FZLSaas 管理后台 `fzlsaas-admin`（Vue3 + Vite + TS + Element Plus）
- 脚手架 + 登录 + 布局 + 动态路由权限
- 业务页：发券 / 开商家 / 核销模式 / 审批管理 / 结算 / 抽奖运营 / 商品 / 看板
- **`npm run build` 已跑通**（修复了 @types/node、tsconfig composite、request 类型 3 个构建错误）
- dev：`cd fzlsaas-admin && npm run dev`（:3000，代理到 :8787）

### 4. 数据库（生产库 so1988_shunwei）
- 已建全部 `sw_*` 表（MVP1+MVP2+MVP3）：会员/积分批次/流水/核销日志/审批/档位规则/店长/现金券/商家/结算/积分充值
- 消费档位已 seed（2000-3000→SW199+¥100 / 3000-6000→SW199+¥300 / 6000-10000→SW299+¥500 / 10000+→SW299+¥800）
- 1770 用户 / 1768 微信绑定 原地复用，老用户无感登录

---

## 二、进行中 / 刚完成
- ✅ 客户侧二维码（钱包 `sw-uid:<uid>` + 积分兑换 `sw-verify:<code>`）
- ✅ 积分商城兑换 API 对接 + 兑换成功弹层二维码
- ✅ `GET /api/integral-mall/orders` + 积分页待核销列表
- ✅ `POST /api/integral-mall/verify-by-code` + 店员扫码解析核销码
- ✅ 路由健康扫描（关键 12 路由 200/401 符合预期）
- 🎨 小程序 + 后台 UI 视觉重构 — 设计师进行中（首页/会员/我的/积分/现金券 v2.0）

---

## 三、⚠️ 需要你（醒来后）提供/操作 — 上线就差这几步

| # | 事项 | 说明 |
|---|------|------|
| 1 | **真机登录验证** | 模拟器无法完成微信授权（jscode2session 拿不到 openid），必须真机预览扫码测登录 |
| 2 | **shunwei-api 部署** | 给 shunwei-api 一个公网 HTTPS 域名（建议 `api.xjshunwei.cn`）。真机访问不了本地 127.0.0.1:8787，会员/积分/现金券需后端上线 |
| 3 | **微信合法域名** | 微信公众平台→服务器域名→request 合法域名 加：`ok.xjshunwei.cn` + shunwei-api 域名 |
| 4 | **微信支付** | 购卡支付路由已对齐生产（user/member/card/create）。真机测付款；若失败可能需确认会员卡上架 + 支付配置 |
| 5 | **生产 APP_KEY** | shunwei-api `.env` 的 CRMEB_APP_KEY 需与生产 crmeb 一致（校验登录 JWT）|
| 6 | **服务器访问** | 部署 shunwei-api + fzlsaas-admin 需服务器（宝塔/SSH）；迁移脚本 + 命令已备（见 DEPLOY_AND_PAYMENT_PLAN.md）|
| 7 | **抽奖素材**（可选）| 新客抽奖页若要还原原版需转盘素材，否则用代码自绘 |

---

## 四、相关文档
- `REBUILD_MASTER_PLAN.md` — 重构总体规划
- `DEPLOY_AND_PAYMENT_PLAN.md` — 部署 + 微信支付方案
- `MEMBERSHIP_SYSTEM_PRD.md` / `_TECH.md` / `MEMBERSHIP_UI_DESIGN.md` — 需求/技术/UI
- 共享记忆（KC Chat）：各阶段进度与决策

---

## 五、本地自测方式（你可随时验）
- 后端：`http://127.0.0.1:8787/health` → 200；FZLSaas 后台 `http://127.0.0.1:8787/admin`（admin / shunwei2026dev）
- 新后台：`cd fzlsaas-admin && npm run dev` → `http://localhost:3000`
- 小程序：HBuilderX 打开 `shunwei-app-v2`，模拟器看 UI（登录/会员/积分需真机）
