// 锦程脱钩：积分商城入口统一收口到锦程积分商城（pages/jingcheng/integral/mall）
// CRMEB 原生积分商城详情依赖老 PHP 后端结构，对 fzlsaas 上传的礼品会报错，故此处直接重定向。
var TARGET = '/pages/jingcheng/integral/mall'

Page({
  onLoad: function () {
    wx.redirectTo({
      url: TARGET,
      fail: function () {
        wx.reLaunch({ url: TARGET })
      }
    })
  }
})
