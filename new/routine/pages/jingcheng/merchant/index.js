const { request, syncAuthFromApp, getToken, openWechatReauth } = require('../../../services/jc-request')

Page({
  data: {
    loading: true,
    merchantName: '',
    isManager: false,
    todayAmount: 0,
    todayCount: 0,
    weekAmount: 0,
    monthAmount: 0,
    totalAmount: 0,
    verifyCount: 0,
    customerCount: 0,
    availableAmount: 0,
    withdrawingAmount: 0,
    staffCount: 0
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
      var staffStats = data.staffStats || []
      this.setData({
        merchantName: data.merchantName || '',
        isManager: !!data.isManager,
        todayAmount: Number(data.todayAmount || 0),
        todayCount: Number(data.todayCount || 0),
        weekAmount: Number(data.weekAmount || 0),
        monthAmount: Number(data.monthAmount || 0),
        totalAmount: Number(data.totalAmount || 0),
        verifyCount: Number(data.verifyCount || 0),
        customerCount: Number(data.customerCount || 0),
        availableAmount: Number(data.availableAmount || 0),
        withdrawingAmount: Number(data.withdrawingAmount || 0),
        staffCount: staffStats.length
      })
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    }).finally(function () {
      this.setData({ loading: false })
    }.bind(this))
  },
  openVerify: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/verify' }) },
  goSnScan: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/sn-scan/index' }) },
  goRecords: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/records/index' }) },
  goStaff: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/staff/index' }) },
  goWithdraw: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/withdraw/index' }) }
})
