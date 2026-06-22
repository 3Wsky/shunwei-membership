const { request } = require('../../../services/jc-request')

Page({
  data: { member: {}, rules: [], submitting: false },
  onLoad(options) {
    try { this.setData({ member: JSON.parse(decodeURIComponent(options.member || '')) }) } catch (_) {}
    request('/api/approval/tier-options').then((rules) => this.setData({ rules: rules || [] }))
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
  },
  chooseRule(e) {
    if (this.data.submitting) return
    const rule = this.data.rules[e.currentTarget.dataset.index]
    const member = this.data.member
    wx.showModal({
      title: '确认提交申请',
      content: `${member.nickname || '会员'}（UID ${member.uid}）\n${rule.tierCode === 'SW299' ? '299会员' : '199会员'} + ${rule.giftIntegral}积分 + ${rule.voucherAmount}元现金券`,
      confirmText: '提交审批',
      success: (res) => { if (res.confirm) this.submit(rule) }
    })
  },
  submit(rule) {
    this.setData({ submitting: true })
    request('/api/approval/submit', {
      method: 'POST',
      data: { customerUid: this.data.member.uid, tierRuleId: rule.id }
    }).then(() => {
      wx.showToast({ title: '已提交店长审批', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1200)
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  }
})
