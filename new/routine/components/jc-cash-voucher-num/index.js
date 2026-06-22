const { request, isLoggedIn, getToken, syncAuthFromApp } = require('../../services/jc-request')

Component({
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared'
  },
  properties: {
    userUid: { type: Number, value: 0, observer: 'refresh' },
    isLogin: { type: Boolean, value: false, observer: 'refresh' }
  },
  data: {
    amount: '0',
    ready: false
  },
  lifetimes: {
    attached() { this.refresh() }
  },
  pageLifetimes: {
    show() { this.refresh() }
  },
  methods: {
    canLoad() {
      syncAuthFromApp()
      const uid = Number(this.properties.userUid || 0)
      return !!(this.properties.isLogin && uid > 0 && getToken())
    },
    refresh() {
      syncAuthFromApp()
      if (!this.canLoad()) {
        this.setData({ amount: '0', ready: true })
        return
      }
      request('/api/member/assets')
        .then((data) => {
          const n = Number(data.cashVoucher || 0)
          const amount = Number.isInteger(n) ? String(n) : n.toFixed(2)
          this.setData({ amount, ready: true })
        })
        .catch(() => this.setData({ amount: '0', ready: true }))
    },
    goWallet() {
      if (!isLoggedIn()) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      wx.navigateTo({ url: '/pages/jingcheng/wallet/index' })
    }
  }
})
