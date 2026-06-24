<template>
  <view class="cate-page">
    <scroll-view scroll-x class="cate-scroll" show-scrollbar="false">
      <view
        v-for="(cat, idx) in categories"
        :key="cat.id"
        class="cate-chip"
        :class="{ active: curCate === idx }"
        hover-class="chip-tap"
        @tap="switchCate(idx)"
      >
        <text>{{ cat.name }}</text>
      </view>
    </scroll-view>

    <view class="grid">
      <view
        v-for="item in list"
        :key="item.id"
        class="card"
        hover-class="card-lift"
        @tap="goDetail(item.id)"
      >
        <view class="img-wrap">
          <image
            v-if="item.image || item.cover"
            class="img"
            :src="item.image || item.cover"
            mode="aspectFill"
          />
          <view v-else class="img-placeholder">
            <text>{{ (item.store_name || item.name || '').slice(0, 2) }}</text>
          </view>
          <view class="member-tag">会员专属</view>
        </view>
        <view class="name">{{ item.store_name || item.name }}</view>
        <view class="price font-num">¥{{ item.price || '—' }}</view>
      </view>
    </view>

    <view v-if="!loading && list.length === 0" class="empty">
      <view class="empty-ring" />
      <text class="empty-text">暂无商品</text>
      <text class="empty-hint">去兑换第一件商品吧</text>
      <button class="empty-btn" hover-class="btn-tap" @tap="goHome">回首页看看</button>
    </view>
    <view v-if="loading" class="empty">
      <text class="empty-text">加载中…</text>
    </view>
  </view>
</template>

<script>
import { getProductList } from '@/api/products.js'

export default {
  data() {
    return {
      categories: [{ id: 0, name: '全部' }],
      curCate: 0,
      list: [],
      loading: true,
      page: 1,
      noMore: false,
    }
  },
  onLoad() {
    this.load()
  },
  onReachBottom() {
    if (!this.noMore && !this.loading) this.load()
  },
  methods: {
    switchCate(idx) {
      this.curCate = idx
      this.page = 1
      this.noMore = false
      this.load()
    },
    async load() {
      this.loading = true
      try {
        const res = await getProductList({ page: this.page, limit: 20 })
        const data = (res && (res.list || (Array.isArray(res) ? res : []))) || []
        if (data.length === 0) this.noMore = true
        this.list = this.page === 1 ? data : this.list.concat(data)
        this.page++
      } catch {
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goDetail(id) {
      uni.navigateTo({ url: '/pages/products/detail?id=' + id })
    },
    goHome() {
      uni.switchTab({ url: '/pages/index/index' })
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.cate-page {
  min-height: 100vh;
  background: $sw-bg;
  padding-bottom: 40rpx;
}
.cate-scroll {
  white-space: nowrap;
  background: $sw-bg-card;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: $sw-shadow-sm;
  position: sticky;
  top: 0;
  z-index: 10;
}
.cate-chip {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: $sw-text-secondary;
  background: $sw-bg;
  transition: all 0.2s $sw-ease;
  &.active {
    background: $sw-integral-soft;
    color: $sw-gold-dark;
    font-weight: 600;
    box-shadow: inset 0 0 0 1rpx rgba($sw-gold, 0.35);
  }
}
.chip-tap { opacity: 0.85; transform: scale(0.97); }

.grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 $sw-page-pad;
  gap: $sw-gap;
}
.card {
  width: calc(50% - 12rpx);
  background: $sw-bg-card;
  border-radius: $sw-radius-card;
  overflow: hidden;
  box-shadow: $sw-shadow-card;
  transition: transform 0.2s $sw-ease, box-shadow 0.2s $sw-ease;
}
.card-lift {
  transform: translateY(-4rpx) scale(0.98);
  box-shadow: $sw-shadow;
}
.img-wrap {
  position: relative;
  width: 100%;
  height: 340rpx;
  background: $sw-bg;
}
.img {
  width: 100%;
  height: 100%;
}
.img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  font-weight: 600;
  color: rgba($sw-gold, 0.35);
  background: linear-gradient(135deg, #f8f6f2 0%, #ede8df 100%);
}
.member-tag {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  background: rgba($sw-dark, 0.72);
  font-size: 20rpx;
  color: $sw-gold-light;
}
.name {
  padding: 16rpx 16rpx 8rpx;
  font-size: 26rpx;
  color: $sw-text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.price {
  padding: 0 16rpx 20rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: $sw-gold;
}
.font-num {
  font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
}
.empty-ring {
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
.empty-text {
  font-size: 28rpx;
  color: $sw-text;
  font-weight: 600;
}
.empty-hint {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $sw-text-secondary;
  margin-bottom: 32rpx;
}
.empty-btn {
  width: 280rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 36rpx;
  background: $sw-bg-dark;
  color: $sw-gold-light;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  box-shadow: $sw-shadow-gold;
  &::after { border: none; }
}
.btn-tap { transform: $sw-tap-scale; opacity: 0.92; }
</style>
