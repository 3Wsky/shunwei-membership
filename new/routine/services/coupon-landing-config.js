module.exports = {
  pageTitle: '米东区联盟现金券',
  pageInfo: {
    brand: '米东区联盟',
    badge: '到店购机 · 赠券到店花',
    titleTop: '到店购机',
    couponMax: 800,
    titleSuffix: '元联盟现金券',
    subtitle: '联盟商家通用 · 无门槛抵扣',
    validityText: '积分长期有效，可累计使用'
  },
  rules: [
    { range: '1000–3000元', min: 1000, max: 3000, member: '199会员', points: 199000, coupon: 100 },
    { range: '3000–6000元', min: 3000, max: 6000, member: '199会员', points: 199000, coupon: 300 },
    { range: '6000–10000元', min: 6000, max: 10000, member: '299会员', points: 299000, coupon: 500 },
    { range: '10000元以上', min: 10000, max: null, member: '299会员', points: 299000, coupon: 800 }
  ],
  categories: [
    { key: 'phone', name: '手机', subtitle: '热门旗舰与畅销机型' },
    { key: 'tablet', name: '平板', subtitle: '学习办公与影音娱乐' },
    { key: 'laptop', name: '电脑', subtitle: '轻薄办公与高性能本' },
    { key: 'wearable', name: '智能穿戴', subtitle: '手表、耳机与智能配件' },
    { key: 'dji', name: '大疆', subtitle: '影像设备与航拍好物' }
  ],
  processSteps: [
    { icon: 'icon_step_buy.svg', number: '01', title: '选购产品', desc: '手机 / 平板 / 穿戴 / 电脑 / 大疆' },
    { icon: 'icon_step_check.svg', number: '02', title: '核对资格', desc: '按真实成交价匹配活动档位' },
    { icon: 'icon_step_coupon.svg', number: '03', title: '发放权益', desc: '现金券与会员积分同步到账' },
    { icon: 'icon_step_store.svg', number: '04', title: '联盟核销', desc: '到联盟商家消费直接抵扣' }
  ],
  redeemSteps: [
    { icon: 'icon_step_coupon.svg', title: '领券成功', desc: '获得联盟现金券' },
    { icon: 'icon_step_store.svg', title: '到店消费', desc: '选择联盟商家' },
    { icon: 'icon_step_check.svg', title: '直接抵扣', desc: '无门槛核销使用' }
  ],
  liveFeed: [
    { id: 'feed-1', userMasked: '张**', content: '兑换了蓝牙耳机', timeText: '1分钟前' },
    { id: 'feed-2', userMasked: '王**', content: '购买手机领取了300元现金券', timeText: '2分钟前' },
    { id: 'feed-3', userMasked: '李**', content: '到店购机获得199000积分', timeText: '3分钟前' },
    { id: 'feed-4', userMasked: '赵**', content: '兑换了移动电源', timeText: '4分钟前' }
  ],
  todayStats: { exchanged: 128, claimed: 56 },
  faq: [
    { title: '现金券如何发放？', content: '完成到店购机并核对资格后，由客户经理按真实成交金额对应档位发放。' },
    { title: '现金券在哪里使用？', content: '现金券仅限已接入系统的米东区联盟商家核销使用，实际商家以本页实时列表为准。' },
    { title: '积分会过期吗？', content: '本活动发放的会员积分长期有效，可累计并在积分商城兑换好礼。' },
    { title: '活动金额如何计算？', content: '权益以真实成交价和活动审核结果为准，退货或撤销交易时对应权益将按规则处理。' }
  ]
}
