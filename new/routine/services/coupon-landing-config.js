const landingConfig = {
  pageTitle: '米东区联盟消费券',
  hero: {
    title: '米东区联盟消费券',
    subtitle: '到店购买指定数码产品，最高送800元现金券 + 299000积分',
    note: '名额有限，发完截止。具体发放金额以实际购买金额和活动规则为准。',
    benefits: ['最高800元现金券', '最高299000积分', '加油/餐饮/商超可用']
  },
  rules: [
    { range: '满1000-3000元', min: 1000, max: 3000, member: '199会员', points: 199000, coupon: 100 },
    { range: '满3000-6000元', min: 3000, max: 6000, member: '199会员', points: 199000, coupon: 300 },
    { range: '满6000-10000元', min: 6000, max: 10000, member: '299会员', points: 299000, coupon: 500 },
    { range: '满10000元以上', min: 10000, max: null, member: '299会员', points: 299000, coupon: 800 }
  ],
  productTabs: [
    { name: '热门手机', keywords: ['手机', 'Mate', 'Pura', 'iPhone', '荣耀', 'vivo', 'OPPO', '小米', 'nova'] },
    { name: '热门平板', keywords: ['平板', 'Pad', 'MatePad', 'Tablet'] },
    { name: '热门笔记本', keywords: ['笔记本', '电脑', 'Book', 'MateBook'] },
    { name: '热门智能穿戴', keywords: ['手表', '手环', 'Watch', 'WATCH', 'Band', '穿戴'] },
    { name: '热门大疆产品', keywords: ['大疆', 'DJI', '无人机', 'Osmo', '云台'] }
  ],
  merchantTabs: ['全部', '加油', '餐饮', '商超', '生活服务'],
  processSteps: [
    { title: '进入小程序', desc: '查看活动商品和福利规则' },
    { title: '到店选购', desc: '选择手机、平板、电脑、穿戴或大疆产品' },
    { title: '核实发放', desc: '门店按实际消费金额发放积分和现金券' },
    { title: '联盟核销', desc: '在可核销商家使用现金券' }
  ],
  contact: {
    phone: '',
    storeName: '锦程数码',
    storeAddress: '',
    latitude: 0,
    longitude: 0
  },
  sections: {
    rules: 'activity-rules',
    products: 'hot-products',
    points: 'points-goods',
    merchants: 'verify-merchants'
  }
}

module.exports = landingConfig
