<template>
  <view class="card-page" v-if="card">
    <view class="hero">
      <image class="avatar" :src="card.avatar || '/static/logo.png'" mode="aspectFill" />
      <view class="name">{{ card.displayName }}</view>
      <view class="title" v-if="card.jobTitle">{{ card.jobTitle }}</view>
      <view class="bio" v-if="card.bio">{{ card.bio }}</view>
    </view>

    <view class="store-panel" v-if="card.storeName || card.storeAddress">
      <view class="store-name">{{ card.storeName || '门店' }}</view>
      <view class="store-addr" @click="openMap">{{ card.storeAddress || '暂无地址' }}</view>
      <view class="hours" v-if="card.businessHours">营业时间：{{ card.businessHours }}</view>
    </view>

    <view class="actions">
      <button class="btn primary" @click="callStaff">联系店员</button>
      <button class="btn" open-type="share">分享名片</button>
    </view>
  </view>
  <view v-else class="empty">加载中...</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getStaffCard, bindStaffSpread } from '@/api/staff.js'
import { getToken } from '@/utils/auth'

const card = ref(null)
let staffUid = 0

onLoad(async (query) => {
  staffUid = Number(query.staffUid || query.uid || 0)
  if (!staffUid) {
    uni.showToast({ title: '缺少店员参数', icon: 'none' })
    return
  }
  try {
    card.value = await getStaffCard(staffUid)
    if (getToken()) {
      await bindStaffSpread(staffUid).catch(() => {})
    }
  } catch (e) {
    uni.showToast({ title: e.message || '名片加载失败', icon: 'none' })
  }
})

function callStaff() {
  const phone = card.value?.storePhone || card.value?.contactPhone
  if (!phone) return uni.showToast({ title: '暂无联系电话', icon: 'none' })
  uni.makePhoneCall({ phoneNumber: String(phone).replace(/\*/g, '') })
}

function openMap() {
  const lat = Number(card.value?.latitude || 0)
  const lng = Number(card.value?.longitude || 0)
  if (!lat || !lng) return uni.showToast({ title: '暂无地图坐标', icon: 'none' })
  uni.openLocation({ latitude: lat, longitude: lng, name: card.value.storeName, address: card.value.storeAddress })
}
</script>

<style scoped>
.card-page { padding: 32rpx; background: #f5f3f0; min-height: 100vh; }
.hero { background: #fff; border-radius: 24rpx; padding: 40rpx; text-align: center; margin-bottom: 24rpx; }
.avatar { width: 160rpx; height: 160rpx; border-radius: 50%; margin-bottom: 20rpx; }
.name { font-size: 40rpx; font-weight: 700; color: #1a1a2e; }
.title { color: #e8436e; margin-top: 8rpx; }
.bio { color: #666; margin-top: 16rpx; font-size: 28rpx; }
.store-panel { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; }
.store-name { font-weight: 600; font-size: 32rpx; }
.store-addr { color: #666; margin-top: 12rpx; }
.hours { color: #999; margin-top: 12rpx; font-size: 26rpx; }
.actions { display: flex; gap: 20rpx; }
.btn { flex: 1; }
.primary { background: #e8436e; color: #fff; }
.empty { text-align: center; padding: 80rpx; color: #999; }
</style>
