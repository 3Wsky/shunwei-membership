import config from '@/config'

export function getToken() {
  return uni.getStorageSync(config.TOKEN_KEY) || ''
}

export function setToken(token) {
  uni.setStorageSync(config.TOKEN_KEY, token)
}

export function removeToken() {
  uni.removeStorageSync(config.TOKEN_KEY)
}

export function getUserInfo() {
  try {
    const raw = uni.getStorageSync(config.USER_INFO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setUserInfo(info) {
  uni.setStorageSync(config.USER_INFO_KEY, JSON.stringify(info))
}

export function removeUserInfo() {
  uni.removeStorageSync(config.USER_INFO_KEY)
}

export function isLoggedIn() {
  return !!getToken()
}

export function clearAuth() {
  removeToken()
  removeUserInfo()
}
