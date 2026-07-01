const { request, getToken, openWechatReauth } = require('../../../services/jc-request')

// 秒级时间戳 → 「MM-DD HH:mm」，0/无效返回空串
function fmtTime(sec) {
  var s = Number(sec || 0)
  if (!s) return ''
  var d = new Date(s * 1000)
  if (isNaN(d.getTime())) return ''
  var p = function (n) { return n < 10 ? '0' + n : '' + n }
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

Page({
  data: {
    autoPass: { consumption: false, integralMall: true },
    pending: [],
    spreadForm: { memberUid: '', newSpreadUid: '' }
  },
  onLoad: function () {
    if (!getToken()) { openWechatReauth(); return }
    this.checkAccess()
  },
  onPullDownRefresh: function () {
    Promise.all([this.loadAutoPass(), this.loadPending()])
      .finally(function () { wx.stopPullDownRefresh() })
  },
  checkAccess: function () {
    var that = this
    request('/api/superadmin/check').then(function (data) {
      if (!data.isSuperAdmin) {
        wx.showModal({ title: '无权限', content: '您不是超级管理员', showCancel: false })
        setTimeout(function () { wx.navigateBack() }, 1500)
        return
      }
      that.loadAutoPass()
      that.loadPending()
    }).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    })
  },
  loadAutoPass: function () {
    var that = this
    return request('/api/superadmin/auto-pass-status').then(function (data) {
      that.setData({ autoPass: data })
    }).catch(function () {})
  },
  toggleAutoPass: function (e) {
    var type = e.currentTarget.dataset.type
    var enabled = e.detail.value
    var that = this
    request('/api/superadmin/auto-pass-toggle', {
      method: 'POST', data: { type: type, enabled: enabled }
    }).then(function () {
      wx.showToast({ title: enabled ? '免审已开启' : '免审已关闭', icon: 'success' })
    }).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
      that.loadAutoPass()
    })
  },
  loadPending: function () {
    var that = this
    return request('/api/superadmin/pending-approvals').then(function (list) {
      var pending = (list || []).map(function (it) {
        var out = Object.assign({}, it)
        out.createdText = fmtTime(it.createdAt)
        out.products = it.products || []
        if (it.managerStep) {
          out.managerStep = Object.assign({}, it.managerStep, { atText: fmtTime(it.managerStep.at) })
        }
        return out
      })
      that.setData({ pending: pending })
    }).catch(function () {})
  },
  reviewApprove: function (e) {
    this.doReview(e.currentTarget.dataset.id, 'approve')
  },
  reviewReject: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '驳回',
      editable: true,
      placeholderText: '驳回原因（选填）',
      success: function (res) {
        if (res.confirm) that.doReview(id, 'reject', res.content)
      }
    })
  },
  doReview: function (requestId, action, reason) {
    var that = this
    request('/api/superadmin/review', {
      method: 'POST',
      data: { requestId: requestId, action: action, reason: reason || '' }
    }).then(function () {
      wx.showToast({ title: action === 'approve' ? '已通过' : '已驳回', icon: 'success' })
      that.loadPending()
    }).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    })
  },
  onMemberUid: function (e) { this.setData({ 'spreadForm.memberUid': e.detail.value }) },
  onSpreadUid: function (e) { this.setData({ 'spreadForm.newSpreadUid': e.detail.value }) },
  changeSpread: function () {
    var f = this.data.spreadForm
    if (!f.memberUid) return wx.showToast({ title: '请输入会员UID', icon: 'none' })
    var that = this
    wx.showModal({
      title: '确认修改归属',
      content: '会员UID ' + f.memberUid + ' → 归属 ' + (f.newSpreadUid || '解除'),
      success: function (res) {
        if (!res.confirm) return
        request('/api/superadmin/change-spread', {
          method: 'POST',
          data: { memberUid: Number(f.memberUid), newSpreadUid: Number(f.newSpreadUid || 0) }
        }).then(function (data) {
          wx.showToast({ title: '归属已修改', icon: 'success' })
          that.setData({ spreadForm: { memberUid: '', newSpreadUid: '' } })
        }).catch(function (err) {
          wx.showToast({ title: err.message, icon: 'none' })
        })
      }
    })
  }
})
