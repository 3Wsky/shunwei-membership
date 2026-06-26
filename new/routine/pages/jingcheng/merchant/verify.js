const { request, syncAuthFromApp, getToken, openWechatReauth } = require('../../../services/jc-request')

function pad(n) { return n < 10 ? '0' + n : '' + n }

function timeText(ts) {
  if (!ts) return ''
  var d = new Date(Number(ts) * 1000)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function todayStartTs() {
  var n = new Date()
  return Math.floor(new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() / 1000)
}

function isIntegralCode(code) {
  var s = String(code || '').trim()
  if (/^\d{6}$/.test(s)) return true
  if (/^IG\d+/i.test(s)) return true
  return false
}

function isCashVoucherToken(code) {
  return String(code || '').trim().indexOf('sw-pay:') === 0
}

Page({
  data: {
    loading: true,
    scanning: false,
    manualCode: '',
    todayAmount: 0,
    todayCount: 0,
    weekAmount: 0,
    weekCount: 0,
    monthAmount: 0,
    monthCount: 0,
    todayRecords: [],
    showSummary: false
  },
  onShow: function () { this.load() },
  onPullDownRefresh: function () { this.load().finally(function () { wx.stopPullDownRefresh() }) },
  onManualInput: function (e) { this.setData({ manualCode: e.detail.value }) },
  manualVerify: function () {
    var code = String(this.data.manualCode || '').trim()
    if (!code) return wx.showToast({ title: '请输入核销码', icon: 'none' })
    this.routeCode(code)
  },
  load: function () {
    syncAuthFromApp()
    if (!getToken()) {
      this.setData({ loading: false })
      openWechatReauth()
      return Promise.resolve()
    }
    this.setData({ loading: true })
    return request('/api/merchant/dashboard', { data: { scope: 'mine' } }).then(function (data) {
      var start = todayStartTs()
      var records = (data.recentRecords || []).filter(function (r) {
        return Number(r.createdAt || 0) >= start
      }).map(function (r) {
        return Object.assign({}, r, { timeText: timeText(r.createdAt) })
      })
      this.setData({
        todayAmount: Number(data.todayAmount || 0),
        todayCount: Number(data.todayCount || 0),
        weekAmount: Number(data.weekAmount || 0),
        weekCount: Number(data.weekCount || 0),
        monthAmount: Number(data.monthAmount || 0),
        monthCount: Number(data.monthCount || 0),
        todayRecords: records
      })
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    }).finally(function () {
      this.setData({ loading: false })
    }.bind(this))
  },
  toggleSummary: function () { this.setData({ showSummary: !this.data.showSummary }) },
  scanCustomer: function () {
    if (this.data.scanning) return
    this.setData({ scanning: true })
    wx.scanCode({
      onlyFromCamera: false,
      success: function (res) {
        var code = String(res.result || '').trim()
        if (!code) {
          this.setData({ scanning: false })
          return wx.showToast({ title: '未识别到核销码', icon: 'none' })
        }
        this.routeCode(code)
      }.bind(this),
      fail: function () { this.setData({ scanning: false }) }.bind(this)
    })
  },
  routeCode: function (code) {
    if (isCashVoucherToken(code)) {
      this.previewCashVoucher(code)
    } else if (isIntegralCode(code)) {
      this.previewIntegral(code)
    } else {
      this.previewCashVoucher(code)
    }
  },
  previewCashVoucher: function (token) {
    request('/api/merchant/preview-verify', {
      method: 'POST', data: { verifyToken: token }
    }).then(function (info) {
      this.setData({ scanning: false })
      this.askAmount(token, info)
    }.bind(this)).catch(function (err) {
      this.setData({ scanning: false })
      wx.showModal({ title: '无法核销', content: err.message || '付款码无效，请让顾客刷新', showCancel: false })
    }.bind(this))
  },
  previewIntegral: function (code) {
    request('/api/integral-mall/preview-by-code', {
      method: 'POST', data: { verifyCode: code }
    }).then(function (info) {
      this.setData({ scanning: false, manualCode: '' })
      this.confirmIntegral(code, info)
    }.bind(this)).catch(function (err) {
      this.setData({ scanning: false })
      wx.showModal({ title: '无法核销', content: err.message || '核销码无效', showCancel: false })
    }.bind(this))
  },
  confirmIntegral: function (code, info) {
    var that = this
    wx.showModal({
      title: '积分礼品核销',
      content: '顾客：' + (info.customerNickname || ('UID ' + info.customerUid)) +
        '\n礼品：' + info.productName +
        '\n消耗积分：' + info.integralCost +
        '\n\n确认核销该积分礼品？',
      confirmText: '确认核销',
      success: function (res) {
        if (!res.confirm) return
        that.doIntegralVerify(code)
      }
    })
  },
  doIntegralVerify: function (code) {
    wx.showLoading({ title: '核销中…', mask: true })
    request('/api/integral-mall/verify-by-code', {
      method: 'POST', data: { verifyCode: code }
    }).then(function (data) {
      wx.hideLoading()
      wx.showModal({
        title: '核销成功',
        content: '积分礼品已核销\n商品：' + data.productName + '\n积分：' + data.integralCost,
        showCancel: false
      })
      this.load()
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      wx.showModal({ title: '核销失败', content: err.message || '请重试', showCancel: false })
    })
  },
  askAmount: function (token, info) {
    var that = this
    wx.showModal({
      title: '现金券核销',
      content: '顾客：' + (info.nickname || ('UID ' + info.uid)) + '\n可用现金券 ¥' + info.balance + '\n请输入核销金额（元）',
      editable: true,
      placeholderText: '本次核销金额',
      confirmText: '确认核销',
      success: function (res) {
        if (!res.confirm) return
        var amount = Number(String(res.content || '').trim())
        if (!amount || amount <= 0) return wx.showToast({ title: '请输入有效金额', icon: 'none' })
        if (amount > Number(info.balance || 0)) return wx.showToast({ title: '超过顾客可用余额', icon: 'none' })
        that.doCashVerify(token, amount)
      }
    })
  },
  doCashVerify: function (token, amount) {
    wx.showLoading({ title: '核销中…', mask: true })
    request('/api/merchant/verify-voucher', {
      method: 'POST', data: { verifyToken: token, amount: amount }
    }).then(function (data) {
      wx.hideLoading()
      wx.showModal({
        title: '核销成功',
        content: '本次核销 ¥' + data.amount + '\n顾客剩余 ¥' + data.balanceAfter,
        showCancel: false
      })
      this.load()
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      wx.showModal({ title: '核销失败', content: err.message || '请重试', showCancel: false })
    })
  }
})
