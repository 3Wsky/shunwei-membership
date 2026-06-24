const { request, getToken } = require('../tools/request')

async function queryMyCashVoucher() {
  if (!getToken()) {
    return {
      isError: true,
      content: [{ type: 'text', text: '您尚未登录，请先在小程序内登录后再查询现金券余额。' }]
    }
  }

  try {
    const data = await request('/api/cash-voucher/wallet')
    return {
      isError: false,
      content: [{
        type: 'text',
        text: `您的现金券余额为 ¥${data.balance || 0}。请展示现金券卡片。`
      }],
      structuredContent: {
        balance: data.balance || 0,
        batchCount: data.batchCount || 0,
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
      content: [{ type: 'text', text: `现金券查询失败：${err.message || '请稍后重试'}` }]
    }
  }
}

module.exports = queryMyCashVoucher
