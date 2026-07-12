const { request, getToken, syncAuthFromApp, openWechatReauth } = require('../../../services/jc-request')

const EMPTY_FORM = {
  displayName: '',
  avatar: '',
  jobTitle: '客户经理',
  bio: '',
  wechatQrcode: '',
  isPublished: true
}

Page({
  data: {
    loading: true,
    saving: false,
    needLogin: false,
    form: EMPTY_FORM,
    store: { name: '', address: '', businessHours: '', phone: '' }
  },

  onLoad() {
    syncAuthFromApp()
    this.loadCard()
  },

  onPullDownRefresh() {
    this.loadCard().finally(() => wx.stopPullDownRefresh())
  },

  loadCard() {
    if (!getToken()) {
      this.setData({ loading: false, needLogin: true })
      return Promise.resolve()
    }
    this.setData({ loading: true, needLogin: false })
    return request('/api/staff/my-card').then((card) => {
      this.setData({
        form: {
          displayName: card.displayName || '',
          avatar: card.avatar || '',
          jobTitle: card.jobTitle || '客户经理',
          bio: card.bio || '',
          wechatQrcode: card.wechatQrcode || '',
          isPublished: card.isPublished !== false
        },
        store: {
          name: card.storeName || '',
          address: card.storeAddress || '',
          businessHours: card.businessHours || '',
          phone: card.storePhone || card.contactPhone || ''
        }
      })
    }).catch((error) => {
      const message = error.message || '名片加载失败'
      this.setData({ needLogin: message.includes('登录') })
      wx.showToast({ title: message, icon: 'none' })
    }).finally(() => this.setData({ loading: false }))
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field
    if (!field) return
    this.setData({ ['form.' + field]: event.detail.value })
  },

  onPublishChange(event) {
    this.setData({ 'form.isPublished': !!event.detail.value })
  },

  goLogin() { openWechatReauth() },

  save() {
    if (this.data.saving) return
    const form = this.data.form
    if (!String(form.displayName || '').trim()) {
      wx.showToast({ title: '请填写展示名称', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    request('/api/staff/my-card', { method: 'PUT', data: form })
      .then(() => wx.showToast({ title: '名片已保存', icon: 'success' }))
      .catch((error) => wx.showToast({ title: error.message || '保存失败', icon: 'none' }))
      .finally(() => this.setData({ saving: false }))
  }
})
