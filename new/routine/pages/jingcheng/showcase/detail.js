const { publicRequest } = require('../../../services/jc-request')

function gallery(product) {
  if (Array.isArray(product.sliderImages) && product.sliderImages.length) return product.sliderImages
  if (product.image) return [product.image]
  return []
}

function priceLabel(value) {
  const price = Number(value || 0)
  return price > 0 ? '¥' + price : '到店咨询'
}

function skuRows(product) {
  const list = Array.isArray(product.skuPrices) ? product.skuPrices : []
  return list.map((item) => ({
    version: item.version || [item.config, item.color].filter(Boolean).join(' '),
    config: item.config || '',
    color: item.color || '',
    image: item.image || '',
    price: item.price || priceLabel(item.priceValue)
  })).filter((item) => item.version || item.config || item.color)
}

Page({
  data: {
    product: null,
    title: '',
    subtitle: '',
    priceLabel: '',
    gallery: [],
    colorItems: [],
    skuRows: [],
    paramList: [],
    specEntries: [],
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
        this.setData({
          product,
          title: product.storeName || product.model || product.title || '商品',
          subtitle: product.storeInfo || product.info || '',
          priceLabel: priceLabel(product.price),
          gallery: gallery(product),
          colorItems: Array.isArray(product.colorItems) ? product.colorItems : [],
          skuRows: skuRows(product),
          paramList: Array.isArray(product.paramsList) ? product.paramsList : [],
          specEntries: Object.keys(specs).map((key) => ({ key, value: specs[key] }))
        })
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  }
})
