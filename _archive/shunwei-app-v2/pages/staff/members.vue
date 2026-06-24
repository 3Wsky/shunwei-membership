<template>
  <view class="members-page">
    <!-- 店长审批入口 -->
    <view v-if="isManager" class="manager-entry btn-tap" @tap="goApprovals">
      <view class="entry-left">
        <text class="entry-title">店长审批</text>
        <text class="entry-desc">审核店员提交的会员权益申请</text>
      </view>
      <view class="entry-right">
        <view v-if="pendingCount > 0" class="badge-dot">{{ pendingCount }}</view>
        <text class="entry-arrow">›</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        v-model="keyword"
        placeholder="搜索昵称、UID 或手机号"
        confirm-type="search"
        @confirm="handleSearch"
      />
      <view class="search-btn btn-tap" @tap="handleSearch">
        <text>查询</text>
      </view>
    </view>

    <!-- 概览 -->
    <view class="summary-bar">
      <text class="summary-text">我的会员 {{ total }} 人</text>
      <text v-if="selfUid" class="uid-hint">登录 UID {{ selfUid }}</text>
    </view>

    <!-- 会员列表 -->
    <view
      v-for="(item, idx) in list"
      :key="item.uid"
      class="member-card btn-tap anim-fade-in"
      :style="{ animationDelay: idx * 0.03 + 's' }"
      @tap="openMember(item)"
    >
      <view class="avatar-wrap">
        <image v-if="item.avatar" class="avatar" :src="item.avatar" mode="aspectFill" />
        <view v-else class="avatar-placeholder">
          <text>{{ (item.nickname || '?').charAt(0) }}</text>
        </view>
      </view>
      <view class="member-info">
        <text class="member-name">{{ item.nickname || '未设置昵称' }}</text>
        <text class="member-meta">UID {{ item.uid }} · {{ item.phone || '未绑定手机' }}</text>
      </view>
      <text class="member-arrow">›</text>
    </view>

    <!-- 需要登录 -->
    <view v-if="needLogin" class="empty-state">
      <text class="empty-title">请先登录</text>
      <text class="empty-desc">在「我的」页完成微信授权后再进入会员管理</text>
      <view class="empty-btn btn-tap" @tap="goLogin">
        <text>去登录</text>
      </view>
    </view>

    <!-- 空列表 -->
    <view v-else-if="loaded && !loading && !list.length" class="empty-state">
      <text class="empty-title">暂无名下会员</text>
      <text class="empty-desc">需在后台为会员指定归属 UID {{ selfUid || '' }}</text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-bar">
      <text>加载中…</text>
    </view>

    <!-- 错误提示 -->
    <view v-if="loadError && !needLogin" class="error-bar">
      <text>{{ loadError }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { getStaffInfo, getStaffStats, getStaffMembers } from '@/api/staff'
import { getApprovalTodos } from '@/api/approval'

const userStore = useUserStore()

const keyword = ref('')
const list = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const loaded = ref(false)
const finished = ref(false)
const isManager = ref(false)
const pendingCount = ref(0)
const selfUid = ref(0)
const needLogin = ref(false)
const loadError = ref('')

onShow(() => {
  if (!userStore.isLoggedIn) {
    needLogin.value = true
    loaded.value = true
    return
  }
  needLogin.value = false
  bootstrap()
})

onPullDownRefresh(() => {
  bootstrap().finally(() => uni.stopPullDownRefresh())
})

onReachBottom(() => {
  if (!finished.value && !loading.value) loadMembers(false)
})

async function bootstrap() {
  loadError.value = ''
  needLogin.value = false
  try {
    const staff = await getStaffInfo()
    isManager.value = !!(staff?.isManager || staff?.is_manager)
    selfUid.value = Number(staff?.uid || 0)
  } catch (err) {
    const msg = err?.message || '加载失败'
    if (msg === 'NOT_LOGGED_IN' || msg.includes('登录')) {
      needLogin.value = true
      loaded.value = true
      return
    }
    loadError.value = msg
  }

  if (isManager.value) {
    try {
      const todos = await getApprovalTodos('manager')
      pendingCount.value = (todos || []).length
    } catch { /* silent */ }
  }

  await loadMembers(true)
}

async function loadMembers(reset) {
  if (loading.value || (!reset && finished.value)) return
  const p = reset ? 1 : page.value
  loading.value = true
  loadError.value = ''

  try {
    if (reset) {
      const stats = await getStaffStats()
      total.value = Number(stats?.memberCount || 0)
    }

    const data = await getStaffMembers({
      page: p,
      pageSize: 50,
      keyword: keyword.value,
    })
    const rows = data?.list || []
    list.value = reset ? rows : list.value.concat(rows)
    total.value = Number(data?.total || total.value)
    page.value = p + 1
    finished.value = rows.length < 50
  } catch (err) {
    loadError.value = err?.message || '加载失败'
    if (loadError.value === 'NOT_LOGGED_IN') needLogin.value = true
  } finally {
    loading.value = false
    loaded.value = true
  }
}

function handleSearch() {
  loadMembers(true)
}

function openMember(item) {
  uni.navigateTo({
    url: `/pages/staff/apply?member=${encodeURIComponent(JSON.stringify(item))}`,
  })
}

function goApprovals() {
  uni.navigateTo({ url: '/pages/approval/center' })
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.members-page {
  min-height: 100vh;
  background: $sw-bg;
  padding: 0 $sw-page-pad $sw-page-pad;
}

.manager-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 28rpx 32rpx;
  margin-top: 20rpx;
  box-shadow: $sw-shadow-sm;
}

.entry-left {
  display: flex;
  flex-direction: column;
}

.entry-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $sw-text;
}

.entry-desc {
  font-size: 24rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.entry-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.badge-dot {
  background: $sw-brand;
  color: #fff;
  font-size: 22rpx;
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10rpx;
}

.entry-arrow {
  font-size: 36rpx;
  color: $sw-text-muted;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-shadow: $sw-shadow-sm;
}

.search-btn {
  height: 72rpx;
  padding: 0 32rpx;
  background: $sw-gold;
  color: #fff;
  border-radius: $sw-radius;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 500;
}

.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 8rpx;
}

.summary-text {
  font-size: 26rpx;
  color: $sw-text-secondary;
  font-weight: 500;
}

.uid-hint {
  font-size: 22rpx;
  color: $sw-text-muted;
}

.member-card {
  display: flex;
  align-items: center;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: $sw-shadow-sm;
}

.avatar-wrap {
  width: 88rpx;
  height: 88rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
}

.avatar-placeholder {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $sw-gold 0%, $sw-gold-light 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #fff;
  font-weight: 600;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.member-name {
  font-size: 30rpx;
  font-weight: 500;
  color: $sw-text;
}

.member-meta {
  font-size: 24rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.member-arrow {
  font-size: 36rpx;
  color: $sw-text-muted;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 80rpx 40rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $sw-text;
  display: block;
}

.empty-desc {
  font-size: 26rpx;
  color: $sw-text-muted;
  margin-top: 12rpx;
  display: block;
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  background: $sw-gold;
  color: #fff;
  border-radius: $sw-radius;
  font-size: 28rpx;
  font-weight: 500;
}

.loading-bar {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: $sw-text-muted;
}

.error-bar {
  text-align: center;
  padding: 24rpx;
  font-size: 26rpx;
  color: $sw-brand;
}
</style>
