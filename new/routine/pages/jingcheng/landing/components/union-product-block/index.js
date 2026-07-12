Component({
  properties: {
    block: { type: Object, value: {} },
    active: { type: Boolean, value: false }
  },
  methods: {
    selectProduct(event) {
      const id = event.currentTarget.dataset.id
      if (id) this.triggerEvent('select', { id })
    }
  }
})
