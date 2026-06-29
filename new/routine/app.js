
require('./common/runtime.js')
require('./common/vendor.js')
require('./common/main.js')

// 自动捕获并绑定企微活码/欢迎语中的客户经理 UID
try {
  var jcBind = require('./services/jc-bind.js')
  jcBind.captureSpreadFromLaunch()
  jcBind.startAutoBind()
  if (typeof wx.onAppShow === 'function') {
    wx.onAppShow(function (opts) {
      jcBind.captureSpreadFromLaunch(opts)
    })
  }
} catch (e) {
  /* ignore */
}

try {
  var sys = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {}
  var sdk = sys.SDKVersion || '3.0.0'
  var parts = String(sdk).split('.').map(function (n) { return Number(n) || 0 })
  var ok = parts[0] > 2 || (parts[0] === 2 && (parts[1] > 21 || (parts[1] === 21 && parts[2] >= 3)))
  wx.setStorageSync('MP_VERSION_ISNEW', ok)
} catch (e) {
  try { wx.setStorageSync('MP_VERSION_ISNEW', true) } catch (err) {}
}

function copyTokenFromPages() {
  try {
    var pages = getCurrentPages() || []
    for (var i = pages.length - 1; i >= 0; i--) {
      var vm = pages[i].$vm
      if (!vm || !vm.$store || !vm.$store.state || !vm.$store.state.app) continue
      var raw = vm.$store.state.app.token
      if (!raw || raw === false) continue
      var token = String(raw).replace(/^Bearer\s+/i, '').trim()
      if (!token || token.indexOf('eyJ') !== 0) continue
      wx.setStorageSync('LOGIN_STATUS_TOKEN', token)
      var app = getApp()
      if (app) {
        app.globalData = app.globalData || {}
        app.globalData.jcAuthToken = token
      }
      return token
    }
  } catch (error) {
    /* ignore */
  }
  return ''
}

setTimeout(copyTokenFromPages, 100)
setInterval(copyTokenFromPages, 500)
