const { publicRequest } = require('../../../services/jc-request')

function title(item) {
  return item.storeName || item.model || item.title || '商品'
}

function cover(item) {
  return item.image || (item.sliderImages && item.sliderImages[0]) || ''
}

function priceLabel(item) {
  if (item.priceText) return item.priceText
  const price = Number(item.price || 0)
  return price > 0 ? `¥${price}` : '到店咨询'
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
    return publicRequest('/api/products', { data: { page, pageSize: 20, status: 'shown' } })
      .then((data) => {
        const rows = (data.list || []).map((item) => ({
          ...item,
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
    const id = e.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: `/pages/jingcheng/showcase/detail?id=${encodeURIComponent(id)}` })
  },
  openMall() {
    wx.navigateTo({ url: '/pages/jingcheng/integral/mall' })
  }
})
