import config from '@/config'
import { getToken, clearAuth } from '@/utils/auth'

function createRequest(baseUrl) {
  return function request(url, options = {}) {
    const { method = 'GET', data, header = {}, silent = false } = options
    const token = getToken()

    const headers = { 'Content-Type': 'application/json', ...header }
    if (token) {
      // CRMEB 规范：Authori-zation 放原始 token，不加 Bearer 前缀
      headers[config.TOKEN_HEADER] = token
    }

    return new Promise((resolve, reject) => {
      uni.request({
        url: `${baseUrl}${url}`,
        method,
        data,
        header: headers,
        success(res) {
          if (res.statusCode === 401) {
            // 仅清除本地登录态并安静拒绝；不在此处强制 reLaunch，
            // 避免 tab 页未登录时触发 navigateTo/reLaunch 超时与循环。
            // 页面自行决定是否引导登录。
            clearAuth()
            return reject(new Error('NOT_LOGGED_IN'))
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            const body = res.data
            if (body && body.status !== undefined) {
              if (body.status === 200 || body.status === 1 || body.ok) {
                return resolve(body.data !== undefined ? body.data : body)
              }
              const msg = body.msg || body.message || '请求失败'
              if (!silent) uni.showToast({ title: msg, icon: 'none' })
              return reject(new Error(msg))
            }
            return resolve(body)
          }

          const errMsg = `请求失败 (${res.statusCode})`
          if (!silent) uni.showToast({ title: errMsg, icon: 'none' })
          reject(new Error(errMsg))
        },
        fail(err) {
          const msg = err.errMsg || '网络异常'
          if (!silent) uni.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        },
      })
    })
  }
}

export const crmebRequest = createRequest(config.CRMEB_BASE_URL)

export const swRequest = createRequest(config.SHUNWEI_BASE_URL)
