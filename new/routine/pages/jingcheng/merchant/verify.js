const { request } = require('../../../services/jc-request')

Page({
  data: { customerUid: '', amount: '', remark: '', submitting: false },
  scanCustomer() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        const value = String(res.result || '').trim()
        const match = value.match(/^sw-uid:(\d+)$/i) || value.match(/^(\d+)$/)
        if (!match) return wx.showToast({ title: '不是有效的顾客二维码', icon: 'none' })
        this.setData({ customerUid: match[1] })
        wx.showToast({ title: '已识别UID ' + match[1], icon: 'none' })
      }
    })
  },
  onUidInput(e) { this.setData({ customerUid: e.detail.value }) },
  onAmountInput(e) { this.setData({ amount: e.detail.value }) },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }) },
  submit() {
    const customerUid = Number(this.data.customerUid || 0)
    const amount = Number(this.data.amount || 0)
    if (!customerUid || amount <= 0) return wx.showToast({ title: '请填写顾客和核销金额', icon: 'none' })
    wx.showModal({
      title: '确认现金券核销',
      content: `顾客UID ${customerUid}\n本次核销 ¥${amount}`,
      confirmText: '确认核销',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ submitting: true })
        request('/api/merchant/verify-voucher', {
          method: 'POST', data: { customerUid, amount, remark: this.data.remark }
        }).then((data) => {
          wx.showModal({ title: '核销成功', content: `核销 ¥${data.amount}\n顾客剩余 ¥${data.balanceAfter}`, showCancel: false })
          this.setData({ customerUid: '', amount: '', remark: '' })
        }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }))
          .finally(() => this.setData({ submitting: false }))
      }
    })
  }
})
