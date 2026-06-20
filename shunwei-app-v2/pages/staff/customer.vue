<template>
  <view class="customer-page">
    <view v-if="customer" class="customer-card">
      <view class="c-header">
        <text class="c-name">{{ customer.nickname || '用户' }}</text>
        <text class="c-uid">UID: {{ customer.uid }}</text>
      </view>
      <view class="c-stats">
        <view class="stat-item">
          <text class="stat-num">{{ customer.integral || 0 }}</text>
          <text class="stat-label">总积分</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ customer.giftIntegralRemain || 0 }}</text>
          <text class="stat-label">赠送余额</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ customer.isMoneyLevel ? '是' : '否' }}</text>
          <text class="stat-label">付费会员</text>
        </view>
      </view>
    </view>

    <!-- 会员记录 -->
    <view v-if="customer && customer.memberships && customer.memberships.length" class="section">
      <text class="section-title">会员记录</text>
      <view class="membership-list">
        <view v-for="(m, idx) in customer.memberships" :key="idx" class="m-item">
          <text class="m-tier">{{ m.tier_code }}</text>
          <text class="m-date">到期: {{ formatTime(m.expire_at) }}</text>
          <text class="m-integral">赠{{ m.granted_integral }}积分</text>
        </view>
      </view>
    </view>

    <view v-else-if="!loading && !customer" class="empty">客户不存在</view>
    <view v-if="loading" class="loading">加载中…</view>
  </view>
</template>

<script>
import { getCustomerBenefits } from '@/api/staff.js'

export default {
  data() {
    return { customer: null, loading: true }
  },
  onLoad(query) {
    if (query.uid) this.loadCustomer(query.uid)
    else this.loading = false
  },
  methods: {
    async loadCustomer(uid) {
      this.loading = true
      try {
        this.customer = await getCustomerBenefits(uid)
      } catch (e) {
        uni.showToast({ title: e.message || '查询失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    formatTime(ts) {
      if (!ts) return '--'
      const d = typeof ts === 'number' && ts < 2e10 ? new Date(ts * 1000) : new Date(ts)
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.customer-page {
  min-height: 100vh;
  padding: $sw-page-pad;
  background: $sw-bg;
}

.customer-card {
  background: linear-gradient(160deg, #1A1A2E 0%, #2D2B55 55%, $sw-purple 100%);
  border-radius: $sw-radius-xl;
  padding: 40rpx 32rpx;
  color: #fff;
  box-shadow: 0 12rpx 40rpx rgba(45, 43, 85, 0.28);
}
.c-header { margin-bottom: 28rpx; }
.c-name { display: block; font-size: 40rpx; font-weight: 800; }
.c-uid { display: block; font-size: 24rpx; opacity: 0.75; margin-top: 6rpx; }

.c-stats {
  display: flex;
  gap: 16rpx;
}
.stat-item {
  flex: 1;
  text-align: center;
  background: rgba(255, 255, 255, 0.12);
  border-radius: $sw-radius-sm;
  padding: 20rpx 8rpx;
}
.stat-num { display: block; font-size: 32rpx; font-weight: 800; }
.stat-label { display: block; font-size: 22rpx; opacity: 0.75; margin-top: 6rpx; }

.section { margin-top: $sw-gap; }
.section-title {
  font-size: 30rpx;
  font-weight: 800;
  color: $sw-text;
  margin-bottom: 16rpx;
  display: block;
}

.membership-list {
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
  overflow: hidden;
  box-shadow: $sw-shadow-sm;
}
.m-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 28rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}
.m-item:last-child { border-bottom: none; }
.m-tier { font-size: 28rpx; font-weight: 700; color: $sw-brand; }
.m-date { flex: 1; font-size: 24rpx; color: $sw-text-muted; }
.m-integral { font-size: 24rpx; color: $sw-text-secondary; }

.empty, .loading {
  text-align: center;
  color: $sw-text-muted;
  padding: 80rpx 0;
  font-size: 28rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
  margin-top: $sw-gap;
}
</style>
