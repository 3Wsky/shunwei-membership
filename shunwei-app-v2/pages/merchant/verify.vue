<template>
  <view class="merchant-verify">
    <view class="merchant-card" v-if="merchant">
      <view class="merchant-badge">商家核销</view>
      <text class="m-name">{{ merchant.merchant_name }}</text>
      <text class="m-category">{{ merchant.category || '异业商家' }}</text>
    </view>

    <!-- 扫码主入口 -->
    <view class="scan-hero" hover-class="tap-scale" @tap="handleScan">
      <view class="scan-frame">
        <view class="scan-corner tl" />
        <view class="scan-corner tr" />
        <view class="scan-corner bl" />
        <view class="scan-corner br" />
        <text class="scan-hero-icon">扫</text>
      </view>
      <text class="scan-hero-title">扫描客户钱包码</text>
      <text class="scan-hero-desc">识别客户 UID 后填写核销金额</text>
    </view>

    <view class="verify-form">
      <text class="form-title">核销现金券</text>
      <view class="input-group">
        <text class="input-label">客户 UID</text>
        <input class="form-input" type="number" placeholder="扫码自动填入，或手动输入" v-model="customerUid" />
      </view>
      <view class="input-group">
        <text class="input-label">核销金额（元）</text>
        <input class="form-input" type="digit" placeholder="输入金额" v-model="amount" />
      </view>
      <view class="input-group">
        <text class="input-label">备注（可选）</text>
        <input class="form-input" placeholder="可选" v-model="remark" />
      </view>
      <button
        class="verify-btn"
        hover-class="tap-scale"
        :loading="verifying"
        :disabled="!canVerify || verifying"
        @tap="handleVerify"
      >
        确认核销
      </button>
    </view>

    <view v-if="result" class="result-card" :class="{ ok: result.ok }">
      <view class="result-icon-wrap" :class="{ ok: result.ok }">
        <text class="result-icon-char">{{ result.ok ? '✓' : '!' }}</text>
      </view>
      <text class="result-msg">{{ result.msg }}</text>
    </view>
  </view>
</template>

<script>
import { getMerchantInfo, merchantVerifyVoucher } from '@/api/voucher.js'

export default {
  data() {
    return { merchant: null, customerUid: '', amount: '', remark: '', verifying: false, result: null }
  },
  computed: {
    canVerify() { return this.customerUid && this.amount && Number(this.amount) > 0 }
  },
  onShow() {
    this.loadMerchant()
  },
  methods: {
    handleScan() {
      uni.scanCode({
        onlyFromCamera: false,
        scanType: ['qrCode', 'barCode'],
        success: (res) => {
          const raw = String(res.result || '').trim()
          const m = raw.match(/(?:sw-uid:)?(\d+)/)
          if (m) {
            this.customerUid = m[1]
            uni.showToast({ title: '已识别客户 ' + m[1], icon: 'none' })
          } else {
            uni.showToast({ title: '二维码无效', icon: 'none' })
          }
        },
        fail: () => uni.showToast({ title: '扫码取消', icon: 'none' }),
      })
    },
    async loadMerchant() {
      if (!uni.getStorageSync('SW_TOKEN')) return
      try { this.merchant = await getMerchantInfo() } catch (e) {
        if (e.message !== 'NOT_LOGGED_IN') uni.showToast({ title: e.message || '未绑定商家', icon: 'none' })
      }
    },
    async handleVerify() {
      this.verifying = true; this.result = null
      try {
        const data = await merchantVerifyVoucher({
          customerUid: Number(this.customerUid),
          amount: Number(this.amount),
          remark: this.remark
        })
        this.result = { ok: true, msg: `核销成功 ¥${data.amount}，客户余额 ¥${data.balanceAfter}` }
        this.customerUid = ''; this.amount = ''; this.remark = ''
      } catch (e) {
        this.result = { ok: false, msg: e.message || '核销失败' }
      } finally { this.verifying = false }
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.merchant-verify {
  min-height: 100vh;
  padding: $sw-page-pad;
  padding-bottom: 48rpx;
  background: $sw-bg;
}

.merchant-card {
  background: $sw-bg-dark-deep;
  border-radius: $sw-radius-xl;
  padding: 36rpx 32rpx;
  color: #fff;
  margin-bottom: $sw-gap;
  box-shadow: 0 12rpx 40rpx rgba(26, 31, 54, 0.35);
}

.merchant-badge {
  display: inline-block;
  font-size: 20rpx;
  font-weight: 600;
  color: $sw-gold-light;
  background: rgba($sw-gold, 0.22);
  border: 1rpx solid rgba($sw-gold-light, 0.45);
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  margin-bottom: 16rpx;
}

.m-name { display: block; font-size: 36rpx; font-weight: 800; }

.m-category {
  display: inline-block;
  font-size: 22rpx;
  opacity: 0.8;
  margin-top: 12rpx;
  background: rgba(255, 255, 255, 0.12);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}

.scan-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 32rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  box-shadow: $sw-shadow-gold;
  border: 2rpx solid rgba($sw-gold, 0.2);
  margin-bottom: $sw-gap;
}

.scan-frame {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  background: $sw-bg-dark;
  border-radius: 50%;
  box-shadow: $sw-shadow-gold;
}

.scan-corner {
  position: absolute;
  width: 32rpx;
  height: 32rpx;
  border-color: $sw-gold-light;
  border-style: solid;
}

.scan-corner.tl { top: 8rpx; left: 8rpx; border-width: 3rpx 0 0 3rpx; border-radius: 8rpx 0 0 0; }
.scan-corner.tr { top: 8rpx; right: 8rpx; border-width: 3rpx 3rpx 0 0; border-radius: 0 8rpx 0 0; }
.scan-corner.bl { bottom: 8rpx; left: 8rpx; border-width: 0 0 3rpx 3rpx; border-radius: 0 0 0 8rpx; }
.scan-corner.br { bottom: 8rpx; right: 8rpx; border-width: 0 3rpx 3rpx 0; border-radius: 0 0 8rpx 0; }

.scan-hero-icon {
  font-size: 48rpx;
  font-weight: 800;
  color: $sw-gold-light;
}

.scan-hero-title {
  font-size: 30rpx;
  font-weight: 800;
  color: $sw-text;
}

.scan-hero-desc {
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.verify-form {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 32rpx 28rpx;
  box-shadow: $sw-shadow-card;
}

.form-title {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: $sw-text;
  margin-bottom: 24rpx;
}

.input-group { margin-bottom: 24rpx; }

.input-label {
  display: block;
  font-size: 26rpx;
  color: $sw-text-secondary;
  font-weight: 600;
  margin-bottom: 10rpx;
}

.form-input {
  border: 2rpx solid $sw-border;
  border-radius: $sw-radius-sm;
  padding: 22rpx 24rpx;
  font-size: 28rpx;
  background: $sw-bg;
}

.verify-btn {
  margin-top: 8rpx;
  width: 100%;
  height: 92rpx;
  border-radius: 46rpx;
  background: $sw-bg-dark;
  color: $sw-gold-light;
  font-size: 30rpx;
  font-weight: 700;
  border: none;
  box-shadow: $sw-shadow-gold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.verify-btn::after { border: none; }
.verify-btn[disabled] { opacity: 0.45; box-shadow: none; }

.result-card {
  margin-top: $sw-gap;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 32rpx 28rpx;
  text-align: center;
  box-shadow: $sw-shadow-card;
}

.result-card.ok {
  border: 2rpx solid rgba($sw-gold, 0.3);
  background: linear-gradient(135deg, $sw-integral-soft, #fff);
}

.result-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba($sw-dark, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16rpx;
}

.result-icon-wrap.ok { background: rgba($sw-gold, 0.15); }

.result-icon-char {
  font-size: 36rpx;
  font-weight: 800;
  color: $sw-text-secondary;
}

.result-icon-wrap.ok .result-icon-char { color: $sw-gold-dark; }

.result-msg {
  font-size: 28rpx;
  font-weight: 500;
  color: $sw-text;
  line-height: 1.5;
}

.tap-scale {
  transform: $sw-tap-scale;
  opacity: 0.92;
}
</style>
