const BASE_URL = 'https://ok.xjshunwei.cn/sw-api'
const TOKEN_KEY = 'LOGIN_STATUS_TOKEN'

function normalizeToken(raw) {
  if (!raw || raw === false) return ''
  var token = String(raw).replace(/^Bearer\s+/i, '').trim()
  if (!token || token === 'false' || token === 'undefined') return ''
  return token
}

function copyTokenFromPages() {
  try {
    var pages = getCurrentPages() || []
    for (var i = pages.length - 1; i >= 0; i--) {
      var vm = pages[i].$vm
      if (!vm || !vm.$store || !vm.$store.state || !vm.$store.state.app) continue
      var token = normalizeToken(vm.$store.state.app.token)
      if (token) {
        wx.setStorageSync(TOKEN_KEY, token)
        try {
          var app = getApp()
          if (app) {
            app.globalData = app.globalData || {}
            app.globalData.jcAuthToken = token
          }
        } catch (e) {}
        return token
      }
    }
  } catch (error) {
    /* ignore */
  }
  return ''
}

function getToken() {
  try {
    var app = getApp()
    if (app && app.globalData && app.globalData.jcAuthToken) {
      var g = normalizeToken(app.globalData.jcAuthToken)
      if (g) return g
    }
  } catch (error) {
    /* ignore */
  }
  try {
    var stored = normalizeToken(wx.getStorageSync(TOKEN_KEY))
    if (stored) return stored
  } catch (error) {
    /* ignore */
  }
  return copyTokenFromPages()
}

function readUidFromStorage() {
  try {
    var pages = getCurrentPages() || []
    for (var i = pages.length - 1; i >= 0; i--) {
      var vm = pages[i].$vm
      if (vm && vm.$store && vm.$store.state && vm.$store.state.app && vm.$store.state.app.uid) {
        return Number(vm.$store.state.app.uid)
      }
    }
  } catch (error) {}
  try {
    return Number(wx.getStorageSync('UID') || 0)
  } catch (error) {
    return 0
  }
}

function syncAuthFromApp() {
  return getToken()
}

function isLoggedIn() {
  return !!getToken()
}

function httpRequest(path, options, token) {
  var header = { 'content-type': 'application/json', 'Form-type': 'routine' }
  if (token) header['Authori-zation'] = 'Bearer ' + token

  return new Promise(function (resolve, reject) {
    wx.request({
      url: BASE_URL + path,
      method: (options && options.method) || 'GET',
      data: (options && options.data) || {},
      header: header,
      timeout: 20000,
      success: function (res) {
        var body = res.data || {}
        if (res.statusCode === 401 || body.status === 401) {
          reject(new Error('SERVER_AUTH:' + (body.msg || '请先登录')))
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && body.status === 200) {
          resolve(body.data)
          return
        }
        reject(new Error(body.msg || '请求失败'))
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '网络异常'))
      }
    })
  })
}

function request(path, options) {
  var token = getToken()
  if (!token) {
    return Promise.reject(new Error('LOCAL_AUTH:请先在「我的」页登录'))
  }
  return httpRequest(path, options || {}, token)
}

function publicRequest(path, options) {
  return httpRequest(path, options || {}, getToken())
}

function openWechatReauth() {
  wx.switchTab({ url: '/pages/user/index' })
}

module.exports = {
  request: request,
  publicRequest: publicRequest,
  getToken: getToken,
  isLoggedIn: isLoggedIn,
  readUidFromStorage: readUidFromStorage,
  syncAuthFromApp: syncAuthFromApp,
  openWechatReauth: openWechatReauth,
  BASE_URL: BASE_URL
}
