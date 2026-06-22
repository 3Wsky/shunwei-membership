# 顺为小程序 · UI 走查清单（PM 验收版）

> 派单：产品经理 → UX/UI 设计师 | 对照 `MINIAPP_LUXURY_UI_BRIEF.md` v4 | 2026-06-20  
> **P1 代码对齐**：2026-06-20 UX/UI 设计师完成 P-09~P-16（除 P-11 此前已对齐）；真机双端勾选待 PM 验收

## 走查环境

| 项 | 要求 |
|----|------|
| 工具 | 微信开发者工具 + 真机预览（iOS + Android 各 1 台） |
| 编译 | `cd shunwei-app-v2 && npm run build:mp-weixin` |
| 对照 | `styles/tokens.scss` + `MINIAPP_LUXURY_UI_BRIEF.md` |

---

## 一、全局规范（所有页面）

| # | 检查项 | 标准 | iOS | Android | 备注 |
|---|--------|------|:---:|:-------:|------|
| G-01 | 主色基调 | 深色系 + 品牌金 `#C9A227`，无促销红/满减黄 | ☐ | ☐ | |
| G-02 | 卡片圆角 | `24rpx` + 极浅阴影 | ☐ | ☐ | |
| G-03 | 数字展示 | 积分/等级/金额大号粗体 + 金色 | ☐ | ☐ | |
| G-04 | TabBar | 选中色 `#C9A227`，图标清晰 | ☐ | ☐ | |
| G-05 | 空状态 | 插画/引导 + 「去兑换第一件商品吧」类 CTA | ☐ | ☐ | |
| G-06 | 按钮反馈 | 微缩回弹 `hover-class` 生效 | ☐ | ☐ | |
| G-07 | 页面背景 | `#F5F3F0` 暖灰底 | ☐ | ☐ | |

---

## 二、核心页面（P0 · 轻奢 v2.0 已改造）

| # | 页面 | 路径 | 关键检查点 | iOS | Android |
|---|------|------|------------|:---:|:-------:|
| P-01 | 登录 | `pages/login/index` | 深色轻奢主题、一键登录按钮金色 | ☐ | ☐ |
| P-02 | 首页 | `pages/index/index` | 磁吸会员身份条、两列商品卡、会员专属角标 | ☐ | ☐ |
| P-03 | 会员中心 | `pages/member/center` | 档位 SW199/SW299 徽章、到期日清晰 | ☐ | ☐ |
| P-04 | 开通会员 | `pages/member/purchase` | 阶梯权益展示、当前档高亮 | ☐ | ☐ |
| P-05 | 我的 | `pages/user/index` | 数据面板（积分/券/待核销）、菜单卡片分组 | ☐ | ☐ |
| P-06 | 积分总览 | `pages/integral/index` | 余额大号金色、明细列表、过期提醒 | ☐ | ☐ |
| P-07 | 积分商城 | `pages/integral/mall` | 半屏确认弹窗、核销码 QR 光晕卡片 | ☐ | ☐ |
| P-08 | 现金券钱包 | `pages/voucher/wallet` | QR 光晕、金色金额、批次列表 | ☐ | ☐ |

---

## 三、业务页面（P1 · 需对齐 v2.0 风格）

| # | 页面 | 路径 | 关键检查点 | iOS | Android | 优先级 |
|---|------|------|------------|:---:|:-------:|:------:|
| P-09 | 商品列表 | `pages/products/list` | 与首页商品卡风格一致 | ✅ | ☐ | P1 |
| P-10 | 商品详情 | `pages/products/detail` | 图占上半屏、积分价金色、「立即兑换」 | ✅ | ☐ | P1 |
| P-11 | 分类 | `pages/goods_cate/index` | 横向分类 chip + 商品网格、空状态 | ✅ | ☐ | P1 |
| P-12 | 购物车 | `pages/cart/index` | 空态引导「去逛逛」、标签栏三承诺 | ✅ | ☐ | P2 |
| P-13 | 店员工作台 | `pages/staff/workbench` | 扫码入口突出、角色感 | ✅ | ☐ | P1 |
| P-14 | 核销扫码 | `pages/staff/verify` | 扫码框 + 结果反馈清晰 | ✅ | ☐ | P1 |
| P-15 | 发起审批 | `pages/approval/submit` | 档位预览卡片、表单克制 | ✅ | ☐ | P1 |
| P-16 | 审批中心 | `pages/approval/center` | 状态标签色、列表卡片 | ✅ | ☐ | P1 |
| P-17 | 商家核销 | `pages/merchant/verify` | 与店员核销风格统一 | ✅ | ☐ | P2 |
| P-18 | 新客抽奖 | `pages/activity/newcomer-lottery` | 转盘/动效、无廉价促销感 | ✅ | ☐ | P2 |

---

## 四、Tab 栏决策（PM 建议 · 待确认）

| Tab | 当前状态 | PM 建议 | 理由 |
|-----|----------|---------|------|
| 首页 | ✅ 完整 | **保留** | 核心入口 |
| 分类 | ✅ 可浏览商品 | **保留** | 已接 API，与积分兑换主路径不冲突 |
| 购物车 | ⚠️ 仅占位空态 | **MVP 隐藏** ✅ 已确认 | 无加购/结算链路，已从 TabBar 移除（路由保留） |
| 我的 | ✅ 完整 | **保留** | 核心入口 |

> ~~若确认隐藏购物车 Tab，需改 `pages.json` tabBar.list（保留页面路由供后续迭代）。~~ **2026-06-20 用户已确认隐藏，TabBar 现为 首页/分类/我的 三项。**

---

## 五、设计师交付要求

1. 逐页走查上表，**勾选 iOS + Android 双列**
2. 不符合项标注 **截图 + 修改建议**（可直接改代码或列 issue）
3. P1 页面须在 **上线前** 完成对齐；P2 可迭代
4. 走查完成后回复 PM：`kc-mcp-agent-2-ow1obptt`

---

## 六、参考文档

- 设计简报：`docs/MINIAPP_LUXURY_UI_BRIEF.md`
- Design Token：`shunwei-app-v2/styles/tokens.scss`
- Admin 侧审计：`docs/ADMIN_LUXURY_UI_AUDIT.md`
