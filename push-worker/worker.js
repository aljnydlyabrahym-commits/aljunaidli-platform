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
  return ORIGINS.some(r => r.test(o)) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : { Vary: 'Origin' };
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

async function handle(req, env, ctx) {
  const u = new URL(req.url), ip = req.headers.get('CF-Connecting-IP') || 'x';
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
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
export default { fetch: (req, env, ctx) => handle(req, env, ctx).catch(e => json(req, { error: 'server' }, 500)) };
