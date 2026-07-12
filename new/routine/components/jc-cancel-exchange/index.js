Component({
  properties: {
    orderId: { type: String, value: '' }
  },
  data: {
    dialogVisible: false,
    submitting: false,
    resultVisible: false
  },
  methods: {
    openDialog() {
      this.setData({ dialogVisible: true })
    },
    closeDialog() {
      if (!this.data.submitting) this.setData({ dialogVisible: false })
    },
    preventMove() {},
    confirmCancel() {
      if (this.data.submitting || !this.data.orderId) return
      let token = ''
      try {
        token = wx.getStorageSync('LOGIN_STATUS_TOKEN') || ''
        const app = getApp()
        if (app && app.globalData && app.globalData.jcAuthToken) token = app.globalData.jcAuthToken
      } catch (e) {}
      token = String(token || '').replace(/^Bearer\s+/i, '').trim()
      this.setData({ submitting: true })
      wx.request({
        url: 'https://ok.xjshunwei.cn/sw-api/api/integral-mall/cancel-exchange',
        method: 'POST',
        data: { orderId: this.data.orderId },
        header: {
          'content-type': 'application/json',
          'Form-type': 'routine',
          'Authori-zation': 'Bearer ' + token
        },
        success: (res) => {
          const body = res.data || {}
          if (res.statusCode === 200 && body.status === 200) {
            this.setData({ dialogVisible: false, resultVisible: true })
          } else {
            wx.showToast({ title: body.msg || body.message || '撤销失败，请稍后重试', icon: 'none' })
          }
        },
        fail: () => wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' }),
        complete: () => this.setData({ submitting: false })
      })
    },
    backToGifts() {
      wx.reLaunch({ url: '/pages/points_mall/exchange_record' })
    }
  }
})
