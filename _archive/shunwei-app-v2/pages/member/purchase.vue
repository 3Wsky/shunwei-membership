<template>
  <view class="purchase-page">
    <view v-if="plan" class="plan-hero" :class="{ gold: plan.tierCode === 'SW299' }">
      <text class="hero-label">{{ plan.title }}</text>
      <view class="hero-price">
        <text class="price-unit">¥</text>
        <text class="price-value">{{ plan.price }}</text>
        <text class="price-period">/年</text>
      </view>
    </view>

    <view class="benefit-section">
      <text class="section-title">会员权益</text>
      <view class="benefit-list">
        <view class="benefit-item">
          <view class="benefit-icon"><text class="benefit-char">赠</text></view>
          <view class="benefit-detail">
            <text class="benefit-name">开卡赠积分</text>
            <text class="benefit-desc">开通即赠 {{ plan ? plan.giftIntegral : '--' }} 积分</text>
          </view>
        </view>
        <view class="benefit-item">
          <view class="benefit-icon"><text class="benefit-char">期</text></view>
          <view class="benefit-detail">
            <text class="benefit-name">会员有效期</text>
            <text class="benefit-desc">{{ plan ? plan.vipDays : '--' }} 天</text>
          </view>
        </view>
        <view class="benefit-item">
          <view class="benefit-icon"><text class="benefit-char">礼</text></view>
          <view class="benefit-detail">
            <text class="benefit-name">积分商城</text>
            <text class="benefit-desc">专属积分兑换商品</text>
          </view>
        </view>
        <view class="benefit-item">
          <view class="benefit-icon"><text class="benefit-char">V</text></view>
          <view class="benefit-detail">
            <text class="benefit-name">等级保护</text>
            <text class="benefit-desc">取高不降级，续费权益叠加</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 计划选择（双卡切换） -->
    <view v-if="allPlans.length > 1" class="plan-switch">
      <text class="section-title">选择套餐</text>
      <view class="switch-cards">
        <view
          v-for="p in allPlans"
          :key="p.tierCode"
          class="switch-card"
          :class="{ active: selectedCode === p.tierCode, gold: p.tierCode === 'SW299' }"
          @tap="selectPlan(p)"
        >
          <text class="sc-name">{{ p.title }}</text>
          <text class="sc-price">¥{{ p.price }}</text>
          <text class="sc-gift">赠 {{ p.giftIntegral }} 积分</text>
        </view>
      </view>
    </view>

    <!-- 底部购买按钮 -->
    <view class="bottom-bar">
      <view class="price-display">
        <text class="pay-label">需支付</text>
        <text class="pay-price">¥{{ plan ? plan.price : '--' }}</text>
      </view>
      <button class="pay-btn" :loading="paying" :disabled="paying" @tap="handlePay">
        立即开通
      </button>
    </view>
  </view>
</template>

<script>
import { getMembershipPlans } from '@/api/membership.js'
import { createMemberOrder, requestWxPayment, claimGiftAfterPay } from '@/api/pay.js'

export default {
  data() {
    return {
      allPlans: [],
      selectedCode: '',
      paying: false,
    }
  },
  computed: {
    plan() {
      return this.allPlans.find(p => p.tierCode === this.selectedCode) || null
    },
  },
  onLoad(query) {
    this.selectedCode = query.plan || 'SW199'
    this.loadPlans()
  },
  methods: {
    async loadPlans() {
      try {
        const data = await getMembershipPlans()
        this.allPlans = Array.isArray(data) ? data : (data?.list || [])
        if (!this.plan && this.allPlans.length) {
          this.selectedCode = this.allPlans[0].tierCode
        }
      } catch { /* silent */ }
    },
    selectPlan(p) {
      this.selectedCode = p.tierCode
    },
    async handlePay() {
      if (!this.plan) return
      if (!uni.getStorageSync('SW_TOKEN')) {
        uni.navigateTo({ url: '/pages/login/index' })
        return
      }
      this.paying = true
      try {
        // 方案甲-1：CRMEB 下单 → uni.requestPayment → 成功后兜底 claim-gift
        const mcId = this.plan.memberShipId || this.plan.mcId || this.plan.mc_id || this.plan.shipId
        const order = await createMemberOrder({
          mcId,
          price: this.plan.price,
          money: this.plan.price,
          memberType: this.plan.tierCode,
        })
        const payInfo = order?.payInfo || order?.jsConfig || order
        await requestWxPayment(payInfo)
        // 支付成功
        try {
          await claimGiftAfterPay({ tierCode: this.plan.tierCode, refId: order?.order_id || order?.orderId || ('PAY' + Date.now()) })
        } catch { /* CRMEB 钩子为主，幂等兜底失败可忽略 */ }
        uni.showToast({ title: '开通成功', icon: 'success' })
        setTimeout(() => uni.redirectTo({ url: '/pages/member/center' }), 800)
      } catch (e) {
        const msg = (e && (e.errMsg || e.message)) || ''
        if (msg.includes('cancel')) {
          uni.showToast({ title: '已取消支付', icon: 'none' })
        } else {
          // 下单/支付失败：常见为生产 CRMEB 付费会员未开启或路由差异，提示联调
          uni.showModal({
            title: '支付未完成',
            content: '会员支付需生产环境开启付费会员并完成联调。错误：' + (msg || '下单失败'),
            showCancel: false,
          })
        }
      } finally {
        this.paying = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.purchase-page {
  padding-bottom: 180rpx;
  min-height: 100vh;
}

.plan-hero {
  background: $sw-bg-dark-deep;
  padding: 72rpx 40rpx 64rpx;
  text-align: center;
  color: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12rpx 40rpx rgba(26, 31, 54, 0.35);
}
.plan-hero.gold {
  background: linear-gradient(160deg, #141824 0%, $sw-purple 45%, #2D3561 100%);
}

.hero-label {
  display: block;
  font-size: 28rpx;
  opacity: 0.9;
  letter-spacing: 6rpx;
  font-weight: 500;
}

.hero-price {
  margin-top: 20rpx;
  display: flex;
  align-items: baseline;
  justify-content: center;
}
.price-unit { font-size: 40rpx; font-weight: 700; }
.price-value { font-size: 96rpx; font-weight: 800; line-height: 1; color: $sw-gold-light; }
.price-period { font-size: 28rpx; opacity: 0.75; margin-left: 6rpx; }

.benefit-section, .plan-switch {
  padding: 32rpx 28rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 800;
  color: $sw-text;
  margin-bottom: 20rpx;
  display: block;
}

.benefit-list {
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
  overflow: hidden;
  box-shadow: $sw-shadow-sm;
}

.benefit-item {
  display: flex;
  align-items: center;
  padding: 28rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}
.benefit-item:last-child { border-bottom: none; }

.benefit-icon {
  margin-right: 20rpx;
  width: 64rpx;
  height: 64rpx;
  background: $sw-integral-soft;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.benefit-char {
  font-size: 26rpx;
  font-weight: 700;
  color: $sw-gold-dark;
}

.benefit-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $sw-text;
  display: block;
}

.benefit-desc {
  font-size: 24rpx;
  color: $sw-text-secondary;
  display: block;
  margin-top: 4rpx;
}

.switch-cards {
  display: flex;
  gap: 20rpx;
}

.switch-card {
  flex: 1;
  background: $sw-bg-card;
  border: 2rpx solid rgba(0, 0, 0, 0.06);
  border-radius: $sw-radius-lg;
  padding: 28rpx 20rpx;
  text-align: center;
  box-shadow: $sw-shadow-sm;
}
.switch-card.active {
  border-color: $sw-gold;
  background: $sw-integral-soft;
  box-shadow: $sw-shadow-gold;
}
.switch-card.gold.active {
  border-color: $sw-purple;
  background: linear-gradient(135deg, #FAFAFF, #F3EEFF);
  box-shadow: 0 8rpx 32rpx rgba(123, 79, 212, 0.12);
}

.sc-name { display: block; font-size: 26rpx; color: $sw-text; font-weight: 600; }
.sc-price { display: block; font-size: 40rpx; font-weight: 800; color: $sw-gold; margin-top: 8rpx; }
.switch-card.gold .sc-price { color: $sw-purple; }
.sc-gift { display: block; font-size: 22rpx; color: $sw-text-muted; margin-top: 6rpx; }

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(12px);
  box-shadow: 0 -8rpx 32rpx rgba(26, 26, 46, 0.08);
}

.price-display { flex: 1; }
.pay-label { font-size: 24rpx; color: $sw-text-muted; display: block; }
.pay-price { font-size: 44rpx; font-weight: 800; color: $sw-gold; }

.pay-btn {
  width: 320rpx;
  height: 92rpx;
  border-radius: 46rpx;
  background: linear-gradient(135deg, $sw-gold, $sw-gold-dark);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: $sw-shadow-gold;
}
.pay-btn::after { border: none; }
</style>
