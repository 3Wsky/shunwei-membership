/** 展示商品字段归一（CMB/shunwei-api 返回 camelCase） */
export function productTitle(item) {
  if (!item) return '商品'
  return item.storeName || item.store_name || item.name || '商品'
}

export function productSubtitle(item) {
  if (!item) return ''
  return item.storeInfo || item.info || ''
}

export function productCover(item) {
  if (!item) return ''
  return item.image || item.cover || (item.sliderImages && item.sliderImages[0]) || ''
}

export function productGallery(item) {
  if (!item) return []
  const slides = item.sliderImages || item.slider_images || []
  const main = productCover(item)
  const merged = main ? [main, ...slides.filter((u) => u && u !== main)] : slides.filter(Boolean)
  return [...new Set(merged)]
}

export function productPriceLabel(item) {
  if (!item) return '—'
  if (item.integral || item.integral_price) {
    return `${item.integral || item.integral_price} 积分`
  }
  if (item.priceText) return item.priceText
  if (item.price) return `¥${item.price}`
  return '到店询价'
}
