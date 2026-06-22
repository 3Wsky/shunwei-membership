<template>
  <view class="merchant-page">
    <!-- 商家信息头部 -->
    <view class="merchant-head">
      <view class="head-info">
        <text class="head-label">商家工作台</text>
        <text class="head-name">{{ merchantName }}</text>
      </view>
      <view class="role-badge" :class="isManager ? 'manager' : ''">
        <text>{{ isManager ? '店长' : '店员' }}</text>
      </view>
    </view>

    <!-- 核销入口 -->
    <view class="verify-entry btn-tap" @tap="openVerify">
      <view class="verify-left">
        <text class="verify-title">现金券核销</text>
        <text class="verify-desc">扫码识别顾客并输入核销金额</text>
      </view>
      <view class="verify-action">
        <text>扫一扫 ›</text>
      </view>
    </view>

    <!-- 店长独有：核销数据 -->
    <template v-if="isManager">
      <view class="section-title">核销数据</view>
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-num">¥{{ todayAmount }}</text>
          <text class="stat-label">今日</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">¥{{ weekAmount }}</text>
          <text class="stat-label">本周</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">¥{{ monthAmount }}</text>
          <text class="stat-label">本月</text>
        </view>
        <view class="stat-card highlight">
          <text class="stat-num">¥{{ totalAmount }}</text>
          <text class="stat-label">累计</text>
        </view>
      </view>

      <!-- 提现 -->
      <view class="withdraw-card">
        <view class="withdraw-head">
          <view class="withdraw-item">
            <text class="withdraw-label">可提现金额</text>
            <text class="withdraw-amount">¥{{ availableAmount }}</text>
          </view>
          <view class="withdraw-item">
            <text class="withdraw-label">提现中</text>
            <text class="withdraw-amount small">¥{{ withdrawingAmount }}</text>
          </view>
        </view>
        <view class="withdraw-notice">
          <text>提现申请审核打款后，预计 T+3 到账</text>
        </view>
        <button
          class="withdraw-all-btn btn-tap"
          :disabled="availableAmount <= 0"
          @tap="withdrawAll"
        >
          全部提现 ¥{{ availableAmount }}
        </button>
        <view class="custom-row">
          <input
            class="custom-input"
            type="digit"
            v-model="customAmount"
            placeholder="输入自定义提现金额"
          />
          <button class="custom-btn btn-tap" @tap="withdrawCustom">
            申请提现
          </button>
        </view>
      </view>

      <!-- 提现记录 -->
      <view class="section-title">提现记录</view>
      <view
        v-for="item in withdrawals"
        :key="item.id"
        class="withdraw-row"
      >
        <view class="row-left">
          <text class="row-amount">¥{{ item.amount }}</text>
          <text class="row-date">申请 {{ dateText(item.createdAt) }} · 预计 {{ dateText(item.expectedAt) }} 到账</text>
        </view>
        <view class="row-status" :class="item.status === 'settled' ? 'settled' : 'pending'">
          <text>{{ item.status === 'settled' ? '已到账' : '处理中' }}</text>
        </view>
      </view>
      <view v-if="!loading && !withdrawals.length" class="empty-row">
        <text>暂无提现记录</text>
      </view>
    </template>

    <!-- 加载 -->
    <view v-if="loading" class="loading-bar">
      <text>加载中…</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { getMerchantDashboard, getMerchantWithdrawals, submitWithdrawal } from '@/api/merchant'

const userStore = useUserStore()

const loading = ref(true)
const merchantName = ref('')
const isManager = ref(false)
const todayAmount = ref(0)
const weekAmount = ref(0)
const monthAmount = ref(0)
const totalAmount = ref(0)
const availableAmount = ref(0)
const withdrawingAmount = ref(0)
const customAmount = ref('')
const withdrawals = ref([])

onShow(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  load()
})

onPullDownRefresh(() => {
  load().finally(() => uni.stopPullDownRefresh())
})

async function load() {
  loading.value = true
  try {
    const data = await getMerchantDashboard()
    merchantName.value = data?.merchantName || ''
    isManager.value = !!data?.isManager
    todayAmount.value = data?.todayAmount || 0
    weekAmount.value = data?.weekAmount || 0
    monthAmount.value = data?.monthAmount || 0
    totalAmount.value = data?.totalAmount || 0
    availableAmount.value = data?.availableAmount || 0
    withdrawingAmount.value = data?.withdrawingAmount || 0

    if (data?.isManager) await loadWithdrawals()
  } catch (err) {
    uni.showToast({ title: err?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadWithdrawals() {
  try {
    const rows = await getMerchantWithdrawals()
    withdrawals.value = rows || []
  } catch { /* silent */ }
}

function dateText(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts) * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function openVerify() {
  uni.navigateTo({ url: '/pages/merchant/verify' })
}

function withdrawAll() {
  confirmWithdraw(Number(availableAmount.value || 0), true)
}

function withdrawCustom() {
  confirmWithdraw(Number(customAmount.value || 0), false)
}

function confirmWithdraw(amount, isAll) {
  if (amount <= 0) {
    uni.showToast({ title: '请输入提现金额', icon: 'none' })
    return
  }
  if (amount > Number(availableAmount.value || 0)) {
    uni.showToast({ title: '超过可提现金额', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认提现申请',
    content: `本次提现 ¥${amount}\n提交后冻结该金额，预计T+3到账`,
    confirmText: '确认申请',
    confirmColor: '#C9A227',
    async success(res) {
      if (!res.confirm) return
      try {
        const result = await submitWithdrawal({
          amount,
          withdrawAll: isAll,
          remark: '',
        })
        uni.showModal({
          title: '申请成功',
          content: `¥${result?.amount || amount} 预计T+3到账`,
          showCancel: false,
        })
        customAmount.value = ''
        load()
      } catch (err) {
        uni.showToast({ title: err?.message || '申请失败', icon: 'none' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.merchant-page {
  min-height: 100vh;
  background: $sw-bg;
  padding: $sw-page-pad;
}

.merchant-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 28rpx 32rpx;
  box-shadow: $sw-shadow-card;
}

.head-info {
  display: flex;
  flex-direction: column;
}

.head-label {
  font-size: 24rpx;
  color: $sw-text-muted;
}

.head-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $sw-text;
  margin-top: 4rpx;
}

.role-badge {
  font-size: 24rpx;
  padding: 6rpx 20rpx;
  border-radius: 16rpx;
  background: $sw-integral-soft;
  color: $sw-gold-dark;
  font-weight: 500;

  &.manager {
    background: linear-gradient(135deg, $sw-gold 0%, $sw-gold-light 100%);
    color: #fff;
  }
}

.verify-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 28rpx 32rpx;
  margin-top: 20rpx;
  box-shadow: $sw-shadow-sm;
}

.verify-left {
  display: flex;
  flex-direction: column;
}

.verify-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $sw-text;
}

.verify-desc {
  font-size: 24rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.verify-action {
  font-size: 28rpx;
  color: $sw-gold;
  font-weight: 500;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $sw-text;
  padding: 32rpx 8rpx 16rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.stat-card {
  background: $sw-bg-card;
  border-radius: $sw-radius;
  padding: 24rpx 20rpx;
  text-align: center;
  box-shadow: $sw-shadow-sm;

  &.highlight {
    background: linear-gradient(135deg, $sw-gold 0%, $sw-gold-light 100%);

    .stat-num, .stat-label {
      color: #fff;
    }
  }
}

.stat-num {
  font-size: 36rpx;
  font-weight: 700;
  color: $sw-text;
  display: block;
}

.stat-label {
  font-size: 22rpx;
  color: $sw-text-muted;
  display: block;
  margin-top: 4rpx;
}

.withdraw-card {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 28rpx 32rpx;
  margin-top: 20rpx;
  box-shadow: $sw-shadow-card;
}

.withdraw-head {
  display: flex;
  justify-content: space-between;
}

.withdraw-item {
  display: flex;
  flex-direction: column;
}

.withdraw-label {
  font-size: 24rpx;
  color: $sw-text-muted;
}

.withdraw-amount {
  font-size: 40rpx;
  font-weight: 700;
  color: $sw-gold;
  margin-top: 8rpx;

  &.small {
    font-size: 28rpx;
    color: $sw-text-secondary;
  }
}

.withdraw-notice {
  font-size: 24rpx;
  color: $sw-text-muted;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $sw-border;
}

.withdraw-all-btn {
  width: 100%;
  height: 80rpx;
  margin-top: 24rpx;
  background: $sw-gold !important;
  color: #fff !important;
  border-radius: $sw-radius;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  line-height: 80rpx;

  &[disabled] {
    opacity: 0.5;
  }
}

.custom-row {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.custom-input {
  flex: 1;
  height: 72rpx;
  background: $sw-bg;
  border-radius: $sw-radius;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.custom-btn {
  height: 72rpx;
  padding: 0 28rpx;
  background: $sw-bg-card !important;
  border: 2rpx solid $sw-gold !important;
  color: $sw-gold !important;
  border-radius: $sw-radius;
  font-size: 26rpx;
  font-weight: 500;
  line-height: 72rpx;
}

.withdraw-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $sw-bg-card;
  border-radius: $sw-radius;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
  box-shadow: $sw-shadow-sm;
}

.row-left {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.row-amount {
  font-size: 30rpx;
  font-weight: 600;
  color: $sw-text;
}

.row-date {
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.row-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  font-weight: 500;
  flex-shrink: 0;

  &.settled {
    background: $sw-voucher-soft;
    color: $sw-voucher;
  }

  &.pending {
    background: $sw-integral-soft;
    color: $sw-gold-dark;
  }
}

.empty-row {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: $sw-text-muted;
}

.loading-bar {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: $sw-text-muted;
}
</style>
