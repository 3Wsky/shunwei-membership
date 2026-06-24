<template>
  <view class="center-page">
    <!-- 角色切换 -->
    <view class="role-switch">
      <view class="switch-track">
        <view
          class="switch-tab"
          :class="{ active: role === 'manager' }"
          hover-class="tap-scale"
          @tap="switchRole('manager')"
        >
          <text>店长审批</text>
        </view>
        <view
          class="switch-tab"
          :class="{ active: role === 'admin' }"
          hover-class="tap-scale"
          @tap="switchRole('admin')"
        >
          <text>超管终审</text>
        </view>
      </view>
    </view>

    <!-- 统计条 -->
    <view v-if="todos.length" class="stats-bar">
      <text class="stats-num font-num">{{ todos.length }}</text>
      <text class="stats-label">条待处理</text>
    </view>

    <!-- 待办列表 -->
    <view v-if="todos.length" class="todo-list">
      <view v-for="item in todos" :key="item.todoId" class="todo-card">
        <view class="tc-header">
          <view class="tc-left">
            <text class="tc-amount font-num">¥{{ item.consumeAmount }}</text>
            <text class="tc-sub">消费金额</text>
          </view>
          <text class="tc-tier">{{ formatTier(item.matchedTierCode) }}</text>
        </view>
        <view class="tc-divider" />
        <view class="tc-detail">
          <view class="td-row">
            <text class="td-label">客户 UID</text>
            <text class="td-value">{{ item.customerUid }}</text>
          </view>
          <view class="td-row">
            <text class="td-label">权益预览</text>
            <text class="td-value">现金券 ¥{{ item.matchedVoucher }} · 积分 {{ item.matchedIntegral }}</text>
          </view>
        </view>
        <view class="tc-actions">
          <button class="btn-reject" hover-class="tap-scale" @tap="handleReject(item)">驳回</button>
          <button class="btn-approve" hover-class="tap-scale" @tap="handleReview(item, 'approve')">通过</button>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <view class="empty-icon-ring" />
      <text class="empty-title">暂无待审批</text>
      <text class="empty-desc">所有申请已处理完毕</text>
    </view>
    <view v-if="loading" class="loading-state">
      <text>加载中…</text>
    </view>
  </view>
</template>

<script>
import { getApprovalTodos, managerReview, adminReview } from '@/api/approval.js'

export default {
  data() {
    return { todos: [], role: 'manager', loading: true }
  },
  onShow() {
    this.load()
  },
  methods: {
    switchRole(role) {
      this.role = role
      this.load()
    },
    formatTier(code) {
      if (code === 'SW199') return '锦程199会员'
      if (code === 'SW299') return '锦程299会员'
      return code || '—'
    },
    async load() {
      this.loading = true
      try {
        const data = await getApprovalTodos(this.role)
        this.todos = Array.isArray(data) ? data : []
      } catch { this.todos = [] }
      finally { this.loading = false }
    },
    async handleReview(item, action, reason = '') {
      try {
        const fn = this.role === 'manager' ? managerReview : adminReview
        await fn(item.requestId, action, reason)
        uni.showToast({ title: action === 'approve' ? '已通过' : '已驳回', icon: 'success' })
        this.load()
      } catch (e) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      }
    },
    handleReject(item) {
      uni.showModal({
        title: '驳回原因',
        editable: true,
        placeholderText: '输入驳回原因(可选)',
        confirmText: '驳回',
        confirmColor: '#C9A227',
        success: (res) => {
          if (res.confirm) {
            this.handleReview(item, 'reject', (res.content || '').trim())
          }
        },
      })
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.center-page {
  min-height: 100vh;
  padding: $sw-page-pad;
  padding-bottom: 48rpx;
  background: $sw-bg;
}

.role-switch { margin-bottom: $sw-gap; }

.switch-track {
  display: flex;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 8rpx;
  box-shadow: $sw-shadow-card;
}

.switch-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22rpx 16rpx;
  font-size: 28rpx;
  color: $sw-text-secondary;
  border-radius: $sw-radius;
  transition: all 0.2s;
}

.switch-tab.active {
  background: $sw-bg-dark;
  color: $sw-gold-light;
  font-weight: 700;
  box-shadow: $sw-shadow-gold;
}

.stats-bar {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-bottom: 16rpx;
  padding: 0 8rpx;
}

.stats-num {
  font-size: 40rpx;
  font-weight: 800;
  color: $sw-gold;
}

.stats-label {
  font-size: 26rpx;
  color: $sw-text-secondary;
}

.font-num {
  font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif;
}

.todo-card {
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: $sw-shadow-card;
}

.tc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.tc-amount {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
  color: $sw-text;
  line-height: 1.1;
}

.tc-sub {
  display: block;
  font-size: 22rpx;
  color: $sw-text-muted;
  margin-top: 4rpx;
}

.tc-tier {
  font-size: 24rpx;
  color: $sw-gold-dark;
  font-weight: 700;
  background: $sw-integral-soft;
  border: 1rpx solid rgba($sw-gold, 0.2);
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
}

.tc-divider {
  height: 1rpx;
  background: $sw-border;
  margin: 20rpx 0;
}

.td-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6rpx 0;
}

.td-label {
  font-size: 24rpx;
  color: $sw-text-muted;
}

.td-value {
  font-size: 24rpx;
  color: $sw-text-secondary;
  font-weight: 500;
  text-align: right;
  max-width: 60%;
}

.tc-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.btn-approve, .btn-reject {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.btn-approve {
  background: $sw-bg-dark;
  color: $sw-gold-light;
  box-shadow: $sw-shadow-gold;
}

.btn-reject {
  background: $sw-bg;
  color: $sw-text-secondary;
  border: 2rpx solid $sw-border;
}

.btn-approve::after, .btn-reject::after { border: none; }

.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx;
  background: $sw-bg-card;
  border-radius: $sw-radius-xl;
  box-shadow: $sw-shadow-card;
}

.empty-icon-ring {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba($sw-gold, 0.2);
  margin-bottom: 24rpx;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    inset: 20rpx;
    border-radius: 50%;
    background: $sw-integral-soft;
  }
}

.empty-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $sw-text;
}

.empty-desc {
  font-size: 26rpx;
  color: $sw-text-muted;
  margin-top: 8rpx;
}

.loading-state {
  color: $sw-text-muted;
  font-size: 28rpx;
}

.tap-scale {
  transform: $sw-tap-scale;
  opacity: 0.92;
}
</style>
