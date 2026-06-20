import { swRequest } from './request'

export function getVoucherWallet() {
  return swRequest('/api/cash-voucher/wallet')
}

export function getVoucherLedger(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return swRequest(`/api/cash-voucher/ledger${qs ? '?' + qs : ''}`)
}

export function verifyVoucher(data) {
  return swRequest('/api/cash-voucher/verify', {
    method: 'POST',
    data,
  })
}

export function getMerchantInfo() {
  return swRequest('/api/merchant/me')
}

export function merchantVerifyVoucher(data) {
  return swRequest('/api/merchant/verify-voucher', {
    method: 'POST',
    data,
  })
}

export function getMerchantSettlement() {
  return swRequest('/api/merchant/settlement')
}
