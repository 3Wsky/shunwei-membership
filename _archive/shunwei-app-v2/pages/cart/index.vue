<template>
  <view class="cart-page">
    <view class="label-nav">
      <view class="label-item"><view class="label-dot" />100%正品保证</view>
      <view class="label-item"><view class="label-dot" />会员专属权益</view>
      <view class="label-item"><view class="label-dot" />售后无忧</view>
    </view>
    <view class="empty-box">
      <view class="empty-icon-ring" />
      <text class="empty-tip">购物车还是空的</text>
      <text class="empty-sub">去挑选心仪的商品吧</text>
      <button class="go-shop-btn" hover-class="btn-tap" @tap="goShop">去逛逛</button>
    </view>
  </view>
</template>

<script setup>
function goShop() {
  uni.switchTab({ url: '/pages/goods_cate/index' })
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.cart-page {
  min-height: 100vh;
  background: $sw-bg;
}
.label-nav {
  display: flex;
  justify-content: space-around;
  padding: 24rpx 20rpx;
  background: $sw-bg-card;
  font-size: 22rpx;
  color: $sw-text-secondary;
  box-shadow: $sw-shadow-sm;
}
.label-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.label-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: $sw-gold;
  flex-shrink: 0;
}
.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx 0;
}
.empty-icon-ring {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba($sw-gold, 0.2);
  margin-bottom: 32rpx;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    inset: 20rpx;
    border-radius: 50%;
    background: $sw-integral-soft;
  }
}
.empty-tip {
  font-size: 32rpx;
  font-weight: 600;
  color: $sw-text;
  margin-bottom: 12rpx;
}
.empty-sub {
  font-size: 26rpx;
  color: $sw-text-muted;
  margin-bottom: 48rpx;
}
.go-shop-btn {
  width: 320rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  background: $sw-bg-dark;
  color: $sw-gold-light;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  box-shadow: $sw-shadow-gold;
  &::after { border: none; }
}
.btn-tap {
  transform: $sw-tap-scale;
  opacity: 0.92;
}
</style>
