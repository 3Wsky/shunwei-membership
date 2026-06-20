<template>
  <view class="plist">
    <view v-if="list.length" class="grid">
      <view
        class="card btn-tap"
        v-for="(item, idx) in list"
        :key="item.id"
        :style="{ animationDelay: idx * 0.05 + 's' }"
        @click="goDetail(item.id)"
      >
        <view class="img-wrap">
          <image
            v-if="item.image || item.cover"
            class="img"
            :src="item.image || item.cover"
            mode="aspectFill"
          ></image>
          <view v-else class="img-placeholder">
            <text>{{ (item.store_name || item.name || '').slice(0, 2) }}</text>
          </view>
          <view class="member-tag">会员专属</view>
        </view>
        <view class="info">
          <text class="name">{{ item.store_name || item.name }}</text>
          <view class="price-row">
            <text class="price">¥{{ item.price || '—' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else-if="!loading" class="empty-state">
      <text class="empty-icon">◇</text>
      <text class="empty-text">暂无在售商品</text>
      <text class="empty-hint">精彩好物即将上架，敬请期待</text>
    </view>

    <view v-if="loading && !list.length" class="loading-tip">加载中…</view>
    <view v-if="loading && list.length" class="loading-tip">加载更多…</view>
  </view>
</template>

<script>
import { getProductList } from '@/api/products.js'

export default {
  data() {
    return { list: [], loading: true, page: 1, noMore: false }
  },
  onLoad() {
    this.load()
  },
  onReachBottom() {
    if (!this.noMore && !this.loading) this.load()
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const res = await getProductList({ page: this.page, limit: 20 })
        const data = (res && (res.list || (Array.isArray(res) ? res : []))) || []
        if (data.length === 0) this.noMore = true
        this.list = this.page === 1 ? data : this.list.concat(data)
        this.page++
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goDetail(id) {
      uni.navigateTo({ url: '/pages/products/detail?id=' + id })
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.plist {
  min-height: 100vh;
  padding: 28rpx;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.card {
  width: calc(50% - 10rpx);
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  overflow: hidden;
  box-shadow: $sw-shadow-card;
  animation: fadeSlideUp 0.4s $sw-ease both;
}

.img-wrap {
  position: relative;
  overflow: hidden;
}

.img {
  width: 100%;
  height: 340rpx;
  display: block;
}

.img-placeholder {
  width: 100%;
  height: 340rpx;
  background: linear-gradient(135deg, #e8e6e1, #f5f3f0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: 700;
  color: rgba(26, 31, 54, 0.15);
}

.member-tag {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: $sw-gold-dark;
  background: rgba(255, 255, 255, 0.92);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  letter-spacing: 1rpx;
}

.info {
  padding: 18rpx 20rpx 20rpx;
}

.name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: $sw-text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-row {
  margin-top: 10rpx;
}

.price {
  font-size: 34rpx;
  font-weight: 800;
  color: $sw-gold;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  box-shadow: $sw-shadow-card;
  margin-top: 40rpx;
}

.empty-icon {
  font-size: 64rpx;
  color: $sw-gold;
  opacity: 0.45;
}

.empty-text {
  font-size: 28rpx;
  color: $sw-text-secondary;
  font-weight: 500;
  margin-top: 16rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: $sw-text-muted;
  margin-top: 8rpx;
}

.loading-tip {
  text-align: center;
  color: $sw-text-muted;
  padding: 40rpx 0;
  font-size: 26rpx;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
