const { request } = require('../../../services/jc-request')

// 须知版本化：条款更新时改版本号即可让用户重新确认
const VOUCHER_TERMS_KEY = 'JC_VOUCHER_TERMS_AGREED_V1'
const TERMS_COUNTDOWN = 5
const TERMS_LIST = [
  '本券为您在本店消费达对应档位后获赠的抵扣权益，仅用于抵扣消费，不可兑换现金、不设找零。',
  '适用范围：限锦程数码门店及合作商家的指定商品/服务，以券面或本页标注为准。',
  '有效期：以每张现金券标注的到期时间为准，到期前小程序将提醒；余额未用完可联系门店协商继续使用或延期。',
  '使用规则：支持部分核销、余额保留（先到期先用）；单笔可用金额及是否可叠加以页面标注为准。',
  '归属：本券绑定您的会员账户，限本人使用；如需转让请通知门店办理。',
  '退货处理：使用本券购买的商品退货时，已抵扣券额按原值退回您的账户（不折现金）。',
  '质量保障：获赠权益不影响您依法享有的商品/服务质量与售后权利。',
  '规则咨询：对使用规则如有疑问，可咨询门店，双方依法协商处理。'
]

function formatTime(ts) {
  if (!ts) return '长期有效'
  const d = new Date(Number(ts) * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    balance: 0,
    totalGranted: 0,
    totalUsed: 0,
    batches: [],
    merchants: [],
    verifyRecords: [],
    customerUid: 0,
    qrText: '',
    loading: true,
    termsAgreed: false,
    showTerms: false,
    countdown: 0,
    termsList: TERMS_LIST
  },
  onShow() {
    this.load()
    this.checkTerms()
  },
  onHide() { this.clearTermsTimer() },
  onUnload() { this.clearTermsTimer() },
  checkTerms() {
    const uid = this.resolveCustomerUid()
    const agreed = !!wx.getStorageSync(VOUCHER_TERMS_KEY)
    this.setData({ termsAgreed: agreed })
    if (uid > 0 && !agreed) this.openTerms()
  },
  openTerms() {
    this.setData({ showTerms: true })
    if (this.data.termsAgreed) {
      this.setData({ countdown: 0 })
      this.clearTermsTimer()
      return
    }
    this.setData({ countdown: TERMS_COUNTDOWN })
    this.clearTermsTimer()
    this._termsTimer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) {
        this.setData({ countdown: 0 })
        this.clearTermsTimer()
      } else {
        this.setData({ countdown: next })
      }
    }, 1000)
  },
  agreeTerms() {
    if (this.data.countdown > 0) return
    try { wx.setStorageSync(VOUCHER_TERMS_KEY, '1') } catch (e) { /* ignore */ }
    this.setData({ termsAgreed: true, showTerms: false })
    this.clearTermsTimer()
  },
  clearTermsTimer() {
    if (this._termsTimer) {
      clearInterval(this._termsTimer)
      this._termsTimer = null
    }
  },
  resolveCustomerUid() {
    let uid = Number(wx.getStorageSync('UID') || 0)
    if (uid > 0) return uid
    try {
      const userInfo = wx.getStorageSync('USER_INFO')
      if (userInfo && userInfo.uid) uid = Number(userInfo.uid)
    } catch (error) { /* ignore */ }
    return uid > 0 ? uid : 0
  },
  load() {
    const customerUid = this.resolveCustomerUid()
    this.setData({
      customerUid,
      qrText: customerUid ? `sw-uid:${customerUid}` : '',
      loading: true
    })
    Promise.all([
      request('/api/cash-voucher/wallet'),
      request('/api/cash-voucher/ledger', { data: { page: 1, limit: 50 } }),
      request('/api/merchants/available')
    ]).then(([wallet, ledger, merchants]) => {
      this.setData({
        balance: Number(wallet.balance || 0),
        totalGranted: Number(wallet.totalGranted || 0),
        totalUsed: Number(wallet.totalUsed || 0),
        batches: (wallet.batches || []).map((item) => ({ ...item, expireText: formatTime(item.expireAt) })),
        merchants: (merchants || []).map((item) => ({
          ...item,
          initial: String(item.merchantName || '商').slice(0, 1)
        })),
        verifyRecords: (ledger.list || [])
          .filter((item) => Number(item.direction) === 0)
          .map((item) => ({ ...item, createdText: formatTime(item.createdAt) }))
      })
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  },
  callMerchant(e) {
    const phone = e.currentTarget.dataset.phone
    if (phone) wx.makePhoneCall({ phoneNumber: String(phone) })
  },
  openMerchant(e) {
    const merchant = this.data.merchants[e.currentTarget.dataset.index]
    if (!merchant || !merchant.latitude || !merchant.longitude) {
      wx.showToast({ title: merchant.storeAddress || '暂无地图位置', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: merchant.latitude,
      longitude: merchant.longitude,
      name: merchant.merchantName,
      address: merchant.storeAddress || ''
    })
  }
})
