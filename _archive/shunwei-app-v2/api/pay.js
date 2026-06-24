import { crmebRequest } from './request'
import { swRequest } from './request'

/**
 * 微信支付（方案甲-1：复用生产 CRMEB 已配置的支付）。
 *
 * 会员购卡：走 CRMEB「其他订单」(付费会员) 下单 → 返回微信支付参数 → uni.requestPayment。
 * 支付成功后 CRMEB 的 OtherOrderServices::paySuccess 钩子会回调 shunwei-api 发放赠积分；
 * 为稳妥，前端支付成功后也主动调 shunwei-api claim-gift（幂等，按 refId 去重）。
 *
 * 生产 v5.6.4 实测路由(对比 cmbline app/api/route/v1.php)：
 *   POST user/member/card/create → OtherOrderController/create  (购买卡创建订单)
 * 参数(postMore): pay_type=weixin, type=1(会员卡), from=routine, member_type, price, money, mc_id
 */

// CRMEB 会员卡下单（付费会员）— 生产 v5.6.4 路由
export function createMemberOrder({ mcId, price, money, memberType = '' }) {
  return crmebRequest('/api/user/member/card/create', {
    method: 'POST',
    data: {
      pay_type: 'weixin',
      type: 1, // 1=会员卡
      from: 'routine',
      member_type: memberType,
      price: price,
      money: money != null ? money : price,
      mc_id: mcId,
    },
  })
}

// 拉起微信支付
export function requestWxPayment(payInfo) {
  // CRMEB 返回的 payInfo 通常含 { timeStamp, nonceStr, package, signType, paySign, appId }
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: String(payInfo.timeStamp || payInfo.timestamp || ''),
      nonceStr: payInfo.nonceStr || payInfo.nonce_str || '',
      package: payInfo.package || payInfo.packageValue || '',
      signType: payInfo.signType || 'MD5',
      paySign: payInfo.paySign || payInfo.sign || '',
      success: resolve,
      fail: reject,
    })
  })
}

// 支付成功后主动领取开卡赠积分（幂等兜底，CRMEB 钩子为主）
export function claimGiftAfterPay({ tierCode, refId }) {
  return swRequest('/api/membership/claim-gift', {
    method: 'POST',
    data: { tierCode, channel: 'wechat_pay', refId },
  })
}
