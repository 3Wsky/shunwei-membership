<template>
  <view class="merchant-verify">
    <view class="merchant-card" v-if="merchant">
      <text class="m-name">{{ merchant.merchant_name }}</text>
      <text class="m-category">{{ merchant.category || '异业商家' }}</text>
    </view>

    <view class="verify-form">
      <text class="form-title">核销现金券</text>
      <button class="scan-btn" @tap="handleScan">📷 扫码识别客户（推荐）</button>
      <view class="input-group">
        <text class="input-label">客户UID</text>
        <input class="form-input" type="number" placeholder="扫码自动填入，或手动输入" v-model="customerUid" />
      </view>
      <view class="input-group">
        <text class="input-label">核销金额</text>
        <input class="form-input" type="digit" placeholder="输入金额" v-model="amount" />
      </view>
      <view class="input-group">
        <text class="input-label">备注</text>
        <input class="form-input" placeholder="可选" v-model="remark" />
      </view>
      <button class="verify-btn" :loading="verifying" :disabled="!canVerify || verifying" @tap="handleVerify">
        确认核销
      </button>
    </view>

    <view v-if="result" class="result" :class="{ ok: result.ok }">
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
          // 客户钱包二维码格式: sw-uid:123 或纯数字uid
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
      if (!uni.getStorageSync('SW_TOKEN')) return // 未登录不请求
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

.merchant-verify { padding: 28rpx; min-height: 100vh; }

.merchant-card {
  background: linear-gradient(160deg, #1A1A2E 0%, $sw-voucher 80%, #1E8449 100%);
  border-radius: $sw-radius-xl;
  padding: 36rpx 32rpx;
  color: #fff;
  margin-bottom: 28rpx;
  box-shadow: 0 12rpx 40rpx rgba(46, 204, 113, 0.25);
}
.m-name { display: block; font-size: 36rpx; font-weight: 800; }
.m-category {
  display: inline-block;
  font-size: 22rpx;
  opacity: 0.85;
  margin-top: 10rpx;
  background: rgba(255, 255, 255, 0.15);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}

.verify-form {
  background: $sw-bg-card;
  border-radius: $sw-radius-xl;
  padding: 32rpx 28rpx;
  box-shadow: $sw-shadow;
}
.form-title {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  color: $sw-text;
  margin-bottom: 24rpx;
}
.scan-btn {
  width: 100%;
  height: 88rpx;
  border-radius: $sw-radius-lg;
  margin-bottom: 28rpx;
  background: linear-gradient(135deg, #EEF2FF, #fff);
  color: $sw-purple;
  font-size: 28rpx;
  font-weight: 700;
  border: 2rpx dashed rgba(123, 79, 212, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}
.scan-btn::after { border: none; }

.input-group { margin-bottom: 24rpx; }
.input-label {
  display: block;
  font-size: 26rpx;
  color: $sw-text-secondary;
  font-weight: 500;
  margin-bottom: 10rpx;
}
.form-input {
  border: 2rpx solid rgba(0, 0, 0, 0.08);
  border-radius: $sw-radius;
  padding: 22rpx 24rpx;
  font-size: 28rpx;
  background: #FAFAFA;
}

.verify-btn {
  margin-top: 16rpx;
  width: 100%;
  height: 92rpx;
  border-radius: 46rpx;
  background: linear-gradient(135deg, $sw-voucher, #27AE60);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border: none;
  box-shadow: 0 8rpx 32rpx rgba(46, 204, 113, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.verify-btn::after { border: none; }
.verify-btn[disabled] { opacity: 0.45; }

.result {
  margin-top: 28rpx;
  padding: 24rpx 28rpx;
  border-radius: $sw-radius-lg;
  background: $sw-brand-soft;
  text-align: center;
}
.result.ok { background: $sw-voucher-soft; }
.result-msg { font-size: 28rpx; font-weight: 500; color: $sw-brand; }
.result.ok .result-msg { color: $sw-voucher; }
</style>
