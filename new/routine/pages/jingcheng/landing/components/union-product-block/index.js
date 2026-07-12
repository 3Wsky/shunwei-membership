Component({
  properties: {
    block: { type: Object, value: {} }
  },
  methods: {
    selectProduct(event) {
      const id = event.currentTarget.dataset.id
      if (id) this.triggerEvent('select', { id })
    }
  }
})
