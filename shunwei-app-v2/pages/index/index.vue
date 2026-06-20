<template>
  <view class="home-page">
    <!-- 磁吸会员身份条 -->
    <view class="identity-bar">
      <view class="identity-inner" @tap="goMember">
        <view class="id-left">
          <view class="avatar-wrap">
            <image
              v-if="userStore.avatar"
              class="avatar"
              :src="userStore.avatar"
              mode="aspectFill"
            />
            <view v-else class="avatar-placeholder">
              <text>{{ userStore.nickname?.charAt(0) || '?' }}</text>
            </view>
          </view>
          <view class="id-info">
            <view class="id-name-row">
              <text class="id-name">{{ userStore.nickname || '欢迎光临' }}</text>
              <view class="tier-badge" :class="tierBadgeClass">
                <text class="tier-icon">{{ tierIcon }}</text>
                <text class="tier-text">{{ memberLabel }}</text>
              </view>
            </view>
            <view class="id-integral">
              <text class="id-integral-num"><CountUp :value="integralBalance" /></text>
              <text class="id-integral-label">可用积分</text>
            </view>
          </view>
        </view>
        <view class="id-arrow">›</view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-nav anim-fade-in">
      <view class="quick-item btn-tap" @tap="goMember">
        <view class="quick-icon quick-icon-member">👑</view>
        <text class="quick-label">会员</text>
      </view>
      <view class="quick-item btn-tap" @tap="goIntegral">
        <view class="quick-icon quick-icon-integral">✦</view>
        <text class="quick-label">积分</text>
      </view>
      <view class="quick-item btn-tap" @tap="goVoucher">
        <view class="quick-icon quick-icon-voucher">◈</view>
        <text class="quick-label">现金券</text>
      </view>
      <view class="quick-item btn-tap" @tap="goProductList">
        <view class="quick-icon quick-icon-shop">◇</view>
        <text class="quick-label">好物</text>
      </view>
    </view>

    <!-- 会员套餐 -->
    <view class="section anim-fade-in">
      <view class="section-header">
        <text class="section-title">会员套餐</text>
        <text class="section-sub">开通即赠积分</text>
      </view>
      <view class="plan-cards">
        <view
          v-for="plan in plans"
          :key="plan.code"
          class="plan-card btn-tap"
          :class="{ premium: plan.code === 'SW299' }"
          @tap="goPlan(plan)"
        >
          <view v-if="plan.code === 'SW299'" class="plan-ribbon">尊享</view>
          <text class="plan-price">¥{{ plan.price }}</text>
          <text class="plan-name">{{ plan.name }}</text>
          <text class="plan-gift">赠 {{ plan.giftIntegral }} 积分</text>
          <view class="plan-btn">立即开通</view>
        </view>
      </view>
    </view>

    <!-- 精选好物 · 两列瀑布流 -->
    <view class="section anim-fade-in">
      <view class="section-header">
        <text class="section-title">精选好物</text>
        <text class="section-more btn-tap" @tap="goProductList">查看全部 ›</text>
      </view>
      <view v-if="products.length" class="product-grid">
        <view
          v-for="(item, idx) in products"
          :key="item.id"
          class="product-card btn-tap"
          :style="{ animationDelay: idx * 0.06 + 's' }"
          @tap="goProductDetail(item)"
        >
          <view class="product-img-wrap">
            <image
              v-if="item.image"
              class="product-img"
              :src="item.image"
              mode="aspectFill"
            />
            <view v-else class="product-img-placeholder">
              <text>{{ (item.storeName || '').slice(0, 2) }}</text>
            </view>
            <view class="member-tag">会员专属</view>
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
        <text class="empty-icon">✦</text>
        <text class="empty-text">暂无在售商品</text>
        <text class="empty-hint">精彩好物即将上架</text>
        <view class="empty-btn btn-tap" @tap="goProductList">去逛逛</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { getProductList } from '@/api/products'
import { getMembershipPlans, getMyMembership, getMyIntegral } from '@/api/membership'
import CountUp from '@/components/CountUp/CountUp.vue'

const userStore = useUserStore()
const products = ref([])
const plans = ref([])
const membership = ref(null)
const integralBalance = ref(0)

const memberLabel = computed(() => {
  if (!membership.value) return '普通用户'
  return membership.value.planName || '会员'
})

const tierBadgeClass = computed(() => {
  const label = memberLabel.value
  if (label.includes('299') || label.includes('尊享')) return 'tier-premium'
  if (membership.value) return 'tier-gold'
  return 'tier-default'
})

const tierIcon = computed(() => {
  if (tierBadgeClass.value === 'tier-premium') return '◆'
  if (tierBadgeClass.value === 'tier-gold') return '★'
  return '○'
})

onMounted(async () => {
  await Promise.allSettled([loadProducts(), loadPlans(), loadMembership(), loadIntegral()])
})

async function loadProducts() {
  try {
    const data = await getProductList()
    products.value = (data.list || data || []).slice(0, 6)
  } catch { /* silent */ }
}

async function loadPlans() {
  try {
    const data = await getMembershipPlans()
    plans.value = data || []
  } catch { /* silent */ }
}

async function loadMembership() {
  if (!userStore.isLoggedIn) return
  try {
    membership.value = await getMyMembership()
  } catch { /* silent */ }
}

async function loadIntegral() {
  if (!userStore.isLoggedIn) return
  try {
    const data = await getMyIntegral()
    integralBalance.value = data.balance || data.integral || data.totalIntegral || 0
  } catch { /* silent */ }
}

function goMember() {
  uni.navigateTo({ url: '/pages/member/center' })
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

function goIntegral() {
  uni.navigateTo({ url: '/pages/integral/index' })
}

function goVoucher() {
  uni.navigateTo({ url: '/pages/voucher/wallet' })
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.home-page {
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* ── 磁吸身份条 ── */
.identity-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: $sw-bg-dark;
  padding: 24rpx $sw-page-pad 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(26, 31, 54, 0.35);
}

.identity-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.id-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.avatar-wrap {
  margin-right: 20rpx;
  flex-shrink: 0;
}

.avatar, .avatar-placeholder {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(212, 175, 55, 0.5);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.25);
}

.avatar-placeholder {
  background: linear-gradient(135deg, $sw-dark-mid, $sw-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
  color: $sw-gold-light;
}

.id-info {
  flex: 1;
  min-width: 0;
}

.id-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.id-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  max-width: 240rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tier-badge {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;

  &.tier-default {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.75);
  }
  &.tier-gold {
    background: linear-gradient(135deg, rgba(201, 162, 39, 0.35), rgba(212, 175, 55, 0.2));
    color: $sw-gold-light;
    border: 1rpx solid rgba(212, 175, 55, 0.4);
  }
  &.tier-premium {
    background: linear-gradient(135deg, rgba(123, 79, 212, 0.4), rgba(201, 162, 39, 0.25));
    color: #E8DAEF;
    border: 1rpx solid rgba(212, 175, 55, 0.35);
  }
}

.tier-icon {
  font-size: 18rpx;
}

.id-integral {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 10rpx;
}

.id-integral-num {
  font-size: 40rpx;
  font-weight: 800;
  color: $sw-gold-light;
  line-height: 1;
}

.id-integral-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.55);
}

.id-arrow {
  font-size: 40rpx;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 300;
  flex-shrink: 0;
  margin-left: 12rpx;
}

/* ── 快捷入口 ── */
.quick-nav {
  display: flex;
  justify-content: space-around;
  margin: $sw-gap $sw-page-pad 0;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 28rpx 16rpx;
  box-shadow: $sw-shadow-card;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.quick-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: $sw-gold;
}

.quick-icon-member { background: linear-gradient(135deg, #FBF6E8, #F5E6A3); }
.quick-icon-integral { background: linear-gradient(135deg, #FBF6E8, #FFF8E7); }
.quick-icon-voucher { background: linear-gradient(135deg, $sw-voucher-soft, #D4F5E0); }
.quick-icon-shop { background: linear-gradient(135deg, #F0F0F5, #E8E8F0); color: $sw-dark-mid; }

.quick-label {
  font-size: 24rpx;
  color: $sw-text-secondary;
  font-weight: 500;
}

/* ── 区块 ── */
.section {
  margin: 36rpx $sw-page-pad 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 800;
  color: $sw-text;
}

.section-sub {
  font-size: 24rpx;
  color: $sw-text-muted;
}

.section-more {
  font-size: 26rpx;
  color: $sw-gold-dark;
  font-weight: 500;
}

/* ── 会员套餐卡 ── */
.plan-cards {
  display: flex;
  gap: 20rpx;
}

.plan-card {
  flex: 1;
  position: relative;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 32rpx 20rpx 24rpx;
  text-align: center;
  box-shadow: $sw-shadow-card;
  border: 2rpx solid rgba(201, 162, 39, 0.12);
  overflow: hidden;

  &.premium {
    background: $sw-bg-dark-deep;
    border-color: rgba(212, 175, 55, 0.35);
    box-shadow: 0 12rpx 40rpx rgba(26, 31, 54, 0.35);

    .plan-price { color: $sw-gold-light; }
    .plan-name { color: rgba(255, 255, 255, 0.9); }
    .plan-gift { color: rgba(255, 255, 255, 0.55); }
    .plan-btn {
      background: linear-gradient(135deg, $sw-gold, $sw-gold-dark);
      color: #fff;
    }
  }
}

.plan-ribbon {
  position: absolute;
  top: 16rpx;
  right: -28rpx;
  background: linear-gradient(135deg, $sw-gold, $sw-gold-dark);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  padding: 4rpx 36rpx;
  transform: rotate(45deg);
  letter-spacing: 2rpx;
}

.plan-price {
  display: block;
  font-size: 48rpx;
  font-weight: 800;
  color: $sw-gold-dark;
  line-height: 1.2;
}

.plan-name {
  display: block;
  font-size: 26rpx;
  color: $sw-text-secondary;
  margin-top: 8rpx;
  font-weight: 600;
}

.plan-gift {
  display: block;
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.plan-btn {
  display: inline-block;
  margin-top: 20rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: $sw-gold-dark;
  background: $sw-integral-soft;
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
}

/* ── 商品瀑布流 ── */
.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.product-card {
  width: calc(50% - 10rpx);
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  overflow: hidden;
  box-shadow: $sw-shadow-card;
  animation: fadeSlideUp 0.45s $sw-ease both;
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
  background: linear-gradient(135deg, #E8E6E1, #F5F3F0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: 700;
  color: rgba(26, 31, 54, 0.15);
}

.member-tag {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: $sw-gold-dark;
  background: rgba(255, 255, 255, 0.92);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  letter-spacing: 1rpx;
}

.product-info {
  padding: 20rpx;
}

.product-name {
  display: block;
  font-size: 26rpx;
  color: $sw-text;
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
  font-weight: 800;
  color: $sw-gold;
}

/* ── 空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  box-shadow: $sw-shadow-card;
}

.empty-icon {
  font-size: 64rpx;
  color: $sw-gold;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: $sw-text-secondary;
  margin-top: 16rpx;
  font-weight: 500;
}

.empty-hint {
  font-size: 24rpx;
  color: $sw-text-muted;
  margin-top: 8rpx;
}

.empty-btn {
  margin-top: 28rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: $sw-gold-dark;
  background: $sw-integral-soft;
  padding: 14rpx 40rpx;
  border-radius: 999rpx;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(24rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
