import { swRequest } from './request'

export function getProductList(params = {}) {
  const query = new URLSearchParams()
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.brand) query.set('brand', params.brand)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return swRequest(`/api/products${qs ? '?' + qs : ''}`)
}

export function getProductDetail(id) {
  return swRequest(`/api/products/${encodeURIComponent(id)}`)
}
