/* junaidli-push — إشعارات منصة أسرة الجنيدلي (Web Push معياري: VAPID + aes128gcm)
   الأسرار (Worker secrets، مو في الكود): VAPID_PRIVATE_JWK.  المتغيرات: VAPID_PUBLIC, ADMIN_EMAIL, FB_PROJECT, VAPID_SUB.
   الربط: SUBS (KV)، SELF (ربط خدمة بنفسه لتوزيع الإرسال على دفعات، لأن حد الطلبات الفرعية 50 لكل استدعاء). */
const ORIGINS = [/^https:\/\/aljunaidli\.netlify\.app$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const BATCH = 40, ICON = '/assets/icon-192.png';
const enc = new TextEncoder();
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ub64 = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); const r = atob(s + '='.repeat((4 - s.length % 4) % 4)); return Uint8Array.from(r, c => c.charCodeAt(0)); };
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const clip = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim().slice(0, n);

function cors(req) {
  const o = req.headers.get('Origin') || '';
  return ORIGINS.some(r => r.test(o)) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : { Vary: 'Origin' };
}
const json = (req, o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...cors(req) } });

/* ---------- حد المعدل (ذاكرة النسخة: بسيط وبدون كتابة في KV) ---------- */
const RL = new Map();
function limited(key, max, ms) {
  const now = Date.now(), a = (RL.get(key) || []).filter(t => now - t < ms);
  if (a.length >= max) { RL.set(key, a); return true; }
  a.push(now); RL.set(key, a); if (RL.size > 5000) RL.clear(); return false;
}

// حد ثابت عبر كل النسخ (KV، ساعة): للأحداث النادرة فقط عشان ما نستهلك حصة الكتابة
async function kvLimited(env, key, max) {
  const n = +(await env.SUBS.get(key)) || 0; if (n >= max) return true;
  await env.SUBS.put(key, String(n + 1), { expirationTtl: 3600 }); return false;
}

/* ---------- تشفير الرسالة (RFC 8291) ---------- */
async function hmac(key, data) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }
async function encrypt(sub, payload) {
  const uaPub = ub64(sub.keys.p256dh), auth = ub64(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hmac(await hmac(auth, ecdh), cat(enc.encode('WebPush: info\0'), uaPub, asPub, [1]));
  const salt = crypto.getRandomValues(new Uint8Array(16)), prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode('Content-Encoding: aes128gcm\0'), [1]))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode('Content-Encoding: nonce\0'), [1]))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc.encode(payload), [2])));
  return cat(salt, [0, 0, 16, 0], [65], asPub, ct);
}
/* ---------- توقيع VAPID ---------- */
const JWT = new Map();
async function vapid(env, endpoint) {
  const aud = new URL(endpoint).origin, c = JWT.get(aud);
  if (c && c.exp - 3600 > Date.now() / 1000) return c.h;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const k = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const un = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) + '.' + b64u(enc.encode(JSON.stringify({ aud, exp, sub: env.VAPID_SUB || 'mailto:admin@example.com' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, enc.encode(un));
  const h = `vapid t=${un}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`; JWT.set(aud, { h, exp }); return h;
}
async function pushOne(env, id, sub, msg) {
  try {
    const body = await encrypt(sub, JSON.stringify(msg));
    const r = await fetch(sub.endpoint, { method: 'POST', body, headers: { Authorization: await vapid(env, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal', Topic: String(msg.tag || 'jnd').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || 'jnd' } });
    if (r.status === 404 || r.status === 410) { await env.SUBS.delete(id); return 'gone'; }
    return r.ok ? 'ok' : 'err' + r.status;
  } catch (e) { return 'fail'; }
}
/* الإرسال لقائمة مفاتيح: دفعة هنا، والباقي يتوزع على استدعاءات جديدة عبر SELF */
async function deliver(env, ids, msg) {
  const out = { ok: 0, gone: 0, err: 0 };
  const mine = ids.slice(0, BATCH), rest = ids.slice(BATCH);
  const jobs = [];
  for (let i = 0; i < rest.length; i += BATCH) {
    const part = rest.slice(i, i + BATCH);
    if (env.SELF) jobs.push(env.SELF.fetch('https://self/fanout', { method: 'POST', headers: { 'X-Fanout': env.FANOUT_KEY || '' }, body: JSON.stringify({ ids: part, msg }) }).then(r => r.json()).then(j => { out.ok += j.ok | 0; out.gone += j.gone | 0; out.err += j.err | 0; }).catch(() => { out.err += part.length; }));
  }
  await Promise.all(mine.map(async id => {
    const v = await env.SUBS.get(id, 'json'); if (!v || !v.sub) return;
    const r = await pushOne(env, id, v.sub, msg); if (r === 'ok') out.ok++; else if (r === 'gone') out.gone++; else out.err++;
  }));
  await Promise.all(jobs); return out;
}
async function listIds(env, pick) {
  const ids = []; let cursor;
  do {
    const l = await env.SUBS.list({ prefix: 's:', cursor });
    for (const k of l.keys) if (!pick || pick(k.metadata || {})) ids.push(k.name);
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);
  return ids;
}

/* ---------- التحقق من توكن Firebase للمشرف ---------- */
let JWKS = null, JWKS_AT = 0;
async function fbKeys() {
  if (JWKS && Date.now() - JWKS_AT < 3600e3) return JWKS;
  const r = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'); if (!r.ok) throw new Error('jwks');
  JWKS = (await r.json()).keys; JWKS_AT = Date.now(); return JWKS;
}
async function verifyAdmin(env, req) {
  try {
    const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''); const p = t.split('.'); if (p.length !== 3) return false;
    const h = JSON.parse(new TextDecoder().decode(ub64(p[0]))), c = JSON.parse(new TextDecoder().decode(ub64(p[1])));
    if (h.alg !== 'RS256' || !h.kid) return false;
    const jwk = (await fbKeys()).find(k => k.kid === h.kid); if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, ub64(p[2]), enc.encode(p[0] + '.' + p[1]))) return false;
    const now = Date.now() / 1000, P = env.FB_PROJECT;
    return c.aud === P && c.iss === 'https://securetoken.google.com/' + P && c.exp > now && c.iat <= now + 60 && c.auth_time <= now + 60 && typeof c.sub === 'string' && c.sub
      && String(c.email || '').toLowerCase() === String(env.ADMIN_EMAIL).toLowerCase() && c.firebase && c.firebase.sign_in_provider === 'password';
  } catch (e) { return false; }
}

const idOf = async ep => 's:' + b64u(await crypto.subtle.digest('SHA-256', enc.encode(ep))).slice(0, 32);
const pidOk = p => p == null ? null : /^[0-9]{1,12}$/.test(String(p)) ? String(p) : null;
function goodSub(s) {
  return s && typeof s.endpoint === 'string' && s.endpoint.length < 1024 && /^https:\/\//.test(s.endpoint) && s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string'
    && s.keys.p256dh.length < 120 && s.keys.auth.length < 40 && ub64(s.keys.p256dh).length === 65 && ub64(s.keys.auth).length === 16;
}
const msgOf = (o, tag) => ({ title: clip(o.title, 60) || 'منصة أسرة الجنيدلي', body: clip(o.body, 160), url: (/^[#./a-z0-9_?=&-]*$/i.test(o.url || '') ? String(o.url || './').slice(0, 120) : './') || './', tag, icon: ICON });

/* ---------- v60: تقرير المشاكل التقنية (مجهول) ----------
   الجهاز يرسل دفعة: {items:[{fp,t,msg,where,ver,n}], fam}. ما نخزن IP ولا اسم ولا رقم: عدد الأجهزة من هاش مملّح يتغيّر كل يوم.
   التخزين مجمّع بالبصمة في مفتاح واحد e:<fp> وينتهي تلقائياً بعد 30 يوم من آخر ظهور. حد يومي للكتابة عشان حصة KV */
const ERR_TTL = 30 * 86400, ERR_DAY_MAX = 400, ERR_KEYS_MAX = 300;
const dayOf = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const scrub = (s, n) => clip(s, 400).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>').replace(/[0-9٠-٩۰-۹]+/g, '#').slice(0, n);
async function errPost(req, env, b, ip) {
  if (limited('e' + ip, 6, 600e3) || limited('eall', 120, 600e3)) return { ok: true, rate: true };
  const items = Array.isArray(b.items) ? b.items.slice(0, 8) : [];
  if (!items.length) return { ok: true, n: 0 };
  const day = dayOf(), ck = 'ec:' + day, used = +(await env.SUBS.get(ck)) || 0;
  if (used >= ERR_DAY_MAX) return { ok: true, cap: true };
  const fam = /^[A-Za-z]{2,10}·[A-Za-z]{2,12}$/.test(b.fam || '') ? b.fam : 'Other·Other';
  // بصمة الجهاز لليوم: هاش (ملح سري + اليوم + IP + المتصفح)، ما ينحفظ منه إلا 8 حروف وما يرجع للـ IP
  const dv = b64u(await crypto.subtle.digest('SHA-256', enc.encode((env.FANOUT_KEY || 'salt') + '|' + day + '|' + ip + '|' + (req.headers.get('User-Agent') || '')))).slice(0, 8);
  let w = 0;
  for (const it of items) {
    if (!it || !/^[a-z0-9]{6,16}$/.test(it.fp || '')) continue;
    if (used + w >= ERR_DAY_MAX) break;
    const k = 'e:' + it.fp, now = Date.now(), n = Math.max(1, Math.min(50, it.n | 0));
    const o = (await env.SUBS.get(k, 'json')) || { fp: it.fp, t: '', msg: '', where: '', first: now, last: now, n: 0, vers: {}, fam: {}, days: {} };
    o.t = /^[a-z]{2,10}$/.test(it.t || '') ? it.t : 'js'; o.msg = scrub(it.msg, 160); o.where = scrub(it.where, 80);
    o.last = now; o.n += n;
    const ver = /^[0-9]{1,4}$/.test(String(it.ver || '')) ? String(it.ver) : '?'; o.vers[ver] = (o.vers[ver] || 0) + n;
    o.fam[fam] = (o.fam[fam] || 0) + n;
    const d = o.days[day] || { n: 0, d: [] }; d.n += n; if (!d.d.includes(dv) && d.d.length < 60) d.d.push(dv); o.days[day] = d;
    Object.keys(o.days).sort().slice(0, -30).forEach(x => delete o.days[x]);
    if (Object.keys(o.vers).length > 12) Object.keys(o.vers).sort((a, c) => o.vers[a] - o.vers[c]).slice(0, -12).forEach(x => delete o.vers[x]);
    if (Object.keys(o.fam).length > 12) Object.keys(o.fam).sort((a, c) => o.fam[a] - o.fam[c]).slice(0, -12).forEach(x => delete o.fam[x]);
    await env.SUBS.put(k, JSON.stringify(o), { expirationTtl: ERR_TTL, metadata: { last: now } }); w++;
  }
  if (w) await env.SUBS.put(ck, String(used + w), { expirationTtl: 2 * 86400 });
  return { ok: true, n: w };
}
async function errList(env) {
  const keys = []; let cursor;
  do { const l = await env.SUBS.list({ prefix: 'e:', cursor }); keys.push(...l.keys); cursor = l.list_complete ? null : l.cursor; } while (cursor && keys.length < 1000);
  keys.sort((a, c) => ((c.metadata || {}).last || 0) - ((a.metadata || {}).last || 0));
  const out = (await Promise.all(keys.slice(0, ERR_KEYS_MAX).map(k => env.SUBS.get(k.name, 'json')))).filter(Boolean)
    .map(o => ({ ...o, dev: Object.values(o.days || {}).reduce((a, d) => a + (d.d || []).length, 0), days: Object.fromEntries(Object.entries(o.days || {}).map(([k, d]) => [k, { n: d.n, dv: (d.d || []).length }])) }));
  return { ok: true, now: Date.now(), items: out };
}

/* ---------- v60: تذكير المناسبات (Cron يومي 05:00 UTC = 8 الصبح بالرياض) ---------- */
const FS = env => 'https://firestore.googleapis.com/v1/projects/' + env.FB_PROJECT + '/databases/(default)/documents/jnd/';
async function fsRead(env, k) {
  const g = async n => { const r = await fetch(FS(env) + encodeURIComponent(n)); if (r.status === 404) return null; if (!r.ok) throw new Error('fs ' + r.status); return r.json(); };
  const j = await g(k); if (!j || !j.fields || !j.fields.v) return null;
  let v = j.fields.v.stringValue || ''; const n = j.fields.n ? +j.fields.n.integerValue : 1;
  for (let i = 1; i < n; i++) { const x = await g(k + '~' + i); if (!x) throw new Error('chunk'); v += x.fields.v.stringValue; }
  return JSON.parse(v);
}
const AR = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
function timeAr(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return '';
  let h = +m[1]; const mm = m[2], p = h < 5 ? 'فجراً' : h < 12 ? 'صباحاً' : h < 15 ? 'ظهراً' : h < 18 ? 'عصراً' : 'مساءً';
  h = h % 12 || 12; return AR(h + (mm !== '00' ? ':' + mm : '')) + ' ' + p;
}
async function remind(env) {
  const now = Date.now() + 3 * 3600e3, today = dayOf(now), tom = dayOf(now + 86400e3);
  const evs = await fsRead(env, 'jnd-events-all'); if (!Array.isArray(evs)) return { ok: true, n: 0, why: 'no events' };
  const due = evs.filter(e => e && e.id && (e.date === today || e.date === tom) && !e.cancelled && !e.hidden);
  if (!due.length) return { ok: true, n: 0 };
  let rows = null;
  const title = async e => {
    if (e.title) return clip(e.title, 70);
    if (e.person_id != null) {
      if (!rows) { try { rows = await fsRead(env, 'jnd-rows'); } catch (x) { rows = []; } if (!Array.isArray(rows)) rows = []; }
      const p = rows.find(r => String(r.id) === String(e.person_id)), f = p && rows.find(r => String(r.id) === String(p.father_id));
      if (p) return clip((e.person_role || 'العريس') === 'العريس' ? `زواج ${p.name}${f ? ' بن ' + f.name : ''}` : `زواج كريمة ${p.name}${f ? ' بن ' + f.name : ''}`, 70);
    }
    return 'مناسبة للأسرة';
  };
  let ids = null, sent = 0;
  for (const e of due.slice(0, 6)) {
    const w = e.date === today ? 'd' : 't', mk = 'rm:' + clip(e.id, 40) + ':' + e.date + ':' + w;
    if (await env.SUBS.get(mk)) continue;
    await env.SUBS.put(mk, '1', { expirationTtl: 4 * 86400 });
    const t = await title(e), tm = timeAr(e.time);
    const msg = msgOf({ title: (w === 'd' ? 'اليوم: ' : 'غداً: ') + t, body: [w === 'd' && tm ? 'الساعة ' + tm : (tm ? 'بكرة الساعة ' + tm : ''), e.venue ? clip(e.venue, 50) : ''].filter(Boolean).join(' · ') || 'لا تفوّتها', url: './#events' }, 'jnd-ev-' + clip(e.id, 20).replace(/[^A-Za-z0-9_-]/g, '') + '-' + w);
    if (!ids) ids = await listIds(env, null);
    await deliver(env, ids, msg); sent++;
  }
  return { ok: true, n: sent };
}

async function handle(req, env, ctx) {
  const u = new URL(req.url), ip = req.headers.get('CF-Connecting-IP') || 'x';
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (u.pathname === '/err' && req.method === 'GET') {
    if (limited('g' + ip, 30, 60e3)) return json(req, { error: 'rate' }, 429);
    if (!await verifyAdmin(env, req)) return json(req, { error: 'auth' }, 401);
    return json(req, await errList(env));
  }
  if (req.method !== 'POST') return json(req, { ok: true, name: 'junaidli-push' });
  if (u.pathname === '/fanout') {
    if (!env.FANOUT_KEY || req.headers.get('X-Fanout') !== env.FANOUT_KEY) return json(req, { error: 'forbidden' }, 403);
    const b = await req.json(); return json(req, await deliver(env, (b.ids || []).slice(0, BATCH), b.msg));
  }
  if (!cors(req)['Access-Control-Allow-Origin'] && u.pathname !== '/notify') return json(req, { error: 'origin' }, 403);
  let b; try { const t = await req.text(); if (t.length > 4096) return json(req, { error: 'big' }, 413); b = JSON.parse(t || '{}'); } catch (e) { return json(req, { error: 'json' }, 400); }

  if (u.pathname === '/subscribe') {
    if (limited('s' + ip, 10, 60e3)) return json(req, { error: 'rate' }, 429);
    if (!goodSub(b.sub)) return json(req, { error: 'sub' }, 400);
    const sub = { endpoint: b.sub.endpoint, keys: { p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth } }, pid = pidOk(b.pid);
    // صلاحية المشرف ما تنعطى إلا بتوكن مشرف صحيح
    const admin = !!b.admin && await verifyAdmin(env, req);
    await env.SUBS.put(await idOf(sub.endpoint), JSON.stringify({ sub, pid, admin, at: Date.now() }), { metadata: { pid, admin } });
    return json(req, { ok: true, admin });
  }
  if (u.pathname === '/unsubscribe') {
    if (limited('s' + ip, 10, 60e3)) return json(req, { error: 'rate' }, 429);
    if (typeof b.endpoint !== 'string' || b.endpoint.length > 1024) return json(req, { error: 'sub' }, 400);
    await env.SUBS.delete(await idOf(b.endpoint)); return json(req, { ok: true });
  }
  if (u.pathname === '/notify') {
    if (limited('n' + ip, 30, 60e3)) return json(req, { error: 'rate' }, 429);
    if (!await verifyAdmin(env, req)) return json(req, { error: 'auth' }, 401);
    const kind = /^(news|moment|decision|event|other)$/.test(b.kind) ? b.kind : 'other', msg = msgOf(b, 'jnd-' + kind + (kind === 'decision' ? '-' + Date.now() : ''));
    let pick = null;
    if (b.to && Array.isArray(b.to.pids)) { const set = new Set(b.to.pids.map(pidOk).filter(Boolean).slice(0, 50)); if (!set.size) return json(req, { ok: true, sent: 0 }); pick = m => set.has(m.pid); }
    else if (b.to !== 'all') return json(req, { error: 'to' }, 400);
    const r = await deliver(env, await listIds(env, pick), msg); return json(req, { ok: true, ...r });
  }
  if (u.pathname === '/err') return json(req, await errPost(req, env, b, ip));
  if (u.pathname === '/visitor-event') {
    // نص ثابت للمشرفين فقط، وبدون أي نص من الزائر. حد صارم لكل IP، وحد عام يمنع الإغراق
    if (limited('v' + ip, 3, 3600e3) || limited('vall', 20, 3600e3) || await kvLimited(env, 'rl:v:' + ip, 3) || await kvLimited(env, 'rl:vall', 20)) return json(req, { ok: true, sent: 0, rate: true });
    const sug = b.kind === 'sug';
    const msg = msgOf({ title: sug ? 'وصل اقتراح جديد' : 'وصل طلب جديد', body: sug ? 'فيه اقتراح جديد بانتظار قرارك في لوحة المشرف' : 'فيه طلب جديد بانتظار قرارك في لوحة المشرف', url: './#admin' }, 'jnd-admin-inbox');
    const ids = await listIds(env, m => m.admin === true);
    ctx.waitUntil(deliver(env, ids, msg)); return json(req, { ok: true });
  }
  return json(req, { error: 'not found' }, 404);
}
export default {
  fetch: (req, env, ctx) => handle(req, env, ctx).catch(e => json(req, { error: 'server' }, 500)),
  scheduled: (ev, env, ctx) => ctx.waitUntil(remind(env).catch(() => null))
};
