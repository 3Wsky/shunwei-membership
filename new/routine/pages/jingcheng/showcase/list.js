const { publicRequest } = require('../../../services/jc-request')

function title(item) {
  return item.storeName || item.model || item.title || '商品'
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

function cover(item) {
  return item.image || (item.sliderImages && item.sliderImages[0]) || ''
}

function priceLabel(item) {
  if (item.priceText) return item.priceText
  const price = Number(item.price || 0)
  return price > 0 ? `¥${price}` : '到店咨询'
}

function productMeta(item) {
  const skuList = Array.isArray(item.skuPrices) ? item.skuPrices : []
  const configs = uniqueText(skuList.map((row) => row.config))
  const colors = uniqueText(item.colors || skuList.map((row) => row.color))
  return {
    subtitle: splitHighlights(item.storeInfo || item.description).slice(0, 2).join(' · ') || '到店咨询，支持门店选购',
    skuSummary: [
      configs.length ? `${configs.length}种配置` : '',
      colors.length ? `${colors.length}款颜色` : ''
    ].filter(Boolean).join(' · '),
    tags: ['官方正品']
      .concat(configs.length ? [configs.slice(0, 2).join(' / ')] : [])
      .concat(colors.length ? [`${colors.length}色可选`] : [])
      .slice(0, 3)
  }
}

Page({
  data: {
    list: [],
    loading: true,
    page: 1,
    noMore: false
  },
  onLoad() {
    this.load(true)
  },
  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) this.load(false)
  },
  onPullDownRefresh() {
    this.setData({ page: 1, noMore: false })
    this.load(true).finally(() => wx.stopPullDownRefresh())
  },
  load(reset) {
    if (this.data.loading && !reset) return
    const page = reset ? 1 : this.data.page
    this.setData({ loading: true })
    return publicRequest('/api/products', { data: { page, pageSize: 20, status: 'shown', source: 'vmall-official' } })
      .then((data) => {
        const rows = (data.list || []).map((item) => ({
          ...item,
          ...productMeta(item),
          displayTitle: title(item),
          displayCover: cover(item),
          displayPrice: priceLabel(item)
        }))
        const list = reset ? rows : this.data.list.concat(rows)
        this.setData({
          list,
          page: page + 1,
          noMore: rows.length < 20
        })
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  },
  openDetail(e) {
    const dataset = (e.currentTarget && e.currentTarget.dataset) || (e.target && e.target.dataset) || {}
    const id = dataset.id
    if (!id) {
      wx.showToast({ title: '商品信息缺少ID', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/jingcheng/showcase/detail?id=${encodeURIComponent(String(id))}`,
      fail(err) {
        console.error('open showcase detail failed:', err)
        wx.showToast({ title: '商品详情打开失败', icon: 'none' })
      }
    })
  },
  openMall() {
    wx.navigateTo({ url: '/pages/jingcheng/integral/mall' })
  }
})
