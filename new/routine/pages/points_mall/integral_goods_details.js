// 锦程脱钩：积分商品详情统一收口到锦程积分商城
// 原 CRMEB 详情依赖老 PHP 后端的完整商品结构(描述/轮播图/SKU)，对 fzlsaas 上传礼品会报错。
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
