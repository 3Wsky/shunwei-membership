Component({
  properties: {
    visible: { type: Boolean, value: false },
    card: { type: Object, value: {} }
  },
  methods: {
    close() { this.triggerEvent('close') },
    stopTap() {},
    call() { this.triggerEvent('call') },
    location() { this.triggerEvent('location') },
    previewQr() {
      const url = this.data.card && this.data.card.wechatQrcode
      if (url) wx.previewImage({ current: url, urls: [url] })
    }
  }
})
