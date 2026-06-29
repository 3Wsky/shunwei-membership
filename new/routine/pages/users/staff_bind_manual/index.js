var jcRequest = require('../../../services/jc-request.js')

function normalizeUid(value) {
  var uid = String(value || '').replace(/[^\d]/g, '')
  if (!uid) return ''
  return String(Math.floor(Number(uid)))
}

function normalizeCard(card) {
  card = card || {}
  return {
    staffUid: Number(card.staffUid || 0),
    displayName: card.displayName || '客户经理',
    avatar: card.avatar || '/static/images/f.png',
    jobTitle: card.jobTitle || '专属客户经理',
    bio: card.bio || '',
    storeName: card.storeName || '',
    storeAddress: card.storeAddress || '',
    storePhone: card.storePhone || '',
    businessHours: card.businessHours || '',
    latitude: Number(card.latitude || 0),
    longitude: Number(card.longitude || 0),
    wechatQrcode: card.wechatQrcode || '',
    contactPhone: card.contactPhone || ''
  }
}

Page({
  data: {
    loading: true,
    bound: false,
    hasCard: false,
    staffUid: '',
    spreadUid: 0,
    card: {},
    submitting: false,
    storeLoading: true,
    stores: []
  },

  onLoad: function (options) {
    var uid = normalizeUid(options && (options.staffUid || options.uid || options.spread))
    if (uid) this.setData({ staffUid: uid })
    this.loadManagerCard()
    this.loadStores()
  },

  onShow: function () {
    if (!this.data.loading) this.loadManagerCard()
  },

  loadStores: function () {
    var self = this
    jcRequest.publicRequest('/api/stores').then(function (list) {
      var stores = (list || []).map(function (item) {
        item = item || {}
        return {
          id: Number(item.id || 0),
          name: item.name || '门店',
          address: item.address || '',
          phone: item.phone || '',
          dayTime: item.dayTime || ''
        }
      })
      self.setData({ storeLoading: false, stores: stores })
    }).catch(function () {
      self.setData({ storeLoading: false, stores: [] })
    })
  },

  loadManagerCard: function () {
    var self = this
    if (!jcRequest.isLoggedIn()) {
      this.setData({ loading: false, bound: false, hasCard: false })
      return
    }
    this.setData({ loading: true })
    jcRequest.request('/api/staff/my-manager-card').then(function (data) {
      var card = data && data.card ? normalizeCard(data.card) : {}
      self.setData({
        loading: false,
        bound: !!(data && data.bound),
        hasCard: !!(data && data.card),
        spreadUid: Number((data && data.spreadUid) || 0),
        card: card
      })
    }).catch(function (error) {
      var msg = (error && error.message) || '客户经理加载失败'
      if (msg.indexOf('LOCAL_AUTH:') === 0 || msg.indexOf('SERVER_AUTH:') === 0) {
        msg = '请先登录后查看客户经理'
      } else if (msg === '请求失败' || msg.indexOf('/api/staff/my-manager-card') >= 0) {
        msg = ''
      }
      self.setData({ loading: false, bound: false, hasCard: false })
      if (msg) wx.showToast({ title: msg, icon: 'none', duration: 2500 })
    })
  },

  onUidInput: function (event) {
    this.setData({ staffUid: normalizeUid(event.detail.value) })
  },

  submitBind: function () {
    var self = this
    var staffUid = normalizeUid(this.data.staffUid)

    if (!staffUid || Number(staffUid) <= 0) {
      wx.showToast({ title: '请输入正确的 UID', icon: 'none' })
      return
    }

    if (!jcRequest.isLoggedIn()) {
      wx.showModal({
        title: '请先登录',
        content: '登录后才能绑定客户经理。',
        confirmText: '去登录',
        success: function (res) {
          if (res.confirm) jcRequest.openWechatReauth()
        }
      })
      return
    }

    var finish = function () {
      self.setData({ submitting: false })
    }

    this.setData({ submitting: true })
    jcRequest.request('/api/staff/bind-spread', {
      method: 'POST',
      data: { staffUid: Number(staffUid) }
    }).then(function () {
      try {
        wx.removeStorageSync('PENDING_SPREAD_STAFF_UID')
        wx.setStorageSync('SPREAD_BIND_DONE', 1)
      } catch (e) {}
      finish()
      wx.showToast({ title: '绑定成功', icon: 'success', duration: 1600 })
      self.loadManagerCard()
    }).catch(function (error) {
      var msg = (error && error.message) || '绑定失败，请稍后再试'
      if (msg.indexOf('LOCAL_AUTH:') === 0 || msg.indexOf('SERVER_AUTH:') === 0) {
        msg = '请先登录后再绑定'
      }
      wx.showToast({ title: msg, icon: 'none', duration: 2500 })
      finish()
      self.loadManagerCard()
    })
  },

  makePhoneCall: function () {
    var phone = this.data.card.storePhone
    if (!phone) {
      wx.showToast({ title: '暂无联系电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: String(phone) })
  },

  openLocation: function () {
    var card = this.data.card || {}
    if (!card.latitude || !card.longitude) {
      wx.showToast({ title: card.storeAddress || '暂无地图位置', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: Number(card.latitude),
      longitude: Number(card.longitude),
      name: card.storeName || card.displayName || '客户经理',
      address: card.storeAddress || ''
    })
  },

  previewQrcode: function () {
    var url = this.data.card.wechatQrcode
    if (!url) return
    wx.previewImage({ current: url, urls: [url] })
  }
})
