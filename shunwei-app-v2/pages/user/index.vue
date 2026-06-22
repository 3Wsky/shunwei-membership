<template>
  <view class="user-page">
    <!-- 用户头卡 -->
    <view class="user-card">
      <view class="card-bg" />
      <view class="user-info-row">
        <view class="avatar-box" @tap="goLogin">
          <image v-if="userStore.avatar" class="avatar" :src="userStore.avatar" mode="aspectFill" />
          <image v-else class="avatar" src="/static/images/f.png" mode="aspectFill" />
        </view>
        <view class="info-center">
          <view v-if="!userStore.isLoggedIn" class="nickname" @tap="goLogin">
            <text>点击登录</text>
          </view>
          <template v-else>
            <view class="nickname">
              <text class="nick-text">{{ userStore.nickname }}</text>
              <view v-if="isMember" class="vip-tag">
                <text>{{ tierLabel }}</text>
              </view>
            </view>
            <view class="phone-row" v-if="userStore.userInfo?.phone">
              <text class="phone-text">{{ userStore.userInfo.phone }}</text>
            </view>
          </template>
        </view>
        <view class="header-actions" v-if="userStore.isLoggedIn">
          <view class="action-icon" @tap="goMember">
            <text>⚙️</text>
          </view>
        </view>
      </view>

      <!-- 数据行 -->
      <view class="num-wrapper">
        <view class="num-item" @tap="goVoucher">
          <text class="num">¥{{ stats.voucherBalance }}</text>
          <text class="txt">现金券</text>
        </view>
        <view class="num-item" @tap="goIntegral">
          <text class="num">{{ stats.integral }}</text>
          <text class="txt">积分</text>
        </view>
        <view class="num-item" @tap="goMall">
          <text class="num">{{ stats.pending }}</text>
          <text class="txt">待核销</text>
        </view>
      </view>
    </view>

    <!-- 业务入口宫格 -->
    <view class="entry-grid">
      <view class="entry-title">常用服务</view>
      <view class="entry-list">
        <view class="entry-item btn-tap" @tap="goMall">
          <view class="entry-icon" style="color: #7B4FD4;">🎁</view>
          <text class="entry-label">积分商城</text>
        </view>
        <view class="entry-item btn-tap" @tap="goVoucher">
          <view class="entry-icon" style="color: #2ECC71;">◈</view>
          <text class="entry-label">现金券</text>
        </view>
        <view class="entry-item btn-tap" @tap="goMember">
          <view class="entry-icon" style="color: #C9A227;">👑</view>
          <text class="entry-label">会员中心</text>
        </view>
        <view class="entry-item btn-tap" @tap="goProductList">
          <view class="entry-icon" style="color: #333;">◇</view>
          <text class="entry-label">精选好物</text>
        </view>
      </view>
    </view>

    <!-- 锦程面板（会员管理/现金券/商家/审批） -->
    <view class="jc-panel" v-if="userStore.isLoggedIn">
      <view class="entry-title">工作台</view>
      <view class="menu-group">
        <view class="menu-item btn-tap" @tap="goStaff">
          <text class="menu-icon">🔧</text>
          <text class="menu-label">员工工作台</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item btn-tap" @tap="goMembers">
          <text class="menu-icon">👥</text>
          <text class="menu-label">会员管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item btn-tap" @tap="goMerchant">
          <text class="menu-icon">🏪</text>
          <text class="menu-label">商家入口</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item btn-tap" @tap="goApproval">
          <text class="menu-icon">📋</text>
          <text class="menu-label">审批中心</text>
          <view v-if="approvalCount > 0" class="menu-badge">{{ approvalCount }}</view>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 常用菜单 -->
    <view class="menu-section">
      <view class="entry-title">我的服务</view>
      <view class="menu-group">
        <view class="menu-item btn-tap" @tap="goIntegral">
          <text class="menu-icon">✦</text>
          <text class="menu-label">积分明细</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item btn-tap" @tap="goMember">
          <text class="menu-icon">⭐</text>
          <text class="menu-label">我的会员</text>
          <text class="menu-desc">{{ tierLabel }}</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出登录 -->
    <view v-if="userStore.isLoggedIn" class="logout-section">
      <button class="logout-btn btn-tap" @tap="handleLogout">退出登录</button>
    </view>

    <view class="footer-brand">
      <text>锦程祥瑞 · FZLSaas</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { getMyIntegral, getMyMembership, getIntegralMallOrders } from '@/api/membership'
import { getVoucherWallet } from '@/api/voucher'
import { getApprovalTodos } from '@/api/approval'

const userStore = useUserStore()
const stats = ref({ integral: 0, voucherBalance: 0, pending: 0 })
const membership = ref(null)
const approvalCount = ref(0)

const tierLabel = computed(() => {
  if (!userStore.isLoggedIn) return '未登录'
  if (!membership.value || !membership.value.isMemberActive) return '普通用户'
  return membership.value.title || membership.value.planName || '会员'
})

const isMember = computed(() => {
  return membership.value && membership.value.isMemberActive
})

onShow(() => {
  if (userStore.isLoggedIn) loadStats()
})

async function loadStats() {
  try {
    const data = await getMyIntegral()
    stats.value.integral = data?.totalIntegral || data?.balance || data?.total || 0
  } catch { /* silent */ }
  try {
    const voucher = await getVoucherWallet()
    stats.value.voucherBalance = Number(voucher?.balance || 0)
  } catch { /* silent */ }
  try {
    membership.value = await getMyMembership()
  } catch { /* silent */ }
  try {
    const orders = await getIntegralMallOrders({ page: 1, limit: 50 })
    const list = orders?.list || []
    stats.value.pending = list.filter(o => o.status !== 3).length
  } catch { /* silent */ }
  try {
    const todos = await getApprovalTodos('manager')
    approvalCount.value = (todos || []).length
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

function goMall() {
  uni.navigateTo({ url: '/pages/integral/mall' })
}

function goProductList() {
  uni.switchTab({ url: '/pages/products/list' })
}

function goStaff() {
  uni.navigateTo({ url: '/pages/staff/workbench' })
}

function goMembers() {
  uni.navigateTo({ url: '/pages/staff/members' })
}

function goMerchant() {
  uni.navigateTo({ url: '/pages/merchant/index' })
}

function goApproval() {
  uni.navigateTo({ url: '/pages/approval/center' })
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    confirmColor: '#e93b3d',
    success(res) {
      if (res.confirm) userStore.logout()
    },
  })
}
</script>

<style lang="scss" scoped>
.user-page {
  min-height: 100vh;
  background: #F8F8F8;
  padding-bottom: env(safe-area-inset-bottom);
}

/* ── 用户头卡 ── */
.user-card {
  position: relative;
  background: linear-gradient(160deg, #1A1F36 0%, #2D3561 100%);
  padding: 40rpx 30rpx 0;
  overflow: hidden;
}

.card-bg {
  position: absolute;
  top: -60rpx;
  right: -40rpx;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: rgba(201, 162, 39, 0.08);
}

.user-info-row {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
}

.avatar-box {
  margin-right: 24rpx;
  flex-shrink: 0;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(212, 175, 55, 0.5);
}

.info-center {
  flex: 1;
  min-width: 0;
}

.nickname {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
}

.nick-text {
  max-width: 280rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vip-tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(201, 162, 39, 0.35), rgba(212, 175, 55, 0.2));
  color: #F5E6A3;
  border: 1rpx solid rgba(212, 175, 55, 0.4);
}

.phone-row {
  margin-top: 8rpx;
}

.phone-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.6);
}

.header-actions {
  flex-shrink: 0;
}

.action-icon {
  font-size: 36rpx;
  padding: 12rpx;
}

/* ── 数据行 ── */
.num-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
  margin-top: 32rpx;
  padding: 28rpx 0 32rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
}

.num-item {
  flex: 1;
  text-align: center;
}

.num {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #fff;
}

.txt {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 4rpx;
}

/* ── 宫格入口 ── */
.entry-grid {
  margin: 20rpx 24rpx 0;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 0 8rpx;
}

.entry-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  padding: 0 28rpx 16rpx;
}

.entry-list {
  display: flex;
  flex-wrap: wrap;
}

.entry-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0 20rpx;
}

.entry-icon {
  font-size: 44rpx;
  margin-bottom: 8rpx;
}

.entry-label {
  font-size: 24rpx;
  color: #333;
}

/* ── 锦程面板 & 菜单 ── */
.jc-panel, .menu-section {
  margin: 20rpx 24rpx 0;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 0 0;
}

.menu-group {
  padding: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #F5F5F5;

  &:last-child {
    border-bottom: none;
  }
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
  width: 44rpx;
  text-align: center;
}

.menu-label {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.menu-desc {
  font-size: 24rpx;
  color: #999;
  margin-right: 12rpx;
}

.menu-badge {
  background: #e93b3d;
  color: #fff;
  font-size: 20rpx;
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  margin-right: 8rpx;
}

.menu-arrow {
  font-size: 32rpx;
  color: #ccc;
}

/* ── 退出 ── */
.logout-section {
  margin: 40rpx 24rpx 0;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #fff !important;
  color: #e93b3d !important;
  font-size: 30rpx;
  font-weight: 500;
  border: none !important;
  border-radius: 16rpx;
}

.footer-brand {
  text-align: center;
  padding: 40rpx 0 20rpx;
  font-size: 22rpx;
  color: #ccc;
}
</style>
