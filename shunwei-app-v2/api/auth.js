import { crmebRequest } from './request'

/**
 * 微信小程序登录（CRMEB v5.6.4/v6 标准两步握手，走 CRMEB 网关）：
 *  1) uni.login() 拿 code
 *  2) GET v2/routine/auth_type?code=xxx → { bindPhone, key }
 *  3) bindPhone=false → GET v2/routine/auth_login?key=xxx → { token, expires_time }
 *     bindPhone=true  → 需先绑定手机号（authBindingPhone，携带 key）
 *
 * 之前误用 auth_login(code) 导致 "method param miss:key" 400 + 回退 routine_auth(404)。
 * token 为 CRMEB HS256 JWT，shunwei-api 用同一 APP_KEY 校验；老微信用户 openid 不变，无感登录。
 */

// 第一步：换取 key（校验 code、缓存用户信息）
export function authType(code, spreadSpid = 0, spreadCode = '') {
  const qs = `code=${encodeURIComponent(code)}&spread_spid=${spreadSpid}&spread_code=${encodeURIComponent(spreadCode)}`
  return crmebRequest(`/api/v2/routine/auth_type?${qs}`, { method: 'GET' })
}

// 第二步：用 key 换 token
export function authLoginByKey(key) {
  return crmebRequest(`/api/v2/routine/auth_login?key=${encodeURIComponent(key)}`, { method: 'GET' })
}

// 新用户绑定手机号（携带第一步的 key）后直接登录
export function authBindingPhone({ code, iv, encryptedData, key, spreadSpid = 0, spreadCode = '' }) {
  return crmebRequest('/api/v2/routine/auth_binding_phone', {
    method: 'POST',
    data: { code, iv, encryptedData, key, spread_spid: spreadSpid, spread_code: spreadCode },
  })
}

// 手机号验证码登录（备用）
export function phoneLogin(data) {
  return crmebRequest('/api/v2/routine/phone_login', { method: 'POST', data })
}

// 当前用户信息
export function getUserInfo() {
  return crmebRequest('/api/user')
}
