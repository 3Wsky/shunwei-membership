// 消费券活动说明页
// 内容由后台「内容管理」配置，小程序公开读取 /api/miniapp/content。
// 拉取失败时使用下方本地兜底文案（与后端默认值一致的精简版）。
var { publicRequest } = require('../../../services/jc-request')

var FALLBACK = {
  activityName: '米东区联盟消费券购机赠送活动',
  subTitle: '活动说明',
  notice: '本活动为米东区促消费活动组成部分，消费券数量有限，发完即止；点击领取为权益登记入口，最终以活动规则及门店核实结果为准。',
  sections: [
    {
      title: '活动说明',
      items: [
        '本活动面向到店购买手机、数码产品、智能穿戴产品的消费者，按单笔订单线下实际支付金额对应档位，赠送积分权益及米东区联盟消费券。',
        '权益由活动执行门店根据用户实际消费、订单信息及活动规则核实后发放，具体以小程序页面及门店公示为准。'
      ]
    },
    {
      title: '温馨提示',
      items: [
        '消费券需在指定联盟商家、指定有效期内按规则核销使用，不可提现、不可转让、不可兑换现金。',
        '如发生退货、退款、换货或订单异常，赠送权益需按活动规则同步处理。',
        '完整规则、适用商品、可用商家、有效期及核销方式，以小程序页面、券面说明及门店实际公示为准。'
      ]
    }
  ]
}

var LEVEL_TEXT = {
  sufficient: '消费券额度充足',
  half: '消费券发放过半',
  tight: '消费券额度偏紧',
  low: '消费券所剩不多'
}

Page({
  data: {
    activityName: FALLBACK.activityName,
    subTitle: FALLBACK.subTitle,
    notice: FALLBACK.notice,
    updatedAt: '',
    sections: FALLBACK.sections,
    loading: true,
    // 现金池进度（只显示图形，不显示具体金额）
    poolReady: false,
    issuedPercent: 0,
    remainPercent: 0,
    poolLevel: 'sufficient',
    poolLevelText: ''
  },

  onLoad: function () {
    this.loadContent()
    this.loadPoolStatus()
  },

  loadPoolStatus: function () {
    var that = this
    publicRequest('/api/miniapp/pool-status').then(function (d) {
      if (!d) return
      var issued = Math.round((Number(d.issuedRatio) || 0) * 100)
      if (issued < 0) issued = 0
      if (issued > 100) issued = 100
      // 进度条至少留一点可见，避免 0% 时空条
      var issuedShow = issued
      if (issuedShow > 0 && issuedShow < 4) issuedShow = 4
      if (issuedShow > 100) issuedShow = 100
      var level = d.level || 'sufficient'
      that.setData({
        poolReady: true,
        issuedPercent: issuedShow,
        remainPercent: 100 - issuedShow,
        poolLevel: level,
        poolLevelText: LEVEL_TEXT[level] || ''
      })
    }).catch(function () { /* 拉取失败则不显示进度块 */ })
  },

  loadContent: function () {
    var that = this
    publicRequest('/api/miniapp/content').then(function (d) {
      var rules = (d && d.activityRules) || {}
      var sections = Array.isArray(rules.sections) ? rules.sections.filter(function (s) {
        return s && (s.title || (Array.isArray(s.items) && s.items.length))
      }) : []
      that.setData({
        activityName: rules.activityName || FALLBACK.activityName,
        subTitle: rules.subTitle || FALLBACK.subTitle,
        notice: rules.notice || '',
        updatedAt: rules.updatedAt || '',
        sections: sections.length ? sections : FALLBACK.sections,
        loading: false
      })
    }).catch(function () {
      that.setData({ loading: false })
    })
  }
})
