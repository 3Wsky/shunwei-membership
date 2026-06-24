<template>
  <view class="workbench">
    <!-- 员工信息 -->
    <view class="staff-card">
      <view class="staff-badge">店员工作台</view>
      <view class="staff-info">
        <text class="staff-name">{{ staffName }}</text>
        <text class="staff-role">{{ roleLabel }}</text>
      </view>
    </view>

    <!-- 扫码核销 · 主入口 -->
    <view class="scan-hero" hover-class="tap-scale" @tap="goVerify">
      <view class="scan-hero-left">
        <view class="scan-icon-ring">
          <text class="scan-icon-char">扫</text>
        </view>
        <view class="scan-hero-text">
          <text class="scan-hero-title">扫码核销</text>
          <text class="scan-hero-desc">积分商城到店核销 · 一键扫描</text>
        </view>
      </view>
      <text class="scan-hero-arrow">›</text>
    </view>

    <!-- 功能入口 -->
    <view class="action-grid">
      <view class="action-item" hover-class="tap-scale" @tap="goMembers">
        <view class="action-icon-wrap members">
          <text class="action-char">管</text>
        </view>
        <text class="action-label">会员管理</text>
        <text class="action-desc">名下会员列表</text>
      </view>
      <view class="action-item" hover-class="tap-scale" @tap="goCustomer">
        <view class="action-icon-wrap customer">
          <text class="action-char">客</text>
        </view>
        <text class="action-label">查客户</text>
        <text class="action-desc">会员/积分查询</text>
      </view>
      <view class="action-item" hover-class="tap-scale" @tap="goSubmitApproval">
        <view class="action-icon-wrap approval">
          <text class="action-char">开</text>
        </view>
        <text class="action-label">发起开通</text>
        <text class="action-desc">录入消费开通</text>
      </view>
      <view class="action-item" hover-class="tap-scale" @tap="goApprovalCenter">
        <view class="action-icon-wrap review">
          <text class="action-char">审</text>
        </view>
        <text class="action-label">审批中心</text>
        <text class="action-desc">待审批/已审批</text>
      </view>
    </view>

    <!-- 最近核销 -->
    <view class="section">
      <text class="section-title">最近核销</text>
      <view v-if="recentVerifies.length" class="verify-list">
        <view v-for="(item, idx) in recentVerifies" :key="idx" class="verify-item">
          <view class="vi-left">
            <text class="vi-product">{{ item.productName || item.store_name || '积分兑换' }}</text>
            <text class="vi-time">{{ formatTime(item.verifiedAt || item.verified_at) }}</text>
          </view>
          <text class="vi-cost font-num">-{{ item.integralCost || item.total_price || 0 }}积分</text>
        </view>
      </view>
      <view v-else class="empty">
        <text class="empty-hint">暂无核销记录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getStaffInfo, getVerifyHistory } from '@/api/staff.js'
import { getToken } from '@/utils/auth.js'

export default {
  data() {
    return {
      staffName: '',
      roleLabel: '店员',
      recentVerifies: [],
    }
  },
  onShow() {
    if (!getToken()) {
      uni.navigateTo({ url: '/pages/login/index' })
      return
    }
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        const info = await getStaffInfo()
        this.staffName = info?.nickname || '员工'
        this.roleLabel = info?.is_staff ? '店员' : '普通用户'
      } catch { /* silent */ }

      try {
        const res = await getVerifyHistory({ page: 1, limit: 10 })
        this.recentVerifies = res?.list || (Array.isArray(res) ? res : [])
      } catch { /* silent */ }
    },
    goVerify() {
      uni.navigateTo({ url: '/pages/staff/verify' })
    },
    goMembers() {
      uni.navigateTo({ url: '/pages/staff/members' })
    },
    goSubmitApproval() {
      uni.navigateTo({ url: '/pages/approval/submit' })
    },
    goApprovalCenter() {
      uni.navigateTo({ url: '/pages/approval/center' })
    },
    goCustomer() {
      uni.showModal({
        title: '查询客户',
        editable: true,
        placeholderText: '输入客户UID',
        confirmText: '查询',
        confirmColor: '#C9A227',
        success: (res) => {
          if (res.confirm && res.content) {
            uni.navigateTo({ url: '/pages/staff/customer?uid=' + res.content.trim() })
          }
        },
      })
    },
    formatTime(ts) {
      if (!ts) return ''
      const d = typeof ts === 'number' && ts < 2e10 ? new Date(ts * 1000) : new Date(ts)
      const pad = n => String(n).padStart(2, '0')
      return `${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.workbench {
  min-height: 100vh;
  padding: $sw-page-pad;
  padding-bottom: 48rpx;
  background: $sw-bg;
}

.staff-card {
  background: $sw-bg-dark-deep;
  border-radius: $sw-radius-xl;
  padding: 36rpx 32rpx;
  color: #fff;
  box-shadow: 0 12rpx 40rpx rgba(26, 31, 54, 0.35);
}

.staff-badge {
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

.staff-name {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
}

.staff-role {
  display: inline-block;
  font-size: 24rpx;
  opacity: 0.8;
  margin-top: 12rpx;
  background: rgba(255, 255, 255, 0.12);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}

.scan-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $sw-gap;
  padding: 32rpx 28rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  box-shadow: $sw-shadow-gold;
  border: 2rpx solid rgba($sw-gold, 0.2);
}

.scan-hero-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.scan-icon-ring {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $sw-bg-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $sw-shadow-gold;
}

.scan-icon-char {
  font-size: 36rpx;
  font-weight: 800;
  color: $sw-gold-light;
}

.scan-hero-title {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: $sw-text;
}

.scan-hero-desc {
  display: block;
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
}

.scan-hero-arrow {
  font-size: 44rpx;
  color: $sw-gold;
  line-height: 1;
}

.action-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 20rpx;
}

.action-item {
  width: calc(33.33% - 14rpx);
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 28rpx 12rpx;
  text-align: center;
  box-shadow: $sw-shadow-card;
}

.action-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12rpx;
}

.action-char {
  font-size: 28rpx;
  font-weight: 700;
}

.action-icon-wrap.members {
  background: $sw-integral-soft;
  .action-char { color: $sw-gold; }
}

.action-icon-wrap.customer {
  background: rgba($sw-dark, 0.06);
  .action-char { color: $sw-dark; }
}

.action-icon-wrap.approval,
.action-icon-wrap.review {
  background: $sw-integral-soft;
  .action-char { color: $sw-gold-dark; }
}

.action-label {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: $sw-text;
}

.action-desc {
  display: block;
  font-size: 20rpx;
  color: $sw-text-muted;
  margin-top: 4rpx;
}

.section { margin-top: 36rpx; }

.section-title {
  font-size: 32rpx;
  font-weight: 800;
  color: $sw-text;
  margin-bottom: 16rpx;
  display: block;
}

.verify-list {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  overflow: hidden;
  box-shadow: $sw-shadow-card;
}

.verify-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid $sw-border;
}

.verify-item:last-child { border-bottom: none; }

.vi-product {
  display: block;
  font-size: 28rpx;
  color: $sw-text;
  font-weight: 500;
}

.vi-time {
  display: block;
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-top: 4rpx;
}

.vi-cost {
  font-size: 30rpx;
  font-weight: 700;
  color: $sw-gold;
}

.font-num {
  font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif;
}

.empty {
  text-align: center;
  padding: 60rpx 0;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  box-shadow: $sw-shadow-card;
}

.empty-hint {
  font-size: 26rpx;
  color: $sw-text-muted;
}

.tap-scale {
  transform: $sw-tap-scale;
  opacity: 0.92;
}
</style>
