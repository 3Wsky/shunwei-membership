const { publicRequest } = require('../../../services/jc-request')
const config = require('../../../services/coupon-landing-config')

function pickName(item) {
  return item.storeName || item.name || item.title || item.productName || '活动商品'
}

function pickImage(item) {
  return item.image || item.cover || item.productImage || ''
}

function matchTab(product, tabs) {
  const text = [
    pickName(product),
    product.brand || '',
    product.model || '',
    product.category || '',
    product.categoryName || ''
  ].join(' ').toLowerCase()
  for (let i = 0; i < tabs.length; i += 1) {
    const tab = tabs[i]
    for (let j = 0; j < tab.keywords.length; j += 1) {
      if (text.indexOf(String(tab.keywords[j]).toLowerCase()) >= 0) return tab.name
    }
  }
  return tabs[0].name
}

function benefitByPrice(price, rules) {
  const value = Number(price || 0)
  if (!value) return { points: 299000, couponText: '最高800元现金券' }
  for (let i = rules.length - 1; i >= 0; i -= 1) {
    const rule = rules[i]
    if (value >= Number(rule.min || 0)) {
      return {
        points: rule.points,
        couponText: '最高' + rule.coupon + '元现金券'
      }
    }
  }
  return { points: rules[0].points, couponText: '最高' + rules[0].coupon + '元现金券' }
}

function normalizeProduct(item, tabs, rules) {
  const benefit = benefitByPrice(item.price || item.priceValue, rules)
  return {
    id: item.id || item.productId,
    name: pickName(item),
    image: pickImage(item),
    brand: item.brand || '',
    category: matchTab(item, tabs),
    benefitTag: '支持消费券活动',
    pointsReward: benefit.points,
    cashCouponText: benefit.couponText,
    suitableFor: (item.features && item.features[0]) || item.storeInfo || '到店选购 / 换新咨询',
    ctaText: '咨询当前活动价'
  }
}

function normalizePointGood(item) {
  return {
    id: item.id,
    title: item.title || item.name || '积分好物',
    image: item.image || '',
    price: Number(item.price || 0),
    stockText: item.canExchange === false ? '暂不可兑' : '可兑换'
  }
}

function buildProductSections(products, tabs) {
  return tabs.map((tab) => {
    const list = products.filter((item) => item.category === tab.name).slice(0, 6)
    return {
      name: tab.name,
      count: list.length,
      countText: list.length ? list.length + '款' : '待上架',
      products: list
    }
  })
}

function normalizeMerchant(item) {
  const rawCategory = item.category || '生活服务'
  let category = rawCategory
  if (rawCategory.indexOf('加油') >= 0) category = '加油'
  else if (rawCategory.indexOf('餐') >= 0) category = '餐饮'
  else if (rawCategory.indexOf('超') >= 0 || rawCategory.indexOf('便利') >= 0) category = '商超'
  return {
    id: item.id || item.merchantId,
    merchantName: item.merchantName || item.name || '',
    category,
    rawCategory,
    cover: item.cover || item.coverImage || '',
    storeAddress: item.storeAddress || item.address || '',
    contactPhone: item.contactPhone || item.phone || '',
    latitude: Number(item.latitude || 0),
    longitude: Number(item.longitude || 0),
    supportText: item.supportText || '支持米东区联盟消费券核销',
    businessHours: item.businessHours || ''
  }
}

Page({
  data: {
    config,
    loading: true,
    productTabs: config.productTabs,
    merchantTabs: config.merchantTabs,
    activeMerchantTab: '全部',
    allProducts: [],
    productSections: [],
    pointsGoods: [],
    allMerchants: [],
    visibleMerchants: [],
    errorText: ''
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '米东区联盟消费券' })
    this.track('landing_page_view')
    this.loadData()
    this.engagedTimer = setTimeout(() => {
      this.track('page_engaged_15s')
    }, 15000)
  },

  onUnload() {
    if (this.engagedTimer) clearTimeout(this.engagedTimer)
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh())
  },

  loadData() {
    this.setData({ loading: true, errorText: '' })
    return Promise.all([
      publicRequest('/api/products', { data: { page: 1, pageSize: 50, status: 'shown', source: 'vmall-official' } }).catch(() => ({ list: [] })),
      publicRequest('/api/integral-mall/products').catch(() => []),
      publicRequest('/api/merchants/public', { data: { limit: 30 } }).catch(() => [])
    ]).then((results) => {
      const productsData = results[0] || {}
      const rawProducts = Array.isArray(productsData)
        ? productsData
        : (productsData.list || (productsData.data && productsData.data.list) || [])
      const products = rawProducts.map((item) => normalizeProduct(item, config.productTabs, config.rules))
      const pointsGoods = (results[1] || []).map(normalizePointGood).slice(0, 12)
      const merchants = (results[2] || []).map(normalizeMerchant)
      this.setData({
        allProducts: products,
        productSections: buildProductSections(products, config.productTabs),
        pointsGoods,
        allMerchants: merchants,
        loading: false
      })
      this.refreshMerchants()
    }).catch((err) => {
      this.setData({
        loading: false,
        errorText: err && err.message ? err.message : '网络异常，请稍后重试'
      })
    })
  },

  refreshMerchants() {
    const active = this.data.activeMerchantTab
    const list = this.data.allMerchants.filter((item) => active === '全部' || item.category === active)
    this.setData({ visibleMerchants: list.slice(0, 8) })
  },

  selectMerchantTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeMerchantTab: tab })
    this.track('merchant_category_click', { category: tab })
    this.refreshMerchants()
  },

  scrollTo(e) {
    const target = e.currentTarget.dataset.target
    if (target === config.sections.rules) this.track('rule_click')
    wx.pageScrollTo({ selector: '#' + target, duration: 260, offsetTop: 8 })
  },

  consultProduct(e) {
    const item = e.currentTarget.dataset.item || {}
    this.track('product_consult_click', { productId: item.id, productName: item.name })
    this.contact()
  },

  openPointGood(e) {
    const item = e.currentTarget.dataset.item || {}
    this.track('points_goods_click', { productId: item.id, productName: item.title })
    if (item.id) wx.navigateTo({ url: '/pages/jingcheng/integral/detail?id=' + item.id })
    else this.goIntegralMall()
  },

  goIntegralMall() {
    this.track('points_mall_click')
    wx.navigateTo({ url: '/pages/jingcheng/integral/mall' })
  },

  goProducts() {
    this.track('bottom_product_click')
    wx.pageScrollTo({ selector: '#' + config.sections.products, duration: 260, offsetTop: 8 })
  },

  contact() {
    this.track('contact_click')
    const phone = config.contact.phone
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone })
      return
    }
    wx.showToast({ title: '请到店咨询活动福利', icon: 'none' })
  },

  storeVisit() {
    this.track('store_visit_intent')
    if (config.contact.latitude && config.contact.longitude) {
      wx.openLocation({
        latitude: Number(config.contact.latitude),
        longitude: Number(config.contact.longitude),
        name: config.contact.storeName,
        address: config.contact.storeAddress
      })
      return
    }
    this.contact()
  },

  navigateMerchant(e) {
    const item = e.currentTarget.dataset.item || {}
    this.track('merchant_nav_click', { merchantId: item.id, merchantName: item.merchantName })
    if (item.latitude && item.longitude) {
      wx.openLocation({
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        name: item.merchantName,
        address: item.storeAddress
      })
      return
    }
    if (item.storeAddress) {
      wx.setClipboardData({ data: item.storeAddress })
      return
    }
    wx.showToast({ title: '商家地址维护中', icon: 'none' })
  },

  retry() {
    this.loadData()
  },

  track(name, payload) {
    console.log('[landing-track]', name, payload || {})
  },

  onShareAppMessage() {
    return {
      title: '米东区联盟消费券，购数码产品可享福利',
      path: '/pages/jingcheng/landing/coupon'
    }
  }
})
