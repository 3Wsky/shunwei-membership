const { request, publicRequest } = require('../../../services/jc-request')

// 须知版本化：条款更新时改版本号即可让用户重新确认
const VOUCHER_TERMS_KEY = 'JC_VOUCHER_TERMS_AGREED_V1'
const TERMS_COUNTDOWN = 5
// 本地兜底文案：后端 /api/miniapp/content 拉取失败时使用，正常情况下以后台配置为准
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
    termsTitle: '现金券使用须知',
    termsList: TERMS_LIST,
    qrText: '',
    payLoading: false,
    payCountdown: 0,
    verifySuccess: false,
    verifyAmount: 0,
    verifyBalanceAfter: 0
  },
  onShow() {
    this.setData({ termsAgreed: !!wx.getStorageSync(VOUCHER_TERMS_KEY) })
    this.loadContent()
    this.load()
  },
  onHide() { this.clearTermsTimer(); this.clearPayTimer(); this.clearWatchTimer() },
  onUnload() { this.clearTermsTimer(); this.clearPayTimer(); this.clearWatchTimer() },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()) },

  // 现金券使用须知文案：后台可在「内容管理」里改，拉取失败则用本地兜底
  loadContent() {
    publicRequest('/api/miniapp/content').then((d) => {
      const terms = (d && d.cashVoucherTerms) || {}
      const items = Array.isArray(terms.items) ? terms.items.filter((x) => x && String(x).trim()) : []
      this.setData({
        termsTitle: terms.title || '现金券使用须知',
        termsList: items.length ? items : TERMS_LIST
      })
    }).catch(() => { /* 用本地兜底，不打扰用户 */ })
  },

  goActivity() {
    wx.navigateTo({ url: '/pages/jingcheng/activity/index' })
  },

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
      this._lastBalance = balance
      if (balance > 0 && this.data.termsAgreed) {
        this.genToken()
        this.startWatchTimer()
      } else {
        this.setData({ qrText: '' })
        this.clearPayTimer()
        this.clearWatchTimer()
      }
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  },

  // 出码期间静默轮询余额：商家核销成功后顾客端立即感知（每 3s 一次，只查钱包，不重复拉记录）
  startWatchTimer() {
    this.clearWatchTimer()
    this._watchTimer = setInterval(() => {
      if (this.data.balance <= 0 || !this.data.qrText) { this.clearWatchTimer(); return }
      request('/api/cash-voucher/wallet').then((wallet) => {
        const newBalance = Number(wallet.balance || 0)
        const prev = Number(this._lastBalance != null ? this._lastBalance : this.data.balance)
        if (newBalance + 0.001 < prev) {
          // 余额下降 = 刚被核销，弹成功提示并刷新整页
          const deducted = Math.round((prev - newBalance) * 100) / 100
          this._lastBalance = newBalance
          this.onVerified(deducted, newBalance)
        } else {
          this._lastBalance = newBalance
        }
      }).catch(() => { /* 轮询失败静默，不打扰顾客 */ })
    }, 3000)
  },
  clearWatchTimer() {
    if (this._watchTimer) { clearInterval(this._watchTimer); this._watchTimer = null }
  },

  // 检测到核销成功：展示成功卡片 + 刷新余额/记录，并停掉旧码（下次使用重新生成）
  onVerified(amount, balanceAfter) {
    this.clearPayTimer()
    this.clearWatchTimer()
    wx.vibrateShort && wx.vibrateShort({ type: 'medium' })
    this.setData({
      verifySuccess: true,
      verifyAmount: amount,
      verifyBalanceAfter: balanceAfter,
      qrText: ''
    })
    this.load()
  },
  closeVerifySuccess() {
    this.setData({ verifySuccess: false })
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
    if (this.data.balance > 0) { this.genToken(); this.startWatchTimer() }
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
        cover: merchant.cover || '',
        images: merchant.images || (merchant.cover ? [merchant.cover] : []),
        latitude: merchant.latitude,
        longitude: merchant.longitude
      })
    } catch (error) { /* ignore */ }
    wx.navigateTo({ url: '/pages/jingcheng/wallet/merchant-detail' })
  }
})
