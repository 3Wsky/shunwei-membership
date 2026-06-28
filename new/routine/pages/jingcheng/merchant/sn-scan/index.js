const { request, getToken, openWechatReauth } = require('../../../../services/jc-request')
const { recogniseSn } = require('../../../../services/sn-recognise')
const { OCR_SN_SCAN_ENABLED } = require('../../../../services/feature-flags')

Page({
  data: {
    ocrEnabled: OCR_SN_SCAN_ENABLED,
    scanning: false,
    form: { sn: '', brand: '', model: '' },
    orderId: '',
    history: []
  },
  onShow: function () { this.loadHistory() },
  editSn: function (e) {
    this.setData({ 'form.sn': e.detail.value })
  },
  editBrand: function (e) {
    this.setData({ 'form.brand': e.detail.value })
  },
  editModel: function (e) {
    this.setData({ 'form.model': e.detail.value })
  },
  editOrder: function (e) {
    this.setData({ orderId: e.detail.value })
  },
  takePhoto: function () {
    if (!this.data.ocrEnabled) return
    if (this.data.scanning) return
    var that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      camera: 'back',
      success: function (res) {
        var tempPath = res.tempFiles[0].tempFilePath
        that.recognise(tempPath)
      }
    })
  },
  recognise: function (filePath) {
    var that = this
    var token = getToken()
    if (!token) { openWechatReauth(); return }

    this.setData({ scanning: true })
    wx.showLoading({ title: '识别中…', mask: true })

    recogniseSn(filePath, token).then(function (data) {
      wx.hideLoading()
      that.setData({
        form: {
          sn: data.sn || '',
          brand: data.brand || '',
          model: data.model || ''
        },
        scanning: false
      })
      if (data.sn) {
        wx.showToast({ title: data.source === 'wechat_ocr' ? '微信OCR识别成功' : '识别成功', icon: 'success' })
      } else {
        wx.showToast({ title: '未识别到SN码，请手动输入', icon: 'none' })
      }
    }).catch(function (err) {
      wx.hideLoading()
      that.setData({ scanning: false })
      wx.showModal({ title: '识别失败', content: err.message || '请重试', showCancel: false })
    })
  },
  bindSn: function () {
    var form = this.data.form
    if (!form || !form.sn || !String(form.sn).trim()) {
      return wx.showToast({ title: '请先输入 SN 码', icon: 'none' })
    }
    var that = this
    wx.showLoading({ title: '绑定中…', mask: true })
    request('/api/staff/sn-binding', {
      method: 'POST',
      data: {
        snCode: String(form.sn).trim(),
        brand: form.brand || '',
        model: form.model || '',
        orderId: that.data.orderId || '',
        source: that.data.ocrEnabled ? 'scan' : 'manual'
      }
    }).then(function () {
      wx.hideLoading()
      wx.showToast({ title: '绑定成功', icon: 'success' })
      that.setData({ form: { sn: '', brand: '', model: '' }, orderId: '' })
      that.loadHistory()
    }).catch(function (err) {
      wx.hideLoading()
      wx.showModal({ title: '绑定失败', content: err.message || '请重试', showCancel: false })
    })
  },
  loadHistory: function () {
    var that = this
    request('/api/staff/sn-bindings', { data: { limit: 10 } }).then(function (data) {
      that.setData({ history: data.list || [] })
    }).catch(function () {})
  }
})
