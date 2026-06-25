const { request, syncAuthFromApp, getToken, openWechatReauth } = require('../../../../services/jc-request')

function dateText(ts) {
  if (!ts) return ''
  var d = new Date(Number(ts) * 1000)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function timeText(ts) {
  if (!ts) return ''
  var d = new Date(Number(ts) * 1000)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

Page({
  data: {
    loading: true,
    merchantNameText: '锦程祥瑞',
    todayAmount: 0,
    todayCount: 0,
    weekAmount: 0,
    monthAmount: 0,
    totalAmount: 0,
    verifyCount: 0,
    customerCount: 0,
    recentRecords: []
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
        todayAmount: Number(data.todayAmount || 0),
        todayCount: Number(data.todayCount || 0),
        weekAmount: Number(data.weekAmount || 0),
        monthAmount: Number(data.monthAmount || 0),
        totalAmount: Number(data.totalAmount || 0),
        verifyCount: Number(data.verifyCount || 0),
        customerCount: Number(data.customerCount || 0),
        recentRecords: (data.recentRecords || []).map(function (item) {
          return Object.assign({}, item, {
            dateText: dateText(item.createdAt),
            timeText: timeText(item.createdAt),
            displayName: item.customerNickname || ('UID:' + item.customerUid)
          })
        })
      })
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    }).finally(function () {
      this.setData({ loading: false })
    }.bind(this))
  }
})
