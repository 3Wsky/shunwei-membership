const BASE = 'http://127.0.0.1:8787';
const USER = 'admin';
const PASS = 'shunwei2026dev';

let cookie = '';
async function login() {
  const res = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${encodeURIComponent(USER)}&password=${encodeURIComponent(PASS)}`,
    redirect: 'manual'
  });
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const c = (sc || []).find((x) => x && x.startsWith('sw_admin_session='));
  if (!c) throw new Error('login failed ' + res.status);
  cookie = c.split(';')[0];
}
async function api(method, url, body, ms = 180000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`${BASE}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  } finally { clearTimeout(t); }
}

(async () => {
  const out = [];
  try {
    await login();
    out.push('login OK');
    const t0 = Date.now();
    const r = await api('POST', '/api/admin/products/collect-from-official', { models: ['华为 Mate 80 Pro Max'], isShow: true }, 180000);
    out.push(`collect status=${r.status} (${Date.now() - t0}ms) -> created=${r.json?.data?.createdCount ?? r.json?.createdCount} updated=${r.json?.data?.updatedCount ?? r.json?.updatedCount} msg=${r.json?.msg || ''}`);

    const list = await api('GET', '/api/admin/products?status=all&keyword=Mate 80 Pro Max');
    const rows = list.json?.data?.list ?? list.json?.list ?? [];
    const p = rows.find((x) => /Mate 80 Pro Max/i.test(x.storeName || ''));
    if (!p) { out.push('PRODUCT NOT FOUND'); }
    else {
      out.push('\n=== imported product ===');
      out.push(JSON.stringify({
        storeName: p.storeName, brand: p.brand, price: p.price, specType: p.specType,
        image: p.image ? 'set' : 'EMPTY',
        sliderImages: (p.sliderImages || []).length,
        colorItems: (p.colorItems || []).map((c) => `${c.name}:${c.image ? 'img' : 'noimg'}`),
        skuPrices: (p.skuPrices || []).length,
        detailImages: (p.detailImages || []).length,
        paramsList: (p.paramsList || []).length,
        descLen: (p.description || '').length,
        source: p.source
      }, null, 2));
      const checks = [
        ['image set', !!p.image],
        ['sliderImages>=2', (p.sliderImages || []).length >= 2],
        ['colorItems>=2 each w/ image', (p.colorItems || []).length >= 2 && p.colorItems.every((c) => c.image)],
        ['skuPrices>=2', (p.skuPrices || []).length >= 2],
        ['skuPrices have image', (p.skuPrices || []).every((s) => s.image)],
        ['detailImages>=3', (p.detailImages || []).length >= 3],
        ['paramsList>=5', (p.paramsList || []).length >= 5],
        ['specType=1', p.specType === 1],
        ['source=vmall-official', p.source === 'vmall-official']
      ];
      out.push('\n=== checks ===');
      let pass = 0;
      for (const [n, ok] of checks) { out.push((ok ? 'PASS  ' : 'FAIL  ') + n); if (ok) pass++; }
      out.push(`\n${pass}/${checks.length} passed`);
    }
  } catch (e) {
    out.push('ERROR: ' + e.message);
  }
  console.log(out.join('\n'));
})();
