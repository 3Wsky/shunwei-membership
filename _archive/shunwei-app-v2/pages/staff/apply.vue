<template>
  <view class="apply-page">
    <!-- 会员信息卡 -->
    <view class="member-card">
      <view class="member-top">
        <view class="avatar-wrap">
          <image v-if="member.avatar" class="avatar" :src="member.avatar" mode="aspectFill" />
          <view v-else class="avatar-placeholder">
            <text>{{ (member.nickname || '?').charAt(0) }}</text>
          </view>
        </view>
        <view class="member-info">
          <text class="member-name">{{ member.nickname || '未设置昵称' }}</text>
          <text class="member-meta">UID {{ member.uid }} · {{ member.phone || '未绑定' }}</text>
        </view>
      </view>
      <view class="assets-row">
        <view class="asset-item">
          <text class="asset-num">{{ member.integral || 0 }}</text>
          <text class="asset-label">当前积分</text>
        </view>
        <view class="asset-divider" />
        <view class="asset-item">
          <text class="asset-num">¥{{ member.cashVoucher || 0 }}</text>
          <text class="asset-label">现金券</text>
        </view>
      </view>
    </view>

    <!-- 档位选择 -->
    <view class="section-heading">
      <text>请选择固定权益档位</text>
    </view>

    <view
      v-for="(rule, idx) in rules"
      :key="rule.id"
      class="rule-card btn-tap anim-fade-in"
      :style="{ animationDelay: idx * 0.05 + 's' }"
      @tap="chooseRule(rule)"
    >
      <view class="rule-top">
        <text class="rule-range">
          {{ rule.maxAmount ? rule.minAmount + '–' + rule.maxAmount + '元档' : rule.minAmount + '元以上档' }}
        </text>
        <view class="tier-badge" :class="rule.tierCode === 'SW299' ? 'premium' : 'gold'">
          <text>{{ rule.tierCode === 'SW299' ? '299会员' : '199会员' }}</text>
        </view>
      </view>
      <view class="rule-gifts">
        <view class="gift-tag">
          <text class="gift-icon">✦</text>
          <text>{{ rule.giftIntegral }} 积分</text>
        </view>
        <view class="gift-tag voucher">
          <text class="gift-icon">◈</text>
          <text>¥{{ rule.voucherAmount }} 现金券</text>
        </view>
      </view>
      <view class="rule-action">
        <text>选择 ›</text>
      </view>
    </view>

    <view v-if="!rules.length && !loading" class="empty-state">
      <text class="empty-desc">暂无可用档位</text>
    </view>

    <view v-if="loading" class="loading-bar">
      <text>加载中…</text>
    </view>

    <view class="tip-bar">
      <text>提交后依次由店长和超管审批，终审通过后权益到账</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTierOptions } from '@/api/staff'
import { submitApproval } from '@/api/approval'

const member = ref({})
const rules = ref([])
const loading = ref(true)
const submitting = ref(false)

onLoad((options) => {
  if (options.member) {
    try {
      member.value = JSON.parse(decodeURIComponent(options.member))
    } catch { /* silent */ }
  }
  loadRules()
})

async function loadRules() {
  loading.value = true
  try {
    const data = await getTierOptions()
    rules.value = data || []
  } catch (err) {
    uni.showToast({ title: err?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function chooseRule(rule) {
  if (submitting.value) return
  const name = member.value.nickname || '会员'
  const tier = rule.tierCode === 'SW299' ? '299会员' : '199会员'

  uni.showModal({
    title: '确认提交申请',
    content: `${name}（UID ${member.value.uid}）\n${tier} + ${rule.giftIntegral}积分 + ¥${rule.voucherAmount}现金券`,
    confirmText: '提交审批',
    confirmColor: '#C9A227',
    success(res) {
      if (res.confirm) doSubmit(rule)
    },
  })
}

async function doSubmit(rule) {
  submitting.value = true
  try {
    await submitApproval({
      customerUid: member.value.uid,
      tierRuleId: rule.id,
    })
    uni.showToast({ title: '已提交店长审批', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1200)
  } catch (err) {
    uni.showToast({ title: err?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.apply-page {
  min-height: 100vh;
  background: $sw-bg;
  padding: $sw-page-pad;
}

.member-card {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 28rpx 32rpx;
  box-shadow: $sw-shadow-card;
}

.member-top {
  display: flex;
  align-items: center;
}

.avatar-wrap {
  width: 96rpx;
  height: 96rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
}

.avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $sw-gold 0%, $sw-gold-light 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #fff;
  font-weight: 600;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.member-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $sw-text;
}

.member-meta {
  font-size: 24rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.assets-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $sw-border;
}

.asset-item {
  flex: 1;
  text-align: center;
}

.asset-num {
  font-size: 36rpx;
  font-weight: 700;
  color: $sw-gold;
  display: block;
}

.asset-label {
  font-size: 22rpx;
  color: $sw-text-muted;
  display: block;
  margin-top: 4rpx;
}

.asset-divider {
  width: 1rpx;
  height: 56rpx;
  background: $sw-border;
}

.section-heading {
  padding: 32rpx 8rpx 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: $sw-text;
}

.rule-card {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 28rpx 32rpx;
  margin-bottom: 20rpx;
  box-shadow: $sw-shadow-sm;
}

.rule-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rule-range {
  font-size: 28rpx;
  font-weight: 600;
  color: $sw-text;
}

.tier-badge {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
  font-weight: 500;

  &.gold {
    background: $sw-integral-soft;
    color: $sw-gold-dark;
  }

  &.premium {
    background: linear-gradient(135deg, $sw-gold 0%, $sw-gold-light 100%);
    color: #fff;
  }
}

.rule-gifts {
  display: flex;
  gap: 20rpx;
  margin-top: 16rpx;
}

.gift-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 26rpx;
  color: $sw-gold;
}

.gift-tag.voucher {
  color: $sw-voucher;
}

.gift-icon {
  font-size: 24rpx;
}

.rule-action {
  text-align: right;
  margin-top: 12rpx;
  font-size: 28rpx;
  color: $sw-gold;
  font-weight: 500;
}

.tip-bar {
  text-align: center;
  padding: 40rpx 20rpx;
  font-size: 24rpx;
  color: $sw-text-muted;
}

.empty-state {
  text-align: center;
  padding: 60rpx 0;
}

.empty-desc {
  font-size: 28rpx;
  color: $sw-text-muted;
}

.loading-bar {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: $sw-text-muted;
}
</style>
