const { request } = require('../tools/request')

async function queryMembershipPlans() {
  try {
    const plans = await request('/api/membership/plans')
    const list = (plans || []).map((p) => ({
      tierCode: p.tierCode || '',
      title: p.title || '',
      price: p.price || 0,
      giftIntegral: p.giftIntegral || 0,
      vipDays: p.vipDays || 365
    }))

    return {
      isError: false,
      content: [{
        type: 'text',
        text: `共 ${list.length} 档会员套餐。请展示套餐对比卡片，帮助用户了解 199 与 299 的区别。`
      }],
      structuredContent: { plans: list }
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `套餐查询失败：${err.message || '请稍后重试'}` }]
    }
  }
}

module.exports = queryMembershipPlans
