const { request } = require('../../../services/jc-request')

Page({
  data: {
    balance: 0,
    products: [],
    loading: true
  },
  onShow() {
    this.load()
  },
  load() {
    this.setData({ loading: true })
    Promise.all([
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
  exchange(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.products || []).find((p) => String(p.id) === String(id))
    if (!item || !item.canExchange) return
    wx.showModal({
      title: '确认兑换',
      content: `使用 ${item.price} 积分兑换「${item.title}」？`,
      success: (res) => {
        if (!res.confirm) return
        request('/api/integral-mall/exchange', { method: 'POST', data: { productId: id } })
          .then(() => {
            wx.showToast({ title: '兑换成功', icon: 'success' })
            this.load()
          })
          .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      }
    })
  }
})
