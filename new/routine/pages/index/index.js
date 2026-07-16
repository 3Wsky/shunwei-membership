const { request, publicRequest } = require('../../services/jc-request')

const DEFAULT_AVATAR = '/static/images/def_avatar.png'
const DEFAULT_BANNERS = [
  {
    id: 'default-points',
    title: '会员积分兑好礼',
    subtitle: '到店购物享权益 · 数码好物兑换',
    buttonText: '查看积分商城',
    image: '',
    targetType: 'page',
    targetPath: '/pages/jingcheng/integral/mall'
  },
  {
    id: 'default-coupon',
    title: '消费券会员专享',
    subtitle: '手机焕新更划算 · 积分权益同步享',
    buttonText: '了解会员权益',
    image: '',
    targetType: 'page',
    targetPath: '/pages/jingcheng/activity/index'
  }
]

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
  var parts = (Math.round(n * 100) / 100).toFixed(2).split('.')
  var integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  var decimals = parts[1].replace(/0+$/, '')
  return integer + (decimals ? '.' + decimals : '')
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function uniqueText(list) {
  var seen = {}
  var result = []
  ;(list || []).forEach(function (value) {
    var text = cleanText(value)
    if (!text || seen[text]) return
    seen[text] = true
    result.push(text)
  })
  return result
}

function splitHighlights(value) {
  return cleanText(value)
    .split(/[|｜/、,，;；]+/)
    .map(cleanText)
    .filter(Boolean)
}

function formatDate(value, fallback) {
  if (!value) return fallback
  if (/^\d{10,13}$/.test(String(value))) {
    var timestamp = Number(value)
    var date = new Date(timestamp < 1000000000000 ? timestamp * 1000 : timestamp)
    if (!Number.isNaN(date.getTime())) {
      return date.getFullYear() + '.' + ('0' + (date.getMonth() + 1)).slice(-2) + '.' + ('0' + date.getDate()).slice(-2)
    }
  }
  var text = String(value)
  var match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (!match) return text
  return match[1] + '.' + ('0' + match[2]).slice(-2) + '.' + ('0' + match[3]).slice(-2)
}

function formatMemberLevel(value) {
  var text = String(value || '').replace(/^VIP\s*/i, '').trim()
  if (/^SW199$/i.test(text)) return '199会员'
  if (/^SW299$/i.test(text)) return '299会员'
  return text || '普通会员'
}

function uniqueImages(items) {
  var seen = {}
  return items.map(function (item) { return item.image }).filter(function (image) {
    if (!image || seen[image]) return false
    seen[image] = true
    return true
  })
}

function groupPointGoods(items) {
  var pages = []
  for (var i = 0; i < items.length; i += 2) {
    pages.push({ id: 'point-page-' + i, items: items.slice(i, i + 2) })
  }
  return pages
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
  var skuList = Array.isArray(item && item.skuPrices) ? item.skuPrices : []
  var params = item && item.paramsList ? item.paramsList : []
  var comment = 0
  for (var i = 0; i < params.length; i++) {
    if (params[i].name === '评价数') comment = toNumber(params[i].value, 0)
  }
  var configs = uniqueText(skuList.map(function (row) { return row.config }))
  var colors = uniqueText((item && item.colors) || skuList.map(function (row) { return row.color }))
  var highlights = splitHighlights((item && (item.storeInfo || item.description)) || '').slice(0, 2)
  var tags = ['官方正品']
  if (configs.length) tags.push(configs.slice(0, 2).join(' / '))
  if (colors.length) tags.push(colors.length + '色可选')
  return {
    id: item.id,
    title: item.storeName || item.model || '精选数码商品',
    image: item.image || (sku && sku.image) || '',
    price: formatMoney(item.price || sku.priceValue || 0),
    subtitle: highlights.length ? highlights.join(' · ') : (item.brand ? item.brand + ' 官方展示商品' : '到店咨询，支持门店选购'),
    spec: configs.length ? configs.slice(0, 3).join(' / ') : (sku.config || sku.version || '官方正品'),
    skuText: [
      configs.length ? configs.length + '种配置' : '',
      colors.length ? colors.length + '款颜色' : ''
    ].filter(Boolean).join(' · '),
    tags: tags.slice(0, 3),
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
    coverImage: item.image || '',
    points: formatNumber(item.price || item.points || 0) + ' 积分',
    canExchange: item.canExchange !== false
  }
}

function normalizeHomeBanner(item, index) {
  var title = cleanText(item.title)
  var subtitle = cleanText(item.subtitle)
  var titleLength = title.length
  var subtitleLength = subtitle.length
  var copyDensity = ''
  if (titleLength > 18 || subtitleLength > 46 || titleLength + subtitleLength > 60) {
    copyDensity = 'dense'
  } else if (titleLength > 12 || subtitleLength > 28 || titleLength + subtitleLength > 40) {
    copyDensity = 'compact'
  }
  return {
    id: item.id || ('homepage-banner-' + index),
    title: title,
    subtitle: subtitle,
    buttonText: cleanText(item.buttonText),
    copyDensity: copyDensity,
    image: item.image || '',
    targetType: item.targetType === 'tab' ? 'tab' : (item.targetType === 'page' ? 'page' : 'none'),
    targetPath: String(item.targetPath || '').trim()
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
      level: '普通会员',
      integral: '0',
      integralClass: '',
      cashVoucher: '0',
      cashVoucherClass: '',
      validUntil: '--'
    },
    quickEntries: [
      { title: '手机专区', icon: 'icon-shouji', className: 'mint', url: '/pages/jingcheng/showcase/list' },
      { title: '数码好物', icon: 'icon-shangpin', className: 'blue', url: '/pages/jingcheng/showcase/list' },
      { title: '以旧换新', icon: 'icon-gengxinshijian', className: 'gold', url: '/pages/jingcheng/activity/index' },
      { title: '积分商城', icon: 'icon-jifenshangcheng', className: 'orange', url: '/pages/jingcheng/integral/mall' }
    ],
    signDays: [
      { day: '1天', reward: '+10', checked: true, current: true },
      { day: '2天', reward: '+20', checked: true },
      { day: '3天', reward: '+30', checked: false },
      { day: '4天', reward: '+40', checked: false },
      { day: '5天', reward: '+50', checked: false },
      { day: '6天', reward: '+60', checked: false },
      { day: '7天', reward: '+80', checked: false, gift: true }
    ],
    banners: DEFAULT_BANNERS,
    bannerImages: [],
    pointGoods: [],
    pointPages: [],
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
      publicRequest('/api/homepage').catch(function () { return { banners: [] } }),
      publicRequest('/api/products', { data: { page: 1, pageSize: 20, status: 'shown', source: 'vmall-official' } }).catch(function () { return { list: [] } }),
      publicRequest('/api/integral-mall/products').catch(function () { return [] }),
      request('/api/member/assets').catch(function () { return {} }),
      request('/api/user/profile-extra').catch(function () { return {} }),
      request('/api/membership/me').catch(function () { return {} })
    ]).then(function (results) {
      var homepage = results[0] || {}
      var configuredBanners = Array.isArray(homepage.banners) ? homepage.banners.map(normalizeHomeBanner) : []
      var productResult = results[1] || {}
      var productList = Array.isArray(productResult) ? productResult : (productResult.list || [])
      var products = productList.map(normalizeProduct).slice(0, 6)
      var pointGoods = (results[2] || []).map(normalizePointGood).slice(0, 8)
      var assets = results[3] || {}
      var profile = results[4] || {}
      var membership = results[5] || {}
      var storedUser = readStoredUser()
      var integral = formatNumber(assets.integral !== undefined ? assets.integral : 0)
      var cashVoucher = formatMoney(assets.cashVoucher !== undefined ? assets.cashVoucher : 0)
      self.setData({
        products: products,
        pointGoods: pointGoods,
        pointPages: groupPointGoods(pointGoods),
        banners: configuredBanners.length ? configuredBanners : DEFAULT_BANNERS,
        bannerImages: configuredBanners.length ? [] : uniqueImages(pointGoods.concat(products)).slice(0, 4),
        member: {
          avatar: normalizeAvatar(profile.avatar || storedUser.avatar || storedUser.avatarUrl),
          nickname: profile.nickname || storedUser.nickname || storedUser.nickName || '微信会员',
          phone: maskPhone(profile.phone || storedUser.phone),
          level: formatMemberLevel(membership.tierCode),
          integral: integral,
          integralClass: integral.length > 7 ? 'compact' : '',
          cashVoucher: cashVoucher,
          cashVoucherClass: cashVoucher.length > 7 ? 'compact' : '',
          validUntil: formatDate(membership.membershipExpireAt || membership.overdueTime, '--')
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

  openBanner: function (event) {
    var index = Number(event.currentTarget.dataset.index || 0)
    var banner = this.data.banners[index] || {}
    var targetPath = String(banner.targetPath || '').trim()
    if (!targetPath || banner.targetType === 'none') return
    if (banner.targetType === 'tab') {
      wx.switchTab({ url: targetPath.split('?')[0] })
      return
    }
    wx.navigateTo({
      url: targetPath,
      fail: function () {
        wx.showToast({ title: '页面暂时无法打开', icon: 'none' })
      }
    })
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

  goCoupon: function () {
    wx.navigateTo({ url: '/pages/jingcheng/landing/coupon' })
  },

  goQuick: function (event) {
    var url = event.currentTarget.dataset.url
    if (!url) return
    wx.navigateTo({ url: url, fail: function () { wx.switchTab({ url: url }) } })
  },

  openProduct: function (event) {
    var dataset = (event.currentTarget && event.currentTarget.dataset) || (event.target && event.target.dataset) || {}
    var id = dataset.id
    if (!id) {
      wx.showToast({ title: '商品信息缺少ID', icon: 'none' })
      return
    }
    var url = '/pages/jingcheng/showcase/detail?id=' + encodeURIComponent(String(id))
    wx.navigateTo({
      url: url,
      fail: function (err) {
        console.error('open showcase detail failed:', err)
        wx.showToast({ title: '商品详情打开失败', icon: 'none' })
      }
    })
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
