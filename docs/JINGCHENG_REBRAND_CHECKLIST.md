# 锦程数码 · 品牌脱钩清单

> PM 审计 | 2026-06-20 | 目标：用户可见面彻底脱离「顺为」，基础设施分阶段

---

## 一、已完成 ✅（设计师/本轮前）

| 区域 | 改动 |
|------|------|
| 小程序登录/首页/我的 | 「锦程数码」 |
| 小程序 manifest / pages.json 标题 | 「锦程数码会员」 |
| 会员中心档位文案 | 「锦程199/299会员」 |
| Admin Vue 登录/顶栏 | 「锦程会员电商系统」 |
| API membership plans title | 「锦程199/299会员」 |
| Admin 财务设置（主分支 fzlsaas-admin） | 「锦程数码」 |

---

## 二、P0 · 用户/运营仍可见（建议立即改）

| # | 位置 | 现状 | 建议 | 状态 |
|---|------|------|------|:---:|
| P0-01 | `CMB/shunwei-api/.../admin.login.page.js` | 「顺为运营后台」 | → 锦程运营后台 | ✅ 已完成 |
| P0-02 | `CMB/shunwei-api/.../admin.page.js` | 「顺为运营后台 / Shunwei Admin」 | → 锦程 | ✅ 已完成 |
| P0-03 | `jingcheng-saas/fzlsaas-admin/.../finance/settings.vue` | 残留「顺为对应」 | 同步主分支 | ✅ 已完成 |
| P0-04 | `jingcheng-saas/shunwei-api/` 内 API 文案 | 未同步锦程改动 | 跑 sync 脚本 | ✅ 已完成 |
| P0-05 | 小程序 `README.md` | 标题仍「顺为会员」 | → 锦程数码 | ✅ 已完成 |

> 注：生产 Admin 走 Vue `fzlsaas-admin`，**旧 HTML 后台**（`/admin` on :8787）若仍暴露，P0-01/02 必须改。

---

## 三、P1 · 内部标识（用户不直接见，可渐进）

| # | 类别 | 示例 | 改法 | 风险 |
|---|------|------|------|------|
| P1-01 | 档位内部码 | `SW199` / `SW299` | 展示层已用「锦程199会员」；**库字段可暂保留** | 改码需 DB 迁移 |
| P1-02 | 环境变量 | `SHUNWEI_API` | 可增 `JC_API` 别名，逐步替换 | 中 |
| P1-03 | Storage Key | `SW_TOKEN` 等 | 可增 `JC_TOKEN`，兼容读旧 key | 低 |
| P1-04 | 健康检查 | `service: 'shunwei-api'` | → `jingcheng-api` | 低 |
| P1-05 | 默认 dev 密码 | `shunwei2026dev` | 生产已改强密码即可 | 低 |
| P1-06 | PM2 进程名 | `shunwei-api` | → `jingcheng-api`（需改 ecosystem + 运维） | 中 |
| P1-07 | 目录/包名 | `shunwei-app-v2`, `shunwei-api` | 新仓库 `jingcheng-saas` 已独立命名 | 低（新仓） |
| P1-08 | 文档标题 | `docs/*` 多处「顺为会员系统」 | 批量替换为「锦程数码」 | 无 |

---

## 四、P2 · 基础设施（需运维窗口，暂不建议动）

| # | 项 | 现状 | 彻底改需 |
|---|-----|------|----------|
| P2-01 | 域名 | `ok.xjshunwei.cn` | 新域名 + 微信合法域名重配 + SSL |
| P2-02 | API 路径 | `/sw-api/` | Nginx 改 `/jc-api/` + 小程序/Admin env |
| P2-03 | 数据库 | `so1988_shunwei` | 新库或 rename（高风险） |
| P2-04 | 表前缀 | `sw_*` | 全量 migration + 代码替换 |
| P2-05 | 服务器目录 | `/www/wwwroot/our/shunwei-api/` | 迁移 + CI path 更新 |
| P2-06 | 微信小程序 AppID | 不变 | 仅改名称/简介即可 |
| P2-07 | Git 仓库 | `shunwei-membership` | 已规划 `jingcheng-saas` 新仓 |

---

## 五、推荐执行顺序

```
阶段 A（1–2h，无停机）  P0 文案 + jingcheng-saas 同步 + 文档
阶段 B（可选）          P1 别名/进程名/health 标识
阶段 C（需决策）        P2 域名/库/路径 — 仅当业务方确认新域名
```

---

## 六、PM 建议

1. **上线前必做**：阶段 A（P0 全部清掉）
2. **档位码 SW199/SW299**：对用户已显示「锦程199/299」，内部码可当作 SKU，**不必为 rebranding 改库**
3. **域名 ok.xjshunwei.cn**：与 CRMEB 同站，改域名成本极高，**建议保留**，用户只见「锦程数码」品牌
4. **新代码仓库**：统一用 `jingcheng-saas`，与顺为 monorepo 脱钩

---

## 七、派单

| 负责人 | 任务 |
|--------|------|
| 架构师 | P0-01~05 代码修改 + build 验证 |
| 设计师 | 走查小程序/Admin 是否还有「顺为」漏网 |
| 运维 | P2 仅在用户确认新域名后执行 |
