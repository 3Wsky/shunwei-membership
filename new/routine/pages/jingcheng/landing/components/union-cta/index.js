Component({
  properties: {
    label: { type: String, value: '立即领取' },
    note: { type: String, value: '' },
    compact: { type: Boolean, value: false }
  },
  methods: {
    handleTap() {
      this.triggerEvent('claim')
    }
  }
})
