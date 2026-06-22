const { request, publicRequest, getToken, syncAuthFromApp, isLoggedIn } = require('../../services/jc-request')

Component({
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared'
  },
  properties: {
    userUid: { type: Number, value: 0, observer: 'refresh' },
    isLogin: { type: Boolean, value: false, observer: 'refresh' }
  },
  data: {
    loggedIn: false,
    showMemberMgmt: true,
    showWallet: true,
    showMerchant: true,
    showManagerApproval: false,
    pendingCount: 0
  },
  lifetimes: {
    attached() { this.refresh() }
  },
  pageLifetimes: {
    show() { this.refresh() }
  },
  methods: {
    refresh() {
      syncAuthFromApp()
      var loggedIn = !!(this.properties.isLogin || isLoggedIn())
      if (!loggedIn) {
        this.setData({ loggedIn: false })
        return
      }
      this.setData({ loggedIn: true, showWallet: true, showMemberMgmt: true, showMerchant: true })
      if (!getToken()) return

      Promise.all([
        publicRequest('/api/miniapp/entry-config').catch(function () {
          return { staffEntryRoleOnly: false, merchantEntryRoleOnly: false }
        }),
        request('/api/staff/me').catch(function () { return null }),
        request('/api/merchant/access').then(function () { return true }).catch(function () { return false }),
        request('/api/approval/todos', { data: { role: 'manager' } }).catch(function () { return [] })
      ]).then(function (res) {
        var config = res[0]
        var staff = res[1]
        var hasMerchant = res[2]
        var todos = res[3]
        var isManager = !!(staff && (staff.isManager || staff.is_manager))
        this.setData({
          showManagerApproval: isManager,
          pendingCount: (todos || []).length,
          showMemberMgmt: config.staffEntryRoleOnly ? !!(staff && (staff.isStaff || staff.is_staff || isManager)) : true,
          showMerchant: config.merchantEntryRoleOnly ? !!hasMerchant : true
        })
      }.bind(this)).catch(function () {})
    }
  }
})
