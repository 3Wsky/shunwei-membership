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
      var realRatio = (d && Number(d.issuedRatio)) || 0;
      var realPercent = Math.round(realRatio * 100);

      // 计算基于 2026 年 6月-7月底 的时间紧迫感比例 (Fictional Urgency Baseline)
      // 用户预期在 7 月底发放完毕，希望 6 月 29 日（今天）展现为约 34%，并向 7 月底平滑推进。
      var now = new Date().getTime();
      var startDate = new Date(2026, 5, 1).getTime(); // 6月1日
      var anchorDate = new Date(2026, 5, 29, 12, 0, 0).getTime(); // 6月29日
      var endDate = new Date(2026, 6, 31, 23, 59, 59).getTime(); // 7月31日

      var fictionalPercent = 34;
      if (now <= startDate) {
        fictionalPercent = 10;
      } else if (now >= endDate) {
        fictionalPercent = 96;
      } else if (now < anchorDate) {
        // 6月1日 -> 6月29日：从 10% 平滑爬升至 34%
        var ratio = (now - startDate) / (anchorDate - startDate);
        fictionalPercent = Math.round(10 + ratio * 24);
      } else {
        // 6月29日 -> 7月31日：从 34% 平滑爬升至 96% (约每天爬升 1.9%)
        var ratio = (now - anchorDate) / (endDate - anchorDate);
        fictionalPercent = Math.round(34 + ratio * 62);
      }

      // 取真实和虚构中的较大值，确保紧迫感的同时若真实数据更高也支持展示
      var finalPercent = Math.max(realPercent, fictionalPercent);
      if (finalPercent < 0) finalPercent = 0;
      if (finalPercent > 100) finalPercent = 100;

      // 进度条至少留一点可见
      var issuedShow = finalPercent;
      if (issuedShow > 0 && issuedShow < 4) issuedShow = 4;

      // 根据最终百分比动态匹配状态等级，营造出渐进式的视觉紧迫感：
      // >= 90% (所剩不多 - 红色), >= 75% (额度偏紧 - 橙色), >= 50% (发放过半 - 金色)
      var level = 'sufficient';
      if (issuedShow >= 90) {
        level = 'low';
      } else if (issuedShow >= 75) {
        level = 'tight';
      } else if (issuedShow >= 50) {
        level = 'half';
      }

      that.setData({
        poolReady: true,
        issuedPercent: issuedShow,
        remainPercent: 100 - issuedShow,
        poolLevel: level,
        poolLevelText: LEVEL_TEXT[level] || ''
      })
    }).catch(function () {
      // 接口失败也展示基于时间的紧迫感进度条，保证完美的兜底营销效果！
      var now = new Date().getTime();
      var startDate = new Date(2026, 5, 1).getTime();
      var anchorDate = new Date(2026, 5, 29, 12, 0, 0).getTime();
      var endDate = new Date(2026, 6, 31, 23, 59, 59).getTime();

      var finalPercent = 34;
      if (now <= startDate) {
        finalPercent = 10;
      } else if (now >= endDate) {
        finalPercent = 96;
      } else if (now < anchorDate) {
        var ratio = (now - startDate) / (anchorDate - startDate);
        finalPercent = Math.round(10 + ratio * 24);
      } else {
        var ratio = (now - anchorDate) / (endDate - anchorDate);
        finalPercent = Math.round(34 + ratio * 62);
      }

      if (finalPercent < 0) finalPercent = 0;
      if (finalPercent > 100) finalPercent = 100;
      var level = finalPercent >= 90 ? 'low' : (finalPercent >= 75 ? 'tight' : (finalPercent >= 50 ? 'half' : 'sufficient'));
      that.setData({
        poolReady: true,
        issuedPercent: finalPercent,
        remainPercent: 100 - finalPercent,
        poolLevel: level,
        poolLevelText: LEVEL_TEXT[level] || ''
      })
    })
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
