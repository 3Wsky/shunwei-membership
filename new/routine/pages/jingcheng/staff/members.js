const { request, getToken, readUidFromStorage, syncAuthFromApp, openWechatReauth } = require('../../../services/jc-request')

function mapStatsMember(row) {
  return {
    uid: Number(row.uid || 0),
    nickname: row.nickname || '',
    phone: row.phone || '',
    avatar: '',
    integral: 0,
    cashVoucher: 0,
    tierCode: row.tier_code || row.tierCode || '',
    membershipExpireAt: 0,
    registerAt: Number(row.registerAt || 0),
    latestApprovalStatus: ''
  }
}

function applyList(page, setData, list, total) {
  setData({
    list: list,
    total: total,
    page: page + 1,
    finished: list.length >= total
  })
}

Page({
  data: {
    keyword: '',
    list: [],
    page: 1,
    total: 0,
    loading: false,
    finished: false,
    isManager: false,
    pendingCount: 0,
    selfUid: 0,
    storageUid: 0,
    loadError: '',
    needLogin: false,
    loaded: false
  },
  onLoad: function () {
    this.setData({ storageUid: readUidFromStorage() })
    this.bootstrap()
  },
  onShow: function () {
    syncAuthFromApp()
    if (this.data.loaded && getToken()) this.load(true)
  },
  onPullDownRefresh: function () {
    this.bootstrap().finally(function () { wx.stopPullDownRefresh() })
  },
  onReachBottom: function () { this.load(false) },
  onInput: function (e) { this.setData({ keyword: e.detail.value }) },
  onSearch: function () { this.load(true) },
  bootstrap: function () {
    syncAuthFromApp()
    if (!getToken()) {
      this.setData({
        needLogin: true,
        loadError: '请先在「我的」Tab 登录（显示三万天昵称），停留 1 秒后再点会员管理',
        loaded: true
      })
      return Promise.resolve()
    }
    this.setData({ needLogin: false, loadError: '' })
    return this.loadAccess().finally(function () { this.load(true) }.bind(this))
  },
  goLogin: function () { openWechatReauth() },
  loadAccess: function () {
    return request('/api/staff/me').then(function (data) {
      this.setData({
        isManager: !!(data.isManager || data.is_manager),
        selfUid: Number(data.uid || 0),
        storageUid: readUidFromStorage()
      })
    }.bind(this)).catch(function (err) {
      var msg = err.message || '加载失败'
      if (msg.indexOf('SERVER_AUTH:') === 0) {
        msg = '服务端未认可登录（需核对 CRMEB_APP_KEY）。本地已带 Token 仍失败请联系管理员。'
      } else if (msg.indexOf('LOCAL_AUTH:') === 0) {
        msg = msg.replace('LOCAL_AUTH:', '')
      }
      this.setData({
        loadError: msg,
        needLogin: msg.indexOf('登录') >= 0 || msg.indexOf('Token') >= 0 || msg.indexOf('APP_KEY') >= 0
      })
    }.bind(this))
  },
  load: function (reset) {
    if (!getToken()) {
      this.setData({ needLogin: true })
      return Promise.resolve()
    }
    if (this.data.loading || (!reset && this.data.finished)) return Promise.resolve()
    var page = reset ? 1 : this.data.page
    this.setData({ loading: true, loadError: '', needLogin: false })
    return request('/api/staff/stats').then(function (stats) {
      if (reset) {
        var statsMembers = (stats.members || []).map(mapStatsMember)
        var total = Number(stats.memberCount || statsMembers.length)
        applyList(page, this.setData.bind(this), statsMembers, total)
      }
      return request('/api/staff/members', {
        data: { page: page, pageSize: 50, keyword: this.data.keyword }
      }).then(function (data) {
        var list = reset ? (data.list || []) : this.data.list.concat(data.list || [])
        var total = Number(data.total || 0)
        if (list.length || total) applyList(page, this.setData.bind(this), list, total)
      }.bind(this))
    }.bind(this)).catch(function (err) {
      this.setData({ loadError: err.message || '加载失败', needLogin: (err.message || '').indexOf('登录') >= 0 })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }.bind(this)).finally(function () {
      this.setData({ loading: false, loaded: true })
    }.bind(this))
  },
  openMember: function (e) {
    var item = this.data.list[e.currentTarget.dataset.index]
    wx.navigateTo({ url: '/pages/jingcheng/staff/apply?member=' + encodeURIComponent(JSON.stringify(item)) })
  },
  openApprovals: function () { wx.navigateTo({ url: '/pages/jingcheng/manager/approvals' }) }
})
