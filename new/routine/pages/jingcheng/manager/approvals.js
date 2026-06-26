const { request } = require('../../../services/jc-request')

function rangeText(rule) {
  if (!rule) return ''
  return rule.maxAmount
    ? rule.minAmount + '-' + rule.maxAmount + '元'
    : rule.minAmount + '元以上'
}

Page({
  data: { list: [], loading: false },
  onLoad() { this.boot() },
  onPullDownRefresh() { this.boot().finally(() => wx.stopPullDownRefresh()) },
  boot() {
    return request('/api/approval/tier-options').then((rules) => {
      this._ruleMap = {}
      ;(rules || []).forEach((r) => { this._ruleMap[Number(r.minAmount)] = r })
    }).catch(() => { this._ruleMap = {} }).then(() => this.load())
  },
  load() {
    this.setData({ loading: true })
    return request('/api/approval/todos', { data: { role: 'manager' } })
      .then((list) => {
        const map = this._ruleMap || {}
        const items = (list || []).map((it) => {
          const rule = map[Number(it.consumeAmount)]
          return Object.assign({}, it, {
            rangeText: rule ? rangeText(rule) : ('￥' + it.consumeAmount + '档'),
            productText: it.receiptNo || '未填写产品信息',
            hasProduct: !!it.receiptNo
          })
        })
        this.setData({ list: items })
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  },
  review(e) {
    const item = this.data.list[e.currentTarget.dataset.index]
    const action = e.currentTarget.dataset.action
    wx.showModal({
      title: action === 'approve' ? '通过申请' : '驳回申请',
      content: `会员：${item.customerName || 'UID ' + item.customerUid} · ${item.rangeText}\n申请人：${item.clerkName || 'UID ' + item.clerkUid}\n${item.matchedIntegral}积分 + ¥${item.matchedVoucher}现金券`,
      editable: true,
      placeholderText: '请输入审批备注（选填）',
      confirmText: action === 'approve' ? '确认通过' : '确认驳回',
      confirmColor: action === 'approve' ? '#2F6BEA' : '#E34D59',
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
