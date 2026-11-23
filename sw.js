/* منصة أسرة الجنيدلي — تشغيل بدون نت + فتح فوري */
// v58: ملفات الإدارة (admin-59.js) وقارئ الإكسل (xl-58.js) والبطاقات (cc-59.js) مستثناة من SHELL عن قصد: الزائر ما يحمّل الأولين أبد، والثالث يتحمّل لما يفتح البطاقات،
// وتنحفظ في الكاش أول ما تنطلب (مسار /assets/ تحت). رقم الكاش الجديد يمسح كاش 57 كامل عند التفعيل
const V = 'jnd-v32', SHELL = ['./', 'index.html', 'og5.jpg', 'manifest.webmanifest', 'assets/logo.png', 'assets/poster.jpg', 'assets/icon-192.png', 'assets/apple-touch-icon.png', 'assets/invite-1.jpg', 'assets/invite-2.jpg'];
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
// v60: التنبيهات الفورية (Web Push من junaidli-push). النص يجي مشفّر من الخادم، ونعرضه بأيقونة المنصة
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  const s = (v, n) => String(v == null ? '' : v).slice(0, n);
  const url = /^[#./a-z0-9_?=&-]*$/i.test(d.url || '') && d.url ? d.url : './';
  e.waitUntil(self.registration.showNotification(s(d.title, 60) || 'منصة أسرة الجنيدلي', {
    body: s(d.body, 160), icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', tag: s(d.tag, 40) || 'jnd', renotify: true, lang: 'ar', dir: 'rtl', data: { url }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const to = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    if (c) return c.focus().then(w => (w && to !== w.url && 'navigate' in w ? w.navigate(to).catch(() => w) : w));
    return self.clients.openWindow(to);
  }));
});
