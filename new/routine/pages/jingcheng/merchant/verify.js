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

function parseMoneyAmount(raw) {
  var s = String(raw || '').trim()
    .replace(/[￥¥,\s，]/g, '')
    .replace(/．/g, '.')
  if (!s || !/^\d+(\.\d{1,2})?$/.test(s)) return NaN
  return Math.round(parseFloat(s) * 100) / 100
}

function isHundredAmount(amount) {
  return Math.round(amount * 100) % 10000 === 0
}

// 核销成功反馈：重震动（柜台忙时不盯屏也能感知）
function feedbackSuccess() {
  try { wx.vibrateShort({ type: 'heavy' }) } catch (e) { try { wx.vibrateShort() } catch (e2) {} }
}

// 核销失败/异常反馈：长震动，与成功区分
function feedbackFail() {
  try { wx.vibrateLong() } catch (e) {}
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
    showSummary: false,
    showAmountModal: false,
    amountInput: '',
    pendingToken: '',
    pendingInfo: null,
    verifyMode: 'any',
    quickAmounts: [],
    showIntegralModal: false,
    integralInfo: null,
    pendingIntegralCode: ''
  },
  onShow: function () { this.load() },
  onPullDownRefresh: function () { this.load().finally(function () { wx.stopPullDownRefresh() }) },
  preventMove: function () {},
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
      wx.showToast({ title: '识别到：现金券', icon: 'none', duration: 800 })
      this.previewCashVoucher(code)
    } else if (isIntegralCode(code)) {
      wx.showToast({ title: '识别到：积分礼品', icon: 'none', duration: 800 })
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
      this.setData({
        scanning: false,
        manualCode: '',
        showIntegralModal: true,
        integralInfo: info,
        pendingIntegralCode: code
      })
    }.bind(this)).catch(function (err) {
      this.setData({ scanning: false })
      wx.showModal({ title: '无法核销', content: err.message || '核销码无效', showCancel: false })
    }.bind(this))
  },
  closeIntegralModal: function () {
    this.setData({ showIntegralModal: false, integralInfo: null, pendingIntegralCode: '' })
  },
  confirmIntegralVerify: function () {
    var code = this.data.pendingIntegralCode
    if (!code) return
    this.closeIntegralModal()
    this.doIntegralVerify(code)
  },
  doIntegralVerify: function (code) {
    if (this._verifyingIntegral) return
    this._verifyingIntegral = true
    wx.showLoading({ title: '核销中…', mask: true })
    request('/api/integral-mall/verify-by-code', {
      method: 'POST', data: { verifyCode: code }
    }).then(function (data) {
      wx.hideLoading()
      this._verifyingIntegral = false
      feedbackSuccess()
      this.showSuccessModal('积分礼品已核销\n商品：' + data.productName + '\n积分：' + data.integralCost)
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      this._verifyingIntegral = false
      var msg = err.message || '请重试'
      var unknown = /网络|超时|timeout|fail/i.test(msg)
      if (unknown) {
        this.recheckIntegralVerify(code)
      } else {
        feedbackFail()
        wx.showModal({ title: '核销失败', content: msg, showCancel: false })
      }
    }.bind(this))
  },
  // 积分核销网络异常后自动回查：用 preview-by-code 看这张码对应的订单是否已变「已核销」
  recheckIntegralVerify: function (code) {
    var self = this
    wx.showLoading({ title: '正在确认结果…', mask: true })
    var attempt = function (left) {
      request('/api/integral-mall/preview-by-code', {
        method: 'POST', data: { verifyCode: code }
      }).then(function () {
        // preview 能正常返回订单 = 该订单仍「待核销」（已核销会走 409 catch）
        // 说明上一笔没核销成功，可安全重试
        wx.hideLoading()
        feedbackFail()
        wx.showModal({
          title: '本次核销未成功',
          content: '已确认本次核销未生效（顾客礼品未被核销），可重新核销。',
          showCancel: false
        })
        self.load()
      }).catch(function (err) {
        var m = (err && err.message) || ''
        // preview 报「已核销/已使用」(409) → 说明上一笔其实成功了
        if (/已核销|已使用|已被/.test(m)) {
          wx.hideLoading()
          feedbackSuccess()
          self.showSuccessModal('已确认核销成功\n积分礼品已核销')
          return
        }
        // 仍是网络问题 → 重试几次
        if (/网络|超时|timeout|fail/i.test(m) && left > 0) {
          setTimeout(function () { attempt(left - 1) }, 1500)
        } else {
          self.showRecheckUnconfirmed()
        }
      })
    }
    attempt(3)
  },
  askAmount: function (token, info) {
    var mode = info.verifyMode || 'any'
    var balance = Math.round(Number(info.balance || 0) * 100) / 100
    this.setData({
      showAmountModal: true,
      amountInput: '',
      pendingToken: token,
      pendingInfo: info,
      verifyMode: mode,
      quickAmounts: this.buildQuickAmounts(balance, mode)
    })
  },
  // 生成快捷金额档：不超过余额；整百模式只给整百档
  buildQuickAmounts: function (balance, mode) {
    var base = [100, 200, 500, 1000]
    var list = []
    for (var i = 0; i < base.length; i++) {
      if (base[i] <= balance + 0.001) list.push(base[i])
    }
    return list
  },
  pickQuickAmount: function (e) {
    var val = Number(e.currentTarget.dataset.amount || 0)
    if (val > 0) this.setData({ amountInput: String(val) })
  },
  onAmountInput: function (e) {
    this.setData({ amountInput: e.detail.value })
  },
  useFullBalance: function () {
    var info = this.data.pendingInfo || {}
    var balance = Math.round(Number(info.balance || 0) * 100) / 100
    if (balance <= 0) return wx.showToast({ title: '暂无可用余额', icon: 'none' })
    if (this.data.verifyMode === 'hundred' && !isHundredAmount(balance)) {
      return wx.showToast({ title: '整百模式请手动输入整百金额', icon: 'none' })
    }
    this.setData({ amountInput: String(balance) })
  },
  closeAmountModal: function () {
    this.setData({ showAmountModal: false, amountInput: '', pendingToken: '', pendingInfo: null })
  },
  confirmAmount: function () {
    var info = this.data.pendingInfo || {}
    var token = this.data.pendingToken
    var amount = parseMoneyAmount(this.data.amountInput)
    if (!amount || amount <= 0) return wx.showToast({ title: '请输入有效金额（最多两位小数）', icon: 'none' })
    if (this.data.verifyMode === 'hundred' && !isHundredAmount(amount)) {
      return wx.showToast({ title: '当前仅允许整百核销（如 100、200）', icon: 'none' })
    }
    var balance = Math.round(Number(info.balance || 0) * 100) / 100
    if (amount > balance + 0.001) return wx.showToast({ title: '超过顾客可用余额', icon: 'none' })
    this.closeAmountModal()
    this.doCashVerify(token, amount)
  },
  doCashVerify: function (token, amount) {
    if (this._verifying) return
    this._verifying = true
    wx.showLoading({ title: '核销中…', mask: true })
    request('/api/merchant/verify-voucher', {
      method: 'POST', data: { verifyToken: token, amount: amount }
    }).then(function (data) {
      wx.hideLoading()
      this._verifying = false
      feedbackSuccess()
      this.showSuccessModal('本次核销 ¥' + data.amount + '\n顾客剩余 ¥' + data.balanceAfter)
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      this._verifying = false
      // 网络/超时类错误：核销结果未知 → 不直接报失败，先按原核销码自动回查这笔到底成没成功
      var msg = err.message || '请重试'
      var unknown = /网络|超时|timeout|fail/i.test(msg)
      if (unknown) {
        this.recheckCashVerify(token)
      } else {
        feedbackFail()
        wx.showModal({ title: '核销失败', content: msg, showCancel: false })
        this.load()
      }
    }.bind(this))
  },
  // 核销成功统一弹窗：带「继续核销」一键再扫，连续核销不用来回点
  showSuccessModal: function (content) {
    var self = this
    wx.showModal({
      title: '核销成功',
      content: content,
      showCancel: true,
      cancelText: '完成',
      confirmText: '继续核销',
      success: function (res) {
        self.load()
        if (res.confirm) {
          setTimeout(function () { self.scanCustomer() }, 250)
        }
      },
      fail: function () { self.load() }
    })
  },
  // 网络恢复后自动回查：凭原核销码确认这笔是否已成功核销，免去核销员手动核对
  recheckCashVerify: function (token) {
    var self = this
    wx.showLoading({ title: '正在确认结果…', mask: true })
    var attempt = function (left) {
      request('/api/merchant/verify-status', {
        method: 'POST', data: { verifyToken: token }
      }).then(function (status) {
        if (status && status.verified) {
          wx.hideLoading()
          feedbackSuccess()
          var line = '本次核销 ¥' + status.amount
          if (status.balanceAfter !== null && status.balanceAfter !== undefined) {
            line += '\n顾客剩余 ¥' + status.balanceAfter
          }
          self.showSuccessModal('已确认核销成功\n' + line)
        } else if (status && status.unknown) {
          // 后端暂时无法判定，按未确认处理
          self.showRecheckUnconfirmed()
        } else {
          // 明确查到没成功 → 可安全重试
          wx.hideLoading()
          feedbackFail()
          wx.showModal({
            title: '本次核销未成功',
            content: '已确认本次核销未生效（顾客未被扣款），可重新核销。',
            showCancel: false
          })
          self.load()
        }
      }).catch(function () {
        // 回查本身又失败（网络仍未恢复）→ 重试几次，仍不行则提示手动核对
        if (left > 0) {
          setTimeout(function () { attempt(left - 1) }, 1500)
        } else {
          self.showRecheckUnconfirmed()
        }
      })
    }
    attempt(3)
  },
  showRecheckUnconfirmed: function () {
    wx.hideLoading()
    feedbackFail()
    wx.showModal({
      title: '核销结果未确认',
      content: '网络异常，暂时无法确认本次核销是否成功。请勿重复核销，先下拉刷新「今日核销」核对是否已记录，再决定是否重试。',
      showCancel: false
    })
    this.load()
  }
})
