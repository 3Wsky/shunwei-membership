<template>

    <view class="plist">

        <view class="grid">

            <view class="card btn-tap anim-fade-in" v-for="(item, idx) in list" :key="item.id" :style="{ animationDelay: idx * 0.05 + 's' }" @click="goDetail(item.id)">

                <view class="img-wrap">
                    <image class="img" :src="item.image || item.cover || ''" mode="aspectFill"></image>
                    <view class="member-tag">会员专属</view>
                </view>

                <view class="name">{{ item.store_name || item.name }}</view>

                <view class="price">¥{{ item.price || '—' }}</view>

            </view>

        </view>

        <view v-if="!loading && list.length === 0" class="empty">暂无在售商品</view>

        <view v-if="loading" class="empty">加载中…</view>

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

        }

    }

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

.img {

    width: 100%;

    height: 340rpx;

    background: linear-gradient(135deg, #E8E6E1, #F5F3F0);

    display: block;

}

.name {

    padding: 18rpx 20rpx 6rpx;

    font-size: 26rpx;

    font-weight: 500;

    color: $sw-text;

    overflow: hidden;

    text-overflow: ellipsis;

    white-space: nowrap;

}

.price {

    padding: 0 20rpx 20rpx;

    font-size: 34rpx;

    font-weight: 800;

    color: $sw-gold;

}

.empty {

    text-align: center;

    color: $sw-text-muted;

    padding: 120rpx 0;

    font-size: 28rpx;

    background: $sw-bg-card;

    border-radius: $sw-radius-card;

    margin-top: 40rpx;

    box-shadow: $sw-shadow-card;

}



@keyframes fadeSlideUp {

    from { opacity: 0; transform: translateY(20rpx); }

    to { opacity: 1; transform: translateY(0); }

}

</style>


