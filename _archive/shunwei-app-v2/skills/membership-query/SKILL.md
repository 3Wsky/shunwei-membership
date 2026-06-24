# membership-query · 会员查询

## 能力域

帮助已登录用户查询会员身份、积分余额；帮助所有用户了解 199/299 套餐差异。

## 触发场景

- 「我是不是会员」「我是什么等级」
- 「还有多少积分」「赠送积分多少」
- 「199 和 299 有什么区别」「会员套餐」
- 「现金券余额多少」

## 不适用范围

- 开通/续费会员 → 引导打开小程序页面 `/pages/member/center`
- 积分兑换商品 → 引导 `/pages/integral/mall`
- 现金券核销 → 店员/商家功能，不对普通用户开放

## 前置条件

| 接口 | 登录 |
|------|:----:|
| queryMyMembership | 是 |
| queryMyIntegral | 是 |
| queryMyCashVoucher | 是 |
| queryMembershipPlans | 否 |

登录态：读取 storage 键 `SW_TOKEN`，请求头 `Authori-zation`（注意拼写）。

## 使用顺序

1. 问等级/身份 → `queryMyMembership`
2. 问积分明细 → 先 `queryMyMembership`（含 integral 摘要），不足再 `queryMyIntegral`
3. 问套餐对比 → `queryMembershipPlans`（无需登录）
4. 问现金券 → `queryMyCashVoucher`

## 返回展示

有绑定组件的接口，**必须展示 GUI 卡片**，content 中写「请展示会员卡片」引导渲染。
