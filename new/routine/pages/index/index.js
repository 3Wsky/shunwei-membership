const { request, publicRequest } = require('../../services/jc-request')

const DEFAULT_AVATAR = '/static/images/def_avatar.png'

function toNumber(value, fallback) {
  var n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function formatNumber(value) {
  var n = toNumber(value, 0)
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatMoney(value) {
  var n = toNumber(value, 0)
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function formatDate(value, fallback) {
  if (!value) return fallback
  var text = String(value)
  var match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (!match) return text
  return match[1] + '.' + ('0' + match[2]).slice(-2) + '.' + ('0' + match[3]).slice(-2)
}

function formatMemberLevel(value) {
  var text = String(value || '').replace(/^VIP\s*/i, '').trim()
  return text || '金卡会员'
}

function uniqueImages(items) {
  var seen = {}
  return items.map(function (item) { return item.image }).filter(function (image) {
    if (!image || seen[image]) return false
    seen[image] = true
    return true
  })
}

function maskPhone(phone) {
  var text = String(phone || '')
  if (/^1\d{10}$/.test(text)) return text.slice(0, 3) + '****' + text.slice(7)
  return '178****6520'
}

function normalizeAvatar(value) {
  var text = String(value || '').trim()
  if (!text) return DEFAULT_AVATAR
  if (/^\/\//.test(text)) return 'https:' + text
  if (/^http:\/\//i.test(text)) return text.replace(/^http:\/\//i, 'https://')
  if (/^\//.test(text)) return 'https://ok.xjshunwei.cn' + text
  return text
}

function readStoredUser() {
  var keys = ['USER_INFO', 'userInfo', 'USERINFO', 'LOGIN_USER_INFO']
  for (var i = 0; i < keys.length; i++) {
    try {
      var raw = wx.getStorageSync(keys[i])
      if (!raw) continue
      if (typeof raw === 'string') raw = JSON.parse(raw)
      if (raw && raw.userInfo && typeof raw.userInfo === 'object') raw = raw.userInfo
      if (raw && raw.data && typeof raw.data === 'object') raw = raw.data
      if (raw && typeof raw === 'object') return raw
    } catch (e) {}
  }
  return {}
}

function normalizeProduct(item) {
  var sku = item && item.skuPrices && item.skuPrices[0] ? item.skuPrices[0] : {}
  var params = item && item.paramsList ? item.paramsList : []
  var comment = 0
  for (var i = 0; i < params.length; i++) {
    if (params[i].name === '评价数') comment = toNumber(params[i].value, 0)
  }
  return {
    id: item.id,
    title: item.storeName || item.model || '精选数码商品',
    image: item.image || (sku && sku.image) || '',
    price: formatMoney(item.price || sku.priceValue || 0),
    spec: sku.config || sku.version || item.description || '官方正品',
    sales: toNumber(item.sales || item.salesCount || comment, 0),
    source: item.source,
    swProductId: item.id
  }
}

function normalizePointGood(item) {
  return {
    id: item.id,
    title: item.title || '积分好礼',
    image: item.image || '',
    points: formatNumber(item.price || item.points || 0) + ' 积分',
    canExchange: item.canExchange !== false
  }
}

Page({
  data: {
    statusBarHeight: 20,
    capsuleSpace: 112,
    bannerIndex: 0,
    member: {
      avatar: DEFAULT_AVATAR,
      nickname: '微信会员',
      phone: '178****6520',
      level: '金卡会员',
      integral: '0',
      integralClass: '',
      cashVoucher: '0',
      cashVoucherClass: '',
      validUntil: '2026.12.31'
    },
    quickEntries: [
      { title: '手机专区', icon: 'icon-shouji', className: 'mint', url: '/pages/jingcheng/showcase/list' },
      { title: '数码好物', icon: 'icon-shangpin', className: 'blue', url: '/pages/jingcheng/showcase/list' },
      { title: '以旧换新', icon: 'icon-gengxinshijian', className: 'gold', url: '/pages/jingcheng/activity/index' },
      { title: '积分商城', icon: 'icon-jifenshangcheng', className: 'orange', url: '/pages/jingcheng/integral/mall' }
    ],
    signDays: [
      { day: '1天', reward: '+10', checked: true },
      { day: '2天', reward: '+20', checked: true },
      { day: '3天', reward: '+30', checked: false },
      { day: '4天', reward: '+40', checked: false },
      { day: '5天', reward: '+50', checked: false },
      { day: '6天', reward: '+60', checked: false },
      { day: '7天', reward: '+80', checked: false, gift: true }
    ],
    banners: [
      { title: '会员积分兑好礼', subtitle: '到店购物享权益 · 数码好物兑换' },
      { title: '消费券会员专享', subtitle: '手机焕新更划算 · 积分权益同步享' }
    ],
    bannerImages: [],
    pointGoods: [],
    products: [],
    loading: true
  },

  onLoad: function () {
    this.setupSystem()
    wx.hideTabBar({ fail: function () {} })
    this.loadHome()
  },

  onShow: function () {
    wx.hideTabBar({ fail: function () {} })
  },

  onPullDownRefresh: function () {
    var self = this
    this.loadHome().finally(function () {
      wx.stopPullDownRefresh()
    })
  },

  setupSystem: function () {
    try {
      var sys = wx.getSystemInfoSync()
      var menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null
      this.setData({
        statusBarHeight: sys.statusBarHeight || 20,
        capsuleSpace: menu ? Math.max(sys.windowWidth - menu.left + 12, 96) : 112
      })
    } catch (e) {}
  },

  loadHome: function () {
    var self = this
    self.setData({ loading: true })
    return Promise.all([
      publicRequest('/api/products', { data: { page: 1, pageSize: 20, status: 'shown', source: 'vmall-official' } }).catch(function () { return { list: [] } }),
      publicRequest('/api/integral-mall/products').catch(function () { return [] }),
      request('/api/member/assets').catch(function () { return {} }),
      request('/api/user/profile-extra').catch(function () { return {} })
    ]).then(function (results) {
      var productResult = results[0] || {}
      var productList = Array.isArray(productResult) ? productResult : (productResult.list || [])
      var products = productList.map(normalizeProduct)
      var pointGoods = (results[1] || []).map(normalizePointGood).slice(0, 8)
      var assets = results[2] || {}
      var profile = results[3] || {}
      var storedUser = readStoredUser()
      var integral = formatNumber(assets.integral || assets.points || 0)
      var cashVoucher = formatMoney(assets.cashVoucher || 0)
      self.setData({
        products: products,
        pointGoods: pointGoods,
        bannerImages: uniqueImages(pointGoods.concat(products)).slice(0, 4),
        member: {
          avatar: normalizeAvatar(profile.avatar || storedUser.avatar || storedUser.avatarUrl),
          nickname: profile.nickname || storedUser.nickname || storedUser.nickName || '微信会员',
          phone: maskPhone(profile.phone || storedUser.phone),
          level: formatMemberLevel(assets.levelName || assets.memberLevel),
          integral: integral,
          integralClass: integral.length > 7 ? 'compact' : '',
          cashVoucher: cashVoucher,
          cashVoucherClass: cashVoucher.length > 7 ? 'compact' : '',
          validUntil: formatDate(assets.validUntil || assets.memberExpireAt, '2026.12.31')
        },
        loading: false
      })
    }).catch(function () {
      self.setData({ loading: false })
    })
  },

  bannerChange: function (event) {
    this.setData({ bannerIndex: event.detail.current || 0 })
  },

  avatarError: function () {
    if (this.data.member.avatar !== DEFAULT_AVATAR) {
      this.setData({ 'member.avatar': DEFAULT_AVATAR })
    }
  },

  goSearch: function () {
    wx.navigateTo({ url: '/pages/goods/goods_search/index' })
  },

  goMember: function () {
    wx.switchTab({ url: '/pages/user/index' })
  },

  goPointsMall: function () {
    wx.navigateTo({ url: '/pages/jingcheng/integral/mall' })
  },

  goSignIn: function () {
    wx.navigateTo({ url: '/pages/users/user_sgin/index' })
  },

  goQuick: function (event) {
    var url = event.currentTarget.dataset.url
    if (!url) return
    wx.navigateTo({ url: url, fail: function () { wx.switchTab({ url: url }) } })
  },

  openProduct: function (event) {
    var id = event.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/jingcheng/showcase/detail?id=' + encodeURIComponent(id) })
  },

  openPointGood: function (event) {
    var id = event.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/jingcheng/integral/detail?id=' + id })
  },

  goCategory: function () {
    wx.switchTab({ url: '/pages/goods_cate/goods_cate' })
  },

  goMine: function () {
    wx.switchTab({ url: '/pages/user/index' })
  },

  onShareAppMessage: function () {
    return {
      title: '锦程祥瑞数码｜会员积分兑好礼',
      path: '/pages/index/index',
      imageUrl: this.data.bannerImages[0] || '/static/images/sign-icon-04.png'
    }
  },

  onShareTimeline: function () {
    return {
      title: '锦程祥瑞数码｜会员积分兑好礼',
      query: '',
      imageUrl: this.data.bannerImages[0] || '/static/images/sign-icon-04.png'
    }
  }
})
