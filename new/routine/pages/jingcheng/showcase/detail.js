const { publicRequest, request } = require('../../../services/jc-request')

const DEFAULT_STORE_CARD = {
  bound: false,
  card: {
    displayName: '锦程祥瑞数码',
    jobTitle: '门店顾问',
    storeName: '锦程祥瑞数码',
    storeAddress: '新疆乌鲁木齐市米东区米古里商圈',
    storePhone: ''
  }
}

const WEAK_PARAM_NAMES = {
  '好评率': true,
  '评价数': true,
  'SKU 数量': true,
  'SKU数量': true
}

function gallery(product) {
  if (Array.isArray(product.sliderImages) && product.sliderImages.length) return product.sliderImages
  if (product.image) return [product.image]
  return []
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function uniqueText(list) {
  const seen = {}
  const result = []
  ;(list || []).forEach((value) => {
    const text = cleanText(value)
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

function priceLabel(value) {
  const price = Number(value || 0)
  return price > 0 ? '¥' + price : '到店咨询'
}

function priceRange(list, fallbackPrice) {
  const prices = (list || []).map((item) => Number(item.priceValue || item.price || 0)).filter((price) => price > 0)
  if (!prices.length) return priceLabel(fallbackPrice)
  const min = Math.min.apply(null, prices)
  const max = Math.max.apply(null, prices)
  return min === max ? '¥' + min : '¥' + min + ' - ¥' + max
}

function configName(version, color, colors) {
  const raw = cleanText(version)
  if (!raw) return ''
  const allColors = uniqueText((colors || []).concat(color || [])).sort((a, b) => b.length - a.length)
  const matchedColor = allColors.find((item) => raw === item || raw.indexOf(item) !== -1)
  if (!matchedColor) return raw
  return cleanText(raw.replace(matchedColor, '')) || raw
}

function skuRows(product) {
  const list = Array.isArray(product.skuPrices) ? product.skuPrices : []
  const colors = uniqueText((product.colors || []).concat((product.colorItems || []).map((item) => item.name)))
  return list.map((item) => ({
    version: item.version || [item.config, item.color].filter(Boolean).join(' '),
    // 旧采集数据可能只保存了“128GB 曜金黑”这类完整 SKU 名称。
    // 展示时去掉颜色，保证版本选择只显示一次“128GB”。
    config: cleanText(item.config) || configName(item.version, item.color, colors.concat(item.colors || [])),
    color: item.color || '',
    image: item.image || '',
    sbomCode: item.sbomCode || '',
    priceValue: Number(item.priceValue || 0),
    price: item.price || priceLabel(item.priceValue)
  })).filter((item) => item.version || item.config || item.color)
}

function findColorImage(product, color, rows) {
  const colorItems = Array.isArray(product.colorItems) ? product.colorItems : []
  const colorItem = colorItems.find((item) => item.name === color)
  if (colorItem && colorItem.image) return colorItem.image
  const row = rows.find((item) => item.color === color && item.image)
  return row ? row.image : ''
}

function skuGroups(product) {
  const rows = skuRows(product)
  const colorOrder = uniqueText((product.colors || []).concat(rows.map((row) => row.color)))
  const groups = colorOrder.length ? colorOrder : ['默认款']
  return groups.map((color) => {
    const matched = rows.filter((row) => color === '默认款' ? !row.color : row.color === color)
    const items = matched.length ? matched : (color === '默认款' ? rows : [])
    const configs = items.map((row) => ({
      name: row.config || row.version || '默认配置',
      version: row.version || [row.config, row.color].filter(Boolean).join(' '),
      price: row.price,
      priceValue: row.priceValue,
      image: row.image,
      color: row.color,
      sbomCode: row.sbomCode || ''
    }))
    return {
      color,
      image: findColorImage(product, color, rows),
      count: configs.length,
      priceRange: priceRange(items, product.price),
      configs
    }
  }).filter((group) => group.configs.length)
}

function buildHighlights(product) {
  const direct = Array.isArray(product.features) ? product.features : []
  return uniqueText(direct.concat(splitHighlights(product.storeInfo || product.description))).slice(0, 10).map((text, index) => ({
    text,
    className: 'cloud-' + (index % 6)
  }))
}

function buildSummary(product, rows) {
  const configs = uniqueText(rows.map((item) => item.config))
  const colors = uniqueText((product.colors || []).concat(rows.map((item) => item.color)))
  return [
    colors.length ? colors.length + '款颜色' : '',
    configs.length ? configs.length + '种配置' : '',
    product.priceStatus === 'available' ? '价格已同步' : ''
  ].filter(Boolean)
}

function colorOptions(product, rows) {
  const colors = uniqueText((product.colorItems || []).map((item) => item.name).concat(product.colors || [], rows.map((row) => row.color)))
  return colors.map((name) => ({
    name,
    image: findColorImage(product, name, rows)
  })).filter((item) => item.name)
}

function configOptions(rows) {
  // 配置与颜色是两个独立维度：同一配置只显示一次，价格对所有颜色一致。
  const names = uniqueText(rows.map((row) => row.config || row.version))
  return names.map((name) => {
    const row = rows.find((item) => (item.config || item.version) === name) || {}
    return {
      name,
      price: row.price || '',
      priceValue: row.priceValue || 0
    }
  }).filter((item) => item.name)
}

function findSelectedSku(rows, color, config) {
  return rows.find((row) => row.color === color && (row.config === config || row.version === config)) ||
    rows.find((row) => row.color === color) ||
    rows.find((row) => row.config === config || row.version === config) ||
    rows[0] ||
    null
}

function meaningfulParams(product, rows) {
  const params = Array.isArray(product.paramsList) ? product.paramsList : []
  const filtered = params
    .filter((item) => item && item.name && item.value && !WEAK_PARAM_NAMES[item.name])
    .map((item) => ({ name: item.name, value: item.value }))

  const configs = uniqueText(rows.map((row) => row.config))
  const colors = uniqueText((product.colors || []).concat(rows.map((row) => row.color)))
  const fallback = [
    product.brand ? { name: '品牌', value: product.brand } : null,
    product.model ? { name: '型号', value: product.model } : null,
    colors.length ? { name: '可选颜色', value: colors.join(' / ') } : null,
    configs.length ? { name: '可选版本', value: configs.join(' / ') } : null,
    product.unitName ? { name: '销售单位', value: product.unitName } : null
  ].filter(Boolean)

  return filtered.length ? filtered.concat(fallback).slice(0, 12) : fallback.slice(0, 12)
}

function buildAdvisorCard(result, selectedSku) {
  const data = result && result.card ? result : DEFAULT_STORE_CARD
  const card = data.card || DEFAULT_STORE_CARD.card
  return {
    bound: !!data.bound,
    displayName: card.displayName || DEFAULT_STORE_CARD.card.displayName,
    initial: (card.displayName || DEFAULT_STORE_CARD.card.displayName).slice(0, 1),
    jobTitle: card.jobTitle || DEFAULT_STORE_CARD.card.jobTitle,
    avatar: card.avatar || '',
    storeName: card.storeName || DEFAULT_STORE_CARD.card.storeName,
    storeAddress: card.storeAddress || DEFAULT_STORE_CARD.card.storeAddress,
    storePhone: card.storePhone || '',
    businessHours: card.businessHours || '',
    selectedText: selectedSku ? [selectedSku.color, selectedSku.config || selectedSku.version, selectedSku.price].filter(Boolean).join(' · ') : ''
  }
}

Page({
  data: {
    product: null,
    title: '',
    subtitle: '',
    priceLabel: '',
    gallery: [],
    highlights: [],
    skuSummary: [],
    colorItems: [],
    skuRows: [],
    skuGroups: [],
    colorOptions: [],
    configOptions: [],
    activeColor: '',
    activeConfig: '',
    selectedSku: null,
    wearableStyle: '',
    paramList: [],
    specEntries: [],
    detailImages: [],
    skuDrawerOpen: false,
    advisorPopupOpen: false,
    advisorCard: DEFAULT_STORE_CARD.card,
    favorite: false,
    loading: true
  },
  onLoad(query) {
    const id = query && query.id
    if (!id) {
      this.setData({ loading: false })
      return
    }
    publicRequest('/api/products/' + id)
      .then((product) => {
        const specs = product.specs && typeof product.specs === 'object' ? product.specs : {}
        const rows = skuRows(product)
        const groups = skuGroups(product)
        const colors = colorOptions(product, rows)
        const activeColor = colors[0] ? colors[0].name : ''
        const configs = configOptions(rows)
        const activeConfig = configs[0] ? configs[0].name : ''
        const selectedSku = findSelectedSku(rows, activeColor, activeConfig)
        this.setData({
          product,
          title: product.storeName || product.model || product.title || '商品',
          subtitle: product.storeInfo || product.info || '',
          priceLabel: priceRange(product.skuPrices, product.price),
          gallery: gallery(product),
          highlights: buildHighlights(product),
          skuSummary: buildSummary(product, rows),
          colorItems: Array.isArray(product.colorItems) ? product.colorItems : [],
          skuRows: rows,
          skuGroups: groups,
          colorOptions: colors,
          configOptions: configs,
          activeColor,
          activeConfig,
          selectedSku,
          wearableStyle: cleanText(product.styleName),
          paramList: meaningfulParams(product, rows),
          specEntries: Object.keys(specs).map((key) => ({ key, value: specs[key] })),
          detailImages: Array.isArray(product.detailImages) ? product.detailImages : []
        })
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  },
  selectColor(e) {
    const color = e.currentTarget.dataset.name || ''
    this.setData({
      activeColor: color,
      selectedSku: findSelectedSku(this.data.skuRows, color, this.data.activeConfig)
    })
  },
  selectConfig(e) {
    const config = e.currentTarget.dataset.name || ''
    this.setData({
      activeConfig: config,
      selectedSku: findSelectedSku(this.data.skuRows, this.data.activeColor, config)
    })
  },
  toggleFavorite() {
    const next = !this.data.favorite
    this.setData({ favorite: next })
    wx.showToast({ title: next ? '已收藏' : '已取消收藏', icon: 'none' })
  },
  openSkuDrawer() {
    this.setData({ skuDrawerOpen: true })
  },
  closeSkuDrawer() {
    this.setData({ skuDrawerOpen: false })
  },
  confirmBuy() {
    const selectedSku = this.data.selectedSku
    wx.showLoading({ title: '正在匹配顾问' })
    request('/api/staff/my-manager-card')
      .catch(() => DEFAULT_STORE_CARD)
      .then((result) => {
        const displayResult = result && result.card ? result : DEFAULT_STORE_CARD
        wx.hideLoading()
        this.setData({
          advisorCard: buildAdvisorCard(displayResult, selectedSku),
          advisorPopupOpen: true
        })
      })
      .finally(() => {
        this.setData({ skuDrawerOpen: false })
      })
  },
  closeAdvisorPopup() {
    this.setData({ advisorPopupOpen: false })
  },
  callAdvisor() {
    const phone = this.data.advisorCard && this.data.advisorCard.storePhone
    if (!phone) {
      wx.showToast({ title: '暂无联系电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },
  copyStoreAddress() {
    const address = this.data.advisorCard && this.data.advisorCard.storeAddress
    if (!address) return
    wx.setClipboardData({ data: address })
  }
})
