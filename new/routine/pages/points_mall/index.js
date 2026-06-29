// 锦程脱钩：积分商城入口统一收口到锦程积分商城（pages/jingcheng/integral/mall）
// CRMEB 原生积分商城详情依赖老 PHP 后端结构，对 fzlsaas 上传的礼品会报错，故此处直接重定向。
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
