<template>
    <view class="mc">
        <!-- 当前会员状态卡 -->
        <view class="cur-card" :class="tierClass">
            <view class="cur-card-bg">
                <view class="cur-orb cur-orb-1" />
                <view class="cur-orb cur-orb-2" />
            </view>
            <view class="cur-card-content">
                <view class="cc-top">
                    <text class="cc-label">当前等级</text>
                    <view class="cc-badge">{{ current.title || '普通会员' }}</view>
                </view>
                <view class="cc-exp" v-if="expireDate">有效期至 {{ expireDate }}</view>
                <view class="cc-exp" v-else>开通会员，畅享专属权益与积分好礼</view>
                <view class="cc-deco">✦ MEMBER ✦</view>
            </view>
        </view>

        <!-- 积分概览 -->
        <view class="integral-panel">
            <view class="ip-header">
                <text class="ip-title">我的积分</text>
                <text class="ip-link" @click="goIntegral">明细 ›</text>
            </view>
            <view class="integral-row">
                <view class="ir-item">
                    <view class="ir-num">{{ integral.total || 0 }}</view>
                    <view class="ir-label">总积分</view>
                </view>
                <view class="ir-divider" />
                <view class="ir-item">
                    <view class="ir-num ir-num-gift">{{ integral.gift || 0 }}</view>
                    <view class="ir-label">赠送</view>
                </view>
                <view class="ir-divider" />
                <view class="ir-item">
                    <view class="ir-num ir-num-recharge">{{ integral.recharge || 0 }}</view>
                    <view class="ir-label">充值</view>
                </view>
            </view>
        </view>

        <!-- 会员套餐 -->
        <view class="section-header">
            <text class="section-title">选择套餐</text>
            <text class="section-sub">开通即赠积分</text>
        </view>

        <view
            class="plan-card"
            v-for="p in plans"
            :key="p.code || p.id"
            :class="{ 'plan-premium': isPremium(p) }"
            @click="goPurchase(p)"
        >
            <view class="plan-left">
                <view class="plan-tier">{{ isPremium(p) ? '尊享会员' : '标准会员' }}</view>
                <view class="p-name">{{ p.title || p.name }}</view>
                <view class="p-gift">赠 {{ p.gift_integral || p.giftIntegral || 0 }} 积分 · {{ p.vip_day || 365 }} 天</view>
            </view>
            <view class="plan-right">
                <view class="p-price">¥{{ p.price }}</view>
                <view class="p-btn">开通</view>
            </view>
        </view>

        <view v-if="!loading && plans.length === 0" class="empty">
            <text class="empty-icon">📋</text>
            <text>暂无可开通套餐</text>
        </view>
    </view>
</template>

<script>
import { getPlans, getMyMembership, getIntegralSummary } from '@/api/membership.js'

export default {
    data() {
        return {
            plans: [],
            current: {},
            integral: { total: 0, gift: 0, recharge: 0 },
            loading: true
        }
    },
    computed: {
        tierClass() {
            const t = (this.current.title || '').toLowerCase()
            if (t.includes('299') || t.includes('尊享')) return 'tier-premium'
            if (t.includes('199') || t.includes('会员')) return 'tier-gold'
            return 'tier-default'
        },
        expireDate() {
            const raw = this.current.membershipExpireAt || this.current.expire_at
            if (!raw) return ''
            const d = new Date(Number(raw) < 2e10 ? Number(raw) * 1000 : Number(raw))
            if (isNaN(d.getTime())) return ''
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        }
    },
    onShow() {
        this.loadAll()
    },
    methods: {
        isPremium(p) {
            const code = (p.tierCode || p.code || '').toUpperCase()
            return code.includes('299') || (p.title || p.name || '').includes('299')
        },
        async loadAll() {
            this.loading = true
            try {
                const pres = await getPlans()
                this.plans = (pres && (pres.list || (Array.isArray(pres) ? pres : []))) || []
            } catch (e) {
                this.plans = []
            }
            const token = uni.getStorageSync('SW_TOKEN')
            if (token) {
                try {
                    this.current = (await getMyMembership()) || {}
                } catch (e) {
                    this.current = {}
                }
                try {
                    const d = (await getIntegralSummary()) || {}
                    this.integral = {
                        total: d.totalIntegral || d.total || d.balance || 0,
                        gift: d.giftRemaining || d.gift_total || d.gift || 0,
                        recharge: d.rechargeRemaining || d.recharge_total || d.recharge || 0
                    }
                } catch (e) {
                    /* ignore */
                }
            }
            this.loading = false
        },
        goPurchase(plan) {
            uni.navigateTo({ url: '/pages/member/purchase?plan=' + (plan.tierCode || plan.code || 'SW199') })
        },
        goIntegral() {
            uni.navigateTo({ url: '/pages/integral/index' })
        }
    }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.mc {
    min-height: 100vh;
    padding: 28rpx;
    padding-bottom: 40rpx;
}

/* ── 当前会员卡 ── */
.cur-card {
    position: relative;
    border-radius: $sw-radius-xl;
    overflow: hidden;
    min-height: 240rpx;
    box-shadow: $sw-shadow-lg;

    &.tier-default {
        .cur-card-bg { background: linear-gradient(135deg, #4A5568 0%, #2D3748 100%); }
        .cc-badge { color: #E2E8F0; }
    }
    &.tier-gold {
        .cur-card-bg { background: linear-gradient(135deg, #8B6914 0%, #C9A227 50%, #F5E6A3 100%); }
        .cc-badge { color: #FFF8E7; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.2); }
    }
    &.tier-premium {
        .cur-card-bg { background: linear-gradient(135deg, #1A1A2E 0%, #7B4FD4 50%, #2D2B55 100%); }
        .cc-badge { color: #E8DAEF; text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.3); }
    }
}

.cur-card-bg {
    position: absolute;
    inset: 0;
}

.cur-orb {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
}

.cur-orb-1 {
    width: 200rpx;
    height: 200rpx;
    top: -60rpx;
    right: -40rpx;
}

.cur-orb-2 {
    width: 120rpx;
    height: 120rpx;
    bottom: -30rpx;
    left: 60rpx;
    background: rgba(255, 255, 255, 0.06);
}

.cur-card-content {
    position: relative;
    z-index: 1;
    padding: 40rpx 32rpx;
    color: #fff;
}

.cc-top {
    margin-bottom: 12rpx;
}

.cc-label {
    font-size: 22rpx;
    opacity: 0.75;
    letter-spacing: 2rpx;
    text-transform: uppercase;
}

.cc-badge {
    display: block;
    font-size: 44rpx;
    font-weight: 800;
    margin-top: 8rpx;
    letter-spacing: 2rpx;
}

.cc-exp {
    font-size: 24rpx;
    opacity: 0.85;
    margin-top: 8rpx;
}

.cc-deco {
    position: absolute;
    bottom: 24rpx;
    right: 32rpx;
    font-size: 20rpx;
    opacity: 0.35;
    letter-spacing: 4rpx;
}

/* ── 积分面板 ── */
.integral-panel {
    background: $sw-bg-card;
    border-radius: $sw-radius-lg;
    margin-top: 24rpx;
    padding: 28rpx;
    box-shadow: $sw-shadow-sm;
}

.ip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
}

.ip-title {
    font-size: 30rpx;
    font-weight: 700;
    color: $sw-text;
}

.ip-link {
    font-size: 24rpx;
    color: $sw-gold-dark;
    font-weight: 500;
}

.integral-row {
    display: flex;
    align-items: center;
}

.ir-item {
    flex: 1;
    text-align: center;
}

.ir-divider {
    width: 1rpx;
    height: 60rpx;
    background: $sw-border;
}

.ir-num {
    font-size: 40rpx;
    font-weight: 800;
    color: $sw-gold;
    line-height: 1.2;
}

.ir-num-gift { color: $sw-integral; }
.ir-num-recharge { color: $sw-voucher; }

.ir-label {
    margin-top: 8rpx;
    font-size: 22rpx;
    color: $sw-text-secondary;
}

/* ── 套餐区 ── */
.section-header {
    display: flex;
    align-items: baseline;
    gap: 12rpx;
    margin: 36rpx 8rpx 20rpx;
}

.section-title {
    font-size: 32rpx;
    font-weight: 800;
    color: $sw-text;
}

.section-sub {
    font-size: 24rpx;
    color: $sw-text-muted;
}

.plan-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: $sw-bg-card;
    border-radius: $sw-radius-lg;
    padding: 32rpx 28rpx;
    margin-bottom: 20rpx;
    box-shadow: $sw-shadow-sm;
    border: 2rpx solid transparent;
    transition: border-color 0.2s;

    &.plan-premium {
        background: linear-gradient(135deg, #FAFAFF 0%, #F3EEFF 100%);
        border-color: rgba(123, 79, 212, 0.25);
        box-shadow: 0 8rpx 32rpx rgba(123, 79, 212, 0.12);

        .plan-tier { color: $sw-purple; background: rgba(123, 79, 212, 0.1); }
        .p-price { color: $sw-purple; }
        .p-btn { background: linear-gradient(135deg, $sw-purple, #5A3BB8); }
    }
}

.plan-left {
    flex: 1;
    min-width: 0;
}

.plan-tier {
    display: inline-block;
    font-size: 20rpx;
    font-weight: 600;
    color: $sw-gold-dark;
    background: rgba(201, 162, 39, 0.12);
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    margin-bottom: 10rpx;
}

.p-name {
    font-size: 32rpx;
    font-weight: 700;
    color: $sw-text;
}

.p-gift {
    margin-top: 10rpx;
    font-size: 24rpx;
    color: $sw-text-secondary;
}

.plan-right {
    text-align: center;
    flex-shrink: 0;
    margin-left: 20rpx;
}

.p-price {
    font-size: 40rpx;
    font-weight: 800;
    color: $sw-gold;
    line-height: 1.2;
}

.p-btn {
    margin-top: 12rpx;
    font-size: 24rpx;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, $sw-gold, $sw-gold-dark);
    padding: 10rpx 32rpx;
    border-radius: 999rpx;
}

.empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: $sw-text-muted;
    padding: 80rpx 0;
    font-size: 26rpx;
}

.empty-icon {
    font-size: 56rpx;
    margin-bottom: 16rpx;
    opacity: 0.5;
}
</style>
