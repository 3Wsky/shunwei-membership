const { request } = require('../../../services/jc-request')

Page({
  data: {
    balance: 0,
    products: [],
    loading: true
  },
  onLoad() {
    wx.hideTabBar({ fail: function () {} })
  },
  onShow() {
    wx.hideTabBar({ fail: function () {} })
    this.load()
  },
  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh())
  },
  load() {
    this.setData({ loading: true })
    return Promise.all([
      request('/api/member/assets').then((data) => Number(data.integral || 0)).catch(() => 0),
      request('/api/integral-mall/products').catch(() => [])
    ]).then(([balance, products]) => {
      this.setData({
        balance,
        products: (products || []).map((item) => ({
          ...item,
          image: item.image || '',
          title: item.title || '积分商品'
        }))
      })
    }).finally(() => this.setData({ loading: false }))
  },
  openDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/jingcheng/integral/detail?id=' + id })
  },
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
  goCategory() {
    wx.switchTab({ url: '/pages/goods_cate/goods_cate' })
  },
  goMine() {
    wx.switchTab({ url: '/pages/user/index' })
  }
})
