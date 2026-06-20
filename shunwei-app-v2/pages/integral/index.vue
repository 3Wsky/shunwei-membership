<template>
  <view class="integral-page">
    <!-- 积分总览 -->
    <view class="summary-card">
      <view class="total-section">
        <text class="total-label">可用积分</text>
        <text class="total-num"><CountUp :value="summary.totalIntegral || 0" /></text>
      </view>
      <view class="summary-row">
        <view class="summary-item">
          <text class="si-num"><CountUp :value="summary.giftRemaining || 0" /></text>
          <text class="si-label">赠送</text>
        </view>
        <view class="summary-item">
          <text class="si-num"><CountUp :value="summary.rechargeRemaining || 0" /></text>
          <text class="si-label">充值</text>
        </view>
        <view class="summary-item" v-if="summary.expiringIn7Days > 0">
          <text class="si-num warn">{{ summary.expiringIn7Days }}</text>
          <text class="si-label">7天内过期</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="action-bar">
      <view class="action-item" @tap="goMall">
        <text class="action-icon">🛍️</text>
        <text class="action-text">积分商城</text>
      </view>
      <view class="action-item" @tap="goRecharge">
        <text class="action-icon">💰</text>
        <text class="action-text">积分充值</text>
      </view>
    </view>

    <!-- 待核销兑换单 -->
    <view v-if="pendingOrders.length" class="orders-section">
      <text class="section-title">待核销兑换</text>
      <view
        v-for="(order, oidx) in pendingOrders"
        :key="order.orderId"
        class="order-card anim-fade-in"
        :style="{ animationDelay: oidx * 0.06 + 's' }"
      >
        <view class="order-head">
          <text class="order-name">{{ order.productName }}</text>
          <text class="order-cost">{{ order.integralCost }} 积分</text>
        </view>
        <view class="order-qr anim-scale-pop" v-if="order.verifyCode">
          <view class="qr-halo anim-glow" />
          <view class="qr-body">
            <SwQrCode :cid="'order-qr-' + order.orderId" :text="'sw-verify:' + order.verifyCode" :size="220" />
          </view>
        </view>
        <text class="order-code">核销码 {{ order.verifyCode }}</text>
        <text class="order-hint">出示二维码给店员扫码核销</text>
      </view>
    </view>

    <!-- 积分明细 -->
    <view class="log-section">
      <text class="section-title">积分明细</text>
      <view v-if="logs.length" class="log-list">
        <view v-for="(item, idx) in logs" :key="idx" class="log-item">
          <view class="log-left">
            <text class="log-title">{{ item.title || item.mark || '积分变动' }}</text>
            <text class="log-time">{{ formatTime(item.add_time || item.created_at) }}</text>
          </view>
          <text class="log-amount" :class="{ plus: item.pm === 1 || item.direction === 1 }">
            {{ (item.pm === 1 || item.direction === 1) ? '+' : '-' }}{{ item.number || item.amount || 0 }}
          </text>
        </view>
      </view>
      <view v-else-if="!loading" class="empty">暂无积分记录</view>
      <view v-if="loading" class="loading-tip">加载中…</view>
    </view>
  </view>
</template>

<script>
import { getMyIntegral, getIntegralLog, getIntegralMallOrders } from '@/api/membership.js'
import SwQrCode from '@/components/SwQrCode/SwQrCode.vue'
import CountUp from '@/components/CountUp/CountUp.vue'

export default {
  components: { SwQrCode, CountUp },
  data() {
    return {
      summary: {},
      logs: [],
      pendingOrders: [],
      loading: true,
      page: 1,
      noMore: false,
    }
  },
  onShow() {
    if (!uni.getStorageSync('SW_TOKEN')) return
    this.loadSummary()
    this.loadOrders()
    this.page = 1
    this.logs = []
    this.loadLog()
  },
  onReachBottom() {
    if (!this.noMore && !this.loading) this.loadLog()
  },
  methods: {
    async loadSummary() {
      try {
        this.summary = (await getMyIntegral()) || {}
      } catch { /* silent */ }
    },
    async loadOrders() {
      try {
        const res = await getIntegralMallOrders({ page: 1, limit: 10 })
        const list = res?.list || []
        this.pendingOrders = list.filter((o) => o.status !== 3)
      } catch { /* silent */ }
    },
    async loadLog() {
      this.loading = true
      try {
        const res = await getIntegralLog({ page: this.page, limit: 20 })
        const data = res?.list || (Array.isArray(res) ? res : [])
        if (data.length === 0) this.noMore = true
        this.logs = this.page === 1 ? data : this.logs.concat(data)
        this.page++
      } catch { /* silent */ } finally {
        this.loading = false
      }
    },
    formatTime(ts) {
      if (!ts) return ''
      const d = typeof ts === 'number' && ts < 2e10 ? new Date(ts * 1000) : new Date(ts)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    goMall() {
      uni.navigateTo({ url: '/pages/integral/mall' })
    },
    goRecharge() {
      uni.showToast({ title: '积分充值将在后续上线', icon: 'none' })
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.integral-page {
  min-height: 100vh;
  padding: 28rpx;
  padding-bottom: 40rpx;
}

.summary-card {
  position: relative;
  overflow: hidden;
  background: $sw-bg-dark;
  border-radius: $sw-radius-card;
  padding: 48rpx 32rpx 40rpx;
  color: #fff;
  box-shadow: 0 12rpx 40rpx rgba(26, 31, 54, 0.35);
}

.total-section {
  text-align: center;
  margin-bottom: 32rpx;
}
.total-label {
  display: block;
  font-size: 26rpx;
  opacity: 0.9;
  letter-spacing: 2rpx;
}
.total-num {
  display: block;
  font-size: 80rpx;
  font-weight: 800;
  margin-top: 8rpx;
  line-height: 1.1;
  color: $sw-gold-light;
}

.summary-row {
  display: flex;
  justify-content: center;
  gap: 48rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: $sw-radius;
  padding: 24rpx 32rpx;
}
.summary-item { text-align: center; }
.si-num {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
}
.si-num.warn { color: $sw-gold-light; }
.si-label {
  display: block;
  font-size: 22rpx;
  opacity: 0.8;
  margin-top: 6rpx;
}

.action-bar {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}
.action-item {
  flex: 1;
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: $sw-shadow-sm;
  &:active { opacity: 0.85; }
}
.action-icon { font-size: 36rpx; }
.action-text { font-size: 28rpx; font-weight: 600; color: $sw-text; }

.orders-section {
  margin-top: 28rpx;
}
.order-card {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 0;
  margin-bottom: 20rpx;
  box-shadow: $sw-shadow-card;
  text-align: center;
  overflow: hidden;
  border-left: 6rpx solid $sw-gold;
  position: relative;

  &::before, &::after {
    content: '';
    position: absolute;
    width: 24rpx;
    height: 24rpx;
    background: $sw-bg;
    border-radius: 50%;
    top: 50%;
    transform: translateY(-50%);
  }
  &::before { left: -12rpx; }
  &::after { right: -12rpx; }
}
.order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx 16rpx;
  border-bottom: 1rpx dashed rgba(0,0,0,0.08);
}
.order-name { font-size: 28rpx; font-weight: 600; color: $sw-text; }
.order-cost { font-size: 24rpx; color: $sw-gold; font-weight: 600; }
.order-qr {
  position: relative;
  display: flex;
  justify-content: center;
  padding: 24rpx;
  background: linear-gradient(135deg, #FBF6E8, #FFFDF5);
  margin: 0 20rpx;
  border-radius: $sw-radius-sm;
}
.qr-halo {
  position: absolute;
  width: 260rpx;
  height: 260rpx;
  top: 50%;
  left: 50%;
  margin: -130rpx 0 0 -130rpx;
  background: radial-gradient(circle, rgba(201, 162, 39, 0.22) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.qr-body {
  position: relative;
  z-index: 1;
}
.order-code {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
  color: $sw-dark;
  padding: 16rpx 0 8rpx;
}
.order-hint {
  display: block;
  font-size: 22rpx;
  color: $sw-text-muted;
  padding-bottom: 24rpx;
}

.log-section {
  margin-top: 36rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 800;
  color: $sw-text;
  margin-bottom: 16rpx;
  display: block;
}

.log-list {
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
  overflow: hidden;
  box-shadow: $sw-shadow-sm;
}
.log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}
.log-item:last-child { border-bottom: none; }

.log-title {
  display: block;
  font-size: 28rpx;
  color: $sw-text;
  font-weight: 500;
}
.log-time {
  display: block;
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.log-amount {
  font-size: 32rpx;
  font-weight: 700;
  color: $sw-text-muted;
}
.log-amount.plus {
  color: $sw-gold;
}

.empty, .loading-tip {
  text-align: center;
  color: $sw-text-muted;
  padding: 80rpx 0;
  font-size: 26rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
}
</style>
