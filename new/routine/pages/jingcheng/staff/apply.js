const { request, getToken, BASE_URL } = require('../../../services/jc-request')
const { recogniseSn } = require('../../../services/sn-recognise')
const { OCR_SN_SCAN_ENABLED } = require('../../../services/feature-flags')

Page({
  data: {
    ocrEnabled: OCR_SN_SCAN_ENABLED,
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
        price: '',
        verified: false,
        checking: false
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
          price: '',
          verified: false,
          checking: false
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
    products[pIdx].verified = false
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
    products[pIdx].verified = false
    this.setData({ products })
  },
  onImei(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const products = this.data.products
    products[pIdx].imei = e.detail.value
    products[pIdx].verified = false
    this.setData({ products })
  },
  // 手动输入完 IMEI/SN 失焦时，自动对照产品库核对并回填型号
  onCodeBlur(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const product = this.data.products[pIdx]
    if (!product) return
    const imei = product.type === '手机' ? String(product.imei || '').trim() : ''
    const sn = product.type !== '手机' ? String(product.sn || '').trim() : ''
    if (!imei && !sn) return
    if (product.verified) return
    this.verifyCode(pIdx, { imei, sn, silent: true })
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
      price: '',
      verified: false,
      checking: false
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
    if (!this.data.ocrEnabled) return
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
      var products = that.data.products
      // 先按品牌推断类型（手机品牌→手机），决定后续按 IMEI1 还是 SN 核对
      if (d.brand) {
        var brandMap = { apple: '手机', samsung: '手机', huawei: '手机', xiaomi: '手机', oppo: '手机', vivo: '手机', honor: '手机', 'oneplus': '手机', realme: '手机' }
        var lower = String(d.brand).toLowerCase()
        for (var k in brandMap) {
          if (lower.indexOf(k) >= 0) { products[pIdx].type = brandMap[k]; break }
        }
      }
      var isPhone = products[pIdx].type === '手机'
      // 手机只认 IMEI1；非手机用 SN
      if (isPhone) {
        if (d.imei) products[pIdx].imei = d.imei
      } else {
        if (d.sn) products[pIdx].sn = d.sn
      }
      if (d.model && !products[pIdx].model) products[pIdx].model = d.model
      products[pIdx].verified = false
      that.setData({ products: products })

      var imei = isPhone ? String(products[pIdx].imei || '').trim() : ''
      var sn = isPhone ? '' : String(products[pIdx].sn || '').trim()

      if (!imei && !sn) {
        wx.hideLoading()
        that.setData({ scanning: false })
        wx.showToast({ title: isPhone ? '未识别到 IMEI，请手动输入' : '未识别到 SN，请手动输入', icon: 'none' })
        return
      }

      // 识别到码 → 对照产品库核对（IMEI1 优先、SN 兜底）
      that.verifyCode(pIdx, { imei: imei, sn: sn, fromScan: true })
    }).catch(function (err) {
      wx.hideLoading()
      that.setData({ scanning: false })
      wx.showToast({ title: err.message || '识别失败', icon: 'none' })
    })
  },
  /**
   * 对照后台产品库核对标识码：IMEI1 优先、SN 兜底。
   * 命中 → 自动回填型号/价格、标记 verified；
   * 未命中 → 提示「暂未找到该IMEI/SN码 请重新核对 或者手动输入」。
   * opts: { imei, sn, fromScan, silent }
   */
  verifyCode(pIdx, opts) {
    var that = this
    opts = opts || {}
    var imei = String(opts.imei || '').trim()
    var sn = String(opts.sn || '').trim()
    if (!imei && !sn) return

    var products = that.data.products
    products[pIdx].checking = true
    that.setData({ products: products })
    if (!opts.silent) wx.showLoading({ title: '核对中…', mask: true })

    var query = {}
    if (imei) query.imei = imei
    if (sn) query.sn = sn

    request('/api/staff/sn-lookup', { data: query }).then(function (r) {
      wx.hideLoading()
      var list = that.data.products
      list[pIdx].checking = false
      // 防重复①：该码已被其它单用过 → 拦截，不允许用于本次申请
      if (r && r.used) {
        list[pIdx].verified = false
        that.setData({ products: list, scanning: false })
        wx.showModal({
          title: '该码已被使用',
          content: '该 IMEI/SN 已被使用过，不能重复申请权益，请核对设备。',
          showCancel: false,
          confirmText: '我知道了'
        })
        return
      }
      if (r && r.found) {
        if (r.model) list[pIdx].model = r.model
        if (r.price > 0) list[pIdx].price = String(r.price)
        list[pIdx].verified = true
        that.setData({ products: list, scanning: false })
        wx.showToast({ title: '已核对并匹配产品', icon: 'success' })
      } else {
        list[pIdx].verified = false
        that.setData({ products: list, scanning: false })
        wx.showModal({
          title: '未找到该码',
          content: '暂未找到该 IMEI/SN 码，请重新核对或手动输入',
          showCancel: false,
          confirmText: '我知道了'
        })
      }
    }).catch(function () {
      wx.hideLoading()
      var list = that.data.products
      list[pIdx].checking = false
      list[pIdx].verified = false
      that.setData({ products: list, scanning: false })
      if (!opts.silent) wx.showToast({ title: '核对失败，请重试', icon: 'none' })
    })
  },
  submit() {
    if (this.data.submitting) return
    const rule = this.data.rules[this.data.selectedIndex]
    if (!rule) return

    const products = this.data.products
    let unverifiedCount = 0
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
      const isPhone = p.type === '手机'
      const code = isPhone ? String(p.imei || '').trim() : String(p.sn || '').trim()
      if (!code) {
        const tip = isPhone ? `请填写产品 #${i + 1} 的 IMEI 码` : `请填写产品 #${i + 1} 的 SN 码`
        wx.showToast({ title: tip, icon: 'none' })
        return
      }
      if (!p.verified) unverifiedCount++
    }

    // 有未核对（产品库未命中）的码 → 提示，让店员选择重新核对或坚持提交
    if (unverifiedCount > 0) {
      this.confirmUnverifiedThenSubmit(products, rule)
      return
    }
    this.doSubmit(products, rule)
  },
  confirmUnverifiedThenSubmit(products, rule) {
    const that = this
    wx.showModal({
      title: '部分码未核对通过',
      content: '有 ' + (function () {
        var n = 0
        products.forEach(function (p) { if (!p.verified) n++ })
        return n
      })() + ' 件产品的 IMEI/SN 未在产品库匹配到。建议重新核对；若坚持提交，将转为人工审核。',
      cancelText: '返回核对',
      confirmText: '坚持提交',
      success(res) {
        if (res.confirm) that.doSubmit(products, rule)
      }
    })
  },
  doSubmit(products, rule) {
    const parts = products.map((p, idx) => {
      const itemParts = []
      if (p.type) itemParts.push(p.type)
      if (p.model) itemParts.push(String(p.model).trim())
      if (p.price) itemParts.push('¥' + String(p.price).trim())
      const isPhone = p.type === '手机'
      const imei1 = String(p.imei || '').trim()
      const sn = String(p.sn || '').trim()
      // 手机只录 IMEI1；非手机录 SN（后台按 SN 录入）
      if (isPhone && imei1) {
        itemParts.push('IMEI:' + imei1)
      } else if (!isPhone && sn) {
        itemParts.push('SN:' + sn)
      }
      return `[产品${idx + 1}] ` + itemParts.join('/')
    })

    let receiptNo = parts.join('; ')
    if (receiptNo.length > 240) receiptNo = receiptNo.slice(0, 240)

    const consumeAmount = products.reduce((sum, p) => {
      const v = parseFloat(String(p.price).replace(/[^\d.]/g, ''))
      return sum + (isNaN(v) ? 0 : v)
    }, 0)

    this.setData({ submitting: true })
    request('/api/approval/submit', {
      method: 'POST',
      data: { customerUid: this.data.member.uid, tierRuleId: rule.id, consumeAmount, receiptNo }
    }).then(() => {
      this.setData({ showProduct: false })
      wx.showToast({ title: '已提交店长审批', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1200)
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  }
})
