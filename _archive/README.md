# `_archive/` — 已封存（半成品 / 仅供后期对比）

> 封存日期：2026-06-24 · 操作：资深全栈架构师
>
> 本目录存放**已停用 / 半成品**的代码，**不参与生产**。保留原因：后期做功能对比 / 回溯设计时参考。
> ⛔ 请勿在这些目录上继续开发；生产代码见仓库根目录的 `new/routine`、`CMB/shunwei-api`、`fzlsaas-admin`。

---

## 当前生产架构（对照用）

| 角色 | 生产目录 | 说明 |
|---|---|---|
| 小程序（已上线） | `new/routine` | 原生微信小程序（锦程 jingcheng），2026-06-23 起投入生产 |
| 业务后端 | `CMB/shunwei-api` | Node + Fastify + MySQL，30+ 路由，routine 全部接口对接它 |
| 管理后台 | `fzlsaas-admin` | Vue3 + Vite + Element Plus，业务完整版（政企轻奢 UI）|

---

## 已封存清单

### 1. `_archive/shunwei-app-v2/` — VUE3 版会员小程序（半成品）

- **技术栈**：uni-app (Vue3 + Pinia)，原计划的"重构方案甲"。
- **状态**：==半成品，未完成改造==。为紧急上线改用了原生 `new/routine`，本工程被取代。
- **可用部分**：主要是早期的"新客抽奖"等页面设计；生产用的抽奖在 `new/routine/pages/goods/lottery` 里，**不依赖本工程**。
- **页面**：24 个 `.vue`（首页/商品/会员/积分/现金券/商家/店员/审批/抽奖等），可作 routine 功能对比参照。
- **封存方式**：整目录从根目录 `git mv` 到此（保留 git 历史 + node_modules 等），未删任何代码。

### 2. DEVIN 版 `fzlsaas-admin` 重设计（半成品，未拉到本地）

- **位置**：未落本地工作区；保留在 GitHub 远端分支：
  - `origin/main`（含 6 个 devin PR 合集）
  - `origin/devin/1781948237-ui-redesign`、`.../1781949576-admin-empty-states`、`.../1781953579-admin-csv-export`、`.../1781950527-miniapp-countup`、`.../1781950880-miniapp-anim-polish`、`.../1781954731-admin-lottery-console`
- **状态**：==换肤 + 空状态/CSV 导出，但删/缺多个业务页==（会员套餐 plans、积分商城 orders、系统设置 settings、会员/店员详情抽屉等）。属半成品，==不并入生产==（合并会丢业务页）。
- **后期对比方式**：需要时 `git diff main origin/main -- fzlsaas-admin/src` 或 `git checkout origin/devin/...` 看具体改动。

---

## 线上 ↔ 本地差异速查（2026-06-24 核对，origin/main = `c42644b`）

| 区域 | 线上 origin/main | 本地 main / `feat/routine-launch` |
|---|:--:|:--:|
| `new/routine` 小程序 | ❌ 无 | ✅ 1106 文件（完整生产）|
| 后端 `CMB/shunwei-api` | ⚠️ 仅初始版（devin 未碰后端）| ✅ 完整 30+ 路由 |
| `fzlsaas-admin` | devin 换肤但缺业务页 | ✅ 业务完整 |
| `shunwei-app-v2`(VUE3) | devin 动效版 | 半成品（已封存到本目录）|

> 完整状态见 `docs/PROGRESS_AND_LAUNCH_CHECKLIST.md` 顶部「🧭 仓库状态快照」。
