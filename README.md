# 顺为会员体系（Shunwei Membership System）

顺为汽车贴膜会员体系重构项目 — 小程序 + 业务后端 + 管理后台 monorepo。

## 项目结构

```
├── shunwei-app-v2/     # 小程序（uni-app Vue3 + Pinia）— 当前主小程序
├── CMB/shunwei-api/    # 业务后端（Node.js + Fastify）
├── fzlsaas-admin/      # 管理后台（Vue3 + Vite + Element Plus）
├── docs/               # 产品文档（PRD / 技术方案 / 部署 / 进度）
└── scripts/            # 本地开发辅助脚本
```

## 技术栈

| 模块 | 技术 |
|------|------|
| 小程序 | uni-app Vue3、Pinia、微信小程序 |
| 后端 | Node.js、Fastify、MySQL（复用 CRMEB `eb_*` 表 + `sw_*` 业务表） |
| 管理后台 | Vue3、Vite、TypeScript、Element Plus |
| 微信网关 | 生产 CRMEB v5.6.4（仅登录 code2session、支付下单，业务不走 PHP） |

## 开发进度（2026-06-20）

### 已完成

- **小程序** `shunwei-app-v2`：17+ 页（登录/首页/会员/积分/现金券/商家/员工/审批等）
- **后端** `shunwei-api`：30+ 路由，健康扫描 18/18 通过
- **管理后台** `fzlsaas-admin`：`npm run build` 已通过，R1-R3 主体功能交付
- **Admin-R4-A**：会员详情快捷操作、变更归属、CSV 导入、看板链接、危险确认
- **数据库**：全部 `sw_*` 表 + 1770 用户原地复用

### 进行中

- **Admin-R4-B**：积分商城兑换订单后台、审批 24h 撤销、审批高级筛选
- **UI 重构**：小程序轻奢风（设计师）

### 上线待办（需运维/真机）

1. 真机微信登录验证
2. shunwei-api 公网 HTTPS 部署
3. 微信合法域名配置
4. 微信支付联调（APIv3 密钥/证书）
5. 生产 APP_KEY 对齐

详见 [`docs/PROGRESS_AND_LAUNCH_CHECKLIST.md`](docs/PROGRESS_AND_LAUNCH_CHECKLIST.md)

## 本地开发

### 后端

```bash
cd CMB/shunwei-api
cp .env.example .env   # 编辑数据库与 CRMEB 配置
npm install
npm run dev            # http://127.0.0.1:8787
```

健康检查：`GET http://127.0.0.1:8787/health`

### 管理后台

```bash
cd fzlsaas-admin
npm install
npm run dev            # http://localhost:3000，代理到 :8787
```

### 小程序

HBuilderX 打开 `shunwei-app-v2`，运行到微信开发者工具。登录/支付需真机预览。

## 文档索引

| 文档 | 说明 |
|------|------|
| `docs/REBUILD_MASTER_PLAN.md` | 重构总体规划 |
| `docs/MEMBERSHIP_SYSTEM_PRD.md` | 会员体系 PRD v4.3 |
| `docs/FZLSAAS_ADMIN_PRD.md` | 管理后台 PRD |
| `docs/DEPLOY_AND_PAYMENT_PLAN.md` | 部署与微信支付 |
| `docs/MINIAPP_LUXURY_UI_BRIEF.md` | 小程序 UI 简报 |

## 不包含在本仓库

以下目录为旧版/归档，未纳入版本控制：

- `shunwei/shunwei-miniprogram/` — 旧 CRMEB 全量电商小程序（已废弃）
- `CMB/CMB-backend/` — CRMEB PHP 后端（生产保留，源码不入库）
- `cmbline/`、`tools/`、`Data/` — 无关或第三方工具

## License

Private — FZLSaas / 反重力人工智能工作室
