<template>
  <view class="workbench">
    <!-- 员工信息 -->
    <view class="staff-card">
      <view class="staff-info">
        <text class="staff-name">{{ staffName }}</text>
        <text class="staff-role">{{ roleLabel }}</text>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="action-grid">
      <view class="action-item" @tap="goVerify">
        <view class="action-icon-wrap scan">
          <text class="action-icon">📷</text>
        </view>
        <text class="action-label">扫码核销</text>
        <text class="action-desc">积分商城到店核销</text>
      </view>
      <view class="action-item" @tap="goCustomer">
        <view class="action-icon-wrap customer">
          <text class="action-icon">👤</text>
        </view>
        <text class="action-label">查客户</text>
        <text class="action-desc">查看客户会员/积分</text>
      </view>
      <view class="action-item btn-tap" @tap="goSubmitApproval">
        <view class="action-icon-wrap approval">
          <text class="action-icon">📝</text>
        </view>
        <text class="action-label">发起开通</text>
        <text class="action-desc">录入消费开通会员</text>
      </view>
      <view class="action-item btn-tap" @tap="goApprovalCenter">
        <view class="action-icon-wrap review">
          <text class="action-icon">✅</text>
        </view>
        <text class="action-label">审批中心</text>
        <text class="action-desc">待审批/已审批</text>
      </view>
    </view>

    <!-- 今日核销记录 -->
    <view class="section">
      <text class="section-title">最近核销</text>
      <view v-if="recentVerifies.length" class="verify-list">
        <view v-for="(item, idx) in recentVerifies" :key="idx" class="verify-item">
          <view class="vi-left">
            <text class="vi-product">{{ item.productName || item.store_name || '积分兑换' }}</text>
            <text class="vi-time">{{ formatTime(item.verifiedAt || item.verified_at) }}</text>
          </view>
          <text class="vi-cost">-{{ item.integralCost || item.total_price || 0 }}积分</text>
        </view>
      </view>
      <view v-else class="empty">暂无核销记录</view>
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
  padding: 28rpx;
  padding-bottom: 40rpx;
}

.staff-card {
  background: $sw-bg-dark;
  border-radius: $sw-radius-xl;
  padding: 40rpx 32rpx;
  color: #fff;
  box-shadow: 0 12rpx 40rpx rgba(26, 31, 54, 0.35);
}
.staff-name {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
}
.staff-role {
  display: block;
  font-size: 24rpx;
  opacity: 0.75;
  margin-top: 8rpx;
  background: rgba(255, 255, 255, 0.15);
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  margin-top: 12rpx;
}

.action-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 28rpx;
}
.action-item {
  width: calc(50% - 10rpx);
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
  padding: 32rpx 20rpx;
  text-align: center;
  box-shadow: $sw-shadow-sm;
}
.action-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14rpx;
}
.action-icon-wrap.scan { background: $sw-integral-soft; }
.action-icon-wrap.customer { background: rgba(26, 31, 54, 0.06); }
.action-icon-wrap.approval { background: $sw-integral-soft; }
.action-icon-wrap.review { background: rgba(26, 31, 54, 0.06); }
.action-icon { font-size: 40rpx; }
.action-label {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $sw-text;
}
.action-desc {
  display: block;
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-top: 6rpx;
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
  border-radius: $sw-radius-lg;
  overflow: hidden;
  box-shadow: $sw-shadow-sm;
}
.verify-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}
.verify-item:last-child { border-bottom: none; }
.vi-product { display: block; font-size: 28rpx; color: $sw-text; font-weight: 500; }
.vi-time { display: block; font-size: 22rpx; color: $sw-text-muted; margin-top: 4rpx; }
.vi-cost { font-size: 30rpx; font-weight: 700; color: $sw-gold; }

.empty {
  text-align: center;
  color: $sw-text-muted;
  padding: 80rpx 0;
  font-size: 26rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-lg;
}
</style>
