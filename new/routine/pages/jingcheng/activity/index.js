// 活动说明 + 免责条款 页面
// 文案内容集中在下方 SECTIONS，修改文字只需改这里（每段一个字符串）。
// 待用户提供「米东区联盟消费券购机赠送活动说明（最终审核版）」正式文案后替换占位内容即可，无需改其它文件。

var SECTIONS = [
  {
    title: '活动说明',
    items: [
      '（此处为活动说明占位文案，请替换为正式内容）',
      '本活动最终解释权归主办方所有。'
    ]
  },
  {
    title: '免责条款',
    items: [
      '（此处为免责条款占位文案，请替换为正式内容）'
    ]
  }
]

Page({
  data: {
    activityName: '米东区联盟消费券购机赠送活动',
    updatedAt: '',
    sections: SECTIONS
  },

  onLoad: function () {
    /* 内容为静态文案，直接渲染 SECTIONS */
  }
})
