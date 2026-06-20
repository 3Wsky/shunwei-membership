<script>
export default {
  onLaunch() {
    console.log('[ShunWei] App Launch')
  },
  onShow() {
    console.log('[ShunWei] App Show')
  },
}
</script>

<style>
page {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue',
    'Microsoft YaHei', sans-serif;
  font-size: 28rpx;
  color: #1A1A1A;
  background-color: #F5F3F0;
  -webkit-font-smoothing: antialiased;
}

/* 全局点击回弹 */
.btn-tap:active {
  transform: scale(0.97);
  transition: transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* 卡片淡入 */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(24rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.anim-fade-in {
  animation: fadeSlideUp 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* 核销码弹出 */
@keyframes scalePop {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }
  70% {
    transform: scale(1.03);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.anim-scale-pop {
  animation: scalePop 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* 核销码光晕扩散 */
@keyframes glowPulse {
  0% {
    opacity: 0.35;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.06);
  }
  100% {
    opacity: 0.35;
    transform: scale(0.9);
  }
}

.anim-glow {
  animation: glowPulse 2.4s ease-in-out infinite;
}
</style>
