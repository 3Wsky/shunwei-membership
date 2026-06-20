Component({
  data: { data: {} },
  lifetimes: {
    created() {
      const modelCtx = wx.modelContext.getContext(this)
      const { NotificationType } = wx.modelContext
      modelCtx.on(NotificationType.Result, (payload) => {
        const sc = payload.result && payload.result.structuredContent
        if (sc) this.setData({ data: sc })
      })
    }
  }
})
