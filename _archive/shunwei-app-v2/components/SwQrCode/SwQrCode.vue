<template>
  <view class="sw-qrcode">
    <canvas
      class="sw-qrcode-canvas"
      :canvas-id="cid"
      :style="{ width: cpSize + 'px', height: cpSize + 'px' }"
    />
    <image
      v-if="show && result"
      :src="result"
      :style="{ width: cpSize + 'px', height: cpSize + 'px' }"
      mode="aspectFit"
    />
  </view>
</template>

<script>
import QRCode from './qrcode.js'

let qrcode

export default {
  name: 'SwQrCode',
  props: {
    cid: { type: String, default: 'sw-qrcode-canvas' },
    size: { type: Number, default: 280 },
    show: { type: Boolean, default: true },
    text: { type: String, default: '' },
    background: { type: String, default: '#ffffff' },
    foreground: { type: String, default: '#1a1a2e' },
  },
  data() {
    return { result: '' }
  },
  computed: {
    cpSize() {
      return uni.upx2px(this.size)
    },
  },
  watch: {
    text(val) {
      if (val) this.makeCode()
    },
  },
  mounted() {
    if (this.text) this.makeCode()
  },
  methods: {
    makeCode() {
      if (!this.text) return
      const that = this
      qrcode = new QRCode({
        context: that,
        canvasId: that.cid,
        usingComponents: true,
        showLoading: false,
        text: that.text,
        size: that.cpSize,
        background: that.background,
        foreground: that.foreground,
        pdground: that.foreground,
        correctLevel: 3,
        cbResult(res) {
          that.result = res
        },
      })
    },
  },
}
</script>

<style scoped>
.sw-qrcode {
  display: flex;
  align-items: center;
  justify-content: center;
}
.sw-qrcode-canvas {
  position: fixed;
  top: -99999rpx;
  left: -99999rpx;
  z-index: -1;
}
</style>
