Component({
  properties: {
    label: { type: String, value: '立即领取' },
    note: { type: String, value: '点击后弹出客户经理名片' },
    compact: { type: Boolean, value: false }
  },
  methods: {
    handleTap() {
      this.triggerEvent('claim')
    }
  }
})
