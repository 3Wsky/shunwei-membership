const { request } = require('../../../services/jc-request')

Page({
  data: {
    member: {},
    rules: [],
    submitting: false,
    showProduct: false,
    selectedIndex: -1,
    selectedText: '',
    productTypes: ['手机', '电脑', '智能穿戴'],
    productType: '手机',
    productModel: '',
    productPrice: ''
  },
  onLoad(options) {
    try { this.setData({ member: JSON.parse(decodeURIComponent(options.member || '')) }) } catch (_) {}
    request('/api/approval/tier-options').then((rules) => this.setData({ rules: rules || [] }))
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
  },
  openProduct(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const rule = this.data.rules[idx]
    if (!rule) return
    const range = rule.maxAmount
      ? rule.minAmount + '-' + rule.maxAmount + '元档'
      : rule.minAmount + '元以上档'
    this.setData({
      showProduct: true,
      selectedIndex: idx,
      selectedText: range + ' · ' + rule.giftIntegral + '积分 · ¥' + rule.voucherAmount + '现金券',
      productType: '手机',
      productModel: '',
      productPrice: ''
    })
  },
  closeProduct() { if (!this.data.submitting) this.setData({ showProduct: false }) },
  noop() {},
  chooseType(e) { this.setData({ productType: e.currentTarget.dataset.type }) },
  onModel(e) { this.setData({ productModel: e.detail.value }) },
  onPrice(e) { this.setData({ productPrice: e.detail.value }) },
  submit() {
    if (this.data.submitting) return
    const rule = this.data.rules[this.data.selectedIndex]
    if (!rule) return
    const parts = []
    if (this.data.productType) parts.push(this.data.productType)
    if (this.data.productModel) parts.push(String(this.data.productModel).trim())
    if (this.data.productPrice) parts.push('¥' + String(this.data.productPrice).trim())
    let receiptNo = parts.join('/')
    if (receiptNo.length > 64) receiptNo = receiptNo.slice(0, 64)
    this.setData({ submitting: true })
    request('/api/approval/submit', {
      method: 'POST',
      data: { customerUid: this.data.member.uid, tierRuleId: rule.id, receiptNo }
    }).then(() => {
      this.setData({ showProduct: false })
      wx.showToast({ title: '已提交店长审批', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1200)
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  }
})
