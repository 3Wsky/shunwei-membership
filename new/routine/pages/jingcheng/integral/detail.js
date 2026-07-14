const { request } = require('../../../services/jc-request')

function fitDescriptionImages(html) {
  return String(html || '').replace(/<img\b([^>]*?)\/?\s*>/gi, function (_, attrs) {
    const cleaned = attrs
      .replace(/\s+(?:style|width|height)\s*=\s*(["'])[^"']*\1/gi, '')
      .replace(/\s+(?:style|width|height)\s*=\s*[^\s>]+/gi, '')
    return '<img' + cleaned + ' style="display:block;width:100%;max-width:100%;height:auto;box-sizing:border-box;" />'
  })
}

Page({
  data: {
    id: 0,
    image: '',
    images: [],
    detailImages: [],
    title: '',
    info: '',
    description: '',
    price: 0,
    pricePending: false,
    stock: 0,
    sales: 0,
    canExchange: false,
    stockHint: '',
    balance: 0,
    loading: true,
    submitting: false,
    exchangeDialog: false,
    exchangeSuccess: false
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
      const price = Number(d.price || 0)
      const pricePending = price <= 0 || !!d.pricePending
      this.setData({
        image: d.image || '',
        images: d.images || [],
        detailImages: d.detailImages || [],
        title: d.title || '积分商品',
        info: d.info || '',
        description: fitDescriptionImages(d.description),
        price,
        pricePending,
        stock: Number(d.stock || 0),
        sales: Number(d.sales || 0),
        canExchange: !pricePending && !!d.canExchange,
        stockHint: pricePending ? '暂不可兑换' : (d.stockHint || '')
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
    this.setData({ exchangeDialog: true })
  },
  cancelExchange() {
    if (!this.data.submitting) this.setData({ exchangeDialog: false })
  },
  confirmExchange() {
    if (this.data.submitting) return
    this.setData({ exchangeDialog: false })
    this.doExchange()
  },
  noop() {
    // Stops taps inside the dialog from closing it.
  },
  doExchange() {
    this.setData({ submitting: true })
    request('/api/integral-mall/exchange', { method: 'POST', data: { productId: this.data.id } })
      .then(() => {
        this.load()
        this.setData({ exchangeSuccess: true })
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },
  closeExchangeSuccess() {
    this.setData({ exchangeSuccess: false })
  },
  viewMyGifts() {
    this.setData({ exchangeSuccess: false })
    wx.navigateTo({ url: '/pages/points_mall/exchange_record' })
  }
})
