<template>
  <view class="submit-page">
    <!-- 顶部说明 -->
    <view class="page-hero">
      <view class="hero-badge">店员操作</view>
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
        <text class="preview-badge">已匹配</text>
        <text class="preview-title">档位预览</text>
      </view>
      <view class="preview-grid">
        <view class="preview-cell">
          <text class="preview-label">会员等级</text>
          <text class="preview-value tier">{{ formatTier(matchResult.tierCode) }}</text>
        </view>
        <view class="preview-cell">
          <text class="preview-label">赠现金券</text>
          <text class="preview-value font-num">¥{{ matchResult.voucherAmount }}</text>
        </view>
        <view class="preview-cell">
          <text class="preview-label">赠积分</text>
          <text class="preview-value font-num">{{ matchResult.giftIntegral }}</text>
        </view>
      </view>
    </view>
    <view v-else-if="consumeAmount && !matching" class="no-match">
      <text class="no-match-text">当前金额暂无匹配档位</text>
    </view>

    <button
      class="submit-btn"
      hover-class="tap-scale"
      :loading="submitting"
      :disabled="!canSubmit || submitting"
      @tap="handleSubmit"
    >
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
    formatTier(code) {
      if (code === 'SW199') return '锦程199会员'
      if (code === 'SW299') return '锦程299会员'
      return code || '—'
    },
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
        await submitApproval({
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
  background: $sw-bg-dark-deep;
  border-radius: $sw-radius-xl;
  padding: 40rpx 32rpx;
  color: #fff;
  margin-bottom: $sw-gap;
  box-shadow: 0 12rpx 40rpx rgba(26, 31, 54, 0.35);
}

.hero-badge {
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

.hero-title {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
}

.hero-desc {
  display: block;
  font-size: 24rpx;
  opacity: 0.75;
  margin-top: 10rpx;
  line-height: 1.5;
}

.form-card {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 32rpx 28rpx;
  box-shadow: $sw-shadow-card;
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
  border: 2rpx solid $sw-border;
  border-radius: $sw-radius-sm;
  padding: 22rpx 24rpx;
  font-size: 28rpx;
  color: $sw-text;
  background: $sw-bg;
}

.match-preview {
  background: $sw-integral-soft;
  border: 2rpx solid rgba($sw-gold, 0.2);
  border-radius: $sw-radius-card;
  padding: 28rpx;
  margin-top: $sw-gap;
  box-shadow: $sw-shadow-card;
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
  color: $sw-gold-dark;
  background: rgba($sw-gold, 0.15);
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

.preview-value.tier { color: $sw-gold-dark; }

.font-num {
  font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif;
}

.no-match {
  text-align: center;
  color: $sw-text-muted;
  padding: 32rpx;
  margin-top: $sw-gap;
  font-size: 26rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  box-shadow: $sw-shadow-card;
}

.submit-btn {
  margin-top: 40rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: $sw-bg-dark;
  color: $sw-gold-light;
  font-size: 32rpx;
  font-weight: 700;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $sw-shadow-gold;
}

.submit-btn::after { border: none; }
.submit-btn[disabled] { opacity: 0.45; box-shadow: none; }

.tap-scale {
  transform: $sw-tap-scale;
  opacity: 0.92;
}
</style>
