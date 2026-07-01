const { request, syncAuthFromApp, getToken, openWechatReauth, getCurrentMerchantId, setCurrentMerchantId, withMerchant } = require('../../../services/jc-request')

Page({
  data: {
    loading: true,
    ready: false,
    merchantName: '',
    isManager: false,
    todayAmount: 0,
    todayCount: 0,
    weekAmount: 0,
    monthAmount: 0,
    totalAmount: 0,
    verifyCount: 0,
    customerCount: 0,
    availableAmount: 0,
    withdrawingAmount: 0,
    staffCount: 0,
    // 一人多店
    stores: [],
    currentMerchantId: 0,
    showStorePicker: false
  },
  onShow: function () { this.boot() },
  onPullDownRefresh: function () { this.boot().finally(function () { wx.stopPullDownRefresh() }) },
  boot: function () {
    syncAuthFromApp()
    if (!getToken()) {
      this.setData({ loading: false })
      openWechatReauth()
      return Promise.resolve()
    }
    var that = this
    // 先拉可操作门店列表，确定当前门店，再加载对应门店的看板
    return request('/api/merchant/my-stores').then(function (data) {
      var stores = (data && data.stores) || []
      // 纯核销员（不是任何一家门店的负责人）→ 直接进核销扫码页，省掉工作台。
      // 负责人（至少管理一家店）仍进完整工作台（可看统计/核销员/提现）。
      var isAnyManager = stores.some(function (s) { return !!(s.isManager || s.is_manager) })
      that._isAnyManager = isAnyManager
      if (stores.length && !isAnyManager) {
        that._redirectedToVerify = true
        wx.redirectTo({ url: '/pages/jingcheng/merchant/verify' })
        return
      }
      var curId = getCurrentMerchantId()
      // 当前门店无效（未选/已不在可访问列表）→ 默认第一家
      var valid = stores.some(function (s) { return Number(s.merchantId) === curId })
      if (!valid) {
        curId = stores.length ? Number(stores[0].merchantId) : 0
        setCurrentMerchantId(curId)
      }
      that.setData({ stores: stores, currentMerchantId: curId })
    }).catch(function () {
      // my-stores 失败不阻断（老逻辑：后端不传 merchantId 会回退首选门店）
    }).then(function () {
      if (that._redirectedToVerify) return
      return that.load()
    })
  },
  load: function () {
    this.setData({ loading: true })
    return request('/api/merchant/dashboard', { data: withMerchant({}) }).then(function (data) {
      data = data || {}
      // 兜底：仅负责人可进工作台。核销员直接进扫码页。
      // 多店负责人（在别店是负责人、当前店仅核销员）不误踢——以 my-stores 的 _isAnyManager 为准。
      var isManagerHere = !!(data.isManager || data.is_manager)
      if (!isManagerHere && !this._isAnyManager) {
        this._redirectedToVerify = true
        wx.redirectTo({ url: '/pages/jingcheng/merchant/verify' })
        return
      }
      var staffStats = data.staffStats || []
      this.setData({
        ready: true,
        merchantName: data.merchantName || '',
        isManager: !!data.isManager,
        currentMerchantId: Number(data.merchantId || this.data.currentMerchantId || 0),
        todayAmount: Number(data.todayAmount || 0),
        todayCount: Number(data.todayCount || 0),
        weekAmount: Number(data.weekAmount || 0),
        monthAmount: Number(data.monthAmount || 0),
        totalAmount: Number(data.totalAmount || 0),
        verifyCount: Number(data.verifyCount || 0),
        customerCount: Number(data.customerCount || 0),
        availableAmount: Number(data.availableAmount || 0),
        withdrawingAmount: Number(data.withdrawingAmount || 0),
        staffCount: staffStats.length
      })
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: err.message, icon: 'none' })
    }).finally(function () {
      this.setData({ loading: false })
    }.bind(this))
  },
  // 门店切换
  openStorePicker: function () {
    if ((this.data.stores || []).length <= 1) return
    this.setData({ showStorePicker: true })
  },
  closeStorePicker: function () { this.setData({ showStorePicker: false }) },
  noop: function () {},
  pickStore: function (e) {
    var id = Number(e.currentTarget.dataset.id || 0)
    if (!id || id === this.data.currentMerchantId) { this.setData({ showStorePicker: false }); return }
    setCurrentMerchantId(id)
    this.setData({ currentMerchantId: id, showStorePicker: false })
    this.load()
  },
  openVerify: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/verify' }) },
  goRecords: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/records/index' }) },
  goStaff: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/staff/index' }) },
  goWithdraw: function () { wx.navigateTo({ url: '/pages/jingcheng/merchant/withdraw/index' }) }
})
