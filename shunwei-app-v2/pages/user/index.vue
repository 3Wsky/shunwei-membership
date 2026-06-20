<template>
  <view class="user-page">
    <!-- 深色头部 -->
    <view class="header-bg" />

    <!-- 用户大卡片 -->
    <view class="profile-card" @tap="goLogin">
      <view class="profile-top">
        <view class="avatar-wrap">
          <image v-if="userStore.avatar" class="avatar" :src="userStore.avatar" mode="aspectFill" />
          <view v-else class="avatar-placeholder">
            <text>{{ userStore.nickname?.charAt(0) || '?' }}</text>
          </view>
          <view class="badge-ring" :class="tierClass">
            <text class="badge-icon">{{ tierIcon }}</text>
          </view>
        </view>
        <view class="profile-info">
          <text class="user-name">{{ userStore.isLoggedIn ? userStore.nickname : '点击登录' }}</text>
          <view class="tier-chip" :class="tierClass">
            <text>{{ tierLabel }}</text>
          </view>
          <text class="user-hint" v-if="!userStore.isLoggedIn">登录后享受会员专属权益</text>
        </view>
      </view>

      <!-- 数据看板 -->
      <view class="stats-row">
        <view class="stat-item" @tap.stop="goIntegral">
          <text class="stat-num">{{ stats.integral }}</text>
          <text class="stat-label">积分余额</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item" @tap.stop="goVoucher">
          <text class="stat-num">{{ stats.vouchers }}</text>
          <text class="stat-label">优惠券</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item" @tap.stop="goIntegral">
          <text class="stat-num">{{ stats.pending }}</text>
          <text class="stat-label">待核销</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item btn-tap" @tap="goMember">
          <view class="menu-icon-wrap menu-icon-member"><text class="menu-icon">👑</text></view>
          <text class="menu-label">我的会员</text>
          <text class="menu-desc">等级权益</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item btn-tap" @tap="goIntegral">
          <view class="menu-icon-wrap menu-icon-integral"><text class="menu-icon">✦</text></view>
          <text class="menu-label">我的积分</text>
          <text class="menu-desc">明细 · 兑换</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item btn-tap" @tap="goVoucher">
          <view class="menu-icon-wrap menu-icon-voucher"><text class="menu-icon">◈</text></view>
          <text class="menu-label">现金券钱包</text>
          <text class="menu-desc">到店核销</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <text class="menu-section-title">工作台</text>
      <view class="menu-group">
        <view class="menu-item btn-tap" @tap="goStaff">
          <view class="menu-icon-wrap menu-icon-staff"><text class="menu-icon">🔧</text></view>
          <text class="menu-label">员工工作台</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item btn-tap" @tap="goMerchant">
          <view class="menu-icon-wrap menu-icon-merchant"><text class="menu-icon">🏪</text></view>
          <text class="menu-label">商家入口</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view v-if="userStore.isLoggedIn" class="logout-section">
      <button class="logout-btn btn-tap" @tap="handleLogout">退出登录</button>
    </view>

    <view class="footer-brand">
      <text>顺为优选 · FZLSaas</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { getMyIntegral, getMyMembership, getIntegralMallOrders } from '@/api/membership'
import { getVoucherWallet } from '@/api/voucher'

const userStore = useUserStore()
const stats = ref({ integral: 0, vouchers: 0, pending: 0 })
const membership = ref(null)

const tierLabel = computed(() => {
  if (!userStore.isLoggedIn) return '未登录'
  if (!membership.value) return '普通用户'
  return membership.value.planName || membership.value.title || '会员'
})

const tierClass = computed(() => {
  const label = tierLabel.value
  if (label.includes('299') || label.includes('尊享')) return 'tier-premium'
  if (membership.value) return 'tier-gold'
  return 'tier-default'
})

const tierIcon = computed(() => {
  if (tierClass.value === 'tier-premium') return '◆'
  if (tierClass.value === 'tier-gold') return '★'
  return '○'
})

onShow(() => {
  if (userStore.isLoggedIn) loadStats()
})

async function loadStats() {
  try {
    const integral = await getMyIntegral()
    stats.value.integral = integral?.totalIntegral || integral?.balance || integral?.total || 0
  } catch { /* silent */ }
  try {
    const voucher = await getVoucherWallet()
    const list = voucher?.list || voucher?.batches || (Array.isArray(voucher) ? voucher : [])
    stats.value.vouchers = list.filter(v => v.status !== 2 && v.status !== 'used').length
  } catch { /* silent */ }
  try {
    membership.value = await getMyMembership()
  } catch { /* silent */ }
  try {
    const orders = await getIntegralMallOrders({ page: 1, limit: 50 })
    const list = orders?.list || []
    stats.value.pending = list.filter(o => o.status !== 3).length
  } catch { /* silent */ }
}

function goLogin() {
  if (!userStore.isLoggedIn) uni.navigateTo({ url: '/pages/login/index' })
}

function goMember() {
  uni.navigateTo({ url: '/pages/member/center' })
}

function goIntegral() {
  uni.navigateTo({ url: '/pages/integral/index' })
}

function goVoucher() {
  uni.navigateTo({ url: '/pages/voucher/wallet' })
}

function goStaff() {
  uni.navigateTo({ url: '/pages/staff/workbench' })
}

function goMerchant() {
  uni.navigateTo({ url: '/pages/merchant/verify' })
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    confirmColor: '#C9A227',
    success(res) {
      if (res.confirm) userStore.logout()
    },
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.user-page {
  min-height: 100vh;
  padding-bottom: 60rpx;
  position: relative;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 360rpx;
  background: $sw-bg-dark;
  border-radius: 0 0 48rpx 48rpx;
}

.profile-card {
  position: relative;
  z-index: 1;
  margin: 48rpx $sw-page-pad 0;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 36rpx 28rpx 28rpx;
  box-shadow: $sw-shadow-lg;
}

.profile-top {
  display: flex;
  align-items: center;
}

.avatar-wrap {
  position: relative;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.avatar, .avatar-placeholder {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(212, 175, 55, 0.4);
}

.avatar-placeholder {
  background: $sw-bg-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  font-weight: 700;
  color: $sw-gold-light;
}

.badge-ring {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #fff;
  font-size: 18rpx;

  &.tier-default { background: #9CA3AF; color: #fff; }
  &.tier-gold { background: linear-gradient(135deg, $sw-gold, $sw-gold-dark); color: #fff; }
  &.tier-premium { background: linear-gradient(135deg, $sw-purple, $sw-gold); color: #fff; }
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: $sw-text;
}

.tier-chip {
  display: inline-block;
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;

  &.tier-default { background: #F3F4F6; color: $sw-text-muted; }
  &.tier-gold { background: $sw-integral-soft; color: $sw-gold-dark; }
  &.tier-premium { background: linear-gradient(135deg, #E8DAEF, #FBF6E8); color: $sw-purple; }
}

.user-hint {
  display: block;
  font-size: 24rpx;
  color: $sw-text-muted;
  margin-top: 8rpx;
}

.stats-row {
  display: flex;
  align-items: center;
  margin-top: 32rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid $sw-border;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: $sw-gold;
  line-height: 1.1;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: $sw-border;
}

.menu-section {
  margin: 28rpx $sw-page-pad 0;
}

.menu-section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $sw-text-secondary;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.menu-group {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  overflow: hidden;
  box-shadow: $sw-shadow-card;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);

  &:last-child { border-bottom: none; }
}

.menu-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.menu-icon-member { background: linear-gradient(135deg, #FBF6E8, #F5E6A3); }
.menu-icon-integral { background: linear-gradient(135deg, #FBF6E8, #FFF8E7); }
.menu-icon-voucher { background: linear-gradient(135deg, $sw-voucher-soft, #D4F5E0); }
.menu-icon-staff { background: linear-gradient(135deg, #EEF2FF, #DDE4FF); }
.menu-icon-merchant { background: linear-gradient(135deg, #F0F0F5, #E8E8F0); }

.menu-icon { font-size: 28rpx; }

.menu-label {
  font-size: 28rpx;
  color: $sw-text;
  font-weight: 500;
}

.menu-desc {
  flex: 1;
  text-align: right;
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-right: 8rpx;
}

.menu-arrow {
  font-size: 28rpx;
  color: $sw-text-muted;
}

.logout-section {
  margin: 48rpx $sw-page-pad 0;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  background: $sw-bg-card;
  color: $sw-text-secondary;
  font-size: 28rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $sw-shadow-card;
  &::after { border: none; }
}

.footer-brand {
  text-align: center;
  margin-top: 40rpx;
  font-size: 22rpx;
  color: $sw-text-muted;
  letter-spacing: 2rpx;
}
</style>
