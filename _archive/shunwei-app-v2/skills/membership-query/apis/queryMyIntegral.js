const { request, getToken } = require('../tools/request')

async function queryMyIntegral() {
  if (!getToken()) {
    return {
      isError: true,
      content: [{ type: 'text', text: '您尚未登录，请先在小程序内登录后再查询积分。' }]
    }
  }

  try {
    const data = await request('/api/integral/summary')
    return {
      isError: false,
      content: [{
        type: 'text',
        text: `您的总积分为 ${data.total || 0}（赠送 ${data.giftRemaining || 0}，充值 ${data.rechargeRemaining || 0}）。请展示积分卡片。`
      }],
      structuredContent: {
        total: data.total || 0,
        giftRemaining: data.giftRemaining || 0,
        rechargeRemaining: data.rechargeRemaining || 0,
        expiringSoon: data.expiringSoon || 0
      }
    }
  } catch (err) {
    if (err.message === 'NOT_LOGGED_IN') {
      return {
        isError: true,
        content: [{ type: 'text', text: '登录已过期，请重新登录。' }]
      }
    }
    return {
      isError: true,
      content: [{ type: 'text', text: `积分查询失败：${err.message || '请稍后重试'}` }]
    }
  }
}

module.exports = queryMyIntegral
