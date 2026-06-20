const { request, formatTierLabel, formatExpireText, getToken } = require('../tools/request')

async function queryMyMembership() {
  if (!getToken()) {
    return {
      isError: true,
      content: [{ type: 'text', text: '您尚未登录，请先在小程序内完成微信登录后再查询会员信息。' }]
    }
  }

  try {
    const data = await request('/api/membership/me')
    const integral = data.integral || {}
    const tierLabel = formatTierLabel(data.tierCode)
    const expireAt = data.membershipExpireAt || data.overdueTime || 0

    return {
      isError: false,
      content: [{
        type: 'text',
        text: `已查询到您的会员信息：${tierLabel}，总积分 ${integral.total || 0}。请展示会员卡片。`
      }],
      structuredContent: {
        uid: data.uid,
        nickname: data.nickname || '',
        tierCode: data.tierCode || '',
        tierLabel,
        isMemberActive: !!data.isMemberActive,
        expireAt,
        expireText: formatExpireText(expireAt),
        integralTotal: integral.total || 0,
        giftRemaining: integral.giftRemaining || 0,
        rechargeRemaining: integral.rechargeRemaining || 0
      }
    }
  } catch (err) {
    if (err.message === 'NOT_LOGGED_IN') {
      return {
        isError: true,
        content: [{ type: 'text', text: '登录已过期，请重新打开小程序登录后再查询。' }]
      }
    }
    return {
      isError: true,
      content: [{ type: 'text', text: `查询失败：${err.message || '请稍后重试'}` }]
    }
  }
}

module.exports = queryMyMembership
