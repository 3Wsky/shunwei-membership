<template>

  <view class="mall-page">

    <!-- 积分余额 -->

    <view class="balance-bar">

      <view class="balance-left">

        <text class="balance-label">可用积分</text>

        <text class="balance-num">{{ balance }}</text>

      </view>

      <view class="balance-deco">✦</view>

    </view>



    <!-- 商品列表 -->

    <view v-if="products.length" class="product-list">

      <view

        v-for="(item, idx) in products"

        :key="item.id"

        class="product-card btn-tap"

        :class="{ disabled: !item.canExchange }"

        :style="{ animationDelay: idx * 0.05 + 's' }"

        @tap="handleExchange(item)"

      >

        <image class="product-img" :src="item.image" mode="aspectFill" />

        <view class="product-body">

          <text class="product-name">{{ item.title }}</text>

          <view class="product-bottom">

            <view class="price-row">

              <text class="integral-price">{{ item.price }}</text>

              <text class="integral-unit">积分</text>

            </view>

          </view>

        </view>

        <view v-if="!item.canExchange" class="mask-layer">

          <text class="mask-text">{{ item.stockHint || '暂时无法兑换，过两天试试' }}</text>

        </view>

      </view>

    </view>



    <view v-else-if="!loading" class="empty-state">

      <text class="empty-icon">✦</text>

      <text class="empty-text">积分商城暂无商品</text>

      <text class="empty-hint">去兑换第一件商品吧</text>

    </view>



    <view v-if="loading" class="loading-tip">加载中…</view>



    <!-- 半屏确认弹窗 -->

    <view v-if="confirmItem" class="sheet-mask" @tap="closeConfirm">

      <view class="confirm-sheet" @tap.stop>

        <view class="sheet-handle" />

        <text class="sheet-title">确认兑换</text>

        <text class="sheet-product">「{{ confirmItem.title }}」</text>

        <view class="sheet-compare">

          <view class="compare-row">

            <text class="compare-label">消耗积分</text>

            <text class="compare-val cost">-{{ confirmItem.price }}</text>

          </view>

          <view class="compare-row">

            <text class="compare-label">兑换后剩余</text>

            <text class="compare-val remain">{{ balance - confirmItem.price }}</text>

          </view>

        </view>

        <view class="sheet-actions">

          <button class="sheet-cancel btn-tap" @tap="closeConfirm">取消</button>

          <button class="sheet-confirm btn-tap" :loading="exchanging" @tap="doExchange">立即兑换</button>

        </view>

      </view>

    </view>



    <!-- 核销码精美卡片 -->

    <view v-if="exchangeResult" class="exchange-modal" @tap="closeExchange">

      <view class="exchange-card anim-scale-pop" @tap.stop>

        <view class="ex-badge">待核销</view>

        <text class="ex-title">兑换成功</text>

        <text class="ex-product">{{ exchangeResult.productName }}</text>

        <text class="ex-cost">消耗 {{ exchangeResult.integralCost }} 积分</text>

        <view class="ex-qr-wrap" v-if="exchangeResult.verifyCode">

          <view class="qr-glow anim-glow" />

          <SwQrCode

            :cid="'mall-qr-' + exchangeResult.orderId"

            :text="exchangeResult.verifyCode"

            :size="300"

            foreground="#1A1F36"

          />

        </view>

        <text class="ex-code">{{ exchangeResult.verifyCode }}</text>

        <text class="ex-hint">出示二维码或核销码给店员扫码核销</text>

        <button class="ex-close btn-tap" @tap="closeExchange">知道了</button>

      </view>

    </view>

  </view>

</template>



<script>

import { getMyIntegral, getIntegralMallProducts, exchangeIntegralProduct } from '@/api/membership.js'

import SwQrCode from '@/components/SwQrCode/SwQrCode.vue'



export default {

  components: { SwQrCode },

  data() {

    return {

      balance: 0,

      products: [],

      loading: true,

      exchanging: false,

      exchangeResult: null,

      confirmItem: null,

    }

  },

  onShow() {

    this.loadAll()

  },

  methods: {

    async loadAll() {

      this.loading = true

      await Promise.allSettled([this.loadBalance(), this.loadProducts()])

      this.loading = false

    },

    async loadBalance() {

      if (!uni.getStorageSync('SW_TOKEN')) return

      try {

        const data = await getMyIntegral()

        this.balance = data?.totalIntegral || data?.total || 0

      } catch { /* silent */ }

    },

    async loadProducts() {

      try {

        const data = await getIntegralMallProducts()

        this.products = Array.isArray(data) ? data : (data?.list || [])

      } catch { /* silent */ }

    },

    handleExchange(item) {

      if (!item.canExchange) {

        uni.showToast({ title: item.stockHint || '暂时无法兑换', icon: 'none' })

        return

      }

      if (!uni.getStorageSync('SW_TOKEN')) {

        uni.showToast({ title: '请先登录', icon: 'none' })

        return

      }

      if (this.balance < item.price) {

        uni.showToast({ title: '积分不足', icon: 'none' })

        return

      }

      this.confirmItem = item

    },

    closeConfirm() {

      this.confirmItem = null

    },

    async doExchange() {

      if (!this.confirmItem || this.exchanging) return

      this.exchanging = true

      try {

        const data = await exchangeIntegralProduct(this.confirmItem.id)

        this.confirmItem = null

        this.exchangeResult = data

        this.balance = data.balanceAfter ?? this.balance

        await this.loadProducts()

      } catch (e) {

        uni.showToast({ title: e.message || '兑换失败', icon: 'none' })

      } finally {

        this.exchanging = false

      }

    },

    closeExchange() {

      this.exchangeResult = null

      this.loadBalance()

    },

  },

}

</script>



<style lang="scss" scoped>

@import '@/styles/tokens.scss';



.mall-page {

  min-height: 100vh;

  padding: 28rpx;

  padding-bottom: 40rpx;

}



.balance-bar {

  display: flex;

  align-items: center;

  justify-content: space-between;

  background: $sw-bg-dark;

  border-radius: $sw-radius-card;

  padding: 36rpx 32rpx;

  margin-bottom: 28rpx;

  box-shadow: 0 12rpx 40rpx rgba(26, 31, 54, 0.3);

}



.balance-label {

  display: block;

  font-size: 26rpx;

  color: rgba(255, 255, 255, 0.65);

  letter-spacing: 2rpx;

}



.balance-num {

  display: block;

  font-size: 56rpx;

  font-weight: 800;

  color: $sw-gold-light;

  margin-top: 4rpx;

  line-height: 1.1;

}



.balance-deco {

  font-size: 48rpx;

  color: rgba(212, 175, 55, 0.25);

}



.product-list {

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

  position: relative;

  animation: fadeSlideUp 0.4s $sw-ease both;



  &.disabled { opacity: 0.7; }

}



.product-img {

  width: 100%;

  height: 280rpx;

  background: linear-gradient(135deg, #E8E6E1, #F5F3F0);

}



.product-body { padding: 20rpx; }



.product-name {

  display: block;

  font-size: 26rpx;

  color: $sw-text;

  font-weight: 600;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

}



.product-bottom { margin-top: 12rpx; }



.price-row {

  display: flex;

  align-items: baseline;

  gap: 4rpx;

}



.integral-price {

  font-size: 36rpx;

  font-weight: 800;

  color: $sw-gold;

}



.integral-unit {

  font-size: 22rpx;

  color: $sw-text-muted;

}



.mask-layer {

  position: absolute;

  inset: 0;

  background: rgba(255, 255, 255, 0.82);

  backdrop-filter: blur(4px);

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 20rpx;

}



.mask-text {

  font-size: 24rpx;

  color: $sw-text-secondary;

  text-align: center;

  background: rgba(255, 255, 255, 0.95);

  padding: 16rpx 24rpx;

  border-radius: $sw-radius-sm;

  font-weight: 500;

}



.empty-state {

  display: flex;

  flex-direction: column;

  align-items: center;

  padding: 120rpx 0;

  background: $sw-bg-card;

  border-radius: $sw-radius-card;

  box-shadow: $sw-shadow-card;

}



.empty-icon { font-size: 64rpx; color: $sw-gold; opacity: 0.4; margin-bottom: 16rpx; }

.empty-text { font-size: 28rpx; color: $sw-text-secondary; font-weight: 500; }

.empty-hint { font-size: 24rpx; color: $sw-text-muted; margin-top: 8rpx; }



.loading-tip {

  text-align: center;

  color: $sw-text-muted;

  padding: 40rpx 0;

  font-size: 26rpx;

}



/* ── 半屏确认 ── */

.sheet-mask {

  position: fixed;

  inset: 0;

  background: rgba(26, 31, 54, 0.55);

  z-index: 998;

  display: flex;

  align-items: flex-end;

}



.confirm-sheet {

  width: 100%;

  background: $sw-bg-card;

  border-radius: 32rpx 32rpx 0 0;

  padding: 24rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));

  animation: slideUp 0.35s $sw-ease both;

}



.sheet-handle {

  width: 64rpx;

  height: 8rpx;

  background: #E5E5E5;

  border-radius: 4rpx;

  margin: 0 auto 24rpx;

}



.sheet-title {

  display: block;

  font-size: 34rpx;

  font-weight: 800;

  color: $sw-text;

  text-align: center;

}



.sheet-product {

  display: block;

  font-size: 28rpx;

  color: $sw-text-secondary;

  text-align: center;

  margin-top: 12rpx;

}



.sheet-compare {

  margin: 32rpx 0;

  background: $sw-integral-soft;

  border-radius: $sw-radius-card;

  padding: 24rpx 28rpx;

}



.compare-row {

  display: flex;

  justify-content: space-between;

  align-items: center;

  padding: 12rpx 0;

}



.compare-label { font-size: 26rpx; color: $sw-text-secondary; }

.compare-val { font-size: 32rpx; font-weight: 800; }

.compare-val.cost { color: $sw-text; }

.compare-val.remain { color: $sw-gold; }



.sheet-actions {

  display: flex;

  gap: 20rpx;

}



.sheet-cancel, .sheet-confirm {

  flex: 1;

  height: 88rpx;

  border-radius: 44rpx;

  font-size: 30rpx;

  font-weight: 600;

  border: none;

  display: flex;

  align-items: center;

  justify-content: center;

  &::after { border: none; }

}



.sheet-cancel {

  background: #F3F4F6;

  color: $sw-text-secondary;

}



.sheet-confirm {

  background: linear-gradient(135deg, $sw-gold, $sw-gold-dark);

  color: #fff;

  box-shadow: $sw-shadow-gold;

}



/* ── 核销码卡片 ── */

.exchange-modal {

  position: fixed;

  inset: 0;

  background: rgba(26, 31, 54, 0.65);

  backdrop-filter: blur(8px);

  display: flex;

  align-items: center;

  justify-content: center;

  z-index: 999;

  padding: 40rpx;

}



.exchange-card {

  background: $sw-bg-card;

  border-radius: $sw-radius-card;

  padding: 48rpx 36rpx 40rpx;

  width: 100%;

  max-width: 620rpx;

  text-align: center;

  box-shadow: $sw-shadow-lg;

  position: relative;

}



.ex-badge {

  display: inline-block;

  font-size: 22rpx;

  font-weight: 600;

  color: $sw-gold-dark;

  background: $sw-integral-soft;

  padding: 6rpx 20rpx;

  border-radius: 999rpx;

  margin-bottom: 16rpx;

}



.ex-title {

  display: block;

  font-size: 40rpx;

  font-weight: 800;

  color: $sw-text;

}



.ex-product {

  display: block;

  font-size: 28rpx;

  color: $sw-text-secondary;

  margin-top: 12rpx;

}



.ex-cost {

  display: block;

  font-size: 26rpx;

  color: $sw-gold;

  font-weight: 600;

  margin-top: 8rpx;

}



.ex-qr-wrap {

  position: relative;

  display: flex;

  justify-content: center;

  margin: 32rpx 0 16rpx;

  padding: 32rpx;

  background: linear-gradient(135deg, #FBF6E8, #FFFDF5);

  border-radius: $sw-radius-card;

  border: 1rpx solid rgba(201, 162, 39, 0.2);

}



.qr-glow {

  position: absolute;

  inset: 20rpx;

  background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%);

  border-radius: 50%;

  pointer-events: none;

}



.ex-code {

  display: block;

  font-size: 36rpx;

  font-weight: 800;

  letter-spacing: 8rpx;

  color: $sw-dark;

}



.ex-hint {

  display: block;

  font-size: 24rpx;

  color: $sw-text-muted;

  margin-top: 12rpx;

}



.ex-close {

  margin-top: 32rpx;

  width: 100%;

  height: 88rpx;

  border-radius: 44rpx;

  background: $sw-bg-dark;

  color: $sw-gold-light;

  font-size: 30rpx;

  font-weight: 600;

  border: none;

}



.ex-close::after { border: none; }



@keyframes fadeSlideUp {

  from { opacity: 0; transform: translateY(20rpx); }

  to { opacity: 1; transform: translateY(0); }

}



@keyframes slideUp {

  from { transform: translateY(100%); }

  to { transform: translateY(0); }

}



@keyframes scalePop {

  0% { opacity: 0; transform: scale(0.85); }

  70% { transform: scale(1.03); }

  100% { opacity: 1; transform: scale(1); }

}



.anim-scale-pop {

  animation: scalePop 0.4s $sw-ease both;

}

</style>


