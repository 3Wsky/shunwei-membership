const { request, syncAuthFromApp, getToken, openWechatReauth } = require('../../../../services/jc-request')

function dateText(ts) {
  if (!ts) return ''
  var d = new Date(Number(ts) * 1000)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function normalizeAmount(value) {
  var amount = String(value || '').replace(/[^\d.]/g, '')
  var parts = amount.split('.')
  if (parts.length > 2) amount = parts.shift() + '.' + parts.join('')
  return amount
}

Page({
  data: {
    loading: true,
    merchantNameText: '锦程祥瑞',
    availableAmount: 0,
    withdrawingAmount: 0,
    customAmount: '',
    customReady: false,
    withdrawals: []
  },
  onShow: function () { this.load() },
  onPullDownRefresh: function () {
    this.load().finally(function () { wx.stopPullDownRefresh() })
  },
  load: function () {
    syncAuthFromApp()
    if (!getToken()) {
      this.setData({ loading: false })
      openWechatReauth()
      return Promise.resolve()
    }
    this.setData({ loading: true })
    return request('/api/merchant/dashboard').then(function (data) {
      data = data || {}
      var isManager = !!(data.isManager || data.is_manager)
      if (!isManager) {
        wx.redirectTo({ url: '/pages/jingcheng/merchant/verify' })
        return
      }
      this.setData({
        merchantNameText: data.merchantName || '锦程祥瑞',
        availableAmount: Number(data.availableAmount || 0),
        withdrawingAmount: Number(data.withdrawingAmount || 0),
        customReady: Number(this.data.customAmount || 0) > 0 && Number(this.data.customAmount || 0) <= Number(data.availableAmount || 0)
      })
      this.loadWithdrawals()
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    }).finally(function () {
      this.setData({ loading: false })
    }.bind(this))
  },
  loadWithdrawals: function () {
    return request('/api/merchant/withdrawals').then(function (rows) {
      this.setData({
        withdrawals: (rows || []).map(function (item) {
          var isSettled = item.status === 'settled'
          var isRejected = item.status === 'rejected'
          return Object.assign({}, item, {
            createdText: dateText(item.createdAt),
            expectedText: dateText(item.expectedAt),
            statusClass: isSettled ? 'settled' : (isRejected ? 'rejected' : 'pending'),
            statusText: isSettled ? '已打款' : (isRejected ? '已驳回' : '审核中')
          })
        })
      })
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: err.message || '提现记录加载失败', icon: 'none' })
      this.setData({ withdrawals: [] })
    }.bind(this))
  },
  onAmountInput: function (e) {
    var amount = normalizeAmount(e.detail.value)
    this.setData({
      customAmount: amount,
      customReady: Number(amount || 0) > 0 && Number(amount || 0) <= Number(this.data.availableAmount || 0)
    })
  },
  withdrawAll: function () { this.confirmWithdraw(Number(this.data.availableAmount || 0), true) },
  withdrawCustom: function () { this.confirmWithdraw(Number(this.data.customAmount || 0), false) },
  confirmWithdraw: function (amount, withdrawAll) {
    if (amount <= 0) return wx.showToast({ title: '请输入提现金额', icon: 'none' })
    if (amount > Number(this.data.availableAmount || 0)) return wx.showToast({ title: '提现金额不能超过可提现余额', icon: 'none' })
    wx.showModal({
      title: '确认申请提现？',
      content: '本次申请提现 ￥' + amount + '，审核通过后预计 T+3 到账。',
      editable: true,
      placeholderText: '提现备注（选填）',
      confirmText: '确认申请',
      success: function (res) {
        if (!res.confirm) return
        request('/api/merchant/withdrawals', {
          method: 'POST',
          data: { amount: amount, withdrawAll: withdrawAll, remark: res.content || '' }
        }).then(function (result) {
          wx.showModal({ title: '申请成功', content: '￥' + result.amount + ' 预计 T+3 到账', showCancel: false })
          this.setData({ customAmount: '', customReady: false })
          this.load()
        }.bind(this)).catch(function (err) {
          wx.showToast({ title: err.message, icon: 'none' })
        })
      }.bind(this)
    })
  }
})
