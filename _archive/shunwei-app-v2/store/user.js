import { defineStore } from 'pinia'
import { getToken, setToken, clearAuth, setUserInfo, getUserInfo as getStoredUser } from '@/utils/auth'
import { authType, authLoginByKey, getUserInfo as fetchUser } from '@/api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userInfo: getStoredUser(),
    isLoading: false,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    nickname: (state) => state.userInfo?.nickname || '未登录',
    avatar: (state) => state.userInfo?.avatar || '',
    uid: (state) => state.userInfo?.uid || 0,
  },

  actions: {
    async login() {
      this.isLoading = true
      try {
        const loginRes = await new Promise((resolve, reject) => {
          uni.login({
            provider: 'weixin',
            success: resolve,
            fail: reject,
          })
        })
        if (!loginRes?.code) {
          throw new Error(loginRes?.errMsg || '微信登录失败')
        }

        // 第一步：auth_type 换 key
        const at = await authType(loginRes.code)
        if (at?.bindPhone) {
          // 新用户需绑定手机号：暂存 key，跳转绑定页（P1 先提示，后续接绑定流程）
          this.pendingKey = at.key || ''
          uni.showToast({ title: '请先绑定手机号', icon: 'none' })
          return false
        }
        if (!at?.key) throw new Error('登录失败：未获取到 key')

        // 第二步：auth_login(key) 换 token
        const data = await authLoginByKey(at.key)
        const token = data?.token || data?.access_token
        if (!token) throw new Error('服务器未返回 token')

        setToken(token)
        this.token = token

        await this.fetchUserInfo()
        return true
      } catch (err) {
        const msg = (err && err.message) || '登录失败'
        // 显式弹窗便于排查（模拟器常因 jscode2session 拿不到 openid 报「静默授权失败」）
        uni.showModal({
          title: '登录失败',
          content: msg + '\n\n提示：模拟器可能无法完成微信授权，请用【真机预览】登录测试。',
          showCancel: false,
        })
        return false
      } finally {
        this.isLoading = false
      }
    },

    async fetchUserInfo() {
      if (!this.token) return
      try {
        const info = await fetchUser()
        this.userInfo = info
        setUserInfo(info)
      } catch {
        // token expired or invalid
      }
    },

    logout() {
      clearAuth()
      this.token = ''
      this.userInfo = null
      uni.reLaunch({ url: '/pages/login/index' })
    },
  },
})
