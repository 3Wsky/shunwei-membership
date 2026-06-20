<template>
    <view class="detail" v-if="product">
        <image class="banner" :src="product.image || product.cover || ''" mode="aspectFill"></image>
        <view class="info">
            <view class="name">{{ product.store_name || product.name }}</view>
            <view class="price">¥{{ product.price || '—' }}</view>
            <view class="desc" v-if="product.info || product.description">
                {{ product.info || product.description }}
            </view>
        </view>
        <view class="tip">该商品为门店展示，欢迎到店咨询选购</view>
    </view>
    <view v-else class="empty">{{ loading ? '加载中…' : '商品不存在' }}</view>
</template>

<script>
import { getProductDetail } from '@/api/products.js'

export default {
    data() {
        return { product: null, loading: true }
    },
    onLoad(query) {
        this.id = query.id
        this.load()
    },
    methods: {
        async load() {
            this.loading = true
            try {
                const res = await getProductDetail(this.id)
                // swRequest 已解包 body.data
                this.product = res || null
            } catch (e) {
                uni.showToast({ title: '加载失败', icon: 'none' })
            } finally {
                this.loading = false
            }
        }
    }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.detail {
    min-height: 100vh;
    padding-bottom: 40rpx;
}
.banner {
    width: 100%;
    height: 600rpx;
    background: #F0EDE8;
    display: block;
}
.info {
    background: $sw-bg-card;
    padding: 32rpx 28rpx;
    margin: -32rpx 28rpx 0;
    border-radius: $sw-radius-xl $sw-radius-xl 0 0;
    position: relative;
    box-shadow: $sw-shadow-lg;
}
.name {
    font-size: 36rpx;
    font-weight: 800;
    color: $sw-text;
    line-height: 1.4;
}
.price {
    margin-top: 16rpx;
    font-size: 48rpx;
    font-weight: 800;
    color: $sw-gold;
}
.desc {
    margin-top: 28rpx;
    font-size: 26rpx;
    color: $sw-text-secondary;
    line-height: 1.7;
    padding-top: 24rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.06);
}
.tip {
    text-align: center;
    color: $sw-text-secondary;
    font-size: 24rpx;
    padding: 48rpx 28rpx;
    margin: 24rpx 28rpx 0;
    background: $sw-bg-card;
    border-radius: $sw-radius-lg;
    box-shadow: $sw-shadow-card;
    border: 1rpx solid rgba(201, 162, 39, 0.12);
}
.empty {
    text-align: center;
    color: $sw-text-muted;
    padding: 160rpx 0;
    font-size: 28rpx;
}
</style>
