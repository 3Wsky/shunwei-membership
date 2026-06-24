<template>
    <view class="plist">
        <view class="grid">
            <view
                class="card"
                v-for="(item, idx) in list"
                :key="item.id"
                :style="{ animationDelay: idx * 0.05 + 's' }"
                hover-class="card-lift"
                @click="goDetail(item.id)"
            >
                <view class="img-wrap">
                    <image
                        v-if="productCover(item)"
                        class="img"
                        :src="productCover(item)"
                        mode="aspectFill"
                    />
                    <view v-else class="img-placeholder">
                        <text>{{ productTitle(item).slice(0, 2) }}</text>
                    </view>
                    <view class="member-tag">会员专属</view>
                </view>
                <view class="name">{{ productTitle(item) }}</view>
                <view class="price font-num">
                    <text>{{ productPriceLabel(item) }}</text>
                </view>
            </view>
        </view>

        <view v-if="!loading && list.length === 0" class="empty-state">
            <view class="empty-icon-ring" />
            <text class="empty-text">暂无在售商品</text>
            <text class="empty-hint">去兑换第一件商品吧</text>
            <button class="empty-btn" hover-class="tap-scale" @tap="goMall">去积分商城</button>
        </view>

        <view v-if="loading" class="loading-hint">加载中…</view>
    </view>
</template>

<script>
import { getProductList } from '@/api/products.js'
import { productTitle, productCover, productPriceLabel } from '@/utils/productDisplay.js'

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
        goMall() {
            uni.navigateTo({ url: '/pages/integral/mall' })
        },
        productTitle,
        productCover,
        productPriceLabel,
    }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.plist {
    min-height: 100vh;
    padding: $sw-page-pad;
    background: $sw-bg;
}

.grid {
    display: flex;
    flex-wrap: wrap;
    gap: $sw-gap;
}

.card {
    width: calc(50% - 12rpx);
    background: $sw-bg-card;
    border-radius: $sw-radius-card;
    overflow: hidden;
    box-shadow: $sw-shadow-card;
    animation: fadeSlideUp 0.4s $sw-ease both;
    transition: transform 0.2s $sw-ease, box-shadow 0.2s $sw-ease;
}

.img-wrap {
    position: relative;
    overflow: hidden;
}

.img,
.img-placeholder {
    width: 100%;
    height: 320rpx;
    display: block;
}

.img-placeholder {
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
    font-size: 20rpx;
    font-weight: 600;
    color: $sw-gold-light;
    background: rgba($sw-dark, 0.72);
    border-radius: 6rpx;
    letter-spacing: 1rpx;
}

.name {
    padding: 16rpx 16rpx 6rpx;
    font-size: 26rpx;
    font-weight: 500;
    color: $sw-text;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.price {
    padding: 0 16rpx 16rpx;
    font-size: 32rpx;
    font-weight: 700;
    color: $sw-gold;
}

.font-num {
    font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif;
}

.loading-hint {
    text-align: center;
    color: $sw-text-muted;
    padding: 80rpx 0;
    font-size: 28rpx;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80rpx 0 40rpx;
    background: $sw-bg-card;
    border-radius: $sw-radius-card;
    margin-top: 40rpx;
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

.empty-text {
    font-size: 28rpx;
    color: $sw-text;
    font-weight: 600;
    margin-bottom: 8rpx;
}

.empty-hint {
    font-size: 24rpx;
    color: $sw-text-muted;
    margin-bottom: 32rpx;
}

.empty-btn {
    display: inline-block;
    padding: 0 48rpx;
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

.card-lift {
    transform: translateY(-4rpx) scale(0.98);
    box-shadow: $sw-shadow;
}

.tap-scale {
    transform: $sw-tap-scale;
    opacity: 0.92;
}

@keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(20rpx); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
