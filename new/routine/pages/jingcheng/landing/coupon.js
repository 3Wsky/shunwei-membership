const { publicRequest } = require('../../../services/jc-request')
const config = require('../../../services/coupon-landing-config')

const DEFAULT_CARD = {
  displayName: '锦程数码',
  jobTitle: '客户经理',
  avatar: '',
  contactPhone: '',
  storeName: '锦程祥瑞数码',
  storeAddress: '新疆乌鲁木齐市米东区米古里商圈',
  storePhone: '',
  businessHours: '',
  wechatQrcode: '',
  latitude: 0,
  longitude: 0
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function formatNumber(value) {
  return String(Math.round(Number(value || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function normalizeSubsidy(value) {
  const subsidy = Number(value || 0)
  return Number.isFinite(subsidy) && subsidy > 0 ? subsidy : 0
}

function calculateSubsidy(item, officialPrice, categoryKey) {
  const eligibleForSubsidy = officialPrice > 0 && officialPrice <= 6000
  const governmentSubsidy = eligibleForSubsidy
    ? Math.min(Math.floor(officialPrice * 0.15), 500)
    : 0
  const configuredStoreSubsidy = normalizeSubsidy(
    item.storeSubsidy || item.shopSubsidy || item.storeDiscount || item.storeSubsidyAmount
  )
  // 6000 元以上不享国补，统一展示 500 元店补，避免后台配置把该档位叠加为其它金额。
  const storeSubsidy = officialPrice > 6000 ? 500 : configuredStoreSubsidy
  const subsidyTotal = governmentSubsidy + storeSubsidy
  const subsidyPrice = officialPrice > 0 ? Math.max(0, officialPrice - subsidyTotal) : 0
  return { governmentSubsidy, storeSubsidy, subsidyTotal, subsidyPrice }
}

function formatSubsidyPrice(subsidyPrice, officialPrice, categoryKey) {
  if (officialPrice > 6000) {
    return '¥' + Math.floor(subsidyPrice / 1000) + '?99起'
  }
  return '¥' + formatNumber(subsidyPrice) + '起'
}

function benefitByPrice(value) {
  const price = Number(value || 0)
  let matched = null
  config.rules.forEach((rule) => {
    if (price >= rule.min) matched = rule
  })
  if (!matched) {
    return { coupon: 0, points: 0, couponText: '到店核算', pointsText: '到店核算', ruleText: '联系客户经理确认' }
  }
  return {
    coupon: matched.coupon,
    points: matched.points,
    couponText: String(matched.coupon),
    pointsText: formatNumber(matched.points),
    ruleText: matched.range
  }
}

function detectCategory(item, categoryNameById) {
  const categoryName = categoryNameById[String(item.categoryId || '')] || ''
  const text = [categoryName, item.category, item.storeName, item.model, item.name, item.title]
    .filter(Boolean).join(' ').toLowerCase()
  if (/大疆|\bdji\b|osmo|pocket|action|无人机|航拍/.test(text)) return 'dji'
  if (/watch|手表|穿戴|freebuds|耳机|手环|band/.test(text)) return 'wearable'
  if (/matepad|平板|tablet/.test(text)) return 'tablet'
  if (/matebook|笔记本|电脑|laptop|notebook|magicbook/.test(text)) return 'laptop'
  return 'phone'
}

function normalizeProduct(item, categoryNameById) {
  const priceValue = Number(item.officialPrice || item.listPrice || item.marketPrice || item.price || item.priceValue || 0)
  const benefit = benefitByPrice(priceValue)
  const categoryKey = detectCategory(item, categoryNameById)
  const subsidy = calculateSubsidy(item, priceValue, categoryKey)
  const tags = Array.isArray(item.tags) ? item.tags : []
  return {
    id: item.id || item.productId,
    name: cleanText(item.storeName || item.name || item.title || item.productName || '热门数码产品'),
    image: item.image || item.cover || item.productImage || '',
    brand: cleanText(item.brand),
    tag: cleanText(tags[0] || item.brand || '热销'),
    categoryKey,
    priceValue,
    officialPriceText: priceValue > 0 ? '¥' + formatNumber(priceValue) + '起' : '到店咨询',
    subsidyPriceText: priceValue > 0 ? formatSubsidyPrice(subsidy.subsidyPrice, priceValue, categoryKey) : '到店咨询',
    subsidyLabel: priceValue > 6000 ? '店补后' : '国补/店补后',
    governmentSubsidy: subsidy.governmentSubsidy,
    storeSubsidy: subsidy.storeSubsidy,
    subsidyTotal: subsidy.subsidyTotal,
    coupon: benefit.coupon,
    points: benefit.points,
    couponText: benefit.couponText,
    pointsText: benefit.pointsText,
    ruleText: benefit.ruleText
  }
}

function buildProductPages(products) {
  const pages = []
  for (let index = 0; index < products.length; index += 4) {
    pages.push({ pageKey: 'page-' + (index / 4), items: products.slice(index, index + 4) })
  }
  return pages
}

function buildCategoryBlocks(products) {
  return config.categories.map((category) => {
    const categoryProducts = products.filter((item) => item.categoryKey === category.key)
    return {
      key: category.key,
      name: category.name,
      subtitle: category.subtitle,
      products: categoryProducts,
      productPages: buildProductPages(categoryProducts)
    }
  })
}

function normalizePointGood(item) {
  return {
    id: item.id,
    title: cleanText(item.title || item.name || '积分好礼'),
    image: item.image || '',
    points: Number(item.price || item.points || 0),
    pointsText: formatNumber(item.price || item.points || 0),
    stockText: item.canExchange === false ? '暂不可兑' : '立即兑换'
  }
}

function merchantType(category) {
  const text = cleanText(category)
  if (/油|加油/.test(text)) return { key: 'gas', text: text || '加油站', icon: 'icon_badge_gas.svg' }
  if (/餐|美食|小吃|火锅/.test(text)) return { key: 'food', text: text || '餐饮', icon: 'icon_badge_food.svg' }
  if (/数码|配件|手机/.test(text)) return { key: 'digital', text: text || '数码配件', icon: 'icon_badge_digital.svg' }
  if (/娱乐|休闲|ktv|影院/i.test(text)) return { key: 'fun', text: text || '休闲娱乐', icon: 'icon_badge_fun.svg' }
  return { key: 'market', text: text || '商超', icon: 'icon_badge_market.svg' }
}

function normalizeMerchant(item) {
  const type = merchantType(item.category)
  return {
    id: item.id || item.merchantId,
    name: cleanText(item.merchantName || item.name),
    category: type.text,
    typeKey: type.key,
    icon: type.icon,
    address: cleanText(item.storeAddress || item.address),
    desc: cleanText(item.supportText || item.businessHours || '支持米东区联盟现金券核销'),
    cover: item.cover || item.coverImage || '',
    latitude: Number(item.latitude || 0),
    longitude: Number(item.longitude || 0),
    couponMax: config.pageInfo.couponMax
  }
}

function buildAdvisorCard(raw) {
  const card = raw && raw.card ? raw.card : (raw || DEFAULT_CARD)
  const displayName = cleanText(card.displayName) || DEFAULT_CARD.displayName
  return {
    displayName,
    initial: displayName.slice(0, 1),
    jobTitle: cleanText(card.jobTitle) || '客户经理',
    avatar: card.avatar || '',
    contactPhone: cleanText(card.contactPhone || card.storePhone),
    storePhone: cleanText(card.storePhone),
    storeName: cleanText(card.storeName) || DEFAULT_CARD.storeName,
    storeAddress: cleanText(card.storeAddress) || DEFAULT_CARD.storeAddress,
    businessHours: cleanText(card.businessHours),
    wechatQrcode: card.wechatQrcode || '',
    latitude: Number(card.latitude || 0),
    longitude: Number(card.longitude || 0)
  }
}

function relativeTimeText(value, fallback) {
  const timestamp = Number(value || 0)
  if (!timestamp) return fallback || '刚刚'
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp)
  if (seconds < 60) return '刚刚'
  if (seconds < 3600) return Math.ceil(seconds / 60) + '分钟前'
  if (seconds < 86400) return Math.ceil(seconds / 3600) + '小时前'
  return '刚刚'
}

function parseVirtualBenefits(content) {
  const text = String(content || '')
  const voucher = text.match(/(\d+)\s*元现金券/)
  const points = text.match(/(\d+)\s*积分/)
  return {
    voucherAmount: voucher ? Number(voucher[1]) : 0,
    points: points ? Number(points[1]) : 0
  }
}

function normalizeVirtualFeed(item, index) {
  const benefits = parseVirtualBenefits(item.content)
  return {
    feedId: 'virtual-' + (item.id || index),
    userName: cleanText(item.userMasked) || '会员',
    event: cleanText(item.content) || '正在领取活动权益',
    voucherAmount: benefits.voucherAmount,
    pointsText: benefits.points ? formatNumber(benefits.points) : '',
    pointsPrefix: '+',
    timeText: cleanText(item.timeText) || '刚刚'
  }
}

function normalizeRealFeed(item, index) {
  const isApproval = item.type === 'approval'
  const points = Number(item.points || 0)
  return {
    feedId: cleanText(item.id) || 'real-' + index,
    userName: cleanText(item.customerNickname) || '微信用户',
    event: isApproval
      ? '购买 ' + (cleanText(item.productModel) || '购机产品')
      : '兑换 ' + (cleanText(item.productName) || '积分好礼'),
    voucherAmount: Number(item.voucherAmount || 0),
    pointsText: points ? formatNumber(points) : '',
    pointsPrefix: isApproval ? '+' : '-',
    timeText: relativeTimeText(item.occurredAt)
  }
}

function buildLiveFeed(realItems) {
  const realFeed = (Array.isArray(realItems) ? realItems : []).map(normalizeRealFeed)
  const virtualFeed = (config.liveFeed || []).map(normalizeVirtualFeed)
  const feed = []
  const count = Math.max(realFeed.length, virtualFeed.length)
  for (let index = 0; index < count; index += 1) {
    if (realFeed[index]) feed.push(realFeed[index])
    if (virtualFeed[index]) feed.push(virtualFeed[index])
  }
  return feed.slice(0, 24)
}

function buildLiveFeedLoop(feed) {
  const source = Array.isArray(feed) ? feed : []
  return source.concat(source.slice(0, 2)).map((item, index) => ({ ...item, loopKey: item.feedId + '-' + index }))
}

Page({
  data: {
    config,
    assetBase: '/static/images/midong-union/',
    loading: true,
    categoryBlocks: [],
    pointsGoods: [],
    merchants: [],
    featuredMerchant: null,
    otherMerchants: [],
    advisorPopupOpen: false,
    advisorAssigned: false,
    advisorCard: buildAdvisorCard(null),
    claimLoading: false,
    entranceReady: false,
    showStickyCta: false,
    finalCtaVisible: false,
    faqOpen: -1,
    visibleSectionMap: { intro: true, products: false, points: false, merchants: false },
    animatedStats: { exchanged: 0, claimed: 0 },
    liveFeed: [],
    liveFeedLoop: [],
    liveFeedOffset: 0,
    liveFeedTransition: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: config.pageTitle })
    this.successAudio = wx.createInnerAudioContext()
    this.successAudio.src = '/pages/jingcheng/static/audio/ding.wav'
    this.successAudio.volume = 0.35
    setTimeout(() => this.setData({ entranceReady: true }), 60)
    this.loadData()
  },

  onReady() {
    this.setupObservers()
  },

  onUnload() {
    ;(this.sectionObservers || []).forEach((observer) => observer.disconnect())
    if (this.statsTimer) clearInterval(this.statsTimer)
    if (this.claimTimer) clearTimeout(this.claimTimer)
    this.stopLiveFeed()
    if (this.successAudio && this.successAudio.destroy) this.successAudio.destroy()
  },

  onPageScroll(event) {
    const shouldShow = event.scrollTop > 520 && !this.data.finalCtaVisible
    if (shouldShow !== this.data.showStickyCta) this.setData({ showStickyCta: shouldShow })
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh())
  },

  loadData() {
    this.setData({ loading: true })
    return Promise.all([
      publicRequest('/api/products', { data: { status: 'shown' } }).catch(() => ({ list: [] })),
      publicRequest('/api/product-categories').catch(() => []),
      publicRequest('/api/merchants/public', { data: { limit: 12 } }).catch(() => []),
      publicRequest('/api/integral-mall/products').catch(() => []),
      publicRequest('/api/landing/coupon/manager-card').catch(() => ({ card: DEFAULT_CARD })),
      publicRequest('/api/landing/coupon/live-feed', { data: { limit: 10 } }).catch(() => ({ list: [] }))
    ]).then((results) => {
      const productData = results[0] || {}
      const rawProducts = Array.isArray(productData) ? productData : (productData.list || [])
      const categories = Array.isArray(results[1]) ? results[1] : []
      const categoryNameById = {}
      categories.forEach((category) => { categoryNameById[String(category.id)] = cleanText(category.name) })
      const products = rawProducts.map((item) => normalizeProduct(item, categoryNameById))
      const merchantData = results[2] || []
      const merchants = (Array.isArray(merchantData) ? merchantData : (merchantData.list || [])).map(normalizeMerchant).slice(0, 8)
      const pointData = results[3] || []
      const pointsGoods = (Array.isArray(pointData) ? pointData : (pointData.list || [])).map(normalizePointGood).slice(0, 8)
      const advisorCard = buildAdvisorCard(results[4])
      const feedData = results[5] || {}
      const liveFeed = buildLiveFeed(feedData.list)
      this.setData({
        categoryBlocks: buildCategoryBlocks(products),
        pointsGoods,
        merchants,
        featuredMerchant: merchants[0] || null,
        otherMerchants: merchants.slice(1),
        advisorCard,
        advisorAssigned: Boolean(results[4] && results[4].card),
        liveFeed,
        liveFeedLoop: buildLiveFeedLoop(liveFeed),
        liveFeedOffset: 0,
        liveFeedTransition: false,
        loading: false
      }, () => this.startLiveFeed())
    }).catch(() => this.setData({ loading: false }))
  },

  startLiveFeed() {
    this.stopLiveFeed()
    if (this.data.liveFeed.length < 2) return
    this.liveFeedIndex = 0
    this.liveFeedTimer = setInterval(() => this.advanceLiveFeed(), 2600)
    this.liveFeedEnableTimer = setTimeout(() => this.setData({ liveFeedTransition: true }), 30)
  },

  stopLiveFeed() {
    if (this.liveFeedTimer) clearInterval(this.liveFeedTimer)
    if (this.liveFeedResetTimer) clearTimeout(this.liveFeedResetTimer)
    if (this.liveFeedEnableTimer) clearTimeout(this.liveFeedEnableTimer)
    this.liveFeedTimer = null
    this.liveFeedResetTimer = null
    this.liveFeedEnableTimer = null
  },

  advanceLiveFeed() {
    const length = this.data.liveFeed.length
    if (length < 2) return
    const next = (this.liveFeedIndex || 0) + 1
    this.liveFeedIndex = next
    this.setData({ liveFeedTransition: true, liveFeedOffset: next * 88 })
    if (next !== length) return
    this.liveFeedResetTimer = setTimeout(() => {
      this.liveFeedIndex = 0
      this.setData({ liveFeedTransition: false, liveFeedOffset: 0 })
      this.liveFeedEnableTimer = setTimeout(() => this.setData({ liveFeedTransition: true }), 30)
    }, 480)
  },

  setupObservers() {
    this.sectionObservers = []
    ;['products', 'points', 'merchants'].forEach((key) => {
      const observer = this.createIntersectionObserver({ thresholds: [0.12] })
      observer.relativeToViewport({ bottom: -80 }).observe('#section-' + key, (result) => {
        if (result.intersectionRatio > 0) {
          const path = 'visibleSectionMap.' + key
          this.setData({ [path]: true })
          if (key === 'points') this.animateStats()
          observer.disconnect()
        }
      })
      this.sectionObservers.push(observer)
    })
    const finalObserver = this.createIntersectionObserver({ thresholds: [0.05] })
    finalObserver.relativeToViewport().observe('#finalCta', (result) => {
      const visible = result.intersectionRatio > 0
      this.setData({ finalCtaVisible: visible, showStickyCta: visible ? false : this.data.showStickyCta })
    })
    this.sectionObservers.push(finalObserver)
  },

  animateStats() {
    if (this.statsAnimated) return
    this.statsAnimated = true
    const target = config.todayStats
    let frame = 0
    this.statsTimer = setInterval(() => {
      frame += 1
      const progress = Math.min(1, frame / 24)
      const eased = 1 - Math.pow(1 - progress, 3)
      this.setData({
        animatedStats: {
          exchanged: Math.round(target.exchanged * eased),
          claimed: Math.round(target.claimed * eased)
        }
      })
      if (progress >= 1) {
        clearInterval(this.statsTimer)
        this.statsTimer = null
      }
    }, 36)
  },

  claimCoupon() {
    if (this.data.claimLoading) return
    this.setData({ claimLoading: true })
    try { if (wx.vibrateShort) wx.vibrateShort({ type: 'light' }) } catch (error) {}
    const open = (card) => {
      this.setData({ advisorCard: buildAdvisorCard(card), advisorPopupOpen: true, advisorAssigned: true })
      if (this.successAudio) this.successAudio.play()
    }
    this.claimTimer = setTimeout(() => {
      const task = this.data.advisorAssigned
        ? Promise.resolve(this.data.advisorCard)
        : publicRequest('/api/landing/coupon/manager-card').catch(() => ({ card: DEFAULT_CARD }))
      task.then(open).finally(() => {
        this.claimTimer = null
        this.setData({ claimLoading: false })
      })
    }, 260)
  },

  closeAdvisorPopup() { this.setData({ advisorPopupOpen: false }) },

  openAdvisorCard() {
    const show = (card) => {
      this.setData({
        advisorCard: buildAdvisorCard(card),
        advisorPopupOpen: true,
        advisorAssigned: true
      })
    }
    if (this.data.advisorAssigned) return show(this.data.advisorCard)
    publicRequest('/api/landing/coupon/manager-card')
      .then(show)
      .catch(() => show(DEFAULT_CARD))
  },

  openProduct() {
    this.openAdvisorCard()
  },

  openPointGood() {
    this.openAdvisorCard()
  },

  openMerchant(event) {
    const id = String(event.currentTarget.dataset.id || '')
    const item = this.data.merchants.find((merchant) => String(merchant.id) === id)
    if (!item) return
    if (item.latitude && item.longitude) {
      wx.openLocation({ latitude: item.latitude, longitude: item.longitude, name: item.name, address: item.address })
      return
    }
    if (item.address) wx.setClipboardData({ data: item.address })
  },

  toggleFaq(event) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({ faqOpen: this.data.faqOpen === index ? -1 : index })
  },

  callAdvisor() {
    const card = this.data.advisorCard || {}
    const phone = card.contactPhone || card.storePhone
    if (!phone) return wx.showToast({ title: '联系电话正在维护中', icon: 'none' })
    wx.makePhoneCall({ phoneNumber: phone })
  },

  openAdvisorLocation() {
    const card = this.data.advisorCard || {}
    if (card.latitude && card.longitude) {
      wx.openLocation({ latitude: card.latitude, longitude: card.longitude, name: card.storeName, address: card.storeAddress })
      return
    }
    if (card.storeAddress) wx.setClipboardData({ data: card.storeAddress })
  },

  onShareAppMessage() {
    return { title: '到店购机，最高送800元米东区联盟现金券', path: '/pages/jingcheng/landing/coupon' }
  },

  onShareTimeline() {
    return { title: '到店购机，赠券到店花｜米东区联盟现金券' }
  }
})
