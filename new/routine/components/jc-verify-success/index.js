Component({
  data: { visible: false },
  lifetimes: {
    attached() {
      const self = this
      this._originalShowModal = wx.showModal
      this._showModalProxy = function (options) {
        const title = String((options && options.title) || '')
        const content = String((options && options.content) || '')
        if (title === '核销成功' && content.indexOf('积分礼品') !== -1) {
          self.setData({ visible: true })
          return
        }
        return self._originalShowModal.apply(wx, arguments)
      }
      wx.showModal = this._showModalProxy
    },
    detached() {
      if (wx.showModal === this._showModalProxy && this._originalShowModal) wx.showModal = this._originalShowModal
    }
  },
  methods: {
    close() {
      this.setData({ visible: false })
    },
    preventMove() {}
  }
})
