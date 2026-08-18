const { request, getToken, BASE_URL } = require('../../../services/jc-request')
const { recogniseSn } = require('../../../services/sn-recognise')
const { OCR_SN_SCAN_ENABLED } = require('../../../services/feature-flags')

function toPrice(value) {
  const amount = Number(String(value || '').replace(/[^\d.]/g, ''))
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function tierRangeText(rule) {
  if (!rule) return ''
  if (rule.title) return rule.title
  return rule.maxAmount ? rule.minAmount + '-' + rule.maxAmount + '元档' : rule.minAmount + '元以上档'
}

const CUSTOM_INTEGRAL_MAX = 1000000

function buildReceiptNo(products) {
  const parts = products.map((p, idx) => {
    const itemParts = []
    if (p.type) itemParts.push(p.type)
    if (p.model) itemParts.push(String(p.model).trim())
    const actualPrice = toPrice(p.catalogPrice) || toPrice(p.price)
    if (actualPrice) itemParts.push('¥' + actualPrice)
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
  return receiptNo
}

Page({
  data: {
    ocrEnabled: OCR_SN_SCAN_ENABLED,
    member: {},
    rules: [],
    program: { mode: 'pura90_42w' },
    submitting: false,
    scanning: false,
    showProduct: false,
    selectedIndex: -1,
    selectedText: '',
    customMode: false,
    customIntegral: '',
    productTypes: ['手机'],
    products: [
      {
        type: '手机',
        model: '',
        sn: '',
        imei: '',
        price: '',
        catalogPrice: 0,
        verified: false,
        checking: false
      }
    ]
  },
  onLoad(options) {
    try { this.setData({ member: JSON.parse(decodeURIComponent(options.member || '')) }) } catch (_) {}
    request('/api/approval/program').then((program) => {
      const nextProgram = program || { mode: 'pura90_42w' }
      const isLegacy = nextProgram.mode === 'legacy_consumption'
      const products = isLegacy ? this.data.products : this.data.products.map((product) => Object.assign({}, product, {
        type: '手机',
        sn: ''
      }))
      this.setData({
        program: nextProgram,
        productTypes: isLegacy ? ['手机', '平板', '电脑', '智能穿戴'] : ['手机'],
        products
      })
    })
      .catch(() => {})
    request('/api/approval/tier-options').then((rules) => this.setData({ rules: rules || [] }))
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
  },
  openProduct(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const rule = this.data.rules[idx]
    if (!rule) return
    const range = rule.title || (rule.maxAmount
      ? rule.minAmount + '-' + rule.maxAmount + '元档'
      : rule.minAmount + '元以上档')
    this.setData({
      showProduct: true,
      submitting: false,
      customMode: false,
      customIntegral: '',
      selectedIndex: idx,
      selectedText: this.data.program.mode === 'legacy_consumption'
        ? range + ' · ' + rule.giftIntegral + '积分 · ¥' + rule.voucherAmount + '现金券'
        : range + ' · 审批通过赠送 ' + rule.giftIntegral + '积分',
      products: [
        {
          type: '手机',
          model: '',
          sn: '',
          imei: '',
          price: '',
          catalogPrice: 0,
          verified: false,
          checking: false
        }
      ]
    })
  },
  closeProduct() { if (!this.data.submitting) this.setData({ showProduct: false }) },
  noop() {},
  // 自定义积分申请：产品四类全开、积分数店员手填、不参与档位匹配
  openCustom() {
    this.setData({
      showProduct: true,
      submitting: false,
      customMode: true,
      customIntegral: '',
      selectedIndex: -1,
      selectedText: '申请礼赠 · 终审通过后礼遇积分到账',
      products: [
        {
          type: '手机',
          model: '',
          sn: '',
          imei: '',
          price: '',
          catalogPrice: 0,
          verified: false,
          checking: false
        }
      ]
    })
  },
  onCustomIntegral(e) { this.setData({ customIntegral: e.detail.value }) },
  chooseType(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const type = e.currentTarget.dataset.type
    if (!this.data.customMode && this.data.program.mode !== 'legacy_consumption' && type !== '手机') return
    const products = this.data.products
    products[pIdx].type = type
    products[pIdx].verified = false
    products[pIdx].catalogPrice = 0
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
    products[pIdx].catalogPrice = 0
    this.setData({ products })
  },
  onSn(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const products = this.data.products
    products[pIdx].sn = e.detail.value
    products[pIdx].verified = false
    products[pIdx].catalogPrice = 0
    this.setData({ products })
  },
  onImei(e) {
    const pIdx = Number(e.currentTarget.dataset.pindex)
    const products = this.data.products
    products[pIdx].imei = e.detail.value
    products[pIdx].verified = false
    products[pIdx].catalogPrice = 0
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
    if (this.data.program.mode !== 'legacy_consumption' && !this.data.customMode) return
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
      catalogPrice: 0,
      verified: false,
      checking: false
    })
    this.setData({ products })
  },
  removeProduct(e) {
    if (this.data.program.mode !== 'legacy_consumption' && !this.data.customMode) return
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
      // 拍照仅识别标识码：手机只认 IMEI1；非手机用 SN。型号价格一律店员手动填写，不再从识别结果回填。
      if (isPhone) {
        if (d.imei) products[pIdx].imei = d.imei
      } else {
        if (d.sn) products[pIdx].sn = d.sn
      }
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
   * 作用仅为「防重复(一码一次) + 防别人家的码」，命中不再回填型号/价格（型号价格一律店员手动录入）。
   * 命中 → 仅标记 verified（绿标"已核对"）；
   * 已用过 → 拦截，提示不能重复申请；
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

    return request('/api/staff/sn-lookup', { data: query }).then(function (r) {
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
        return { found: !!(r && r.found), used: true }
      }
      if (r && r.found) {
        // 命中仅作核对（防别人家的码）：标记已核对，不回填型号/价格，型号价格由店员手动填写
        list[pIdx].verified = true
        const catalogPrice = toPrice(r.price)
        if (catalogPrice > 0) {
          list[pIdx].catalogPrice = catalogPrice
          list[pIdx].price = String(catalogPrice)
        }
        that.setData({ products: list, scanning: false })
        if (catalogPrice > 0) {
          wx.showToast({ title: '已核对，已锁定产品库价格', icon: 'none' })
        } else {
          wx.showToast({ title: '已核对（请手动填写型号价格）', icon: 'none' })
        }
        return { found: true, used: false }
      } else {
        list[pIdx].verified = false
        that.setData({ products: list, scanning: false })
        wx.showModal({
          title: '未找到该码',
          content: '暂未找到该 IMEI/SN 码，请重新核对或手动输入',
          showCancel: false,
          confirmText: '我知道了'
        })
        return { found: false, used: false }
      }
    }).catch(function (err) {
      wx.hideLoading()
      var list = that.data.products
      list[pIdx].checking = false
      list[pIdx].verified = false
      that.setData({ products: list, scanning: false })
      if (!opts.silent) wx.showToast({ title: (err && err.message) || '核对失败，请重试', icon: 'none' })
      return { found: false, used: false, error: err }
    })
  },
  submit() {
    if (this.data.submitting) {
      wx.showToast({ title: '正在提交，请稍候', icon: 'none' })
      return
    }
    if (this.data.customMode) {
      this.submitCustom()
      return
    }
    const rule = this.data.rules[this.data.selectedIndex]
    if (!rule) {
      wx.showToast({ title: '审批档位未加载，请退出重进', icon: 'none' })
      return
    }

    const products = this.data.products
    let unverifiedCount = 0
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (!String(p.model || '').trim()) {
        wx.showToast({ title: `请填写产品 #${i + 1} 的型号`, icon: 'none' })
        return
      }
      if (!String(p.price || '').trim()) {
        wx.showToast({ title: `请填写产品 #${i + 1} 的价格`, icon: 'none' })
        return
      }
      if (p.checking) {
        wx.showToast({ title: '正在核对 IMEI，请稍候', icon: 'none' })
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

    // Pura 90 后端要求产品库必须命中；点击提交时主动再核对一次，
    // 解决管理员刚补录串码后，当前页面仍保留旧的“未核对”状态而无法提交的问题。
    if (unverifiedCount > 0) {
      if (this.data.program.mode === 'pura90_42w') {
        const pIdx = products.findIndex((p) => !p.verified)
        const product = products[pIdx]
        const imei = String(product && product.imei || '').trim()
        this.verifyCode(pIdx, { imei, silent: false }).then((result) => {
          if (result && result.found && !result.used) {
            setTimeout(() => this.submit(), 0)
          }
        })
        return
      }
      this.confirmUnverifiedThenSubmit(products, rule)
      return
    }
    this.confirmTierThenSubmit(products, rule)
  },
  // 自定义积分：所有码必须产品库命中（无「坚持提交」兜底），积分为 1~100 万整数
  submitCustom() {
    const products = this.data.products
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (!String(p.model || '').trim()) {
        wx.showToast({ title: `请填写产品 #${i + 1} 的型号`, icon: 'none' })
        return
      }
      if (!String(p.price || '').trim()) {
        wx.showToast({ title: `请填写产品 #${i + 1} 的价格`, icon: 'none' })
        return
      }
      if (p.checking) {
        wx.showToast({ title: '正在核对 IMEI/SN，请稍候', icon: 'none' })
        return
      }
      const isPhone = p.type === '手机'
      const code = isPhone ? String(p.imei || '').trim() : String(p.sn || '').trim()
      if (!code) {
        wx.showToast({ title: isPhone ? `请填写产品 #${i + 1} 的 IMEI 码` : `请填写产品 #${i + 1} 的 SN 码`, icon: 'none' })
        return
      }
    }

    const integralText = String(this.data.customIntegral || '').trim()
    const integral = Number(integralText)
    if (!/^\d+$/.test(integralText) || integral < 1 || integral > CUSTOM_INTEGRAL_MAX) {
      wx.showToast({ title: '礼赠积分需为 1-1000000 的整数', icon: 'none' })
      return
    }

    // 未核对的先自动核对一次：命中且未被用过就继续提交，否则由核对弹窗拦截
    const pIdx = products.findIndex((p) => !p.verified)
    if (pIdx >= 0) {
      const product = products[pIdx]
      const isPhone = product.type === '手机'
      this.verifyCode(pIdx, {
        imei: isPhone ? String(product.imei || '').trim() : '',
        sn: isPhone ? '' : String(product.sn || '').trim(),
        silent: false
      }).then((result) => {
        if (result && result.found && !result.used) {
          setTimeout(() => this.submit(), 0)
        }
      })
      return
    }

    this.doSubmitCustom(products, integral)
  },
  doSubmitCustom(products, integral) {
    if (this.data.submitting) {
      wx.showToast({ title: '正在提交，请稍候', icon: 'none' })
      return
    }
    const consumeAmount = products.reduce((sum, product) => {
      return sum + (toPrice(product.catalogPrice) || toPrice(product.price))
    }, 0)
    const receiptNo = buildReceiptNo(products)

    this.setData({ submitting: true })
    wx.showLoading({ title: '正在提交…', mask: true })

    const finishSubmit = () => {
      if (this._submitTimeout) {
        clearTimeout(this._submitTimeout)
        this._submitTimeout = null
      }
      wx.hideLoading()
      this.setData({ submitting: false })
    }
    this._submitTimeout = setTimeout(() => {
      if (!this.data.submitting) return
      finishSubmit()
      wx.showModal({
        title: '提交超时',
        content: '网络响应超时，请检查网络后重新提交。',
        showCancel: false,
        confirmText: '我知道了'
      })
    }, 22000)

    request('/api/approval/submit', {
      method: 'POST',
      data: { customerUid: this.data.member.uid, customIntegral: integral, consumeAmount, receiptNo }
    }).then(() => {
      finishSubmit()
      this.setData({ showProduct: false })
      wx.showToast({ title: '已提交店长审批', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1200)
    }).catch((err) => {
      finishSubmit()
      wx.showModal({
        title: '提交失败',
        content: (err && err.message) || '提交失败，请重试',
        showCancel: false,
        confirmText: '重新检查'
      })
    })
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
        if (res.confirm) that.confirmTierThenSubmit(products, rule)
      }
    })
  },
  matchTierRule(amount) {
    const value = Number(amount || 0)
    return (this.data.rules || []).find((item) => {
      const min = Number(item.minAmount || 0)
      const max = Number(item.maxAmount || 0)
      return value >= min && (!max || value <= max)
    }) || null
  },
  confirmTierThenSubmit(products, selectedRule) {
    const consumeAmount = products.reduce((sum, product) => {
      return sum + (toPrice(product.catalogPrice) || toPrice(product.price))
    }, 0)
    const matchedRule = this.matchTierRule(consumeAmount)
    if (!matchedRule) {
      wx.showModal({
        title: '未匹配到权益档位',
        content: '核实后的产品总价为 ¥' + consumeAmount + '，不在当前任何权益档位范围内，请联系管理员检查档位配置。',
        showCancel: false,
        confirmText: '返回修改'
      })
      return
    }
    // 兼容数字档位 ID 和 Pura 90 的字符串档位 ID。
    // 原先统一 Number() 会把 PURA90_42W 变成 NaN，而 NaN !== NaN 永远成立，
    // 导致同一个 Pura 90 档位也被误判为“档位已修正”，无法走正常提交路径。
    if (String(matchedRule.id) !== String(selectedRule.id)) {
      const lockedCount = products.filter((product) => toPrice(product.catalogPrice) > 0).length
      wx.showModal({
        title: '权益档位已修正',
        content: '产品核实总价 ¥' + consumeAmount + '，应使用“' + tierRangeText(matchedRule) + '”。现金券将由 ¥' + selectedRule.voucherAmount + ' 调整为 ¥' + matchedRule.voucherAmount + '，积分同步按正确档位发放。' + (lockedCount ? '\n已核对产品已按产品库价格计算。' : ''),
        cancelText: '返回修改',
        confirmText: '按正确档位提交',
        success: (res) => {
          if (res.confirm) this.doSubmit(products, matchedRule, consumeAmount)
        }
      })
      return
    }
    this.doSubmit(products, matchedRule, consumeAmount)
  },
  doSubmit(products, rule, consumeAmount) {
    if (this.data.submitting) {
      wx.showToast({ title: '正在提交，请稍候', icon: 'none' })
      return
    }
    const receiptNo = buildReceiptNo(products)

    this.setData({ submitting: true })
    wx.showLoading({ title: '正在提交…', mask: true })

    const finishSubmit = () => {
      if (this._submitTimeout) {
        clearTimeout(this._submitTimeout)
        this._submitTimeout = null
      }
      wx.hideLoading()
      this.setData({ submitting: false })
    }
    this._submitTimeout = setTimeout(() => {
      if (!this.data.submitting) return
      finishSubmit()
      wx.showModal({
        title: '提交超时',
        content: '网络响应超时，请检查网络后重新提交。',
        showCancel: false,
        confirmText: '我知道了'
      })
    }, 22000)

    request('/api/approval/submit', {
      method: 'POST',
      data: { customerUid: this.data.member.uid, tierRuleId: rule.id, consumeAmount, receiptNo }
    }).then((result) => {
      finishSubmit()
      this.setData({ showProduct: false })
      const done = () => {
        wx.showToast({ title: '已提交店长审批', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1200)
      }
      if (result && result.corrected) {
        wx.showModal({
          title: '已按核实价格修正',
          content: '后端已按产品库核实总价 ¥' + result.effectiveAmount + ' 重新匹配权益档位，最终发放金额以正确档位为准。',
          showCancel: false,
          confirmText: '我知道了',
          success: done
        })
      } else {
        done()
      }
    }).catch((err) => {
      finishSubmit()
      wx.showModal({
        title: '提交失败',
        content: (err && err.message) || '提交失败，请重试',
        showCancel: false,
        confirmText: '重新检查'
      })
    })
  }
})
