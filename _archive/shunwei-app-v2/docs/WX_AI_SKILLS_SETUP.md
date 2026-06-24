# 微信小程序 AI Skills 接入说明

> 工程：`shunwei-app-v2` | SKILL：`membership-query` | 维护：产品经理

## 目录结构

```
shunwei-app-v2/
├── AGENTS.md                          # 全局 AI 提示词
├── skills/
│   └── membership-query/
│       ├── SKILL.md                   # 业务说明书
│       ├── mcp.json                   # 原子接口声明
│       ├── index.js                   # 注册入口
│       ├── apis/                      # 4 个只读查询接口
│       ├── components/                # 4 个 GUI 卡片组件
│       └── tools/request.js           # 共享请求（读 SW_TOKEN）
└── scripts/patch-mp-ai.mjs            # 编译后注入 app.json
```

## 原子接口

| 接口 | 需登录 | 后端 API |
|------|:------:|----------|
| queryMyMembership | ✅ | GET /api/membership/me |
| queryMyIntegral | ✅ | GET /api/integral/summary |
| queryMembershipPlans | ❌ | GET /api/membership/plans |
| queryMyCashVoucher | ✅ | GET /api/cash-voucher/wallet |

## 本地调试步骤

1. **申请资格**：微信公众平台 → 基础功能 → AI 能力 → 开发模式
2. **工具**：微信开发者工具 **Nightly 版**，调试基础库 **3.16.1+**
3. **编译**：
   ```bash
   cd shunwei-app-v2
   npm run dev:mp-weixin
   node scripts/patch-mp-ai.mjs dev
   ```
4. **导入项目**：打开 `unpackage/dist/dev/mp-weixin`
5. **切换模式**：编译模式 → 「小程序 AI 编译」
6. **安全设置**：开发者工具 → 设置 → 安全 → 开启服务端口（SkillHub 校验用）
7. **后端**：`cd CMB/shunwei-api && npm run dev`（8787）
8. **登录**：先在普通模式完成微信登录，再切 AI 模式问「查我的会员等级」

## 注意事项

- AI 开发模式代码 **不可合入正式版提审**（微信官方限制）
- token 与主小程序共享 storage 键 `SW_TOKEN`
- 组件视觉为骨架版，设计师重构 UI 后可同步升级卡片样式

## SkillHub 校验（可选）

安装 SkillHub「校验 Skills」后，对 AI 说：「校验 shunwei-app-v2 的 membership-query skill」
