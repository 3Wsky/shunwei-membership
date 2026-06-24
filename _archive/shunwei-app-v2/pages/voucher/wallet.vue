<template>
  <view class="wallet-page">
    <!-- 核销二维码（需先阅读并同意《现金券使用须知》） -->
    <view v-if="!notLogged && customerUid && termsAgreed" class="qr-section">
      <view class="qr-glow" />
      <text class="qr-title">出示二维码核销现金券</text>
      <view class="qr-wrap">
        <SwQrCode cid="wallet-uid-qr" :text="qrText" :size="320" foreground="#1A1F36" />
      </view>
      <text class="qr-hint">商家/店员扫码即可识别您的会员身份</text>
      <text class="qr-uid">UID: {{ customerUid }}</text>
      <text class="qr-terms-link" @tap="openTerms">《现金券使用须知》</text>
    </view>
    <view v-else-if="!notLogged && customerUid && !termsAgreed" class="terms-lock" @tap="openTerms">
      <text class="lock-icon">🔒</text>
      <text class="lock-title">现金券使用前需阅读并同意</text>
      <text class="lock-sub">点击查看《现金券使用须知》</text>
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

    <!-- 《现金券使用须知》弹窗协议（5 秒倒计时，同意后方可使用） -->
    <view v-if="showTerms" class="terms-mask">
      <view class="terms-sheet">
        <text class="terms-title">现金券使用须知</text>
        <text class="terms-tip">请阅读以下条款，同意后方可使用现金券</text>
        <scroll-view scroll-y class="terms-body">
          <view v-for="(t, i) in termsList" :key="i" class="terms-item">
            <text class="terms-idx">{{ i + 1 }}.</text>
            <text class="terms-text">{{ t }}</text>
          </view>
        </scroll-view>
        <button
          class="terms-agree-btn"
          :class="{ disabled: countdown > 0 }"
          :disabled="countdown > 0"
          @tap="agreeTerms"
        >
          {{ countdown > 0 ? `请阅读（${countdown}s）` : '我已阅读并同意' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { getVoucherWallet, getVoucherLedger } from '@/api/voucher.js'
import { getMyMembership } from '@/api/membership.js'
import { useUserStore } from '@/store/user'
import SwQrCode from '@/components/SwQrCode/SwQrCode.vue'

// 须知版本化：条款更新时改版本号即可让用户重新确认
const VOUCHER_TERMS_KEY = 'SW_VOUCHER_TERMS_AGREED_V1'
const TERMS_COUNTDOWN = 5

export default {
  components: { SwQrCode },
  data() {
    return {
      wallet: {},
      ledger: [],
      loading: true,
      notLogged: false,
      customerUid: 0,
      termsAgreed: false,
      showTerms: false,
      countdown: 0,
      termsList: [
        '本券为您在本店消费达对应档位后获赠的抵扣权益，仅用于抵扣消费，不可兑换现金、不设找零。',
        '适用范围：限锦程数码门店及合作商家的指定商品/服务，以券面或本页标注为准。',
        '有效期：以每张现金券标注的到期时间为准，到期前小程序将提醒；余额未用完可联系门店协商继续使用或延期。',
        '使用规则：支持部分核销、余额保留（先到期先用）；单笔可用金额及是否可叠加以页面标注为准。',
        '归属：本券绑定您的会员账户，限本人使用；如需转让请通知门店办理。',
        '退货处理：使用本券购买的商品退货时，已抵扣券额按原值退回您的账户（不折现金）。',
        '质量保障：获赠权益不影响您依法享有的商品/服务质量与售后权利。',
        '规则咨询：对使用规则如有疑问，可咨询门店，双方依法协商处理。',
      ],
    }
  },
  computed: {
    qrText() {
      return this.customerUid ? `sw-uid:${this.customerUid}` : ''
    },
  },
  onShow() {
    this.loadAll()
    this.checkTerms()
  },
  onHide() {
    this.clearTermsTimer()
  },
  onUnload() {
    this.clearTermsTimer()
  },
  methods: {
    checkTerms() {
      if (!uni.getStorageSync('SW_TOKEN')) {
        this.termsAgreed = false
        this.showTerms = false
        this.clearTermsTimer()
        return
      }
      this.termsAgreed = !!uni.getStorageSync(VOUCHER_TERMS_KEY)
      if (!this.termsAgreed) this.openTerms()
    },
    openTerms() {
      this.showTerms = true
      // 已同意过的用户主动复看：按钮立即可用；首次必须读满倒计时
      if (this.termsAgreed) {
        this.countdown = 0
        this.clearTermsTimer()
        return
      }
      this.countdown = TERMS_COUNTDOWN
      this.clearTermsTimer()
      this._termsTimer = setInterval(() => {
        this.countdown -= 1
        if (this.countdown <= 0) {
          this.countdown = 0
          this.clearTermsTimer()
        }
      }, 1000)
    },
    agreeTerms() {
      if (this.countdown > 0) return
      try { uni.setStorageSync(VOUCHER_TERMS_KEY, '1') } catch (e) { /* ignore */ }
      this.termsAgreed = true
      this.showTerms = false
      this.clearTermsTimer()
    },
    clearTermsTimer() {
      if (this._termsTimer) {
        clearInterval(this._termsTimer)
        this._termsTimer = null
      }
    },
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

/* ── 须知链接 & 未同意锁定态 ── */
.qr-terms-link {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: $sw-gold-dark;
  text-decoration: underline;
}
.terms-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: $sw-bg-card;
  border: 1rpx dashed rgba(201, 162, 39, 0.4);
  border-radius: $sw-radius-xl;
  padding: 48rpx 28rpx;
  margin-bottom: $sw-gap;
  text-align: center;
}
.lock-icon { font-size: 56rpx; margin-bottom: 12rpx; }
.lock-title { font-size: 28rpx; font-weight: 700; color: $sw-text; }
.lock-sub { font-size: 24rpx; color: $sw-gold-dark; margin-top: 8rpx; }

/* ── 使用须知弹窗协议 ── */
.terms-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(26, 31, 54, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.terms-sheet {
  width: 100%;
  max-width: 640rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx 32rpx 32rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
}
.terms-title {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  color: $sw-text;
  text-align: center;
}
.terms-tip {
  display: block;
  font-size: 24rpx;
  color: $sw-text-muted;
  text-align: center;
  margin-top: 10rpx;
}
.terms-body {
  max-height: 640rpx;
  margin: 24rpx 0;
  padding: 24rpx;
  background: $sw-bg;
  border-radius: 16rpx;
}
.terms-item {
  display: flex;
  margin-bottom: 18rpx;
  line-height: 1.6;
}
.terms-item:last-child { margin-bottom: 0; }
.terms-idx {
  flex-shrink: 0;
  width: 36rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: $sw-gold-dark;
}
.terms-text {
  flex: 1;
  font-size: 26rpx;
  color: $sw-text-secondary;
}
.terms-agree-btn {
  width: 100%;
  height: 92rpx;
  border-radius: 46rpx;
  background: linear-gradient(135deg, $sw-gold, $sw-gold-dark);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}
.terms-agree-btn::after { border: none; }
.terms-agree-btn.disabled {
  background: #D0D0D0;
  color: rgba(255, 255, 255, 0.85);
}
</style>
