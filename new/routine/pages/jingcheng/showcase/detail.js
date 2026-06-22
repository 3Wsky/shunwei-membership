const { publicRequest } = require('../../../services/jc-request')

function gallery(product) {
  if (Array.isArray(product.sliderImages) && product.sliderImages.length) return product.sliderImages
  if (product.image) return [product.image]
  return []
}

Page({
  data: {
    product: null,
    title: '',
    subtitle: '',
    priceLabel: '',
    gallery: [],
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
          priceLabel: Number(product.price || 0) > 0 ? '¥' + product.price : '到店咨询',
          gallery: gallery(product),
          paramList: Array.isArray(product.paramsList) ? product.paramsList : [],
          specEntries: Object.keys(specs).map((key) => ({ key, value: specs[key] }))
        })
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  }
})
