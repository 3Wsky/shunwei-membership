const { request, getToken, BASE_URL } = require('../../../services/jc-request')

Page({
  data: {
    member: {},
    rules: [],
    submitting: false,
    scanning: false,
    showProduct: false,
    selectedIndex: -1,
    selectedText: '',
    productTypes: ['手机', '电脑', '智能穿戴'],
    productType: '手机',
    productModel: '',
    productPrice: '',
    productSn: '',
    productImei: ''
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
  onSn(e) { this.setData({ productSn: e.detail.value }) },
  onImei(e) { this.setData({ productImei: e.detail.value }) },
  scanSn() {
    if (this.data.scanning) return
    var that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success(res) {
        var filePath = res.tempFiles[0].tempFilePath
        that.recogniseSn(filePath)
      }
    })
  },
  recogniseSn(filePath) {
    var that = this
    var token = getToken()
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); return }
    this.setData({ scanning: true })
    wx.showLoading({ title: '识别中…', mask: true })
    wx.uploadFile({
      url: BASE_URL + '/api/staff/scan-sn',
      filePath: filePath,
      name: 'file',
      header: { 'Authori-zation': 'Bearer ' + token, 'Form-type': 'routine' },
      success(res) {
        wx.hideLoading()
        try {
          var body = JSON.parse(res.data)
          if (body.status === 200 && body.data) {
            var d = body.data
            var updates = { scanning: false }
            if (d.sn) updates.productSn = d.sn
            if (d.imei) updates.productImei = d.imei
            if (d.model) updates.productModel = d.model
            if (d.brand) {
              var brandMap = { apple: '手机', samsung: '手机', huawei: '手机', xiaomi: '手机', oppo: '手机', vivo: '手机' }
              var lower = String(d.brand).toLowerCase()
              for (var k in brandMap) {
                if (lower.indexOf(k) >= 0) { updates.productType = brandMap[k]; break }
              }
            }
            that.setData(updates)
            wx.showToast({ title: d.sn ? '识别成功' : '未识别到SN，请手动输入', icon: d.sn ? 'success' : 'none' })
          } else {
            that.setData({ scanning: false })
            wx.showToast({ title: body.msg || '识别失败', icon: 'none' })
          }
        } catch (e) {
          that.setData({ scanning: false })
          wx.showToast({ title: '识别异常', icon: 'none' })
        }
      },
      fail() {
        wx.hideLoading()
        that.setData({ scanning: false })
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    })
  },
  submit() {
    if (this.data.submitting) return
    const rule = this.data.rules[this.data.selectedIndex]
    if (!rule) return
    const parts = []
    if (this.data.productType) parts.push(this.data.productType)
    if (this.data.productModel) parts.push(String(this.data.productModel).trim())
    if (this.data.productPrice) parts.push('¥' + String(this.data.productPrice).trim())
    if (this.data.productSn) parts.push('SN:' + String(this.data.productSn).trim())
    let receiptNo = parts.join('/')
    if (receiptNo.length > 120) receiptNo = receiptNo.slice(0, 120)
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
