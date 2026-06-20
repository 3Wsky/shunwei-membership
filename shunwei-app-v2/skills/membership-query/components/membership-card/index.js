Component({
  data: {
    data: {}
  },
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const { NotificationType } = wx.modelContext
      this._viewCtx = wx.modelContext.getViewContext(this)

      modelCtx.on(NotificationType.Result, (payload) => {
        const sc = payload.result && payload.result.structuredContent
        if (!sc) return
        const tierClass = sc.tierLabel && sc.tierLabel.indexOf('299') >= 0 ? 'gold' : (sc.isMemberActive ? 'silver' : '')
        this.setData({ data: sc, tierClass })
        if (this._viewCtx) {
          this._viewCtx.setRelatedPage({ query: '' })
        }
      })
    }
  }
})
