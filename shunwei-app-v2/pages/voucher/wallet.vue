<template>
  <view class="wallet-page">
    <!-- 核销二维码 -->
    <view v-if="!notLogged && customerUid" class="qr-section">
      <view class="qr-glow" />
      <text class="qr-title">出示二维码核销现金券</text>
      <view class="qr-wrap">
        <SwQrCode cid="wallet-uid-qr" :text="qrText" :size="320" foreground="#1A1F36" />
      </view>
      <text class="qr-hint">商家/店员扫码即可识别您的会员身份</text>
      <text class="qr-uid">UID: {{ customerUid }}</text>
    </view>
    <view v-else-if="notLogged" class="login-tip" @tap="goLogin">
      <text>登录后显示核销二维码</text>
    </view>

    <!-- 余额卡片 -->
    <view class="balance-card">
      <text class="balance-label">现金券余额</text>
      <text class="balance-num">¥{{ wallet.balance || 0 }}</text>
      <view class="balance-meta" v-if="wallet.expiringSoon > 0">
        <text class="expiring-warn">{{ wallet.expiringSoon }}元即将过期(30天内)</text>
      </view>
    </view>

    <!-- 券批次列表 -->
    <view v-if="wallet.batches && wallet.batches.length" class="batch-section">
      <text class="section-title">我的现金券</text>
      <view v-for="b in wallet.batches" :key="b.id" class="batch-card">
        <view class="batch-left">
          <text class="batch-amount">¥{{ b.remainAmount }}</text>
          <text class="batch-total">/ {{ b.totalAmount }}</text>
        </view>
        <view class="batch-right">
          <text class="batch-expire">{{ formatExpire(b.expireAt) }}</text>
        </view>
      </view>
    </view>

    <!-- 使用明细 -->
    <view class="ledger-section">
      <text class="section-title">使用明细</text>
      <view v-if="ledger.length" class="ledger-list">
        <view v-for="(item, idx) in ledger" :key="idx" class="ledger-item">
          <view class="li-left">
            <text class="li-title">{{ item.direction === 1 ? '发放' : '核销' }}</text>
            <text class="li-remark">{{ item.remark || '' }}</text>
          </view>
          <text class="li-amount" :class="{ plus: item.direction === 1 }">
            {{ item.direction === 1 ? '+' : '-' }}{{ item.amount }}
          </text>
        </view>
      </view>
      <view v-else-if="!loading" class="empty">暂无使用记录</view>
    </view>
  </view>
</template>

<script>
import { getVoucherWallet, getVoucherLedger } from '@/api/voucher.js'
import { getMyMembership } from '@/api/membership.js'
import { useUserStore } from '@/store/user'
import SwQrCode from '@/components/SwQrCode/SwQrCode.vue'

export default {
  components: { SwQrCode },
  data() {
    return { wallet: {}, ledger: [], loading: true, notLogged: false, customerUid: 0 }
  },
  computed: {
    qrText() {
      return this.customerUid ? `sw-uid:${this.customerUid}` : ''
    },
  },
  onShow() {
    this.loadAll()
  },
  methods: {
    goLogin() {
      uni.navigateTo({ url: '/pages/login/index' })
    },
    async loadUid() {
      const userStore = useUserStore()
      if (userStore.uid) {
        this.customerUid = userStore.uid
        return
      }
      try {
        const me = await getMyMembership()
        this.customerUid = me?.uid || me?.user?.uid || 0
      } catch {
        const info = uni.getStorageSync('SW_USER_INFO')
        this.customerUid = info?.uid || 0
      }
    },
    async loadAll() {
      if (!uni.getStorageSync('SW_TOKEN')) {
        this.notLogged = true
        this.loading = false
        this.customerUid = 0
        return
      }
      this.notLogged = false
      this.loading = true
      await Promise.allSettled([this.loadUid(), this.loadWallet(), this.loadLedger()])
      this.loading = false
    },
    async loadWallet() {
      try { this.wallet = (await getVoucherWallet()) || {} } catch {}
    },
    async loadLedger() {
      try {
        const res = await getVoucherLedger({ page: 1, limit: 30 })
        this.ledger = res?.list || []
      } catch {}
    },
    formatExpire(ts) {
      if (!ts) return '永久有效'
      const d = new Date(ts * 1000)
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} 到期`
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.wallet-page {
  min-height: 100vh;
  padding: $sw-page-pad;
  padding-bottom: 40rpx;
  background: $sw-bg;
}
.qr-section {
  position: relative;
  background: $sw-bg-card;
  border-radius: $sw-radius-xl;
  padding: 36rpx 28rpx;
  margin-bottom: $sw-gap;
  text-align: center;
  box-shadow: $sw-shadow-sm;
  overflow: hidden;
}
.qr-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 360rpx;
  height: 360rpx;
  transform: translate(-50%, -55%);
  background: radial-gradient(circle, $sw-gold-glow 0%, transparent 70%);
  pointer-events: none;
}
.qr-wrap {
  position: relative;
  display: flex;
  justify-content: center;
}
.qr-title { display: block; font-size: 28rpx; font-weight: 700; color: $sw-text; margin-bottom: 20rpx; }
.qr-hint { display: block; font-size: 24rpx; color: $sw-text-muted; margin-top: 16rpx; }
.qr-uid { display: block; font-size: 22rpx; color: $sw-text-muted; margin-top: 8rpx; opacity: 0.7; }
.login-tip {
  background: rgba(26, 31, 54, 0.06);
  border: 1rpx solid rgba(201, 162, 39, 0.25);
  border-radius: $sw-radius-lg;
  padding: 28rpx;
  text-align: center;
  color: $sw-gold-dark;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: $sw-gap;
}
.balance-card {
  background: linear-gradient(135deg, $sw-voucher, #27AE60);
  border-radius: $sw-radius-xl;
  padding: 48rpx 36rpx;
  color: #fff;
  text-align: center;
  box-shadow: 0 12rpx 40rpx rgba(46, 204, 113, 0.25);
}
.balance-label { display: block; font-size: 26rpx; opacity: 0.9; }
.balance-num { display: block; font-size: 72rpx; font-weight: 800; margin-top: 8rpx; }
.expiring-warn { font-size: 22rpx; color: $sw-gold-light; margin-top: 12rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: 800; color: $sw-text; margin: 28rpx 0 16rpx; }
.batch-section { margin-top: 8rpx; }
.batch-card {
  display: flex; justify-content: space-between; align-items: center;
  background: $sw-bg-card; border-radius: $sw-radius-lg; padding: 24rpx 28rpx;
  margin-bottom: 12rpx; box-shadow: $sw-shadow-sm;
}
.batch-left { display: flex; align-items: baseline; gap: 8rpx; }
.batch-amount { font-size: 36rpx; font-weight: 700; color: $sw-gold; }
.batch-total { font-size: 24rpx; color: $sw-text-muted; }
.batch-expire { font-size: 22rpx; color: $sw-text-muted; }
.ledger-list { background: $sw-bg-card; border-radius: $sw-radius-lg; overflow: hidden; box-shadow: $sw-shadow-sm; }
.ledger-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 22rpx 28rpx; border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}
.ledger-item:last-child { border-bottom: none; }
.li-title { display: block; font-size: 28rpx; color: $sw-text; font-weight: 500; }
.li-remark { display: block; font-size: 22rpx; color: $sw-text-muted; margin-top: 4rpx; }
.li-amount { font-size: 30rpx; font-weight: 700; color: $sw-text-muted; }
.li-amount.plus { color: $sw-voucher; }
.empty { text-align: center; color: $sw-text-muted; padding: 60rpx 0; font-size: 26rpx; }
</style>
