<template>
    <view class="login-page">
        <view class="login-bg">
            <view class="login-orb login-orb-1" />
            <view class="login-orb login-orb-2" />
        </view>
        <view class="login-content">
            <view class="logo-wrap">
                <text class="logo-icon">顺</text>
            </view>
            <view class="logo">顺为优选</view>
            <view class="tip">登录后查看会员权益、积分与专属服务</view>
            <button class="login-btn" :loading="loading" @click="onLogin">
                <text class="btn-icon">💬</text>
                微信一键登录
            </button>
            <view class="agree">登录即代表同意《用户协议》和《隐私政策》</view>
        </view>
    </view>
</template>

<script>
import { useUserStore } from '@/store/user'

export default {
    data() {
        return { loading: false }
    },
    methods: {
        async onLogin() {
            this.loading = true
            try {
                const userStore = useUserStore()
                const ok = await userStore.login()
                if (!ok) return
                uni.showToast({ title: '登录成功', icon: 'success' })
                setTimeout(() => {
                    const pages = getCurrentPages()
                    if (pages.length > 1) uni.navigateBack()
                    else uni.switchTab({ url: '/pages/index/index' })
                }, 600)
            } finally {
                this.loading = false
            }
        }
    }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.login-page {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
}

.login-bg {
    position: absolute;
    inset: 0;
    background: $sw-bg-dark-deep;
}

.login-orb {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
}

.login-orb-1 {
    width: 400rpx;
    height: 400rpx;
    top: -100rpx;
    right: -80rpx;
}

.login-orb-2 {
    width: 240rpx;
    height: 240rpx;
    bottom: 120rpx;
    left: -60rpx;
    background: rgba(255, 255, 255, 0.08);
}

.login-content {
    position: relative;
    z-index: 1;
    padding: 160rpx 60rpx 80rpx;
    text-align: center;
}

.logo-wrap {
    width: 120rpx;
    height: 120rpx;
    margin: 0 auto 24rpx;
    background: linear-gradient(135deg, $sw-gold 0%, $sw-gold-light 100%);
    border-radius: 32rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $sw-shadow-gold;
}

.logo-icon {
    font-size: 56rpx;
    font-weight: 800;
    color: $sw-dark;
}

.logo {
    font-size: 52rpx;
    font-weight: 800;
    color: #fff;
    letter-spacing: 6rpx;
}

.tip {
    margin-top: 20rpx;
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.6;
}

.login-btn {
    margin-top: 100rpx;
    background: linear-gradient(135deg, $sw-gold 0%, $sw-gold-light 100%);
    color: $sw-dark;
    border-radius: 48rpx;
    font-size: 32rpx;
    font-weight: 700;
    height: 96rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    box-shadow: $sw-shadow-gold;
    border: none;
}
.login-btn::after { border: none; }

.btn-icon { font-size: 36rpx; }

.agree {
    margin-top: 48rpx;
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.6);
}
</style>
