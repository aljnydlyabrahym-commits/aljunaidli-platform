/* منصة أسرة الجنيدلي — تشغيل بدون نت + فتح فوري */
const V = 'jnd-v28', SHELL = ['./', 'index.html', 'og5.jpg', 'manifest.webmanifest', 'assets/logo.png', 'assets/poster.jpg', 'assets/icon-192.png', 'assets/apple-touch-icon.png', 'assets/invite-1.jpg', 'assets/invite-2.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const tag = r => r && (r.headers.get('etag') || r.headers.get('last-modified') || r.headers.get('content-length'));
function notify() { self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage({ jndUpdate: 1 }))); }
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  // بيانات Firebase والدخول: دايم من الشبكة
  if (/firestore\.googleapis|identitytoolkit|securetoken/.test(u.hostname)) return;
  // الخطوط: من المحفوظ أولاً ويتحدث بالخلفية
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(V).then(c => c.match(r).then(hit => { const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }).catch(() => hit); return hit || net; })));
    return;
  }
  if (u.origin !== location.origin) return;
  // الصور والملفات الثابتة: من المحفوظ فوراً ويتحدّث بالخلفية
  if (/\/assets\/|\/og5\.jpg$|manifest\.webmanifest$/.test(u.pathname)) {
    e.respondWith(caches.open(V).then(c => c.match(r).then(hit => { const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit); return hit || net; })));
    return;
  }
  // صفحة الموقع: تنفتح فوراً من المحفوظ، وتتحدّث بالخلفية، وإذا فيه نسخة أحدث يطلع للمستخدم زر «تحديث»
  e.respondWith(caches.open(V).then(async c => {
    const key = 'index.html', hit = await c.match(key);
    const upd = fetch(key, { cache: 'no-cache' }).then(async res => {
      if (!res.ok) return null;
      const old = await c.match(key), changed = old && tag(old) && tag(res) && tag(old) !== tag(res);
      await c.put(key, res.clone()); if (changed) notify(); return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(upd); return hit; }
    const res = await upd; return res || new Response('ما فيه اتصال', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
