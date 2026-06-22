<template>
  <view class="verify-page">
    <!-- 扫码主入口 -->
    <view class="scan-hero" hover-class="tap-scale" @tap="handleScan">
      <view class="scan-frame">
        <view class="scan-corner tl" />
        <view class="scan-corner tr" />
        <view class="scan-corner bl" />
        <view class="scan-corner br" />
        <text class="scan-hero-icon">扫</text>
      </view>
      <text class="scan-hero-title">扫描核销码</text>
      <text class="scan-hero-desc">对准客户核销二维码或条形码</text>
    </view>

    <!-- 手动输入 -->
    <view class="input-section">
      <text class="input-label">或手动输入核销码</text>
      <input
        class="verify-input"
        type="number"
        maxlength="12"
        placeholder="输入订单号或核销码"
        v-model="orderInput"
        confirm-type="done"
        @confirm="handleVerify"
      />
      <button
        class="verify-btn"
        hover-class="tap-scale"
        :loading="verifying"
        :disabled="!orderInput || verifying"
        @tap="handleVerify"
      >
        确认核销
      </button>
    </view>

    <!-- 核销结果 -->
    <view v-if="result" class="result-card" :class="{ success: result.ok, error: !result.ok }">
      <view class="result-icon-wrap" :class="{ ok: result.ok }">
        <text class="result-icon-char">{{ result.ok ? '✓' : '!' }}</text>
      </view>
      <text class="result-title">{{ result.ok ? '核销成功' : '核销失败' }}</text>
      <text class="result-msg">{{ result.msg }}</text>
      <view v-if="result.data" class="result-detail">
        <text class="rd-item">商品：{{ result.data.productName }}</text>
        <text class="rd-item">积分：{{ result.data.integralCost }}</text>
        <text class="rd-item">客户UID：{{ result.data.customerUid }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { verifyOrder } from '@/api/staff.js'

export default {
  data() {
    return {
      orderInput: '',
      verifying: false,
      result: null,
    }
  },
  methods: {
    async handleVerify() {
      if (!this.orderInput.trim()) return
      this.verifying = true
      this.result = null
      try {
        const data = await verifyOrder(this.orderInput.trim())
        this.result = { ok: true, msg: `${data.productName} 核销成功`, data }
        this.orderInput = ''
      } catch (e) {
        this.result = { ok: false, msg: e.message || '核销失败' }
      } finally {
        this.verifying = false
      }
    },
    handleScan() {
      uni.scanCode({
        onlyFromCamera: false,
        scanType: ['barCode', 'qrCode'],
        success: (res) => {
          const raw = String(res.result || '').trim()
          const verifyMatch = raw.match(/(?:sw-verify:)?(\d{4,12})/i)
          const orderMatch = raw.match(/^(IG\d+)/i)
          this.orderInput = orderMatch?.[1] || verifyMatch?.[1] || raw
          if (this.orderInput) this.handleVerify()
        },
        fail: () => {
          uni.showToast({ title: '扫码取消', icon: 'none' })
        },
      })
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.verify-page {
  min-height: 100vh;
  padding: $sw-page-pad;
  padding-bottom: 48rpx;
  background: $sw-bg;
}

.scan-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx;
  background: $sw-bg-dark-deep;
  border-radius: $sw-radius-xl;
  box-shadow: 0 12rpx 40rpx rgba(26, 31, 54, 0.35);
  margin-bottom: $sw-gap;
}

.scan-frame {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.scan-corner {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
  border-color: $sw-gold-light;
  border-style: solid;
}

.scan-corner.tl { top: 0; left: 0; border-width: 4rpx 0 0 4rpx; }
.scan-corner.tr { top: 0; right: 0; border-width: 4rpx 4rpx 0 0; }
.scan-corner.bl { bottom: 0; left: 0; border-width: 0 0 4rpx 4rpx; }
.scan-corner.br { bottom: 0; right: 0; border-width: 0 4rpx 4rpx 0; }

.scan-hero-icon {
  font-size: 56rpx;
  font-weight: 800;
  color: $sw-gold-light;
}

.scan-hero-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #fff;
}

.scan-hero-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 8rpx;
}

.input-section {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 32rpx 28rpx;
  box-shadow: $sw-shadow-card;
}

.input-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $sw-text-secondary;
  margin-bottom: 16rpx;
}

.verify-input {
  border: 2rpx solid $sw-border;
  border-radius: $sw-radius;
  padding: 24rpx;
  font-size: 36rpx;
  letter-spacing: 6rpx;
  text-align: center;
  background: $sw-bg;
}

.verify-btn {
  margin-top: 24rpx;
  width: 100%;
  height: 92rpx;
  border-radius: 46rpx;
  background: $sw-bg-dark;
  color: $sw-gold-light;
  font-size: 30rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: $sw-shadow-gold;
}

.verify-btn::after { border: none; }
.verify-btn[disabled] { opacity: 0.45; box-shadow: none; }

.result-card {
  margin-top: $sw-gap;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 36rpx 28rpx;
  text-align: center;
  box-shadow: $sw-shadow-card;
}

.result-card.success {
  border: 2rpx solid rgba($sw-gold, 0.3);
  background: linear-gradient(135deg, $sw-integral-soft, #fff);
}

.result-card.error {
  border: 2rpx solid rgba($sw-dark, 0.12);
}

.result-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba($sw-dark, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16rpx;
}

.result-icon-wrap.ok {
  background: rgba($sw-gold, 0.15);
}

.result-icon-char {
  font-size: 40rpx;
  font-weight: 800;
  color: $sw-text-secondary;
}

.result-icon-wrap.ok .result-icon-char {
  color: $sw-gold-dark;
}

.result-title {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  color: $sw-text;
}

.result-card.success .result-title { color: $sw-gold-dark; }

.result-msg {
  display: block;
  font-size: 26rpx;
  color: $sw-text-secondary;
  margin-top: 8rpx;
}

.result-detail {
  margin-top: 24rpx;
  text-align: left;
  background: rgba(255, 255, 255, 0.8);
  border-radius: $sw-radius;
  padding: 20rpx 24rpx;
}

.rd-item {
  display: block;
  font-size: 26rpx;
  color: $sw-text;
  line-height: 2;
}

.tap-scale {
  transform: $sw-tap-scale;
  opacity: 0.92;
}
</style>
