<template>
  <view class="settlement-page">
    <view class="summary-card">
      <text class="s-name">{{ settlement.merchantName || '商家' }}</text>
      <view class="s-stats">
        <view class="s-item">
          <text class="s-num">¥{{ settlement.pendingSettlement || 0 }}</text>
          <text class="s-label">待结算</text>
        </view>
        <view class="s-item">
          <text class="s-num">¥{{ settlement.settledTotal || 0 }}</text>
          <text class="s-label">累计已结算</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">结算记录</text>
      <view v-if="settlement.records && settlement.records.length" class="record-list">
        <view v-for="(r, idx) in settlement.records" :key="idx" class="record-item">
          <view class="r-left">
            <text class="r-amount">¥{{ r.amount }}</text>
            <text class="r-remark">{{ r.remark || '' }}</text>
          </view>
          <view class="r-right">
            <text class="r-status" :class="r.status">{{ r.status === 'settled' ? '已结算' : '待结算' }}</text>
            <text class="r-time">{{ formatTime(r.createdAt) }}</text>
          </view>
        </view>
      </view>
      <view v-else class="empty">暂无结算记录</view>
    </view>

    <view class="tip">结算由超管线下打款后标记完成，非小程序提现。</view>
  </view>
</template>

<script>
import { getMerchantSettlement } from '@/api/voucher.js'

export default {
  data() {
    return { settlement: {} }
  },
  onShow() {
    this.load()
  },
  methods: {
    async load() {
      if (!uni.getStorageSync('SW_TOKEN')) return // 未登录不请求
      try { this.settlement = (await getMerchantSettlement()) || {} } catch (e) {
        if (e.message !== 'NOT_LOGGED_IN') uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      }
    },
    formatTime(ts) {
      if (!ts) return ''
      const d = new Date(ts * 1000)
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.settlement-page { padding: 28rpx; min-height: 100vh; }

.summary-card {
  background: linear-gradient(160deg, #1A1A2E 0%, #2D2B55 50%, $sw-gold-dark 100%);
  border-radius: $sw-radius-xl;
  padding: 44rpx 32rpx;
  color: #fff;
  box-shadow: 0 12rpx 40rpx rgba(45, 43, 85, 0.3);
}
.s-name { display: block; font-size: 32rpx; font-weight: 800; margin-bottom: 28rpx; }
.s-stats { display: flex; gap: 48rpx; }
.s-item { text-align: center; flex: 1; }
.s-num { display: block; font-size: 44rpx; font-weight: 800; color: $sw-gold-light; }
.s-label { display: block; font-size: 22rpx; opacity: 0.75; margin-top: 6rpx; }

.section { margin-top: 32rpx; }
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: $sw-text;
  margin-bottom: 16rpx;
}

.record-list {
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
  overflow: hidden;
  box-shadow: $sw-shadow-sm;
}
.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}
.record-item:last-child { border-bottom: none; }
.r-amount { display: block; font-size: 32rpx; font-weight: 800; color: $sw-text; }
.r-remark { display: block; font-size: 22rpx; color: $sw-text-muted; margin-top: 4rpx; }
.r-status { display: block; font-size: 24rpx; font-weight: 600; text-align: right; }
.r-status.pending { color: $sw-integral; }
.r-status.settled { color: $sw-voucher; }
.r-time { display: block; font-size: 22rpx; color: $sw-text-muted; text-align: right; margin-top: 4rpx; }

.empty {
  text-align: center;
  color: $sw-text-muted;
  padding: 80rpx 0;
  font-size: 26rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
}
.tip {
  text-align: center;
  color: $sw-text-muted;
  font-size: 22rpx;
  margin-top: 48rpx;
  padding: 20rpx;
  background: rgba(0, 0, 0, 0.03);
  border-radius: $sw-radius;
}
</style>
