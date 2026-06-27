const { request, getToken, BASE_URL } = require('../../../services/jc-request')
const { recogniseSn } = require('../../../services/sn-recognise')

Page({
  data: {
    member: {},
    rules: [],
    submitting: false,
    scanning: false,
    showProduct: false,
    selectedIndex: -1,
    selectedText: '',
    productTypes: ['手机', '平板', '电脑', '智能穿戴'],
    products: [
      {
        type: '手机',
        model: '',
        sn: '',
        imei: '',
        price: ''
      }
    ]
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
      products: [
        {
          type: '手机',
          model: '',
          sn: '',
          imei: '',
          price: ''
        }
      ]
    })
  },
  closeProduct() { if (!this.data.submitting) this.setData({ showProduct: false }) },
  noop() {},
  chooseType(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const type = e.currentTarget.dataset.type
    const products = this.data.products
    products[pIdx].type = type
    this.setData({ products })
  },
  onModel(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const products = this.data.products
    products[pIdx].model = e.detail.value
    this.setData({ products })
  },
  onPrice(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const products = this.data.products
    products[pIdx].price = e.detail.value
    this.setData({ products })
  },
  onSn(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const products = this.data.products
    products[pIdx].sn = e.detail.value
    this.setData({ products })
  },
  onImei(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const products = this.data.products
    products[pIdx].imei = e.detail.value
    this.setData({ products })
  },
  addProduct() {
    const products = this.data.products
    if (products.length >= 5) {
      wx.showToast({ title: '最多添加5个产品', icon: 'none' })
      return
    }
    products.push({
      type: '手机',
      model: '',
      sn: '',
      imei: '',
      price: ''
    })
    this.setData({ products })
  },
  removeProduct(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const products = this.data.products
    if (products.length <= 1) return
    products.splice(idx, 1)
    this.setData({ products })
  },
  scanSn(e) {
    if (this.data.scanning) return
    const pIdx = Number(e.currentTarget.dataset.pindex)
    var that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      camera: 'back',
      success(res) {
        var filePath = res.tempFiles[0].tempFilePath
        that.recogniseSn(filePath, pIdx)
      }
    })
  },
  recogniseSn(filePath, pIdx) {
    var that = this
    var token = getToken()
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); return }
    this.setData({ scanning: true })
    wx.showLoading({ title: '识别中…', mask: true })
    recogniseSn(filePath, token).then(function (d) {
      wx.hideLoading()
      var products = that.data.products
      if (d.sn) products[pIdx].sn = d.sn
      if (d.imei) products[pIdx].imei = d.imei
      if (d.model) products[pIdx].model = d.model
      if (d.brand) {
        var brandMap = { apple: '手机', samsung: '手机', huawei: '手机', xiaomi: '手机', oppo: '手机', vivo: '手机' }
        var lower = String(d.brand).toLowerCase()
        for (var k in brandMap) {
          if (lower.indexOf(k) >= 0) { products[pIdx].type = brandMap[k]; break }
        }
      }
      that.setData({ products: products, scanning: false })
      var tip = d.sn ? '识别成功' : '未识别到SN，请手动输入'
      if (d.source === 'wechat_ocr') tip = d.sn ? '微信OCR识别成功' : '未识别到SN，请手动输入'
      wx.showToast({ title: tip, icon: d.sn ? 'success' : 'none' })
    }).catch(function (err) {
      wx.hideLoading()
      that.setData({ scanning: false })
      wx.showToast({ title: err.message || '识别失败', icon: 'none' })
    })
  },
  submit() {
    if (this.data.submitting) return
    const rule = this.data.rules[this.data.selectedIndex]
    if (!rule) return

    const products = this.data.products
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (!p.model.trim()) {
        wx.showToast({ title: `请填写产品 #${i + 1} 的型号`, icon: 'none' })
        return
      }
      if (!p.price.trim()) {
        wx.showToast({ title: `请填写产品 #${i + 1} 的价格`, icon: 'none' })
        return
      }
    }

    const parts = products.map((p, idx) => {
      const itemParts = []
      if (p.type) itemParts.push(p.type)
      if (p.model) itemParts.push(String(p.model).trim())
      if (p.price) itemParts.push('¥' + String(p.price).trim())
      if (p.sn) itemParts.push('SN:' + String(p.sn).trim())
      if (p.imei) itemParts.push('IMEI:' + String(p.imei).trim())
      return `[产品${idx + 1}] ` + itemParts.join('/')
    })

    let receiptNo = parts.join('; ')
    if (receiptNo.length > 240) receiptNo = receiptNo.slice(0, 240)

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
