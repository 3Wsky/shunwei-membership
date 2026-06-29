Page({
  data: {
    merchant: {}
  },
  onLoad() {
    let merchant = {}
    try {
      merchant = wx.getStorageSync('JC_WALLET_MERCHANT_DETAIL') || {}
    } catch (error) { /* ignore */ }
    merchant = Object.assign({
      merchantName: '锦程祥瑞',
      categoryText: '数码3C',
      hoursText: '营业时间请咨询',
      addressText: '门店地址请咨询',
      contactPhone: '',
      cover: '',
      images: []
    }, merchant)
    if (!Array.isArray(merchant.images)) merchant.images = merchant.cover ? [merchant.cover] : []
    this.setData({ merchant })
    wx.setNavigationBarTitle({ title: merchant.merchantName || '商家详情' })
  },
  callMerchant() {
    const phone = this.data.merchant.contactPhone
    if (phone) {
      wx.makePhoneCall({ phoneNumber: String(phone) })
    } else {
      wx.showToast({ title: '暂无联系电话', icon: 'none' })
    }
  },
  openLocation() {
    const merchant = this.data.merchant
    if (!merchant.latitude || !merchant.longitude) {
      wx.showToast({ title: merchant.addressText || merchant.storeAddress || '暂无地图位置', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: Number(merchant.latitude),
      longitude: Number(merchant.longitude),
      name: merchant.merchantName,
      address: merchant.addressText || merchant.storeAddress || ''
    })
  }
})
