<template>
  <view class="home-page">
    <!-- 用户信息条 -->
    <view class="user-bar" @tap="goUser">
      <view class="user-bar-left">
        <view class="user-avatar-sm">
          <image v-if="userStore.avatar" class="avatar-img" :src="userStore.avatar" mode="aspectFill" />
          <view v-else class="avatar-ph"><text>{{ (userStore.nickname || '?').charAt(0) }}</text></view>
        </view>
        <text class="user-greet">{{ userStore.isLoggedIn ? userStore.nickname : '点击登录' }}</text>
      </view>
      <view class="user-bar-right" v-if="userStore.isLoggedIn">
        <view class="stat-chip">
          <text class="stat-val">{{ integralBalance }}</text>
          <text class="stat-lbl">积分</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-chip">
          <text class="stat-val">¥{{ voucherBalance }}</text>
          <text class="stat-lbl">现金券</text>
        </view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-inner" @tap="goSearch">
        <text class="search-icon">🔍</text>
        <text class="search-placeholder">搜索商品</text>
      </view>
    </view>

    <!-- Banner 轮播 -->
    <view class="banner-wrap" v-if="plans.length">
      <swiper class="banner-swiper" circular autoplay :interval="4000" indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#fff">
        <swiper-item v-for="plan in plans" :key="plan.tierCode || plan.code" @tap="goPlan(plan)">
          <view class="banner-card" :class="{ premium: (plan.tierCode || plan.code) === 'SW299' }">
            <view class="banner-left">
              <text class="banner-title">{{ plan.title || plan.name }}</text>
              <text class="banner-gift">赠 {{ plan.giftIntegral }} 积分</text>
              <view class="banner-btn">立即开通</view>
            </view>
            <view class="banner-right">
              <text class="banner-price">¥{{ plan.price }}</text>
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 宫格导航 -->
    <view class="nav-grid">
      <view class="nav-item btn-tap" @tap="goMember">
        <view class="nav-icon" style="background: linear-gradient(135deg, #FBF6E8, #F5E6A3);">
          <text>👑</text>
        </view>
        <text class="nav-label">会员中心</text>
      </view>
      <view class="nav-item btn-tap" @tap="goIntegral">
        <view class="nav-icon" style="background: linear-gradient(135deg, #FBF6E8, #FFF8E7);">
          <text>✦</text>
        </view>
        <text class="nav-label">我的积分</text>
      </view>
      <view class="nav-item btn-tap" @tap="goVoucher">
        <view class="nav-icon" style="background: linear-gradient(135deg, #ECFDF3, #D4F5E0);">
          <text>◈</text>
        </view>
        <text class="nav-label">现金券</text>
      </view>
      <view class="nav-item btn-tap" @tap="goMall">
        <view class="nav-icon" style="background: linear-gradient(135deg, #F0ECFF, #E8DAEF);">
          <text>🎁</text>
        </view>
        <text class="nav-label">积分商城</text>
      </view>
      <view class="nav-item btn-tap" @tap="goProductList">
        <view class="nav-icon" style="background: linear-gradient(135deg, #F0F0F5, #E8E8F0);">
          <text>◇</text>
        </view>
        <text class="nav-label">精选好物</text>
      </view>
    </view>

    <!-- 精选好物 · 两列瀑布流 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">精选好物</text>
        <text class="section-more btn-tap" @tap="goProductList">查看全部 ›</text>
      </view>
      <view v-if="products.length" class="product-grid">
        <view
          v-for="(item, idx) in products"
          :key="item.id"
          class="product-card btn-tap anim-fade-in"
          :style="{ animationDelay: idx * 0.05 + 's' }"
          @tap="goProductDetail(item)"
        >
          <view class="product-img-wrap">
            <image v-if="item.image" class="product-img" :src="item.image" mode="aspectFill" />
            <view v-else class="product-img-placeholder">
              <text>{{ (item.storeName || '').slice(0, 2) }}</text>
            </view>
          </view>
          <view class="product-info">
            <text class="product-name">{{ item.storeName }}</text>
            <view class="product-price-row">
              <text class="product-price">¥{{ item.price }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">
        <text class="empty-text">暂无在售商品</text>
        <text class="empty-hint">精彩好物即将上架</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { getProductList } from '@/api/products'
import { getMembershipPlans, getMyIntegral } from '@/api/membership'
import { getVoucherWallet } from '@/api/voucher'

const userStore = useUserStore()
const products = ref([])
const plans = ref([])
const integralBalance = ref(0)
const voucherBalance = ref(0)

onMounted(async () => {
  await Promise.allSettled([loadProducts(), loadPlans()])
})

onShow(() => {
  if (userStore.isLoggedIn) loadUserStats()
})

async function loadProducts() {
  try {
    const data = await getProductList()
    products.value = (data.list || data || []).slice(0, 20)
  } catch { /* silent */ }
}

async function loadPlans() {
  try {
    const data = await getMembershipPlans()
    plans.value = data || []
  } catch { /* silent */ }
}

async function loadUserStats() {
  try {
    const data = await getMyIntegral()
    integralBalance.value = data?.totalIntegral || data?.balance || data?.total || 0
  } catch { /* silent */ }
  try {
    const voucher = await getVoucherWallet()
    voucherBalance.value = Number(voucher?.balance || 0)
  } catch { /* silent */ }
}

function goUser() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' })
  } else {
    uni.switchTab({ url: '/pages/user/index' })
  }
}

function goSearch() {
  uni.switchTab({ url: '/pages/products/list' })
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

function goPlan(plan) {
  uni.navigateTo({ url: `/pages/member/purchase?plan=${plan.tierCode || plan.code}` })
}

function goProductList() {
  uni.switchTab({ url: '/pages/products/list' })
}

function goProductDetail(item) {
  uni.navigateTo({ url: `/pages/products/detail?id=${item.id}` })
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.home-page {
  min-height: 100vh;
  background: #F8F8F8;
  padding-bottom: 40rpx;
}

/* ── 用户信息条 ── */
.user-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #1A1F36 0%, #2D3561 100%);
  padding: 24rpx 28rpx;
}

.user-bar-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.user-avatar-sm {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
}

.avatar-img {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(212, 175, 55, 0.5);
}

.avatar-ph {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(201, 162, 39, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #F5E6A3;
  font-weight: 600;
}

.user-greet {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}

.user-bar-right {
  display: flex;
  align-items: center;
  gap: 0;
}

.stat-chip {
  text-align: center;
  padding: 0 20rpx;
}

.stat-val {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #F5E6A3;
}

.stat-lbl {
  display: block;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.55);
}

.stat-divider {
  width: 1rpx;
  height: 40rpx;
  background: rgba(255, 255, 255, 0.15);
}

/* ── 搜索栏 ── */
.search-bar {
  background: #fff;
  padding: 16rpx 24rpx;
  position: sticky;
  top: 0;
  z-index: 100;
}

.search-inner {
  display: flex;
  align-items: center;
  background: #F5F5F5;
  border-radius: 36rpx;
  height: 68rpx;
  padding: 0 24rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-placeholder {
  font-size: 28rpx;
  color: #999;
}

/* ── Banner ── */
.banner-wrap {
  padding: 20rpx 24rpx 0;
}

.banner-swiper {
  height: 240rpx;
  border-radius: 20rpx;
  overflow: hidden;
}

.banner-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 32rpx 40rpx;
  background: linear-gradient(135deg, $sw-gold, $sw-gold-dark);
  border-radius: 20rpx;

  &.premium {
    background: $sw-bg-dark-deep;
  }
}

.banner-left {
  display: flex;
  flex-direction: column;
}

.banner-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
}

.banner-gift {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
}

.banner-btn {
  display: inline-block;
  margin-top: 20rpx;
  padding: 10rpx 28rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
  border: 1rpx solid rgba(255, 255, 255, 0.4);
}

.banner-right {
  text-align: right;
}

.banner-price {
  font-size: 60rpx;
  font-weight: 800;
  color: #fff;
}

/* ── 宫格导航 ── */
.nav-grid {
  display: flex;
  flex-wrap: wrap;
  background: #fff;
  margin: 20rpx 24rpx 0;
  border-radius: 20rpx;
  padding: 24rpx 0 16rpx;
}

.nav-item {
  width: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 12rpx;
}

.nav-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}

.nav-label {
  font-size: 24rpx;
  color: #333;
  margin-top: 10rpx;
  font-weight: 500;
}

/* ── 区块 ── */
.section {
  margin: 20rpx 24rpx 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 0 4rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}

.section-more {
  font-size: 26rpx;
  color: #999;
}

/* ── 商品瀑布流 ── */
.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.product-card {
  width: calc(50% - 8rpx);
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.product-img-wrap {
  position: relative;
  overflow: hidden;
}

.product-img {
  width: 100%;
  height: 340rpx;
  display: block;
}

.product-img-placeholder {
  width: 100%;
  height: 340rpx;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #ddd;
}

.product-info {
  padding: 16rpx 20rpx 20rpx;
}

.product-name {
  display: block;
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price-row {
  margin-top: 10rpx;
}

.product-price {
  font-size: 34rpx;
  font-weight: 700;
  color: #e93b3d;
}

/* ── 空状态 ── */
.empty-state {
  text-align: center;
  padding: 80rpx 0;
  background: #fff;
  border-radius: 16rpx;
}

.empty-text {
  display: block;
  font-size: 28rpx;
  color: #999;
}

.empty-hint {
  display: block;
  font-size: 24rpx;
  color: #ccc;
  margin-top: 8rpx;
}
</style>
