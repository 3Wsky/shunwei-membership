// 客户经理归属绑定（企微方案A · 与 CRMEB 原生分销参数对齐）
// 入口：企微员工活码/欢迎语挂小程序，路径带 ?spread=客户经理UID（兼容 spid / staffUid / 小程序码 scene 内 pid=）
// 逻辑：启动时解析归属 UID → 暂存 → 登录拿到 token 后调用 /api/staff/bind-spread（首次绑定生效，不覆盖已有归属）
// 注：CRMEB 主程序 onShow 也会用 spread/spid/scene(pid) 走 silenceBindingSpread 原生绑定；
//     本模块作为新链路的补充与兜底，bind-spread 为首次绑定生效，二者不会冲突。
const { getToken, BASE_URL } = require('./jc-request')

var PENDING_KEY = 'PENDING_SPREAD_STAFF_UID'
var DONE_KEY = 'SPREAD_BIND_DONE'
var _timer = null

function toUid(value) {
  var n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

// 从 scene 字符串解析归属 UID，兼容 "pid=20"、"spread=20"、"spid=20"、"staffUid=20"、纯 "20"
function parseStaffUidFromScene(scene) {
  if (!scene) return 0
  var raw = ''
  try { raw = decodeURIComponent(String(scene)) } catch (e) { raw = String(scene) }
  var pairs = raw.split('&')
  for (var i = 0; i < pairs.length; i++) {
    var kv = pairs[i].split('=')
    var key = (kv[0] || '').trim().toLowerCase()
    if ((key === 'pid' || key === 'spread' || key === 'spid' || key === 'staffuid' || key === 'sid') && kv[1]) {
      var uid = toUid(kv[1])
      if (uid) return uid
    }
  }
  // 纯数字 scene 兜底
  return toUid(raw)
}

// 从启动参数（query / scene）提取归属 UID。与 CRMEB 原生一致优先 spread/spid。
function extractStaffUid(opts) {
  if (!opts) return 0
  var q = opts.query || {}
  var uid = toUid(q.spread || q.spid || q.staffUid || q.staffuid || q.sid || q.pid)
  if (uid) return uid
  return parseStaffUidFromScene(q.scene || opts.scene)
}

// 读取启动参数（优先本次冷/热启动）
function readEnterOptions() {
  try {
    if (typeof wx.getEnterOptionsSync === 'function') {
      var eo = wx.getEnterOptionsSync()
      if (eo) return eo
    }
  } catch (e) {}
  try {
    if (typeof wx.getLaunchOptionsSync === 'function') return wx.getLaunchOptionsSync()
  } catch (e) {}
  return null
}

// 捕获并暂存 staffUid（在 app onLaunch / onShow 调用）
function captureSpreadFromLaunch(opts) {
  try {
    var options = opts || readEnterOptions()
    var uid = extractStaffUid(options)
    if (!uid) return
    // 已经绑定过就不再覆盖（防抢客）
    if (wx.getStorageSync(DONE_KEY)) return
    wx.setStorageSync(PENDING_KEY, uid)
  } catch (e) {
    /* ignore */
  }
}

function doBind(staffUid) {
  var token = getToken()
  if (!token || !staffUid) return Promise.resolve(false)
  return new Promise(function (resolve) {
    wx.request({
      url: BASE_URL + '/api/staff/bind-spread',
      method: 'POST',
      data: { staffUid: staffUid },
      header: { 'content-type': 'application/json', 'Form-type': 'routine', 'Authori-zation': 'Bearer ' + token },
      timeout: 20000,
      success: function (res) {
        var body = res.data || {}
        var code = res.statusCode
        var status = body.status
        if (code >= 200 && code < 300 && status === 200) {
          // 成功（含已有归属未变更）都视为处理完成，避免重复请求
          try {
            wx.removeStorageSync(PENDING_KEY)
            wx.setStorageSync(DONE_KEY, 1)
          } catch (e) {}
          var bound = body.data && body.data.bound
          if (bound) {
            try { wx.showToast({ title: '已绑定专属顾问', icon: 'success' }) } catch (e) {}
          }
          resolve(true)
          return
        }
        if (code === 401 || status === 401) {
          // 未登录/登录失效：保留 pending，等下次登录后重试
          resolve(false)
          return
        }
        // 其他业务错误（如 staffUid 无效 404）：清除 pending，避免无限重试
        try { wx.removeStorageSync(PENDING_KEY) } catch (e) {}
        resolve(false)
      },
      fail: function () { resolve(false) }
    })
  })
}

// 尝试绑定：有 pending 且已登录则绑定，否则等待下次轮询
function tryBindPending() {
  try {
    if (wx.getStorageSync(DONE_KEY)) { stopAutoBind(); return }
    var pending = toUid(wx.getStorageSync(PENDING_KEY))
    if (!pending) return
    if (!getToken()) return // 未登录，等下次
    doBind(pending)
  } catch (e) {
    /* ignore */
  }
}

// 启动轮询：登录态出现后自动完成绑定（与 app.js 既有 token 轮询同节奏）
function startAutoBind() {
  if (_timer) return
  tryBindPending()
  _timer = setInterval(tryBindPending, 1000)
}

function stopAutoBind() {
  if (_timer) { clearInterval(_timer); _timer = null }
}

module.exports = {
  captureSpreadFromLaunch: captureSpreadFromLaunch,
  startAutoBind: startAutoBind,
  stopAutoBind: stopAutoBind,
  tryBindPending: tryBindPending
}
