<template>
  <view class="submit-page">
    <!-- 顶部说明 -->
    <view class="page-hero">
      <text class="hero-icon">📝</text>
      <text class="hero-title">发起会员开通</text>
      <text class="hero-desc">录入客户消费信息，系统自动匹配档位并提交审批</text>
    </view>

    <view class="form-card">
      <view class="input-group">
        <text class="label">客户 UID</text>
        <input class="form-input" type="number" placeholder="输入客户 UID" v-model="customerUid" />
      </view>

      <view class="input-group">
        <text class="label">消费金额（元）</text>
        <input class="form-input" type="digit" placeholder="输入消费金额" v-model="consumeAmount" @blur="onAmountBlur" />
      </view>

      <view class="input-group">
        <text class="label">小票号（可选）</text>
        <input class="form-input" placeholder="无小票可留空" v-model="receiptNo" />
      </view>
    </view>

    <!-- 实时匹配预览 -->
    <view v-if="matchResult && matchResult.matched" class="match-preview">
      <view class="preview-header">
        <text class="preview-badge">✓ 已匹配</text>
        <text class="preview-title">档位预览</text>
      </view>
      <view class="preview-grid">
        <view class="preview-cell">
          <text class="preview-label">会员等级</text>
          <text class="preview-value tier">{{ matchResult.tierCode }}</text>
        </view>
        <view class="preview-cell">
          <text class="preview-label">赠现金券</text>
          <text class="preview-value">¥{{ matchResult.voucherAmount }}</text>
        </view>
        <view class="preview-cell">
          <text class="preview-label">赠积分</text>
          <text class="preview-value">{{ matchResult.giftIntegral }}</text>
        </view>
      </view>
    </view>
    <view v-else-if="consumeAmount && !matching" class="no-match">
      <text class="no-match-icon">⚠️</text>
      <text>当前金额暂无匹配档位</text>
    </view>

    <button class="submit-btn" :loading="submitting" :disabled="!canSubmit || submitting" @tap="handleSubmit">
      提交审批
    </button>
  </view>
</template>

<script>
import { matchTierRule, submitApproval } from '@/api/approval.js'

export default {
  data() {
    return {
      customerUid: '', consumeAmount: '', receiptNo: '',
      matchResult: null, matching: false, submitting: false,
    }
  },
  computed: {
    canSubmit() {
      return this.customerUid && this.consumeAmount && Number(this.consumeAmount) > 0 &&
             this.matchResult && this.matchResult.matched
    }
  },
  methods: {
    async onAmountBlur() {
      const amount = Number(this.consumeAmount)
      if (!amount || amount <= 0) { this.matchResult = null; return }
      this.matching = true
      try {
        this.matchResult = await matchTierRule(amount)
      } catch { this.matchResult = null }
      finally { this.matching = false }
    },
    async handleSubmit() {
      this.submitting = true
      try {
        const result = await submitApproval({
          customerUid: Number(this.customerUid),
          consumeAmount: Number(this.consumeAmount),
          receiptNo: this.receiptNo,
        })
        uni.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1200)
      } catch (e) {
        uni.showToast({ title: e.message || '提交失败', icon: 'none' })
      } finally { this.submitting = false }
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.submit-page {
  min-height: 100vh;
  padding: $sw-page-pad;
  padding-bottom: 48rpx;
  background: $sw-bg;
}

.page-hero {
  background: linear-gradient(160deg, #1A1A2E 0%, #2D2B55 55%, $sw-purple 100%);
  border-radius: $sw-radius-xl;
  padding: 40rpx 32rpx;
  color: #fff;
  margin-bottom: $sw-gap;
  box-shadow: 0 12rpx 40rpx rgba(45, 43, 85, 0.28);
}
.hero-icon { display: block; font-size: 48rpx; margin-bottom: 12rpx; }
.hero-title { display: block; font-size: 36rpx; font-weight: 800; }
.hero-desc {
  display: block;
  font-size: 24rpx;
  opacity: 0.8;
  margin-top: 10rpx;
  line-height: 1.5;
}

.form-card {
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
  padding: 32rpx 28rpx;
  box-shadow: $sw-shadow-sm;
}
.input-group { margin-bottom: 24rpx; }
.input-group:last-child { margin-bottom: 0; }
.label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $sw-text-secondary;
  margin-bottom: 10rpx;
}
.form-input {
  border: 2rpx solid rgba(0, 0, 0, 0.06);
  border-radius: $sw-radius-sm;
  padding: 22rpx 24rpx;
  font-size: 28rpx;
  color: $sw-text;
  background: $sw-bg;
}

.match-preview {
  background: $sw-voucher-soft;
  border: 2rpx solid rgba(46, 204, 113, 0.2);
  border-radius: $sw-radius-lg;
  padding: 28rpx;
  margin-top: $sw-gap;
  box-shadow: $sw-shadow-sm;
}
.preview-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.preview-badge {
  font-size: 22rpx;
  font-weight: 700;
  color: $sw-voucher;
  background: rgba(46, 204, 113, 0.15);
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.preview-title {
  font-size: 28rpx;
  font-weight: 700;
  color: $sw-text;
}
.preview-grid {
  display: flex;
  gap: 16rpx;
}
.preview-cell {
  flex: 1;
  background: $sw-bg-card;
  border-radius: $sw-radius-sm;
  padding: 20rpx 16rpx;
  text-align: center;
}
.preview-label {
  display: block;
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-bottom: 8rpx;
}
.preview-value {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $sw-text;
}
.preview-value.tier { color: $sw-brand; }

.no-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  text-align: center;
  color: $sw-text-muted;
  padding: 32rpx;
  margin-top: $sw-gap;
  font-size: 26rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
  box-shadow: $sw-shadow-sm;
}
.no-match-icon { font-size: 36rpx; }

.submit-btn {
  margin-top: 40rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, $sw-brand, $sw-brand-light);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $sw-shadow-brand;
}
.submit-btn::after { border: none; }
.submit-btn[disabled] { opacity: 0.45; box-shadow: none; }
</style>
