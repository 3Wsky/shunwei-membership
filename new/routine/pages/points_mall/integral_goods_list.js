// 锦程脱钩：积分商城列表统一收口到锦程积分商城
// 短暂展示轻奢金入场过渡动画后再跳转，避免白屏闪烁的生硬观感。
var TARGET = '/pages/jingcheng/integral/mall'

Page({
  onLoad: function () {
    setTimeout(function () {
      wx.redirectTo({
        url: TARGET,
        fail: function () {
          wx.reLaunch({ url: TARGET })
        }
      })
    }, 450)
  }
})
