const { request } = require('../../../services/jc-request')

Page({
  data: {
    id: 0,
    image: '',
    images: [],
    title: '',
    info: '',
    description: '',
    price: 0,
    stock: 0,
    sales: 0,
    canExchange: false,
    stockHint: '',
    balance: 0,
    loading: true,
    submitting: false
  },
  onLoad(options) {
    this.setData({ id: Number((options && options.id) || 0) })
    this.load()
  },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()) },
  load() {
    if (!this.data.id) {
      wx.showToast({ title: '缺少商品参数', icon: 'none' })
      return Promise.resolve()
    }
    this.setData({ loading: true })
    const detail = request('/api/integral-mall/product/' + this.data.id).then((d) => {
      this.setData({
        image: d.image || '',
        images: d.images || [],
        title: d.title || '积分商品',
        info: d.info || '',
        description: d.description || '',
        price: Number(d.price || 0),
        stock: Number(d.stock || 0),
        sales: Number(d.sales || 0),
        canExchange: !!d.canExchange,
        stockHint: d.stockHint || ''
      })
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
    this.loadBalance()
    return detail.finally(() => this.setData({ loading: false }))
  },
  loadBalance() {
    return request('/api/member/assets')
      .then((d) => this.setData({ balance: Number(d.integral || 0) }))
      .catch(() => {})
  },
  exchange() {
    if (this.data.submitting) return
    if (!this.data.canExchange) return wx.showToast({ title: this.data.stockHint || '暂不可兑换', icon: 'none' })
    if (this.data.balance < this.data.price) return wx.showToast({ title: '积分不足', icon: 'none' })
    wx.showModal({
      title: '确认兑换',
      content: '使用 ' + this.data.price + ' 积分兑换「' + this.data.title + '」？',
      confirmText: '确认兑换',
      success: (res) => { if (res.confirm) this.doExchange() }
    })
  },
  doExchange() {
    this.setData({ submitting: true })
    request('/api/integral-mall/exchange', { method: 'POST', data: { productId: this.data.id } })
      .then(() => {
        wx.showModal({ title: '兑换成功', content: '已使用 ' + this.data.price + ' 积分兑换「' + this.data.title + '」', showCancel: false })
        this.load()
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  }
})
