// 锦程脱钩：积分商品详情统一收口到锦程积分商城
// 原 CRMEB 详情依赖老 PHP 后端的完整商品结构(描述/轮播图/SKU)，对 fzlsaas 上传礼品会报错。
// 优先用 id 直达锦程积分商品详情；无 id 时回落到积分商城列表。短暂展示入场过渡动画。
var MALL = '/pages/jingcheng/integral/mall'

Page({
  onLoad: function (options) {
    var id = options && options.id ? String(options.id) : ''
    var target = id ? '/pages/jingcheng/integral/detail?id=' + id : MALL
    setTimeout(function () {
      wx.redirectTo({
        url: target,
        fail: function () {
          wx.redirectTo({
            url: MALL,
            fail: function () {
              wx.reLaunch({ url: MALL })
            }
          })
        }
      })
    }, 450)
  }
})
