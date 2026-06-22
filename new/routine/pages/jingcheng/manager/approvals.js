const { request } = require('../../../services/jc-request')

Page({
  data: { list: [], loading: false },
  onLoad() { this.load() },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()) },
  load() {
    this.setData({ loading: true })
    return request('/api/approval/todos', { data: { role: 'manager' } })
      .then((list) => this.setData({ list: list || [] }))
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  },
  review(e) {
    const item = this.data.list[e.currentTarget.dataset.index]
    const action = e.currentTarget.dataset.action
    wx.showModal({
      title: action === 'approve' ? '通过申请' : '驳回申请',
      content: `UID ${item.customerUid}\n${item.matchedTierCode === 'SW299' ? '299会员' : '199会员'} · ${item.matchedIntegral}积分 · ¥${item.matchedVoucher}现金券`,
      editable: true,
      placeholderText: '请输入审批备注（选填）',
      confirmText: action === 'approve' ? '确认通过' : '确认驳回',
      confirmColor: action === 'approve' ? '#B48B16' : '#D44C4C',
      success: (res) => {
        if (!res.confirm) return
        request('/api/approval/review/manager', {
          method: 'POST',
          data: { requestId: item.requestId, action, reason: res.content || '' }
        }).then(() => {
          wx.showToast({ title: action === 'approve' ? '已转交超管终审' : '已驳回', icon: 'success' })
          this.load()
        }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      }
    })
  }
})
