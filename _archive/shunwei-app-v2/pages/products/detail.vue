<template>
    <view class="detail-page" v-if="product">
        <swiper
            v-if="gallery.length"
            class="banner-swiper"
            circular
            indicator-dots
            indicator-color="rgba(255,255,255,0.4)"
            indicator-active-color="#C9A962"
        >
            <swiper-item v-for="(img, idx) in gallery" :key="idx">
                <image class="banner" :src="img" mode="aspectFill" />
            </swiper-item>
        </swiper>
        <view v-else class="banner-wrap">
            <view class="banner-placeholder">
                <text>{{ title.slice(0, 2) }}</text>
            </view>
        </view>
        <view class="banner-badge">会员专属</view>

        <view class="info">
            <view v-if="product.brand || product.model" class="meta-row">
                <text v-if="product.brand" class="meta-tag">{{ product.brand }}</text>
                <text v-if="product.model" class="meta-model">{{ product.model }}</text>
            </view>
            <view class="name">{{ title }}</view>
            <view class="price-row">
                <text class="price font-num">{{ priceLabel }}</text>
                <text class="price-hint">展示价 · 到店咨询</text>
            </view>
            <view class="desc" v-if="subtitle">{{ subtitle }}</view>
        </view>

        <view v-if="paramList.length" class="section">
            <view class="section-title">参数规格</view>
            <view class="param-list">
                <view class="param-row" v-for="(p, idx) in paramList" :key="idx">
                    <text class="param-name">{{ p.name }}</text>
                    <text class="param-value">{{ p.value }}</text>
                </view>
            </view>
        </view>

        <view v-if="specEntries.length" class="section">
            <view class="section-title">配置信息</view>
            <view class="param-list">
                <view class="param-row" v-for="(entry, idx) in specEntries" :key="idx">
                    <text class="param-name">{{ entry.key }}</text>
                    <text class="param-value">{{ entry.value }}</text>
                </view>
            </view>
        </view>

        <view v-if="product.description" class="section">
            <view class="section-title">商品详情</view>
            <rich-text class="rich-desc" :nodes="product.description" />
        </view>

        <view class="action-bar">
            <button class="consult-btn" hover-class="tap-scale" open-type="contact">
                到店咨询
            </button>
            <text class="tip">展示商品 · 不支持线上下单，请到店了解</text>
        </view>
    </view>
    <view v-else class="empty-page">
        <view class="empty-icon-ring" />
        <text class="empty-text">{{ loading ? '加载中…' : '商品不存在' }}</text>
    </view>
</template>

<script>
import { getProductDetail } from '@/api/products.js'
import {
    productTitle,
    productSubtitle,
    productGallery,
    productPriceLabel,
} from '@/utils/productDisplay.js'

export default {
    data() {
        return { product: null, loading: true }
    },
    computed: {
        title() {
            return productTitle(this.product)
        },
        subtitle() {
            return productSubtitle(this.product)
        },
        gallery() {
            return productGallery(this.product)
        },
        priceLabel() {
            return productPriceLabel(this.product)
        },
        paramList() {
            return (this.product && this.product.paramsList) || []
        },
        specEntries() {
            const specs = (this.product && this.product.specs) || {}
            return Object.keys(specs).map((key) => ({ key, value: specs[key] }))
        },
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
                this.product = res || null
            } catch (e) {
                uni.showToast({ title: '加载失败', icon: 'none' })
            } finally {
                this.loading = false
            }
        },
    },
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.detail-page {
    min-height: 100vh;
    padding-bottom: 180rpx;
    background: $sw-bg;
    position: relative;
}

.banner-swiper,
.banner-wrap {
    width: 100%;
    height: 56vh;
    max-height: 680rpx;
    background: linear-gradient(135deg, #f8f6f2 0%, #ede8df 100%);
}

.banner,
.banner-placeholder {
    width: 100%;
    height: 100%;
    display: block;
}

.banner-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80rpx;
    font-weight: 600;
    color: rgba($sw-gold, 0.3);
}

.banner-badge {
    position: absolute;
    top: 24rpx;
    left: 24rpx;
    z-index: 2;
    padding: 6rpx 16rpx;
    font-size: 22rpx;
    font-weight: 600;
    color: $sw-gold-light;
    background: rgba($sw-dark, 0.72);
    border-radius: 8rpx;
    letter-spacing: 1rpx;
}

.info {
    background: $sw-bg-card;
    padding: 36rpx $sw-page-pad;
    margin: -40rpx $sw-page-pad 0;
    border-radius: $sw-radius-xl $sw-radius-xl 0 0;
    position: relative;
    z-index: 1;
    box-shadow: $sw-shadow-lg;
}

.meta-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 12rpx;
}

.meta-tag {
    font-size: 22rpx;
    color: $sw-gold;
    background: $sw-integral-soft;
    padding: 4rpx 12rpx;
    border-radius: 6rpx;
}

.meta-model {
    font-size: 24rpx;
    color: $sw-text-muted;
}

.name {
    font-size: 36rpx;
    font-weight: 800;
    color: $sw-text;
    line-height: 1.4;
}

.price-row {
    margin-top: 20rpx;
    display: flex;
    align-items: baseline;
    gap: 12rpx;
    flex-wrap: wrap;
}

.price {
    font-size: 52rpx;
    font-weight: 800;
    color: $sw-gold;
    line-height: 1.1;
}

.price-hint {
    font-size: 24rpx;
    color: $sw-text-muted;
}

.font-num {
    font-family: 'DIN Alternate', 'Helvetica Neue', sans-serif;
}

.desc {
    margin-top: 28rpx;
    font-size: 26rpx;
    color: $sw-text-secondary;
    line-height: 1.7;
    padding-top: 24rpx;
    border-top: 1rpx solid $sw-border;
}

.section {
    margin: 24rpx $sw-page-pad 0;
    padding: 28rpx;
    background: $sw-bg-card;
    border-radius: $sw-radius-lg;
    box-shadow: $sw-shadow-sm;
}

.section-title {
    font-size: 30rpx;
    font-weight: 700;
    color: $sw-text;
    margin-bottom: 20rpx;
}

.param-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.param-row {
    display: flex;
    gap: 16rpx;
    font-size: 26rpx;
    line-height: 1.5;
}

.param-name {
    flex-shrink: 0;
    width: 160rpx;
    color: $sw-text-muted;
}

.param-value {
    flex: 1;
    color: $sw-text-secondary;
    word-break: break-all;
}

.rich-desc {
    font-size: 26rpx;
    color: $sw-text-secondary;
    line-height: 1.7;
}

.action-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 20rpx $sw-page-pad calc(20rpx + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.06);
}

.consult-btn {
    width: 100%;
    height: 96rpx;
    line-height: 96rpx;
    border-radius: 48rpx;
    background: $sw-bg-dark;
    color: $sw-gold-light;
    font-size: 32rpx;
    font-weight: 700;
    border: none;
    box-shadow: $sw-shadow-gold;
    &::after { border: none; }
}

.tip {
    display: block;
    text-align: center;
    margin-top: 12rpx;
    font-size: 22rpx;
    color: $sw-text-muted;
}

.empty-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: $sw-bg;
    padding: 80rpx;
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
    color: $sw-text-muted;
}

.tap-scale {
    transform: $sw-tap-scale;
    opacity: 0.92;
}
</style>
