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
    loading: true,
    termsAgreed: false,
    showTerms: false,
    countdown: 0,
    termsList: TERMS_LIST,
    qrText: '',
    payLoading: false,
    payCountdown: 0
  },
  onShow() {
    this.setData({ termsAgreed: !!wx.getStorageSync(VOUCHER_TERMS_KEY) })
    this.load()
  },
  onHide() { this.clearTermsTimer(); this.clearPayTimer() },
  onUnload() { this.clearTermsTimer(); this.clearPayTimer() },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()) },

  load() {
    this.setData({ loading: true })
    return Promise.all([
      request('/api/cash-voucher/wallet'),
      request('/api/cash-voucher/ledger', { data: { page: 1, limit: 50 } }),
      request('/api/merchants/available')
    ]).then(([wallet, ledger, merchants]) => {
      const balance = Number(wallet.balance || 0)
      this.setData({
        balance,
        totalGranted: Number(wallet.totalGranted || 0),
        totalUsed: Number(wallet.totalUsed || 0),
        batches: (wallet.batches || []).map((item) => ({ ...item, expireText: formatTime(item.expireAt) })),
        merchants: merchants || [],
        verifyRecords: (ledger.list || [])
          .filter((item) => Number(item.direction) === 0)
          .map((item) => ({ ...item, createdText: formatTime(item.createdAt) }))
      })
      if (balance > 0 && this.data.termsAgreed) {
        this.genToken()
      } else {
        this.setData({ qrText: '' })
        this.clearPayTimer()
      }
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  },

  genToken() {
    if (this.data.balance <= 0) return
    this.setData({ payLoading: true })
    request('/api/member/verify-token', { method: 'POST' }).then((d) => {
      this.setData({ qrText: d.token || '', payCountdown: Number(d.expiresIn || 60), payLoading: false })
      this.startPayTimer()
    }).catch((err) => {
      this.setData({ payLoading: false })
      wx.showToast({ title: err.message, icon: 'none' })
    })
  },
  refreshCode() { if (!this.data.payLoading) this.genToken() },
  startPayTimer() {
    this.clearPayTimer()
    this._payTimer = setInterval(() => {
      const next = this.data.payCountdown - 1
      if (next <= 0) {
        this.clearPayTimer()
        this.genToken()
      } else {
        this.setData({ payCountdown: next })
      }
    }, 1000)
  },
  clearPayTimer() {
    if (this._payTimer) { clearInterval(this._payTimer); this._payTimer = null }
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
    if (this.data.balance > 0) this.genToken()
  },
  clearTermsTimer() {
    if (this._termsTimer) { clearInterval(this._termsTimer); this._termsTimer = null }
  },

  openMerchantDetail(e) {
    const merchant = this.data.merchants[e.currentTarget.dataset.index]
    if (!merchant) return
    try {
      wx.setStorageSync('JC_WALLET_MERCHANT_DETAIL', {
        merchantName: merchant.merchantName,
        categoryText: merchant.category || '数码3C',
        hoursText: merchant.businessHours || '营业时间请咨询',
        addressText: merchant.storeAddress || '门店地址请咨询',
        contactPhone: merchant.contactPhone || '',
        latitude: merchant.latitude,
        longitude: merchant.longitude
      })
    } catch (error) { /* ignore */ }
    wx.navigateTo({ url: '/pages/jingcheng/wallet/merchant-detail' })
  }
})
