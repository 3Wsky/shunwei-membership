// 锦程脱钩：积分商城列表统一收口到锦程积分商城
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
