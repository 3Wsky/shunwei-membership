<template>
  <view class="verify-page">
    <!-- 输入核销码 -->
    <view class="input-section">
      <text class="input-label">输入核销码</text>
      <input
        class="verify-input"
        type="number"
        maxlength="12"
        placeholder="输入订单号或核销码"
        v-model="orderInput"
        confirm-type="done"
        @confirm="handleVerify"
      />
      <button class="verify-btn" :loading="verifying" :disabled="!orderInput || verifying" @tap="handleVerify">
        确认核销
      </button>
    </view>

    <!-- 扫码按钮 -->
    <view class="scan-section" @tap="handleScan">
      <text class="scan-icon">📷</text>
      <text class="scan-text">扫描核销码</text>
    </view>

    <!-- 核销结果 -->
    <view v-if="result" class="result-card" :class="{ success: result.ok, error: !result.ok }">
      <text class="result-icon">{{ result.ok ? '✅' : '❌' }}</text>
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
  padding: 32rpx 28rpx;
}

.input-section {
  background: $sw-bg-card;
  border-radius: $sw-radius-xl;
  padding: 36rpx 28rpx;
  box-shadow: $sw-shadow;
}
.input-label {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $sw-text;
  margin-bottom: 16rpx;
}
.verify-input {
  border: 2rpx solid rgba(0, 0, 0, 0.08);
  border-radius: $sw-radius;
  padding: 24rpx;
  font-size: 36rpx;
  letter-spacing: 6rpx;
  text-align: center;
  background: #FAFAFA;
}
.verify-btn {
  margin-top: 28rpx;
  width: 100%;
  height: 92rpx;
  border-radius: 46rpx;
  background: linear-gradient(135deg, $sw-brand, $sw-brand-dark);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: $sw-shadow-brand;
}
.verify-btn::after { border: none; }
.verify-btn[disabled] { opacity: 0.45; }

.scan-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  margin-top: 28rpx;
  padding: 36rpx;
  background: linear-gradient(135deg, #EEF2FF, #fff);
  border-radius: $sw-radius-lg;
  border: 2rpx dashed rgba(123, 79, 212, 0.3);
}
.scan-icon { font-size: 44rpx; }
.scan-text { font-size: 30rpx; color: $sw-purple; font-weight: 600; }

.result-card {
  margin-top: 32rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-xl;
  padding: 36rpx 28rpx;
  text-align: center;
  box-shadow: $sw-shadow-sm;
}
.result-card.success {
  border: 2rpx solid $sw-voucher;
  background: linear-gradient(135deg, $sw-voucher-soft, #fff);
}
.result-card.error {
  border: 2rpx solid #FF4757;
  background: linear-gradient(135deg, #FFF0F0, #fff);
}

.result-icon { display: block; font-size: 64rpx; }
.result-title {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  margin-top: 12rpx;
}
.result-card.success .result-title { color: $sw-voucher; }
.result-card.error .result-title { color: #FF4757; }

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
</style>
