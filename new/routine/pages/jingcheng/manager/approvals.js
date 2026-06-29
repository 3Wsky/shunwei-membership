const { request } = require('../../../services/jc-request')

function rangeText(rule) {
  if (!rule) return ''
  return rule.maxAmount
    ? rule.minAmount + '-' + rule.maxAmount + '元'
    : rule.minAmount + '元以上'
}

function parseProducts(receiptNo) {
  if (!receiptNo) return null
  var s = String(receiptNo).trim()
  if (s.indexOf('[产品') < 0) return null
  
  var parts = s.split(/;\s*(?=\[产品)/)
  var items = []
  parts.forEach(function(part) {
    var m = part.match(/^\[产品\d+\]\s*(.*)$/)
    if (!m) return
    var content = m[1]
    var segments = content.split('/')
    var type = '其他'
    var model = ''
    var price = ''
    var sn = ''
    segments.forEach(function(seg) {
      seg = seg.trim()
      if (['手机', '平板', '电脑', '智能穿戴'].indexOf(seg) >= 0) {
        type = seg
      } else if (seg.indexOf('¥') === 0 || seg.indexOf('￥') === 0) {
        price = seg
      } else if (seg.indexOf('SN:') === 0) {
        sn = seg.substring(3).trim()
      } else if (seg) {
        model = seg
      }
    })
    items.push({ type: type, model: model || '未知型号', price: price || '未知价格', sn: sn })
  })
  return items.length > 0 ? items : null
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
          const productItems = parseProducts(it.receiptNo)
          return Object.assign({}, it, {
            rangeText: rule ? rangeText(rule) : ('￥' + it.consumeAmount + '档'),
            productText: it.receiptNo || '未填写产品信息',
            hasProduct: !!it.receiptNo,
            productItems: productItems
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
