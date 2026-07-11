const { publicRequest } = require('../../services/jc-request')

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function cover(product) {
  return product.recommendImage || product.image || (product.sliderImages && product.sliderImages[0]) || ''
}

function formatPrice(product) {
  if (product.priceText) return String(product.priceText).replace(/^¥/, '')
  const price = Number(product.price || 0)
  if (!price) return '到店咨询'
  return price.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function productView(product) {
  const skuList = Array.isArray(product.skuPrices) ? product.skuPrices : []
  const configs = []
  const seen = {}
  skuList.forEach((sku) => {
    const value = cleanText(sku.config || sku.version)
    if (!value || seen[value]) return
    seen[value] = true
    configs.push(value)
  })
  const colors = Array.isArray(product.colors) ? product.colors.filter(Boolean) : []
  const badges = []
  if (product.isNew) badges.push('新品')
  if (product.isHot) badges.push('热卖')
  if (product.isBest) badges.push('精选')
  return {
    ...product,
    displayName: product.storeName || product.model || '数码商品',
    displayImage: cover(product),
    displayPrice: formatPrice(product),
    priceAvailable: Number(product.price || 0) > 0,
    badges: badges.slice(0, 2),
    meta: [
      configs.length ? configs.length + '种配置' : '',
      colors.length ? colors.length + '款颜色' : ''
    ].filter(Boolean).join(' · ')
  }
}

Page({
  data: {
    categories: [],
    activeCategoryId: '',
    activeCategoryName: '全部商品',
    keyword: '',
    totalProductCount: 0,
    products: [],
    loading: true,
    errorText: ''
  },

  onLoad() {
    wx.hideTabBar({ fail: function () {} })
    this.loadCategories()
    this.loadProducts()
  },

  onShow() {
    wx.hideTabBar({ fail: function () {} })
  },

  onPullDownRefresh() {
    Promise.all([this.loadCategories(), this.loadProducts()])
      .finally(() => wx.stopPullDownRefresh())
  },

  loadCategories() {
    return publicRequest('/api/product-categories')
      .then((rows) => {
        const remote = Array.isArray(rows) ? rows : []
        const tones = ['coral', 'mint', 'blue', 'gold', 'rose', 'lilac']
        const categories = [{ id: '', name: '全部', productCount: this.data.totalProductCount, shortName: '全', tone: 'coral' }]
          .concat(remote.map((item, index) => ({
            ...item,
            shortName: cleanText(item.name).slice(0, 1) || '品',
            tone: tones[(index + 1) % tones.length]
          })))
        this.setData({ categories })
      })
      .catch(() => {
        this.setData({ categories: [{ id: '', name: '全部', productCount: 0, shortName: '全', tone: 'coral' }] })
      })
  },

  loadProducts() {
    const requestId = Date.now() + Math.random()
    this._productRequestId = requestId
    const data = { status: 'shown' }
    if (this.data.activeCategoryId) data.categoryId = this.data.activeCategoryId
    if (cleanText(this.data.keyword)) data.keyword = cleanText(this.data.keyword)

    this.setData({ loading: true, errorText: '' })
    return publicRequest('/api/products', { data })
      .then((result) => {
        if (this._productRequestId !== requestId) return
        const products = ((result && result.list) || []).map(productView)
        const isFullCatalog = !this.data.activeCategoryId && !cleanText(this.data.keyword)
        const categories = this.data.categories.map((item, index) => (
          index === 0 && isFullCatalog
            ? { ...item, productCount: products.length }
            : item
        ))
        this.setData({
          products,
          categories,
          totalProductCount: isFullCatalog ? products.length : this.data.totalProductCount
        })
      })
      .catch((error) => {
        if (this._productRequestId !== requestId) return
        this.setData({ products: [], errorText: error.message || '商品加载失败' })
      })
      .finally(() => {
        if (this._productRequestId === requestId) this.setData({ loading: false })
      })
  },

  selectCategory(event) {
    const dataset = event.currentTarget.dataset || {}
    const id = dataset.id || ''
    if (id === this.data.activeCategoryId) return
    this.setData({
      activeCategoryId: id,
      activeCategoryName: dataset.name || '全部商品'
    })
    this.loadProducts()
  },

  onSearchInput(event) {
    this.setData({ keyword: event.detail.value })
  },

  submitSearch() {
    this.loadProducts()
  },

  clearSearch() {
    if (!this.data.keyword) return
    this.setData({ keyword: '' })
    this.loadProducts()
  },

  openProduct(event) {
    const id = event.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/jingcheng/showcase/detail?id=' + encodeURIComponent(String(id)) })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goPointsMall() {
    wx.navigateTo({ url: '/pages/jingcheng/integral/mall' })
  },

  goMine() {
    wx.switchTab({ url: '/pages/user/index' })
  }
})
