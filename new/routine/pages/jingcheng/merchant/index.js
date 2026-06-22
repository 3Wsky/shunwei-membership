const { request, syncAuthFromApp, getToken, openWechatReauth } = require('../../../services/jc-request')

function dateText(ts) {
  if (!ts) return ''
  var d = new Date(Number(ts) * 1000)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

Page({
  data: {
    loading: true,
    merchantName: '',
    isManager: false,
    todayAmount: 0,
    weekAmount: 0,
    monthAmount: 0,
    totalAmount: 0,
    availableAmount: 0,
    withdrawingAmount: 0,
    settledTotal: 0,
    customAmount: '',
    withdrawals: []
  },
  onShow: function () { this.load() },
  onPullDownRefresh: function () { this.load().finally(function () { wx.stopPullDownRefresh() }) },
  load: function () {
    syncAuthFromApp()
    if (!getToken()) {
      this.setData({ loading: false })
      openWechatReauth()
      return Promise.resolve()
    }
    this.setData({ loading: true })
    return request('/api/merchant/dashboard').then(function (data) {
      this.setData(data)
      if (data.isManager) return this.loadWithdrawals()
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    }).finally(function () {
      this.setData({ loading: false })
    })
  },
  loadWithdrawals: function () {
    return request('/api/merchant/withdrawals').then(function (rows) {
      this.setData({
        withdrawals: (rows || []).map(function (item) {
          return Object.assign({}, item, {
            createdText: dateText(item.createdAt),
            expectedText: dateText(item.expectedAt)
          })
        })
      })
    }.bind(this))
  },
  openVerify: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/verify' }) },
  onAmountInput: function (e) { this.setData({ customAmount: e.detail.value }) },
  withdrawAll: function () { this.confirmWithdraw(Number(this.data.availableAmount || 0), true) },
  withdrawCustom: function () { this.confirmWithdraw(Number(this.data.customAmount || 0), false) },
  confirmWithdraw: function (amount, withdrawAll) {
    if (amount <= 0) return wx.showToast({ title: '请输入提现金额', icon: 'none' })
    if (amount > Number(this.data.availableAmount || 0)) return wx.showToast({ title: '超过可提现金额', icon: 'none' })
    wx.showModal({
      title: '确认提现申请',
      content: '本次提现 ¥' + amount + '\n提交后冻结该金额，预计T+3到账',
      editable: true,
      placeholderText: '提现备注（选填）',
      confirmText: '确认申请',
      success: function (res) {
        if (!res.confirm) return
        request('/api/merchant/withdrawals', {
          method: 'POST',
          data: { amount: amount, withdrawAll: withdrawAll, remark: res.content || '' }
        }).then(function (result) {
          wx.showModal({ title: '申请成功', content: '¥' + result.amount + ' 预计T+3到账', showCancel: false })
          this.setData({ customAmount: '' })
          this.load()
        }.bind(this)).catch(function (err) { wx.showToast({ title: err.message, icon: 'none' }) })
      }.bind(this)
    })
  }
})
