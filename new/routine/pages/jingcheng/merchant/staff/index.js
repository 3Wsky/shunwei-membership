const { request, syncAuthFromApp, getToken, openWechatReauth } = require('../../../../services/jc-request')

Page({
  data: {
    loading: true,
    merchantNameText: '锦程祥瑞',
    staffStats: [],
    staffList: []
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
        staffStats: data.staffStats || []
      })
      return this.loadStaffList()
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    }).finally(function () {
      this.setData({ loading: false })
    }.bind(this))
  },
  loadStaffList: function () {
    return request('/api/merchant/staff').then(function (list) {
      this.setData({
        staffList: (list || []).map(function (item) {
          var resumeText = ''
          if (item.suspendedUntil) {
            var d = new Date(Number(item.suspendedUntil) * 1000)
            resumeText = String(d.getHours()).padStart(2, '0') + ':00'
          }
          return Object.assign({}, item, { resumeTimeText: resumeText })
        })
      })
    }.bind(this)).catch(function () {
      this.setData({ staffList: [] })
    }.bind(this))
  },
  suspendStaff: function (e) {
    var uid = e.currentTarget.dataset.uid
    var nickname = e.currentTarget.dataset.nickname || 'UID:' + uid
    wx.showModal({
      title: '暂停核销权限',
      content: '确认暂停「' + nickname + '」的核销权限？\n次日早 8:00 自动恢复。',
      confirmText: '确认暂停',
      success: function (res) {
        if (!res.confirm) return
        request('/api/merchant/staff/' + uid + '/suspend', {
          method: 'PUT',
          data: { action: 'suspend', resumeHour: 8 }
        }).then(function () {
          wx.showToast({ title: '已暂停', icon: 'success' })
          this.loadStaffList()
        }.bind(this)).catch(function (err) {
          wx.showToast({ title: err.message, icon: 'none' })
        })
      }.bind(this)
    })
  },
  resumeStaff: function (e) {
    var uid = e.currentTarget.dataset.uid
    request('/api/merchant/staff/' + uid + '/suspend', {
      method: 'PUT',
      data: { action: 'resume' }
    }).then(function () {
      wx.showToast({ title: '已恢复', icon: 'success' })
      this.loadStaffList()
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    })
  }
})
