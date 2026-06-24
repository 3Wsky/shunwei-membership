/**
 * 会员 / 积分（走 shunwei-api，复用已实现的 membership / integral 模块）。
 * 统一用 swRequest；同时导出多套命名别名，兼容各页面引用习惯。
 */
import { swRequest } from './request'

// 会员套餐（199/299），无需登录
export function getMembershipPlans() {
  return swRequest('/api/membership/plans')
}

// 我的会员信息（需登录）
export function getMyMembership() {
  return swRequest('/api/membership/me')
}

// 积分摘要（赠送/充值批次）
export function getMyIntegral() {
  return swRequest('/api/integral/summary')
}

// 领取开卡赠积分（幂等）
export function claimGift(payload) {
  return swRequest('/api/membership/claim-gift', { method: 'POST', data: payload })
}

// 积分明细（eb_user_bill 流水）
export function getIntegralLog(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return swRequest(`/api/integral/log${qs ? '?' + qs : ''}`)
}

// 积分商城商品列表
export function getIntegralMallProducts() {
  return swRequest('/api/integral-mall/products')
}

// 积分兑换下单
export function exchangeIntegralProduct(productId, specs = {}) {
  return swRequest('/api/integral-mall/exchange', {
    method: 'POST',
    data: { productId, ...specs },
  })
}

// 我的积分兑换订单（含核销码）
export function getIntegralMallOrders(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return swRequest(`/api/integral-mall/orders${qs ? '?' + qs : ''}`)
}

// ---- 别名（兼容其它页面）----
export const getPlans = getMembershipPlans
export const getIntegralSummary = getMyIntegral

export default {
  getMembershipPlans,
  getMyMembership,
  getMyIntegral,
  claimGift,
  getIntegralLog,
  getIntegralMallProducts,
  exchangeIntegralProduct,
  getIntegralMallOrders,
  getPlans,
  getIntegralSummary,
}
