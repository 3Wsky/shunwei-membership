const BASE = 'https://api.fastapi.ai/v1';
const KEY = 'sk-FastAPI1opUxN0qXl0RxG5gHR3A1RRj0pNuSj1KE0NcaJ1uN';
const MODEL = 'gpt-image-2';

async function main() {
  // 1) text-to-image
  try {
    const t0 = Date.now();
    const r = await fetch(`${BASE}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt: 'a red apple on pure white background, product photo', n: 1, size: '1024x1024', quality: 'low' }),
      signal: AbortSignal.timeout(180000)
    });
    const text = await r.text();
    console.log(`GEN status=${r.status} (${(Date.now()-t0)/1000}s) body=${text.slice(0, 300)}`);
  } catch (e) { console.log('GEN err', e.name, e.message); }

  // 2) image-to-image (edits)
  try {
    const dl = await fetch('https://ok.xjshunwei.cn/uploads/attach/2026/03/20260308/7ae883eb719128f5fd17cce8fbe1b6be.png', { signal: AbortSignal.timeout(30000) });
    const buf = Buffer.from(await dl.arrayBuffer());
    console.log(`REF download status=${dl.status} type=${dl.headers.get('content-type')} bytes=${buf.length}`);
    const form = new FormData();
    form.append('model', MODEL);
    form.append('prompt', 'clean white background ecommerce product photo, keep the product unchanged');
    form.append('n', '1');
    form.append('size', '1024x1024');
    form.append('quality', 'low');
    form.append('image', new Blob([buf], { type: 'image/png' }), 'reference.png');
    const t0 = Date.now();
    const r = await fetch(`${BASE}/images/edits`, { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form, signal: AbortSignal.timeout(180000) });
    const text = await r.text();
    console.log(`EDIT status=${r.status} (${(Date.now()-t0)/1000}s) body=${text.slice(0, 600)}`);
  } catch (e) { console.log('EDIT err', e.name, e.message); }
}
main();
