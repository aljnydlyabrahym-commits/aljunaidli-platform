/* منصة أسرة الجنيدلي — أدوات المشرف (الإصدار 58)
   يتحمّل من index.html بعد دخول المشرف فقط (admLoad)، والزائر ما يحمّله أبد.
   الكود منقول كما هو من index.html، والدوال المشتركة توصل له من J (نفس الكائنات، مو نسخ). */
window.JNDAdmin = function (J) {
  'use strict';
  const { $, $$, A, AD, AD_TAB, AD_TABS, ARW, ARWB, BKEYS, CC_OCC, GR, HMS, IDB, JND_V, LK, MOM, MOM_CAP, MOM_DAY, MOM_IDX_MAX, MOM_MAX, NOSELF, RJ, ROLE, S, SECS, SEG, SITE0, adOpen, adSave, adScroller, adTop, addRow, admPend, adminIds, afterUnlock, applySite, ar, armDelete, bFmt, bFull, bReqOf, bellBadge, bkDays, bkDue, ccLoad, ccMeta, ccModal, ccPreview, ccTitle, chain, cloudOn, daysTo, daysWord, decOf, descendants, dispName, dnRM, drawRows, dupScan, errList, errOpen, esc, evSorted, evTitle, gStr, gateId, gateNode, go, grActive, grList, greetOpen, hStr, hasPh, hp, isAdmin, iso, lineage, logIt, meRender, momClean, momCloud, momDay0, momImg, momList, momLogo, mqDays, mqT, nCount, nDate, newsSorted, norm, nz, openEvent, openNewsEd, phDisp, quad, refresh, relTag, reload, removeEvent, rjOpen, rqBind, rqDone, rqRerender, rsGen, rsSub, rsWhen, saveEvents, saveNews, saveReqs, saveRows, saveSugs, sd, search, segHtml, sgOpen, stPill, stamp, sv, t12, toLat, toast, today, treeFocus, upcoming, utc, wday, ymd } = J;
  function decideBirth(r, ok, why) {
    const p = S.byId[r.pid];
    if (ok) {
      const row = S.rows.find(x => String(x.id) === String(r.pid)); if (!row) { toast('الشخص مو موجود'); return; }
      row.birth = String(r.y); row.bfull = r.m ? `${r.y}-${r.m}-${r.d || 0}` : null;
      (S.reqs || []).forEach(x => { if (x !== r && x.type === 'birth' && x.status === 'pending' && String(x.pid) === String(r.pid)) { x.status = 'no'; stamp(x, 'no', 'اعتمدنا تاريخ ثاني لنفس الشخص'); } });
      r.status = 'ok'; stamp(r, 'ok'); saveRows(); logIt('تاريخ ميلاد', `${p ? lineage(p, 3) : ''} ← ${bFmt(r.y, r.m, r.d)}`); saveReqs(); AD.just.add(String(r.id)); refresh(); bellBadge(); toast('تمت الموافقة، واعتمدنا التاريخ');
    } else { r.status = 'no'; stamp(r, 'no', why); saveReqs(); rqDone(r); toast('لم تتم الموافقة، وبلّغنا صاحب الطلب'); }
  }
  function saveAdmins(ids, msg) { try { localStorage.setItem('jnd-admins', JSON.stringify(ids)); } catch (e) { } logIt('المشرفون', msg); adminRender(); toast('انحفظت قائمة المشرفين'); }
  function supHTML() {
    const ids = adminIds(), me = String(gateId());
    const rows = ids.map(id => { const n = S.byId[id]; if (!n) return ''; const self = id === me;
      return `<div class="ad-row"><span class="ad-av">${esc((n.name || '؟')[0])}</span><div class="ad-rt"><b>${esc(quad(n))}</b><small>${self ? 'أنت' : 'مشرف'}</small></div><div class="ad-btns"><button type="button" class="del" data-supd="${esc(id)}" title="${ids.length < 2 ? 'لازم يبقى مشرف واحد على الأقل' : self ? 'ما تقدر تشيل نفسك' : 'شيله من المشرفين'}" aria-label="شيله من المشرفين" ${ids.length < 2 || self ? 'disabled' : ''}>${sv('trash')}</button></div></div>`; }).join('');
    return `<p class="as-note" style="margin-top:0">اللي هنا يقدرون يدخلون اللوحة بكلمة المرور.</p>
      <div class="ad-list" id="sup-list">${rows || '<p class="ad-empty">ما حددت مشرفين، فأي أحد معه كلمة المرور يقدر يدخل.</p>'}</div>
      <div class="ad-q" style="margin-top:10px">${sv('search')}<input id="sup-q" placeholder="ابحث عن الاسم الرباعي" aria-label="ابحث عن الاسم الرباعي" autocomplete="off"></div><div id="sup-res" class="ad-list"></div>`;
  }
  function bindSup() {
    $$('#ad-s-sup [data-supd]').forEach(b => b.onclick = () => armDelete(b, () => { const id = b.dataset.supd, ids = adminIds().filter(x => x !== id); if (!ids.length) return; saveAdmins(ids, 'إزالة مشرف: ' + quad(S.byId[id])); }));
    const q = $('#sup-q'); if (!q) return;
    q.oninput = () => {
      const v = nz(q.value); const box = $('#sup-res'); if (!box) return; if (v.length < 2) { box.innerHTML = ''; return; }
      const cur = adminIds(), hits = S.all.filter(n => n.link === 'مؤكد' && chain(n).length >= 4 && !cur.includes(String(n.id)) && nz(quad(n)).includes(v)).slice(0, 8);
      box.innerHTML = hits.length ? hits.map(n => `<div class="ad-row"><span class="ad-av">${esc((n.name || '؟')[0])}</span><div class="ad-rt"><b>${esc(quad(n))}</b></div><div class="ad-btns"><button type="button" data-supa="${esc(n.id)}" title="أضفه مشرفاً" aria-label="أضفه مشرفاً">${sv('plus')}</button></div></div>`).join('') : '<p class="ad-empty">ما لقينا اسم مؤكد بهالبحث</p>';
      $$('#sup-res [data-supa]').forEach(b => b.onclick = () => { const n = S.byId[b.dataset.supa]; saveAdmins(adminIds().concat(String(n.id)), 'إضافة مشرف: ' + quad(n)); });
    };
  }
  function phAdminCard() {
    if (!cloudOn() || !window.JNDKey) return '';
    const pk = JNDKey.hasPk(), sk = JNDKey.hasSk();
    if (pk && sk) return '';   // الحماية شغّالة: تطلع تنبيه أخضر هادي في «بانتظارك»
    return `<div class="al bad al-col" id="ph-card">${sv('shield')}<span><b>حماية أرقام الواتس ${!pk ? 'مو شغّالة' : 'مقفلة على هالجهاز'}</b>${!pk ? 'ما فعّلت الحماية للحين. اكتب كلمة مرور المشرف (نفس كلمة دخولك) مرة وحدة، وبعدها كل الأرقام تنحفظ مشفّرة.' : 'الأرقام مشفّرة. اكتب كلمة مرور المشرف عشان تنفتح على هالجهاز.'}</span>
      <div class="ph-row"><input id="ph-pw" type="password" autocomplete="current-password" placeholder="كلمة مرور المشرف" aria-label="كلمة مرور المشرف" dir="ltr"><button type="button" id="ph-go">${!pk ? 'فعّل الحماية' : 'افتح الأرقام'}</button></div><p class="ph-err" id="ph-err" hidden></p>
      ${pk && !sk ? '<button class="ph-reset" id="ph-reset" type="button">نسيت كلمة المرور؟ ابدأ الحماية من جديد (الأرقام القديمة ما تنفتح)</button>' : ''}</div>`;
  }
  function phBind() {
    const go = $('#ph-go'); if (!go) return; const err = m => { const e = $('#ph-err'); if (e) { e.textContent = m; e.hidden = !m; } };
    const run = async force => { const pw = ($('#ph-pw') || {}).value; if (!pw) { err('اكتب كلمة المرور'); return; } go.disabled = true; err('');
      try { if (window.JNDCloud && JNDCloud.verify) await JNDCloud.verify(pw); } catch (e) { err('كلمة المرور غير صحيحة'); go.disabled = false; return; }
      const hadPk = JNDKey.hasPk(), r = await JNDKey.unlock(pw, force);
      if (r === 'bad') { err('كلمة المرور ما تطابق اللي فعّلت فيها الحماية. إذا غيّرتها اضغط «ابدأ الحماية من جديد»'); go.disabled = false; return; }
      toast(r === 'nocrypto' ? 'المتصفح ما يدعم التشفير' : hadPk && !force ? 'انفتحت الأرقام' : 'تفعّلت حماية الأرقام'); await afterUnlock(r || 'ok'); };
    go.onclick = () => run(false); const rs = $('#ph-reset'); if (rs) rs.onclick = () => arm2(rs, 'متأكد؟ الأرقام القديمة ما تنفتح', () => run(true));
  }
  // نص مشاركة التهنئة للقروب: بدون رابط الموقع (القاعدة: لا رابط على محتوى التهنئة المشارك)
  const grText = g => `${GR[g.k].hi}\nبطاقة كل واحد منكم جاهزة باسمه في منصة الأسرة، تلقونها في الرئيسية.\nأسرة الجنيدلي`;
  function arm2(btn, label, fn) { if (btn.dataset.armed) { fn(); return; } btn.dataset.armed = 1; const old = btn.innerHTML; btn.classList.add('armed'); btn.innerHTML = `<b>${label}</b><small>اضغط مرة ثانية</small>`;
    setTimeout(() => { if (document.body.contains(btn)) { delete btn.dataset.armed; btn.classList.remove('armed'); btn.innerHTML = old; } }, 4000); }
  function grSend(k) { const L = grList().slice(-5); L.push({ id: 'g' + Date.now(), k, at: new Date().toISOString() }); try { localStorage.setItem('jnd-greet', JSON.stringify(L)); } catch (e) { toast('ما انحفظت'); return; }
    logIt('تهنئة الأسرة', GR[k].t); adminRender(); bellBadge(); toast('أرسلنا التهنئة للأسرة'); }
  function grStop() { const L = grList(); const g = L[L.length - 1]; if (!g) return; g.off = true; try { localStorage.setItem('jnd-greet', JSON.stringify(L)); } catch (e) { } logIt('تهنئة الأسرة', 'إيقاف ' + GR[g.k].t); adminRender(); bellBadge(); toast('وقّفنا التهنئة'); }
  function grAdminHtml() {
    const g = grActive(), days = g ? Math.floor((Date.now() - new Date(g.at)) / 864e5) : 0, left = g ? Math.max(1, GR[g.k].days - days) : 0;
    const since = days <= 0 ? 'بدأت اليوم' : days === 1 ? 'من أمس' : days === 2 ? 'من يومين' : `من ${ar(days)} ${days <= 10 ? 'أيام' : 'يوماً'}`;
    const ends = left === 1 ? 'تنتهي غداً' : left === 2 ? 'تنتهي بعد يومين' : `تنتهي بعد ${ar(left)} ${left <= 10 ? 'أيام' : 'يوماً'}`;
    return `<p class="as-note" style="margin:0 0 12px">كل فرد توصله بطاقة باسمه في الجرس والرئيسية.</p>
      ${g ? `<div class="gr-live"><i></i><div><b>التهنئة شغّالة: ${GR[g.k].b}</b><small>${since} · ${ends}</small></div></div>
        <div class="gr-acts"><a class="btn gold" id="gr-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(grText(g))}">شارك في قروب الأسرة</a><button class="btn line" id="gr-copy" type="button">انسخ الرسالة</button><button class="btn line" id="gr-pv" type="button">شوف بطاقتي</button><button class="btn line gr-stop" id="gr-stop" type="button">أوقفها</button></div>` : '<p class="gr-none">ما فيه تهنئة شغّالة الحين</p>'}
      <div class="gr-pick" role="group" aria-label="أرسل تهنئة">${Object.keys(GR).map(k => `<button type="button" class="gr-k" data-grk="${k}"><b>${GR[k].b}</b><small>${g && g.k === k ? 'أرسلها مرة ثانية' : GR[k].d}</small></button>`).join('')}</div>`;
  }
  function grBind() {
    $$('#admin [data-grk]').forEach(b => b.onclick = () => arm2(b, 'أرسلها للأسرة؟', () => grSend(b.dataset.grk)));
    const c = $('#gr-copy'); if (c) c.onclick = async () => { const g = grActive(); if (!g) return; try { await navigator.clipboard.writeText(grText(g)); toast('انتسخت الرسالة'); } catch (e) { toast('ما انتسخت، استخدم زر المشاركة'); } };
    const pv = $('#gr-pv'); if (pv) pv.onclick = () => greetOpen(); const st = $('#gr-stop'); if (st) st.onclick = () => arm2(st, 'متأكد توقفها؟', grStop);
  }
  async function decideReq(id, ok, why) {
    const r = (S.reqs || []).find(x => String(x.id) === String(id)); if (!r) return;
    if (r.type === 'birth') return decideBirth(r, ok, why);
    if (r.type === 'card') return decideCard(r, ok, why);
    try {
      const res = S.cfg.decideRequest ? await S.cfg.decideRequest(r, ok) : null;
      r.status = ok ? 'ok' : 'no'; stamp(r, r.status, why);
      if (ok) { const ev = { id: 'e' + Date.now(), person_id: null, title: r.title, subtitle: null, host: null, date: r.date, time: r.time, venue: r.venue, map: r.map, note: r.note, kind: r.kind, local: true };
        if (res && res.event) Object.assign(ev, res.event);
        else if (S.cfg.addEvent && !S.cfg.decideRequest) { const x = await S.cfg.addEvent(ev); if (x && x.id) Object.assign(ev, x); }
        S.events = (S.events || []).concat(ev); saveEvents(); logIt('موافقة على طلب مناسبة', r.title); }
      saveReqs(); rqDone(r); toast(ok ? 'تمت الموافقة، ونزلت المناسبة للجميع' : 'لم تتم الموافقة، وبلّغنا صاحب الطلب');
    } catch (x) { toast('ما مشى، جرّب مرة ثانية'); }
  }
  // نعيد تنظيف الطلب قبل ما نرسمه (الطلبات تجي من الزوار)
  function ccSafe(sp) {
    const J = window.JCC; sp = sp || {}; const k = CC_OCC.find(o => o.k === sp.occ); if (!k) return null;
    const o = { occ: k.k, g: sp.g === 'f' ? 'f' : 'm', date: J.cleanText(sp.date, 30) };
    if (k.k === 'eid') { o.eid = sp.eid === 'adha' ? 'adha' : sp.eid === 'ramadan' ? 'ramadan' : 'fitr'; const en = J.cleanText(sp.name, 60); if (en && sp.pers === true) { o.name = en; o.pers = true; } else if (en) { o.name = en; const rv = J.cleanArName(sp.rel, 24); if (rv) o.rel = rv; } else o.g = 'm'; return o; }
    o.name = J.cleanText(sp.name, 60); if (!o.name) return null;
    { const rv = J.cleanArName(sp.rel, 24); if (rv) o.rel = rv; else if (sp.self === true && !NOSELF.includes(k.k)) o.self = true; }
    if (k.k === 'birth') { o.mom = sp.mom === true; o.father = J.cleanText(sp.father, 60); o.name = J.cleanArName(sp.name, 20); if (!o.father || o.name.length < 2) return null; }
    if (k.k === 'grad') { o.degree = J.cleanText(sp.degree, 60); if (!o.degree) return null; }
    if (k.k === 'quran') o.hadiths = (Array.isArray(sp.hadiths) ? sp.hadiths : []).filter(id => J.QH.some(h => h.id === id)).slice(0, 2);
    return o;
  }
  async function ccAdminPreview(id) {
    const r = (S.reqs || []).find(x => String(x.id) === String(id)); if (!r || !isAdmin()) return;
    try { await ccLoad(); } catch (e) { toast('ما انحمّلت البطاقات، تأكد من النت وجرّب مرة ثانية'); return; }
    const o = ccSafe(r.spec); if (!o) { toast('بيانات الطلب غير صحيحة'); return; }
    ccModal().classList.add('open'); ccPreview(o, false);
  }
  async function decideCard(r, ok, why) {
    if (!ok) { r.status = 'no'; stamp(r, 'no', why); saveReqs(); rqDone(r); toast('لم تتم الموافقة، وبلّغنا صاحب الطلب'); return; }
    try {
      const J = await ccLoad(), o = ccSafe(r.spec); if (!o) { toast('بيانات الطلب غير صحيحة'); return; }
      const c = await J.make(o, await J.loadLogo(S.cfg.logo || ($('.brand img') || {}).src)), sm = document.createElement('canvas'); sm.width = 720; sm.height = 900;
      const g2 = sm.getContext('2d'); g2.imageSmoothingQuality = 'high'; g2.drawImage(c, 0, 0, 720, 900); const url = sm.toDataURL('image/jpeg', .74);
      if (JSON.stringify(S.news).length + url.length > 800000) { toast('مساحة الأخبار شبه ممتلئة، احذف بعض الأخبار القديمة أول'); return; }
      const n = { id: 'n' + Date.now(), title: ccTitle(o), body: 'تهنئة من أسرة الجنيدلي · قدّمها ' + (r.by || ''), kind: 'تهنئة', pinned: false, date: new Date().toISOString(), images: [url] };
      if (S.cfg.saveNews) { const x = await S.cfg.saveNews(n, [{ url }], false); if (x) Object.assign(n, x); }
      const old = S.news.slice(); S.news = S.news.concat(n); try { saveNews(); } catch (e) { S.news = old; return; }
      r.status = 'ok'; stamp(r, 'ok'); saveReqs(); logIt('نشر بطاقة تهنئة', n.title); rqDone(r); toast('تمت الموافقة، ونزلت البطاقة في أخبار الأسرة');
    } catch (e) { console.error(e); toast('ما مشى، جرّب مرة ثانية'); }
  }
  const CHV = '<svg class="arw" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.5 6l-6 6 6 6"/></svg>';
  // نسخة العرض: تجمع تعديلات الجهاز في نص مختصر يُرسل لـ Claude ليثبّتها في الرابط
  function exportLog() {
    const l = S.log || []; if (!l.length) { toast('السجل فاضي — ما فيه شي يتصدّر'); return; }
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
    const f = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
    const rows = [['التاريخ والوقت', 'نوع التعديل', 'التفاصيل', 'بواسطة'].map(q).join(',')].concat(l.map(x => [f(x.at), logA(x.action), x.text, x.by || ''].map(q).join(',')));
    const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }), u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = 'سجل-تعديلات-الجنيدلي-' + new Date().toLocaleDateString('en-CA') + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    toast(`نزل السجل (${nCount(l.length, ['تعديل واحد', 'تعديلين', 'تعديلات', 'تعديلاً'])})، ويفتح في إكسل`);
  }
  function exportChanges() {
    const F = ['name', 'father_id', 'gender', 'link', 'birth', 'bfull', 'note', 'dead', 'dy'], orig = {}, cur = {};
    S.original.rows.forEach(r => orig[r.id] = r); S.rows.forEach(r => cur[r.id] = r);
    const add = S.rows.filter(r => !orig[r.id]).map(r => ({ id: r.id, father_id: r.father_id, name: r.name, gender: r.gender, birth: r.birth || null }));
    const del = S.original.rows.filter(r => !cur[r.id]).map(r => r.id);
    const upd = S.rows.filter(r => orig[r.id]).map(r => { const d = {}; F.forEach(f => { if ((r[f] ?? null) !== (orig[r.id][f] ?? null)) d[f] = r[f] ?? null; }); return Object.keys(d).length ? Object.assign({ id: r.id }, d) : null; }).filter(Boolean);
    const oe = {}; S.original.events.forEach(e => oe[e.id] = JSON.stringify(Object.assign({}, e, { invite: !!e.invite })));
    const strip = e => { const x = Object.assign({}, e); x.invite = e.invite ? (oe[e.id] && JSON.parse(oe[e.id]).invite ? 'نفس الدعوة' : 'صورة جديدة') : null; delete x.local; delete x.inviteFile; return x; };
    const evs = S.events.map(strip).filter(e => oe[e.id] !== JSON.stringify(Object.assign({}, e, { invite: e.invite === 'نفس الدعوة' })));
    const evDel = S.original.events.filter(e => !S.events.some(x => String(x.id) === String(e.id))).map(e => e.id);
    const out = { v: 1, add, upd, del, events: evs, eventsDel: evDel };
    const n = add.length + upd.length + del.length + evs.length + evDel.length;
    if (!n) { toast('ما فيه تعديلات جديدة على جهازك'); return; }
    const txt = 'تعديلات موقع الجنيدلي:\n' + JSON.stringify(out);
    $('#ex-n').textContent = nCount(n, ['تعديل واحد', 'تعديلين', 'تعديلات', 'تعديلاً']) + (evs.some(e => e.invite === 'صورة جديدة') ? ' — وفيه صورة دعوة جديدة، أرسلها مع النص' : '');
    $('#ex-t').value = txt; $('#exm').classList.add('open');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('انسخ النص — جاهز للإرسال'), () => { $('#ex-t').select(); });
  }
  /* تعديل وحذف فرد */
  const ED = {};
  function openEdit(n) {
    ED.dupOk = false; ED.n = n; ED.father = n.parent || null;
    $('#ed-who').textContent = lineage(n, 6);
    $('#ed-dead').checked = !!n.dead; $('#ed-dy').value = n.dy || ''; $('#ed-dyw').hidden = !n.dead;
    $('#ed-name').value = n.name; $('#ed-birth').value = n.birth || ''; $('#ed-note').value = n.note || ''; $('#ed-link').value = n.link || 'محتمل';
    $$('#ed-gender button').forEach(b => b.classList.toggle('on', b.dataset.g === (n.gender || 'male')));
    $('#ed-fq').value = ''; $('#ed-fres').innerHTML = ''; drawEdFather();
    const del = $('#ed-del'); del.disabled = !n.parent || n.kids.length > 0; delete del.dataset.armed; del.classList.remove('armed'); del.textContent = 'حذف من الشجرة';
    $('#ed-del-note').textContent = !n.parent ? 'الجد الأول ما ينحذف.' : n.kids.length ? `له أبناء في الشجرة (${ar(n.kids.length)})؛ احذفهم أو انقلهم لأب ثاني أول.` : 'الحذف نهائي، وينسجل في سجل التعديلات.';
    $('#edm').classList.add('open');
  }
  function drawEdFather() { $('#ed-father').innerHTML = ED.father ? `<b>${esc(lineage(ED.father, 5))}</b>` : '<b>— الجد الأول —</b>'; }
  function bindEdit() {
    $('#ed-dead').onchange = () => { $('#ed-dyw').hidden = !$('#ed-dead').checked; if (!$('#ed-dead').checked) $('#ed-dy').value = ''; };
    $$('#ed-gender button').forEach(b => b.onclick = () => $$('#ed-gender button').forEach(x => x.classList.toggle('on', x === b)));
    $('#ed-fq').addEventListener('input', () => {
      const bad = new Set([ED.n.id, ...descendants(ED.n).map(d => d.id)]);
      const res = search($('#ed-fq').value).filter(x => !bad.has(x.id)).slice(0, 6);
      $('#ed-fres').innerHTML = res.map(x => `<button type="button" data-id="${x.id}"><span style="flex:1;min-width:0"><b>${esc(x.name)}</b> ${x.parent ? 'بن ' + esc(chain(x).slice(1, 5).map(dispName).join(' بن ').replace(' بن آل جنيدلي', ' آل جنيدلي')) : ''}</span>${relTag(x)}</button>`).join('');
      $$('#ed-fres button').forEach(b => b.onclick = () => { ED.father = S.byId[b.dataset.id]; $('#ed-fq').value = ''; $('#ed-fres').innerHTML = ''; drawEdFather(); });
    });
    $('#ed-form').addEventListener('submit', async e => {
      e.preventDefault(); const n = ED.n, name = $('#ed-name').value.trim();
      if (!name) { toast('اكتب الاسم'); return; }
      { const fa = ED.father, g0 = $('#ed-gender .on').dataset.g; const same = fa ? fa.kids.filter(k => k !== n && norm(k.name) === norm(name) && (k.gender === 'female') === (g0 === 'female')) : [];
        if (same.length && !ED.dupOk) { ED.dupOk = true; toast(`«${name}» موجود أصلاً تحت ${dispName(fa)}. تأكد إنه شخص آخر ثم اضغط «حفظ» مرة ثانية`); return; } }
      const data = { name, gender: $('#ed-gender .on').dataset.g, father_id: ED.father ? ED.father.id : null, link: $('#ed-link').value,
        birth: $('#ed-birth').value.trim() || null, note: $('#ed-note').value.trim() || null,
        dead: $('#ed-dead').checked ? 1 : null, dy: $('#ed-dead').checked ? (toLat($('#ed-dy').value.trim()).replace(/\D/g, '').slice(0, 4) || null) : null };
      data.bfull = n.bfull && String(n.bfull).split('-')[0] === toLat(data.birth) ? n.bfull : null;
      try { if (S.cfg.updatePerson) await S.cfg.updatePerson(n, data);
        const row = S.rows.find(r => String(r.id) === String(n.id)); Object.assign(row, data, { name_c: 'واضح' });
        const moved = n.parent && String(n.parent.id) !== String(data.father_id);
        logIt('تعديل', `${lineage(n, 3)}${name !== n.name ? ` ← ${name}` : ''}${moved ? ` (نُقل تحت ${ED.father.name})` : ''}${(data.dead ? 1 : 0) !== (n.dead ? 1 : 0) ? (data.dead ? (data.gender === 'female' ? ' (سُجّلت متوفاة)' : ' (سُجّل متوفى)') : ' (أُلغي تسجيل الوفاة)') : ''}`);
        $('#edm').classList.remove('open'); refresh(n.id); saveRows(); if (S.view === 'tree') treeFocus(S.sel); toast('انحفظ التعديل'); }
      catch (x) { toast('ما انحفظ، جرّب مرة ثانية'); }
    });
    $('#ed-addk').onclick = () => { const n = ED.n; if (!n) return; $('#edm').classList.remove('open'); openAdd(n); };
    $('#ed-del').onclick = () => armDelete($('#ed-del'), async () => {
      const n = ED.n, f = n.parent;
      try { if (S.cfg.deletePerson) await S.cfg.deletePerson(n);
        S.rows = S.rows.filter(r => String(r.id) !== String(n.id)); logIt('حذف', lineage(n, 4));
        $('#edm').classList.remove('open'); refresh(f.id); saveRows(); toast(`انحذف ${n.name}`); }
      catch (x) { toast('ما انحذف، جرّب مرة ثانية'); }
    });
  }
  const bkLv = () => { const d = bkDays(); return d <= 7 ? 'ok' : d <= 14 ? 'warn' : 'bad'; };
  // الجوالات تبقى مشفّرة في النسخة: أي رقم مكشوف قديم (من قبل الحماية) ما يدخل النسخة أبداً، والمشفّر (phc) يدخل كما هو
  function bkSafe(v) {
    let L; try { L = JSON.parse(v); } catch (e) { return v; } if (!Array.isArray(L)) return v; let ch = 0;
    L = L.map(x => { if (x && x.phone) { ch = 1; const y = Object.assign({}, x); delete y.phone; return y; } return x; });
    return ch ? JSON.stringify(L) : v;
  }
  function bkDownload() {
    try {
      const data = {}; BKEYS.forEach(k => { const v = localStorage.getItem(k); if (v != null) data[k] = v; });
      const fb = { 'jnd-rows': S.rows, 'jnd-events-all': S.events || [], 'jnd-news': S.news || [], 'jnd-reqs': S.reqs || [], 'jnd-sugs': S.sugs || [], 'jnd-log': S.log || [], 'jnd-site': S.site };
      Object.keys(fb).forEach(k => { if (data[k] == null && fb[k] != null) data[k] = JSON.stringify(fb[k]); });
      for (const k of ['jnd-reqs', 'jnd-sugs']) if (data[k]) data[k] = bkSafe(data[k]);
      const d = new Date(), name = `نسخة-أسرة-الجنيدلي-${ymd(d)}.json`;
      const blob = new Blob([JSON.stringify({ app: 'jnd', v: 2, ver: JND_V, at: d.toISOString(), people: S.rows.length, keys: Object.keys(data), data })], { type: 'application/json' }), u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      try { localStorage.setItem('jnd-bk-at', String(Date.now())); localStorage.removeItem('jnd-bk-snz'); } catch (e) { }
      toast('نزلت النسخة الاحتياطية'); bellBadge(); if (S.view === 'admin') adminRender(); return true;
    } catch (e) { toast('ما نزلت النسخة، جرّب مرة ثانية'); return false; }
  }
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  function scrollKeep() {
    const els = []; for (let e = $('#admin'); e; e = e.parentElement) if (e.scrollTop > 0) els.push([e, e.scrollTop]);
    const y = window.scrollY; return () => requestAnimationFrame(() => { els.forEach(([e, t]) => { e.scrollTop = t; }); window.scrollTo(0, y); });
  }
  function setStatus(id, link) {
    if (!isAdmin() || !LK[link]) return;
    const row = S.rows.find(r => String(r.id) === String(id)), n = S.byId[id]; if (!row || !n || row.link === link) return;
    const keep = scrollKeep(), lab = SEG.find(x => x[0] === link)[2];
    row.link = link; saveRows(); logIt('تعديل', 'تغيير حالة «' + n.name + '» إلى ' + lab); AD.open = null;
    refresh(S.sel ? S.sel.id : undefined); keep(); toast('انحفظت الحالة: ' + lab);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-pst]'); if (!b) return;
    const id = b.dataset.pid != null ? b.dataset.pid : (S.sel && S.sel.id); if (id != null) setStatus(id, b.dataset.pst); });
  /* ── الشجرة: قائمة الأفراد (البحث والحالة). الحالة سطر مستقل تحت النسب، فما تزاحم الاسم ── */
  const SL = { ok: 'مؤكد', pr: 'غير مؤكد', un: 'غير واضح' }, SLP = { ok: 'مؤكدة', pr: 'غير مؤكدة', un: 'غير واضحة' };
  const NP = ['فرد واحد', 'فردين', 'أفراد', 'فرداً'];
  function adDraw() {
    const el = $('#ad-list'); if (!el) return;
    const all = S.all.filter(n => !n.pending), q = norm(AD.q), f = AD.st || 'all';
    const list = (q || f !== 'all') ? all.filter(n => (f === 'all' || n.lk === f) && (!q || norm(lineage(n, 5)).includes(q))) : [];
    const empty = f === 'all' ? (q ? 'ما لقينا الاسم، جرّب اسمه واسم أبوه' : '') : (q ? 'ما فيه اسم بهالحالة يطابق بحثك' : f === 'ok' ? 'ما فيه أسماء مؤكدة' : `<span class="ad-done">${sv('check')}</span>ما فيه أسماء ${SLP[f]}، كل شي تمام`);
    const rest = list.length - AD.limit;
    el.innerHTML = (!q && f === 'all') ? '<p class="ad-empty">اكتب الاسم واسم أبوه، مثل: فهد بن عثمان</p>' : !list.length ? `<p class="ad-empty">${empty}</p>` :
      (f !== 'all' ? `<p class="ad-count ad-flt"><span>${q ? '' : nCount(list.length, NP) + ' · '}${SL[f]}</span><button type="button" data-adst="all">اعرض الكل</button></p>` : '') +
      `<div class="pl">${list.slice(0, AD.limit).map(n => `<div class="pl-r"><span class="pl-av">${esc(dispName(n)[0])}</span><div class="pl-t"><b>${esc(dispName(n))}</b>${relTag(n)}<small>${esc(lineage(n))}</small>
        <button type="button" class="pl-st ast-${n.lk}" data-adss="${esc(n.id)}" aria-expanded="${AD.open === String(n.id)}" aria-label="الحالة: ${SL[n.lk]}، غيّرها"><i></i>${SL[n.lk]}</button>
        </div>
        <div class="pl-b"><button type="button" data-ed="${esc(n.id)}" title="عدّل" aria-label="عدّل">${sv('pen')}</button><button type="button" data-gox="${esc(n.id)}" title="شوفه في الشجرة" aria-label="شوفه في الشجرة">${sv('locate')}</button></div>
        ${AD.open === String(n.id) ? `<div class="ad-seg-w"><small>الحالة:</small>${segHtml(n.link, n.id)}</div>` : ''}</div>`).join('')}</div>`
      + (rest > 0 ? `<button type="button" class="ad-more" id="ad-more">اعرض ${ar(Math.min(25, rest))} زيادة</button>` : '');
    $$('#admin [data-adh]').forEach(b => b.setAttribute('aria-pressed', String(AD.tab === 'tree' && b.dataset.adh === AD.st)));
  }
  /* ── قوائم الصفوف (ما تنرسم إلا لما ينفتح الصف) ── */
  function adEvList() {
    const up = upcoming(), past = evSorted().filter(e => daysTo(e.date) < 0).reverse();
    const row = e => { const d = daysTo(e.date), h = sd(() => hp(utc(e.date))) || {};
      return `<div class="ad-row"><span class="ad-d ${d < 0 ? 'past' : ''}"><b>${h.d ? ar(h.d) : ''}</b><small>${HMS[h.m - 1] || ''}</small></span>
        <div class="ad-rt"><b>${esc(evTitle(e))}</b><small>${d < 0 ? 'فاتت' : esc(daysWord(d))}${e.venue ? ' · ' + esc(e.venue) : ''}</small></div>
        <div class="ad-btns"><button type="button" data-eve="${esc(e.id)}" title="عدّل" aria-label="عدّل المناسبة">${sv('pen')}</button><button type="button" class="del" data-evd="${esc(e.id)}" title="احذف" aria-label="احذف المناسبة">${sv('trash')}</button></div></div>`; };
    return (up.length ? (AD.evAll ? up : up.slice(0, 5)).map(row).join('') + (up.length > 5 ? `<button type="button" class="ad-more" data-adx="evAll">${AD.evAll ? 'اعرض أقل' : `اعرض الكل (${ar(up.length)})`}</button>` : '')
      : '<p class="ad-empty">ما فيه مناسبات قادمة للحين</p>')
      + (past.length ? `<button type="button" class="ad-sub" data-adx="evPast" aria-expanded="${AD.evPast}"><span>المناسبات الماضية (${ar(past.length)})</span><span class="chev">${CHEV}</span></button>${AD.evPast ? `<div class="ad-list">${past.map(row).join('')}</div>` : ''}` : '');
  }
  function adNwList() {
    const L = newsSorted();
    if (!L.length) return '<p class="ad-empty">ما فيه أخبار للحين</p>';
    return (AD.nwAll ? L : L.slice(0, 5)).map(n => `<div class="ad-row">${n.images && n.images[0] ? `<img class="ad-img" src="${esc(n.images[0])}" alt="" loading="lazy">` : `<span class="ad-d ad-ic">${sv('news')}</span>`}
      <div class="ad-rt"><b>${esc(n.title)}</b><small>${esc(n.kind || 'خبر')} · ${esc(nDate(n.date))}${n.pinned ? ' · مثبّت' : ''}</small></div>
      <div class="ad-btns"><button type="button" data-ned="${esc(n.id)}" title="عدّل" aria-label="عدّل الخبر">${sv('pen')}</button><button type="button" class="del" data-ndel="${esc(n.id)}" title="احذف" aria-label="احذف الخبر">${sv('trash')}</button></div></div>`).join('')
      + (L.length > 5 ? `<button type="button" class="ad-more" data-adx="nwAll">${AD.nwAll ? 'اعرض أقل' : `اعرض الكل (${ar(L.length)})`}</button>` : '');
  }
  function dupBody(L) {
    const tw = n => n === 2 ? 'مرتين' : `${ar(n)} ${n <= 10 ? 'مرات' : 'مرة'}`;
    const items = L.map(x => x.t === 'p'
      ? `<div class="dp-it"><h5>${esc(x.g[0].name)}<em>${tw(x.g.length)} تحت ${esc(dispName(x.f))}</em></h5>${x.g.map(n => `<div class="dp-row"><span>${esc(chain(n).slice(0, 3).map(dispName).join(' بن '))}<small class="dp-k">${n.kids.length ? 'أبناؤه: ' + esc(n.kids.slice(0, 3).map(k => k.name).join('، ')) + (n.kids.length > 3 ? `، وغيرهم (${ar(n.kids.length - 3)})` : '') : 'ما له أبناء مسجّلين'}${n.birth ? ' · مواليد ' + esc(n.birth) : ''}${n.pending ? ' · بانتظار الاعتماد' : ''} · رقمه ${esc(n.id)}</small></span><button type="button" data-dped="${esc(n.id)}">عدّل</button><button type="button" data-dptr="${esc(n.id)}">شوفه في الشجرة</button></div>`).join('')}<div class="dp-row"><span>إذا كانوا أشخاص مختلفين:</span><button type="button" data-dpok="${esc(x.k)}">مو تكرار</button></div></div>`
      : `<div class="dp-it"><h5>${esc(evTitle(x.g[0]))}<em>مناسبة مكررة · ${esc(sd(() => hStr(x.g[0].date)))}</em></h5><p class="as-note" style="margin:0">${nCount(x.g.length, ['مناسبة واحدة', 'مناسبتين', 'مناسبات', 'مناسبة'])} بنفس العنوان والتاريخ. احذف المكرر من «المناسبات».</p><div class="dp-row"><span>إذا كانت مناسبات مختلفة:</span><button type="button" data-dpok="${esc(x.k)}">مو تكرار</button></div></div>`).join('');
    return `<p class="as-note" style="margin-top:0">أسماء متشابهة تحت نفس الأب، ومناسبات متطابقة. راجعها قبل لا تحذف.</p>${L.length ? items : `<p class="dp-ok">${sv('check')}ما فيه تكرار، كل شي تمام</p>`}`;
  }
  const AD_LAZY = { ev: ['#ad-lz-ev', adEvList], nw: ['#ad-lz-nw', adNwList], dup: ['#ad-lz-dup', () => dupBody(dupScan())], log: ['#ad-log', () => logHTML(S.log || [])] };
  function adFill(k) {
    const z = AD_LAZY[k], el = z && $(z[0]); if (!el) return; el.innerHTML = z[1]();
    if (k === 'log' && S.cfg.logUrl) fetch(S.cfg.logUrl, { headers: { Accept: 'application/json' } }).then(r => r.json()).then(l => { const x = $('#ad-log'); if (x && Array.isArray(l)) x.innerHTML = logHTML(l); }).catch(() => { });
  }
  async function sugAct(b, st, msg, why0) {
    const id = b.dataset.sgr || b.dataset.sgd || b.dataset.sgn, x = (S.sugs || []).find(y => String(y.id) === String(id)); if (!x) return;
    const why = st === 'no' ? (why0 || '') : '';
    try { if (S.cfg.markSuggestion) await S.cfg.markSuggestion(x, st); x.status = st; stamp(x, st === 'review' ? 'review' : st, why); saveSugs(); AD.just.add(String(x.id)); rqRerender(); toast(msg); }
    catch (er) { toast('ما مشى، جرّب مرة ثانية'); }
  }
  function sugBind(root) {
    if (!root) return;
    $$('[data-sgr]', root).forEach(b => b.onclick = () => sugAct(b, 'review', 'صار قيد المراجعة، وبلّغنا صاحب الاقتراح'));
    $$('[data-sgd]', root).forEach(b => b.onclick = () => sugAct(b, 'done', 'تمت الموافقة، وبلّغنا صاحب الاقتراح'));
    $$('[data-sgn]', root).forEach(b => b.onclick = () => rjOpen(b, why => sugAct(b, 'no', 'لم تتم الموافقة، وبلّغنا صاحب الاقتراح', why)));
  }
  // نحفظ سبب الرفض المكتوب عشان إعادة الرسم ما تمسحه
  const whyKeep = root => { const w = {}; $$('.rj', root).forEach(f => { const r = $('input[type=radio]:checked', f); if (!f.hidden || r) w[f.dataset.rj] = { open: !f.hidden, v: r && r.value, t: $('.rj-t', f).value }; });
    return () => $$('.rj', root).forEach(f => { const k = w[f.dataset.rj]; if (!k) return; if (k.v != null) { const r = $$('input[type=radio]', f).find(x => x.value === k.v); if (r) r.checked = true; } $('.rj-t', f).value = k.t || '';
      if (k.open) { const a = f.closest('article'), b = a && a.querySelector('[data-rno],[data-sgn]'); if (b) b.click(); } }); };
  // أنواع البطاقة. الاقتراح يأخذ نوعه من اختيار المرسل
  const RQK = { event: ['cal', 'طلب مناسبة'], birth: ['cake', 'تاريخ ميلاد'], card: ['mail', 'بطاقة تهنئة'] };
  const SGK = { 'تصحيح اسم أو نسب': 'تصحيح اسم', 'تصحيح': 'تصحيح اسم', 'إضافة مولود': 'إضافة مولود', 'فكرة للمنصة': 'فكرة للمنصة' };
  const rqLine = (ic, t) => t ? `<div>${sv(ic)}<span>${t}</span></div>` : '';
  const rqAtFull = x => sd(() => { const d = new Date(x.at); return isNaN(d) ? '' : d.toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }); });
  // صف «يبي الرد على الواتس»: لكل الأنواع إذا صاحبه طلب الرد. الرقم ينفك على جهاز المشرف بس (phFill)
  function rqWa(x) {
    const ph = hasPh(x); if (!ph && !x.phq) return '';
    const f = rsGen(x) === 'f', st = decOf(x);
    const lab = !st ? 'تواصل بالواتس' : (x.waAt ? 'تم التبليغ · ' : '') + (f ? (x.waAt ? 'بلّغها مرة ثانية' : 'بلّغها بالواتس') : (x.waAt ? 'بلّغه مرة ثانية' : 'بلّغه بالواتس'));
    const num = x.phc ? `<small><span class="ph-c" data-phc="${esc(x.phc)}" data-pid="${esc(x.id)}">••••••••</span></small>`
      : x.phone ? `<small><a href="tel:${esc(x.phone)}"><bdi dir="ltr">${esc(phDisp(x.phone))}</bdi></a></small>` : '<small>الرقم بانتظار التشفير</small>';
    return `<div class="rq2-wa">${sv('chat')}<span>${f ? 'تبي' : 'يبي'} الرد على الواتس${num}</span>${ph ? `<a class="rq-wa" data-wab="${esc(x.id)}" target="_blank" rel="noopener" role="button" hidden>${lab}</a>` : ''}</div>`;
  }
  // أسباب الرفض الثابتة: قائمة عمودية، كل سبب سطر 44px. نفس محددات rjOpen (.rj و.rj-o و.rj-t و.rj-go و.rj-back)
  const rj2 = (id, noName) => `<fieldset class="rj rj2" data-rj="${esc(id)}" hidden><legend>سبب عدم الموافقة<small>يوصل السبب لصاحب الطلب كما هو</small></legend>
    <div class="rj2-l" role="radiogroup" aria-label="سبب عدم الموافقة">${RJ.map((t, i) => noName && i === 0 ? '' : `<label><input type="radio" name="rj-${esc(id)}" value="${i}"><span>${t}</span></label>`).join('')}<label><input type="radio" name="rj-${esc(id)}" value="x"><span>سبب آخر</span></label></div>
    <div class="rj-o" hidden><label class="rj2-ol">اكتب السبب<input class="rj-t" maxlength="140" placeholder="سطر قصير يوصله كما تكتبه"></label><p class="rj-e" role="alert" hidden>اكتب السبب، أو اختر سبباً من القائمة</p></div>
    <div class="rj2-a"><button type="button" class="rj-go go" disabled>تأكيد الرفض</button><button type="button" class="rj-back bk">تراجع</button></div></fieldset>`;
  function rq2(x, sg) {
    const t = sg ? 'sug' : x.type === 'birth' ? 'birth' : x.type === 'card' ? 'card' : 'event', id = esc(x.id), sp = x.spec || {};
    const open = sg ? sgOpen(x) : x.status === 'pending', rev = open && (x.rev || x.status === 'review'), st = decOf(x), more = AD.more.has(String(x.id));
    let ic = 'pen', lab = SGK[x.kind] || 'اقتراح', sub = '';
    if (sg) { if (!SGK[x.kind] && x.kind && x.kind !== 'أخرى') sub = x.kind; }
    else { [ic, lab] = RQK[t]; sub = t === 'event' ? (x.kind || '') : t === 'card' ? ((sd(() => ccMeta(sp.occ)) || {}).t || '') : ''; }
    const p = t === 'birth' ? S.byId[x.pid] : null, cur = p && p.birth ? (bFull(p) || p.birth + 'هـ') : '';
    const title = t === 'birth' ? (x.pname || (p ? lineage(p, 3) : '')) : t === 'sug' ? '' : t === 'card' ? (typeof sp.name === 'string' ? sp.name.slice(0, 60) : '') : (x.title || '');
    const det = t === 'event' ? rqLine('clock', '<span class="nw">' + esc(sd(() => wday(x.date) + ' ' + hStr(x.date))) + '</span>' + (x.time ? ' · <span class="nw">' + esc(sd(() => t12(x.time))) + '</span>' : '')) + rqLine('pin', x.venue ? esc(x.venue) : '')
      : t === 'birth' ? rqLine('cal', `<span class="nw">${esc(bFmt(x.y, x.m, x.d))}</span> · <span class="nw">المسجّل الحالي: ${cur ? esc(cur) : 'ما فيه'}</span>`)
      : t === 'card' ? rqLine('info', [sp.degree, sp.occ === 'birth' && sp.father ? (sp.mom ? 'الأم: ' : 'الأب: ') + sp.father : '', sp.date].filter(Boolean).map(v => '<span class="nw">' + esc(String(v)) + '</span>').join(' · '))
      : (x.bd && x.bd.y ? rqLine('cal', '<span class="nw">تاريخ الميلاد: ' + esc(bFmt(x.bd.y, x.bd.m, x.bd.d)) + '</span>') : '');
    const txt = t === 'event' ? x.note : t === 'sug' ? x.text : '';
    const others = t === 'birth' && open ? bReqOf({ id: x.pid }).filter(y => y !== x) : [];
    const res = !open ? `<p class="rq2-res ${st === 'ok' ? 'ok' : 'no'}">${sv(st === 'ok' ? 'check' : 'xmark')}<span>${st === 'ok' ? 'تمت الموافقة' : 'لم تتم الموافقة'}${st === 'no' && x.why ? ' · السبب: ' + esc(x.why) : ''}</span></p>` : '';
    const mapOk = t === 'event' && /^https:\/\/\S+$/.test(String(x.map || ''));
    const xb = more ? `<div class="rq2-x" id="rqx-${id}">
        ${t === 'card' ? `<div class="rq2-cc" data-ccimg="${id}"><span>جاري تجهيز البطاقة…</span></div><button type="button" class="abtn line full" data-ccpv="${id}">اعرض البطاقة بحجمها</button>` : ''}
        <dl>${rqAtFull(x) ? `<div><dt>وقت الإرسال</dt><dd>${esc(rqAtFull(x))}</dd></div>` : ''}${t === 'event' && x.date ? `<div><dt>الموافق</dt><dd>${esc(sd(() => gStr(x.date)))}</dd></div>` : ''}${mapOk ? `<div><dt>الموقع</dt><dd><a href="${esc(x.map)}" target="_blank" rel="noopener noreferrer">افتح الخريطة</a></dd></div>` : ''}</dl>
        ${open ? (rev ? '<p class="rq2-rvn">قيد المراجعة، وصاحب الطلب يشوف هذا عنده</p>' : `<button type="button" class="abtn line full" ${sg ? 'data-sgr' : 'data-rrv'}="${id}">${sv('search')}بنراجعه</button><small class="rq2-rvh">يوصل لصاحب الطلب إنه قيد المراجعة</small>`) : ''}</div>` : '';
    return `<article class="rq2${open ? '' : ' dec'}" data-rq="${id}">
      <div class="rq2-h"><span class="rq2-k${sg ? ' k-sug' : ''}">${sv(ic)}${lab}${sub ? ' · ' + esc(sub) : ''}</span>${rev ? '<span class="rq2-rv">قيد المراجعة</span>' : ''}<time class="rq2-t">${esc(nDate(String(x.at || '')))}</time></div>
      ${title ? `<h4>${esc(title)}</h4>` : ''}${det ? `<div class="rq2-d">${det}</div>` : ''}${txt ? `<p class="rq2-q">${esc(txt)}</p>` : ''}
      <p class="rq2-by">${sv('user')}<span>من: <b>${esc(x.by || '')}</b>${t === 'birth' ? ' · ' + (x.self ? 'الشخص نفسه' : 'الأب') : ''}</span></p>
      ${others.length ? `<p class="rq-cf">فيه ${nCount(others.length + 1, ['طلب واحد', 'طلبين', 'طلبات', 'طلباً'])} لنفس الشخص: ${others.map(y => `${esc(bFmt(y.y, y.m, y.d))} (${y.self ? (p && p.gender === 'female' ? 'هي نفسها' : 'هو نفسه') : (p && p.gender === 'female' ? 'أبوها' : 'أبوه')})`).join('، ')}. إذا وافقت على واحد تنرفض الباقي تلقائياً.</p>` : ''}
      ${rqWa(x)}${res}
      ${open ? `<div class="rq2-a"><button type="button" class="ok" ${sg ? 'data-sgd' : 'data-rok'}="${id}">${sv('check')}${t === 'event' || t === 'card' ? 'اقبل وانشر' : 'اقبل'}</button><button type="button" class="no" ${sg ? 'data-sgn' : 'data-rno'}="${id}" aria-expanded="false">ارفض</button><button type="button" class="more" data-rq2-more="${id}" aria-expanded="${more}" aria-controls="rqx-${id}">التفاصيل</button></div>`
        : `<div class="rq2-a one"><button type="button" class="more" data-rq2-more="${id}" aria-expanded="${more}" aria-controls="rqx-${id}">التفاصيل</button></div>`}
      ${xb}${open ? rj2(x.id, !sg) : ''}
    </article>`;
  }
  // معاينة البطاقة داخل «التفاصيل»: البطاقة تبان قبل القرار بضغطة وحدة
  const CCIMG = {};
  async function rqCcFill(root) {
    for (const box of $$('[data-ccimg]', root)) {
      const id = box.dataset.ccimg, r = (S.reqs || []).find(x => String(x.id) === id); if (!r) continue;
      const put = () => { if (document.body.contains(box)) box.innerHTML = `<img src="${CCIMG[id]}" alt="معاينة البطاقة">`; };
      if (CCIMG[id]) { put(); continue; }
      try { const J = await ccLoad(), o = ccSafe(r.spec); if (!o) { box.innerHTML = '<span>بيانات الطلب غير صحيحة</span>'; continue; }
        const c = await J.make(o, await J.loadLogo(S.cfg.logo || ($('.brand img') || {}).src)), b = await J.toBlob(c, 'image/png'); CCIMG[id] = URL.createObjectURL(b); put(); }
      catch (e) { box.innerHTML = '<span>ما تجهّزت البطاقة، جرّب مرة ثانية</span>'; }
    }
  }
  // التنبيهات (آخر «بانتظارك»): صف لكل تنبيه بلون حالته
  const alRow = (c, ic, b, s, btn) => `<div class="al ${c}">${sv(ic)}<span><b>${b}</b>${s}</span>${btn || ''}</div>`;
  function adAlerts(P) {
    const A = [];
    if (bkDue()) { const d = bkDays(); A.push(alRow('bad', 'save', d === Infinity ? 'ما نزّلت نسخة احتياطية للحين' : `مضى ${nCount(d, ['يوم', 'يومان', 'أيام', 'يوماً'])} على آخر نسخة احتياطية`, 'نزّل نسخة الحين واحفظها عندك', '<button type="button" data-bkgo>نزّلها</button>')); }
    if (P.d) A.push(alRow('warn', 'copy', `أسماء مكررة محتملة (${ar(P.d)})`, 'راجعها قبل لا تحذف شي', '<button type="button" data-adsec="dup">افحصها</button>'));
    if (cloudOn() && window.JNDKey) A.push(JNDKey.hasPk() && JNDKey.hasSk() ? alRow('ok', 'lock', 'حماية أرقام الواتس شغّالة', 'أرقام المرسلين محفوظة مشفّرة، وما تحتاج تسوي شي') : phAdminCard());
    const nE = errList().length; if (nE) A.push(alRow('warn', 'alert', 'المشاكل التقنية', `${nCount(nE, ['مشكلة واحدة', 'مشكلتين', 'مشاكل', 'مشكلة'])} على هالجهاز`, '<button type="button" data-ero>اعرضها</button>'));
    const g = grActive(); if (g) A.push(alRow('ok', 'mail', `التهنئة شغّالة: ${GR[g.k].b}`, 'كل فرد توصله بطاقة باسمه في الجرس والرئيسية', '<button type="button" data-adsec="gr">افتحها</button>'));
    return A.length ? A.join('') : '<p class="ad-empty">ما فيه تنبيهات</p>';
  }
  function adInbox(dups) {
    const el = $('#adp-inbox'); if (!el) return; const back = whyKeep(el);
    const jr = x => AD.just.has(String(x.id));
    const R = (S.reqs || []).filter(r => !r.sup), SG = S.sugs || [];
    const rL = R.filter(r => r.status === 'pending' || jr(r)), rH = R.filter(r => r.status !== 'pending' && !jr(r));
    const sL = SG.filter(x => sgOpen(x) || jr(x)), sH = SG.filter(x => !sgOpen(x) && !jr(x));
    // الأحدث أول، والطلبات والاقتراحات في قائمة وحدة
    const L = rL.map(x => [x, 0]).concat(sL.map(x => [x, 1])).sort((a, b) => String(b[0].at || '').localeCompare(String(a[0].at || '')));
    // «السابقة»: سجل واحد (طلبات واقتراحات) مرتب بتاريخ القرار، والأقدم من شهر مطوي داخله
    const H = rH.concat(sH).sort((a, b) => mqT(b).localeCompare(mqT(a))), H1 = H.filter(x => mqDays(x) <= 30), H2 = H.filter(x => mqDays(x) > 30);
    const P = admPend(dups), tot = P.n, nH = H.length;   // v58: نفس مصدر رقم الجرس
    const pv = x => `<article class="ib-pv"><div class="rq-h"><span class="rq-k">${esc(x.kind || 'مناسبة')}</span>${stPill(x)}</div>
        <b>${esc(x.title || rsSub(x) || x.pname || '')}</b>${x.bd && x.bd.y ? `<small>تاريخ الميلاد: ${esc(bFmt(x.bd.y, x.bd.m, x.bd.d))}</small>` : ''}<small>من: ${esc(x.by || '')} · ${esc(rsWhen(x))}</small>${x.status === 'no' && x.why ? `<p class="rq-why-t">السبب: ${esc(x.why)}</p>` : ''}</article>`;
    if (AD.ib === 'hist' && !nH) AD.ib = '';
    const last = H[0] ? rsWhen(H[0]) : '';
    el.innerHTML = `<div class="adp-h"><h2>بانتظارك</h2>${tot ? `<small>${nCount(tot, ['أمر واحد', 'أمران', 'أمور', 'أمراً'])} · الأحدث أول</small>` : ''}</div>
      ${L.length ? L.map(([x, s]) => sd(() => rq2(x, s))).join('') : tot ? '' : `<div class="ad-zero"><i>${sv('check')}</i><b>ما فيه شي بانتظارك</b><small>أول ما يوصل طلب أو اقتراح يطلع هنا</small></div>`}
      ${nH ? `<button type="button" class="adr" data-ib="hist" aria-expanded="${AD.ib === 'hist'}">${sv('clock')}<span><b>السابقة</b><small>${nCount(nH, ['قرار واحد', 'قراران', 'قرارات', 'قراراً'])}${last ? ' · آخرها ' + esc(last) : ''}</small></span>${CHV}</button>${AD.ib === 'hist' ? `<div class="ib-prev">${H1.map(x => sd(() => pv(x))).join('')}${H2.length ? (AD.arch ? H2.map(x => sd(() => pv(x))).join('') : `<button type="button" class="ib-old" data-arch>عرض الأقدم من شهر (${ar(H2.length)})</button>`) : ''}</div>` : ''}` : ''}
      <h3 class="adp-sub">التنبيهات</h3>${adAlerts(P)}`;
    rqBind(el); sugBind(el); phBind(); back(); rqCcFill(el);
    const ao = $('[data-arch]', el); if (ao) ao.onclick = () => { AD.arch = 1; adInbox(dups); };
  }
  function adBindAll() { phBind(); grBind(); bindSup(); adBind(); momAdBind(); }
  function adToggle(k, force) {
    const hd = $(`#admin [data-fold="${k}"]`), bd = $('#ad-b-' + k); if (!hd || !bd) return;
    const y0 = hd.getBoundingClientRect().top, open = force === true || AD.sec !== k;
    AD.sec = open ? k : ''; adSave();
    $$('#admin [data-fold]').forEach(h => { const kk = h.dataset.fold, on = kk === AD.sec, b = $('#ad-b-' + kk); h.setAttribute('aria-expanded', String(on)); if (b) b.hidden = !on; });
    if (open && !bd.dataset.f) { bd.innerHTML = AD_BODY[k] ? AD_BODY[k]() : ''; bd.dataset.f = '1'; adBindAll(); }
    if (open) adFill(k);
    // نثبّت رأس الصف في مكانه على الشاشة لما ينطوي الصف اللي فوقه (يشتغل مع أي حجم خط، لأن المقاسات كلها بإحداثيات الشاشة)
    const d = hd.getBoundingClientRect().top - y0; if (Math.abs(d) > 1) { const sc = adScroller(); sc.scrollTop += d; }
  }
  // بعد تبديل القسم: إذا كان الشريط ملزوق فوق، نرجع لأول القسم الجديد
  // ننزل لين يلزق شريط الأقسام فوق (بعد البطاقة)
  function adToBar() { const sc = adScroller(), h = $('#admin .ad-hero'); if (!h) return; const base = sc === document.scrollingElement || sc === document.documentElement || sc === document.body ? 0 : sc.getBoundingClientRect().top;
    sc.scrollTop = Math.max(0, h.getBoundingClientRect().bottom - base + sc.scrollTop); }
  function adTab(k, kb) {
    if (!AD_TABS.some(x => x[0] === k)) return;
    if (AD.tab !== k) { AD.tab = k; if (AD_TAB[AD.sec] !== k) AD.sec = ''; adSave(); adminRender(); adTop(); }
    if (kb) { const t = $('#adt-' + k); if (t) t.focus(); }
  }
  function adKey(e) {
    const t = e.target.closest('[role=tab]'); if (!t || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const ks = AD_TABS.map(x => x[0]), i = ks.indexOf(t.dataset.adt), rtl = getComputedStyle(t).direction === 'rtl';
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? ks.length - 1 : (i + ((e.key === 'ArrowLeft') === rtl ? 1 : -1) + ks.length) % ks.length;
    e.preventDefault(); adTab(ks[j], true);
  }
  // v58: التصدير والاستيراد بإكسل. القارئ assets/xl-58.js (window.JNDXL) ما يتحمّل إلا عند الضغط. كل نص منه يمر على esc()
  const XL_URL = 'assets/xl-58.js';
  const XL = {
    p: null,
    load() { return XL.p || (XL.p = new Promise((ok, no) => {
      if (window.JNDXL) return ok(window.JNDXL);
      const s = document.createElement('script'); s.src = XL_URL;
      s.onload = () => window.JNDXL ? ok(window.JNDXL) : (XL.p = null, no(new Error('xl')));
      s.onerror = () => { XL.p = null; s.remove(); no(new Error('xl-load')); };
      document.head.appendChild(s); })); },
    async need() { if (!window.JNDXL) toast('جاري تجهيز قارئ الإكسل…'); try { return await XL.load(); } catch (e) { toast('ما تحمّل قارئ الإكسل، تأكد من النت وجرّب مرة ثانية'); return null; } },
    async tree() { const J = await XL.need(); if (!J) return;
      try { J.save(J.exportTree(S.rows), J.names.tree(new Date())); toast(`نزل ملف الشجرة (${nCount(S.rows.length, J.NP)})`); } catch (e) { toast('ما نزل الملف، جرّب مرة ثانية'); } },
    async imp() { const J = await XL.need(); if (!J) return; impOpen(J); },
  };
  /* ── نافذة الاستيراد: الملف ← المراجعة ← الإضافة ── */
  let IMP = null;
  const IMP_ST = ['الملف', 'المراجعة', 'الإضافة'];
  const impIc = { ok: 'check', warn: 'info', err: 'xmark', skip: 'info' }, impCls = { ok: 'g', warn: 'y', err: 'r', skip: 's' };
  function impOpen(J) {
    impClose();
    const d = document.createElement('div'); d.className = 'imp'; d.id = 'imp'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'imp-t');
    document.body.appendChild(d); document.body.classList.add('sh-open');
    IMP = { J, el: d, step: 1, rows: null, dec: {}, f: '', all: false, R: null, busy: '', err: '', ret: document.activeElement, rec: null, done: null, undo: false };
    d.addEventListener('click', impClick); d.addEventListener('change', impChange);
    IMP.key = e => { if (!IMP) return; if (e.key === 'Escape' && !IMP.busy) { e.preventDefault(); impClose(); }
      if (e.key === 'Tab') { const F = $$('button:not([disabled]),input:not([type=file]),label.imp-drop', d).filter(x => x.offsetParent !== null); if (!F.length) return; const a = F.indexOf(document.activeElement);
        if (e.shiftKey ? a <= 0 : a === F.length - 1) { e.preventDefault(); F[e.shiftKey ? F.length - 1 : 0].focus(); } } };
    document.addEventListener('keydown', IMP.key, true);
    impDraw(); setTimeout(() => { const x = $('.imp-x', d); try { x && x.focus({ preventScroll: true }); } catch (e) { } }, 30);
  }
  function impClose() {
    if (!IMP) return; const { el, key, ret } = IMP; IMP = null; document.removeEventListener('keydown', key, true); el.remove(); document.body.classList.remove('sh-open');
    try { ret && ret.focus && ret.focus({ preventScroll: true }); } catch (e) { }
  }
  const impVal = () => { IMP.R = IMP.J.validate(IMP.rows, S.rows, { decisions: IMP.dec }); return IMP.R; };
  function impRow(it, done) {
    const c = impCls[it.level], lid = 'ir-' + it.line;
    const sub = [it.gender === 'female' ? 'أنثى' : it.gender === 'male' ? 'ذكر' : '', it.birth ? String(it.birth) : ''].filter(Boolean).join(' · ');
    let m = '';
    if (done) m = `<p class="ir-m">${esc(it.msg || '')}</p>`;
    else if (it.level === 'err') m = `<p class="ir-m">${esc(it.msg || '')}${it.fix ? `<span class="ir-fix">الحل: ${esc(it.fix)}</span>` : ''}</p>${(it.errs || []).slice(1).map(x => `<p class="ir-m">${esc(x.msg)}${x.fix ? `<span class="ir-fix">الحل: ${esc(x.fix)}</span>` : ''}</p>`).join('')}`;
    else m = `<p class="ir-m">${esc(it.msg || '')}</p>`;
    const ch = !done && it.choices && it.choices.length ? `<div class="ir-c" role="radiogroup" aria-labelledby="${lid}">${it.choices.map(o => `<label><input type="radio" name="d${esc(String(it.line))}" data-xd="${esc(String(it.line))}" value="${esc(o.v)}"${it.decision === o.v ? ' checked' : ''}>${esc(o.t)}</label>`).join('')}</div>` : '';
    return `<div class="ir ${c}"><div class="ir-h">${sv(impIc[it.level])}<span><b id="${lid}">${esc(it.name || '—')}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="ir-n">السطر ${ar(it.line)}</span></div>${m}${ch}</div>`;
  }
  function impDraw() {
    if (!IMP) return; const d = IMP.el, s = IMP.step, J = IMP.J, keep = $('.imp-b', d) ? $('.imp-b', d).scrollTop : 0;
    const stp = `<ol class="imp-stp">${IMP_ST.map((t, i) => `<li class="${i + 1 < s ? 'done' : i + 1 === s ? 'cur' : ''}"${i + 1 === s ? ' aria-current="step"' : ''}><i>${i + 1 < s ? sv('check') : ar(i + 1)}</i>${t}</li>`).join('')}</ol>`;
    const head = `<div class="imp-h">${s === 2 ? `<button class="sh-x imp-bk" type="button" aria-label="رجوع">${ARWB}</button>` : ''}<h3 id="imp-t">أضف أسماء من إكسل</h3><button class="sh-x imp-x" type="button" aria-label="إغلاق">${sv('xmark')}</button></div>`;
    let body = '', foot = '';
    if (s === 1) {
      body = `<div class="atl imp-tl"><div class="atl-h"><span class="atl-ic gold">${sv('sheet')}</span><span><b>أضف أسماء كثيرة دفعة وحدة</b><small>نزّل النموذج، واكتب فيه الأسماء، وارفعه هنا. نقبل ملف إكسل (xlsx) أو csv.</small></span></div>
        <div class="imp-tw"><table class="imp-tbl"><thead><tr><th>الاسم</th><th>رقم الأب أو نسبه</th><th>الجنس</th><th>تاريخ الميلاد</th></tr></thead>
          <tbody><tr><td>نورة</td><td>245</td><td>أنثى</td><td>1445/03/12</td></tr><tr><td>عبدالله</td><td>فهد بن عثمان بن إبراهيم</td><td>ذكر</td><td></td></tr></tbody></table></div>
        <button type="button" class="abtn line full imp-tpl">${sv('down')}نزّل النموذج</button></div>
        ${IMP.err ? `<p class="imp-err" role="alert">${sv('alert')}<span>${esc(IMP.err)}</span></p>` : ''}
        <label class="imp-drop${IMP.busy ? ' busy' : ''}" tabindex="0">${sv('up')}<b>${IMP.busy ? esc(IMP.busy) : 'اختر الملف'}</b><small>إكسل (xlsx) أو csv</small><input type="file" class="imp-file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label>`;
      foot = `<div class="imp-f one"><button type="button" class="abtn line imp-x2">إلغاء</button></div>`;
    } else if (s === 2) {
      const R = IMP.R || impVal(), n = R.n, f = IMP.f;
      const grp = (lv, t) => { let L = R.items.filter(x => x.level === lv); if (!L.length || (f && f !== lv)) return '';
        let more = ''; if (lv === 'ok' && L.length > 20 && !IMP.all) { more = `<button type="button" class="abtn line full imp-all">اعرض الكل (${ar(L.length)})</button>`; L = L.slice(0, 5); }
        return `<h4 class="adp-sub">${t}</h4>${L.map(x => impRow(x)).join('')}${more}`; };
      body = `<h3 class="imp-ti">راجع الأسماء قبل الإضافة</h3>
        <div class="imp-rs" role="group" aria-label="تصفية الأسطر">${[['ok', 'g', 'check', 'جاهزة'], ['warn', 'y', 'info', 'تحتاج قرارك'], ['err', 'r', 'xmark', 'فيها خطأ']].map(([k, c, ic, t]) => `<button type="button" class="${c}" data-imf="${k}" aria-pressed="${f === k}"><b>${sv(ic)}${ar(n[k] || 0)}</b><small>${t}</small></button>`).join('')}</div>
        ${grp('warn', 'تحتاج قرارك')}${grp('err', 'فيها خطأ، ما تنضاف')}${grp('ok', 'جاهزة')}${grp('skip', 'ما تنضاف')}
        ${n.err ? `<p class="as-note">الأسطر الحمراء ما تنضاف. صلّحها في الملف وارفعه مرة ثانية، أو كمّل بالباقي.</p>` : ''}
        <p class="imp-note">${sv('info')}<span>بنحفظ نسخة احتياطية قبل الإضافة، وتقدر تتراجع بعدها.</span></p>`;
      const lab = IMP.busy ? esc(IMP.busy) : R.need > 0 ? `اختر قرارك في الأسطر الصفراء أول (باقي ${ar(R.need)})` : !R.add ? 'ما فيه أسطر جاهزة للإضافة' : `أضف ${esc(nCount(R.add, J.NP))}`;
      foot = `<div class="imp-f"><button type="button" class="abtn pri imp-go"${R.need > 0 || !R.add || IMP.busy ? ' disabled' : ''}>${lab}</button><button type="button" class="abtn line imp-bk">${ARWB}غيّر الملف</button></div>`;
    } else {
      const D = IMP.done, miss = D.miss;
      body = `<div class="imp-done"><i>${sv('check')}</i><h4>انضاف ${esc(nCount(D.n, J.NP))} للشجرة</h4><p>انحفظت نسخة احتياطية قبل الإضافة، وانسجّلت العملية في السجل.</p></div>
        ${miss.length ? `<h4 class="adp-sub">ما انضاف ${esc(nCount(miss.length, ['سطر واحد', 'سطرين', 'أسطر', 'سطراً']))}:</h4>${miss.map(x => impRow(x, 1)).join('')}` : ''}
        ${IMP.undo ? `<div class="imp-undo" role="alert"><p>بتنمسح الأسماء اللي انضافت في هالاستيراد (${ar(D.n)}). متأكد؟</p><div class="adrow2"><button type="button" class="abtn imp-redf imp-uy">نعم، تراجع</button><button type="button" class="abtn line imp-un">لا</button></div></div>` : ''}`;
      foot = `<div class="imp-f"><button type="button" class="abtn pri imp-see">${sv('tree')}شوف الأسماء في الشجرة</button><button type="button" class="abtn imp-redl imp-u"${IMP.undo ? ' aria-expanded="true"' : ''}>تراجع</button></div>`;
    }
    d.innerHTML = head + stp + `<div class="imp-b">${body}</div>` + foot;
    if (s === 2 && keep) $('.imp-b', d).scrollTop = keep;
  }
  async function impFile(file) {
    if (!IMP || !file) return; IMP.err = ''; IMP.busy = 'جاري قراءة الملف…'; impDraw();
    try { const rows = await IMP.J.parse(file); if (!IMP) return; IMP.rows = rows; IMP.dec = {}; IMP.f = ''; IMP.all = false; IMP.busy = ''; impVal(); IMP.step = 2; impDraw(); $('.imp-b', IMP.el).scrollTop = 0; }
    catch (e) { if (!IMP) return; IMP.busy = ''; IMP.err = e && e.code ? String(e.message) : 'ما قدرنا نقرأ الملف. احفظه من إكسل مرة ثانية وجرّب'; impDraw(); }
  }
  async function impAdd() {
    const R = impVal(); if (R.need > 0 || !R.add) { impDraw(); return; }
    IMP.busy = 'جاري حفظ نسخة احتياطية…'; impDraw();
    try { localStorage.setItem('jnd-imp-pre', JSON.stringify(S.rows)); } catch (e) { }
    if (!bkDownload()) { IMP.busy = ''; impDraw(); toast('ما انحفظت النسخة الاحتياطية، فما أضفنا شي. جرّب مرة ثانية'); return; }
    IMP.busy = 'جاري الإضافة…'; impDraw();
    const J = IMP.J; let out;
    try { out = J.build(R.plan); } catch (e) { IMP.busy = ''; impDraw(); toast('ما تمت الإضافة، جرّب مرة ثانية'); return; }
    S.rows.push(...out.rows); saveRows(); logIt('استيراد من إكسل', nCount(out.rec.n, J.NP));
    try { localStorage.setItem('jnd-imp-last', JSON.stringify(out.rec)); } catch (e) { }
    refresh(); bellBadge();
    IMP.rec = out.rec; IMP.added = out.rows; IMP.busy = ''; IMP.step = 3;
    IMP.done = { n: out.rec.n, miss: R.items.filter(x => x.level === 'err' || x.level === 'skip') };
    impDraw();
  }
  function impUndo() {
    const J = IMP.J; let u;
    try { u = J.undo(S.rows, IMP.rec); } catch (e) { toast('ما تم التراجع، جرّب مرة ثانية'); return; }
    if (!u || !u.ok) { IMP.undo = false; impDraw(); toast(u && u.msg ? u.msg : 'ما تم التراجع، جرّب مرة ثانية'); return; }
    S.rows = u.rows; saveRows(); logIt('تراجع عن استيراد', nCount(u.n, J.NP));
    try { localStorage.removeItem('jnd-imp-last'); } catch (e) { }
    impClose(); refresh(); bellBadge(); toast('تراجعنا، وانمسحت أسماء آخر استيراد');
  }
  function impClick(e) {
    if (!IMP) return; const t = e.target, at = s => t.closest(s);
    if (at('.imp-x,.imp-x2')) { if (!IMP.busy) impClose(); return; }
    if (at('.imp-bk')) { if (IMP.busy) return; IMP.step = 1; IMP.err = ''; impDraw(); return; }
    if (at('.imp-tpl')) { try { IMP.J.save(IMP.J.template(S.rows), IMP.J.names.template()); } catch (x) { toast('ما نزل الملف، جرّب مرة ثانية'); } return; }
    let b;
    if ((b = at('[data-imf]'))) { const k = b.dataset.imf; IMP.f = IMP.f === k ? '' : k; impDraw(); return; }
    if (at('.imp-all')) { IMP.all = true; impDraw(); return; }
    if (at('.imp-go')) { if (!IMP.busy) impAdd(); return; }
    if (at('.imp-see')) { const r = IMP.added && IMP.added[0], n = r && (S.byId[r.father_id] || S.byId[r.id]); impClose(); go('tree', n); return; }
    if (at('.imp-u')) { IMP.undo = !IMP.undo; impDraw(); return; }
    if (at('.imp-un')) { IMP.undo = false; impDraw(); return; }
    if (at('.imp-uy')) { impUndo(); return; }
  }
  function impChange(e) {
    if (!IMP) return; const t = e.target;
    if (t.classList.contains('imp-file')) { const f = t.files && t.files[0]; t.value = ''; impFile(f); return; }
    if (t.dataset.xd != null) { IMP.dec[t.dataset.xd] = t.value; impVal(); impDraw(); toast('انحفظ قرارك');
      const x = $(`input[name="d${CSS.escape(t.dataset.xd)}"]:checked`, IMP.el); if (x) try { x.focus({ preventScroll: true }); } catch (y) { } }
  }
  function adClick(e) {
    const t = e.target, at = s => t.closest(s);
    let b;
    if ((b = at('[data-adt]'))) { adTab(b.dataset.adt); return; }
    if ((b = at('[data-fold]'))) { adToggle(b.dataset.fold); return; }
    if ((b = at('[data-adq]'))) { const k = b.dataset.adq; if (k === 'person') openAdd(null); else if (k === 'event') openEvent(null); else if (k === 'news') openNewsEd(); return; }
    if ((b = at('[data-ib]'))) { AD.ib = AD.ib === b.dataset.ib ? '' : b.dataset.ib; adInbox(dupScan()); return; }
    if ((b = at('[data-adsec]'))) { adOpen(b.dataset.adsec); return; }
    if (at('[data-bkgo]')) { bkDownload(); return; }
    if (at('[data-ero]')) { errOpen(); return; }
    if ((b = at('[data-xl]'))) { const f = XL[b.dataset.xl]; if (f) f(); return; }
    if ((b = at('[data-rq2-more]'))) { const k = b.dataset.rq2More; if (AD.more.has(k)) AD.more.delete(k); else AD.more.add(k); adInbox(dupScan());
      const nb = $(`#adp-inbox [data-rq2-more="${CSS.escape(k)}"]`); if (nb) nb.focus({ preventScroll: true }); return; }
    if ((b = at('[data-adx]'))) { const k = b.dataset.adx; AD[k] = !AD[k]; adFill(k === 'nwAll' ? 'nw' : 'ev'); return; }
    if ((b = at('[data-adw]'))) { if (AD.tab !== 'inbox') adTab('inbox'); adToBar(); return; }
    if ((b = at('[data-adh]'))) { const k = b.dataset.adh; AD.st = AD.tab === 'tree' && AD.st === k ? 'all' : k; AD.limit = 25; AD.open = null; if (AD.tab !== 'tree') adTab('tree'); else adDraw(); return; }
    if ((b = at('[data-adst]'))) { const k = b.dataset.adst; AD.st = AD.st === k ? 'all' : k; AD.limit = 25; AD.open = null; adDraw(); return; }
    const id = (k, a) => (b = at('[' + k + ']')) && b.dataset[a];
    let v;
    if ((v = id('data-ed', 'ed')) != null) { const n = S.byId[v]; if (n) openEdit(n); return; }
    if ((v = id('data-adk', 'adk')) != null) { const n = S.byId[v]; if (n) openAdd(n); return; }
    if ((v = id('data-gox', 'gox')) != null) { const n = S.byId[v]; if (n) go('tree', n); return; }
    if ((v = id('data-adss', 'adss')) != null) { AD.open = AD.open === v ? null : v; adDraw(); return; }
    if (at('#ad-more')) { AD.limit += 25; adDraw(); return; }
    if ((v = id('data-eve', 'eve')) != null) { const x = (S.events || []).find(y => String(y.id) === v); if (x) openEvent(x); return; }
    if ((v = id('data-evd', 'evd')) != null) { const x = (S.events || []).find(y => String(y.id) === v); if (x) armDelete(b, () => removeEvent(x)); return; }
    if ((v = id('data-ned', 'ned')) != null) { const x = (S.news || []).find(y => String(y.id) === v); if (x) openNewsEd(x); return; }
    if ((v = id('data-ndel', 'ndel')) != null) { const n = (S.news || []).find(y => String(y.id) === v); if (!n) return;
      armDelete(b, async () => { try { if (S.cfg.deleteNews) await S.cfg.deleteNews(n); S.news = S.news.filter(x => x !== n); try { const del = JSON.parse(localStorage.getItem('jnd-news-del') || '[]'); del.push(String(n.id)); localStorage.setItem('jnd-news-del', JSON.stringify(del)); } catch (x) { } saveNews(); logIt('حذف خبر', n.title); adminRender(); toast('انحذف الخبر'); } catch (er) { toast('ما انحذف، جرّب مرة ثانية'); } }); return; }
    if ((v = id('data-dped', 'dped')) != null) { const n = S.byId[v]; if (n) openEdit(n); return; }
    if ((v = id('data-dptr', 'dptr')) != null) { const n = S.byId[v]; if (n) go('tree', n); return; }
    if ((v = id('data-dpok', 'dpok')) != null) { S.site.dupOk = (S.site.dupOk || []).filter(x => x !== v).concat(v);
      try { localStorage.setItem('jnd-site', JSON.stringify(S.site)); } catch (x) { } logIt('إعدادات', 'أكّد إنها مو تكرار'); toast('تمام، ما راح ننبّهك عليها مرة ثانية'); bellBadge(); adminRender(); return; }
  }
  /* ── أجسام الصفوف ── */
  function setBody() {
    const a = S.all.filter(n => !n.pending), k = a.filter(n => n.birth).length, f = a.filter(n => n.bfull).length, pb = (S.reqs || []).filter(r => r.type === 'birth' && r.status === 'pending').length;
    return `<div class="as-grp" style="margin-top:0"><h4>نصوص الموقع</h4>
        <label class="as-f"><span>اسم المنصة</span><input id="as-name" maxlength="40" value="${esc(S.site.name)}"></label>
        <label class="as-f"><span>عبارة الترحيب <small>تطلع فوق الاسم في الرئيسية</small></span><input id="as-welcome" maxlength="40" value="${esc(S.site.welcome)}"></label>
        <label class="as-f"><span>سطر النسب <small>يطلع تحت الاسم في الرئيسية</small></span><input id="as-lineage" maxlength="80" value="${esc(S.site.lineage)}"></label>
        <label class="as-f"><span>رقم واتساب الإدارة <small>يطلع للزوار زر «تواصل مع الإدارة». اتركه فاضي إذا ما تبيه.</small></span><input id="as-contact" inputmode="tel" dir="ltr" placeholder="05xxxxxxxx" maxlength="16" value="${esc(S.site.contact)}"></label>
        <div class="as-act"><button type="button" class="btn" id="as-save">احفظ</button><button type="button" class="btn line" id="as-reset">رجّع النصوص الأصلية</button></div></div>
      <div class="as-grp"><h4>وش يشوف الزوار</h4>
        ${SECS.map(([k2, t, d]) => `<label class="as-sw"><span><b>${t}</b><small>${d}</small></span><input type="checkbox" data-sec="${k2}" ${S.site.hide[k2] ? '' : 'checked'}><i></i></label>`).join('')}
        <label class="as-sw"><span><b>تاريخ الميلاد (هجري)</b><small>مسجّل: ${ar(k)} من ${ar(a.length)} · ${ar(f)} بتاريخ كامل · ${pb ? nCount(pb, ['طلب واحد', 'طلبين', 'طلبات', 'طلباً']) + ' بانتظارك' : 'ما فيه طلبات'}</small></span><input type="checkbox" data-birth ${S.site.birthOn ? 'checked' : ''}><i></i></label>
        <p class="as-note">القسم المطفي يختفي عن الزوار، وأنت تشوفه. «تاريخ الميلاد» لما تفتحه يظهر في «ملفي» لكل واحد يسجّل تاريخه، والأب يسجّل لأبنائه.</p></div>`;
  }
  const errBody = () => `<p class="as-note" style="margin-top:0">إذا أحد اشتكى من الموقع، اطلب منه يضغط 5 مرات على «الإصدار» في آخر «المزيد» ويرسل لك التقرير.</p>
      <div class="as-bk"><button class="btn line" id="er-open" type="button">اعرض التقرير</button></div>`;
  const logBody = () => `<div class="as-bk ad-acts">${S.cfg.persistLocal ? '<button type="button" class="btn line" data-cmd="export">أرسل تعديلات الجهاز للمطوّر</button>' : ''}<button type="button" class="btn line" data-cmd="exportlog">نزّل سجل التعديلات (إكسل)</button></div>
      <div class="a-log" id="ad-log"></div>`;
  const AD_BODY = { ev: () => '<div class="ad-list" id="ad-lz-ev"></div>', nw: () => '<div class="ad-list" id="ad-lz-nw"></div>', gr: () => grAdminHtml(), dup: () => '<div id="ad-lz-dup"></div>',
    set: () => setBody(), sup: () => supHTML(), log: () => logBody(), err: () => errBody() };
  // صف ينفتح: الرأس .adr والجسم يتعبّى أول ما ينفتح
  const adf = (k, ic, t, sum) => { const o = AD.sec === k;
    return `<section class="adf" id="ad-s-${k}"><button type="button" class="adr" data-fold="${k}" aria-expanded="${o}" aria-controls="ad-b-${k}">${sv(ic)}<span><b>${t}</b><small>${sum}</small></span>${CHV}</button><div class="adx" id="ad-b-${k}"${o ? ' data-f="1"' : ' hidden'}>${o ? AD_BODY[k]() : ''}</div></section>`; };
  const BK = ['jnd-rows', 'jnd-events-all', 'jnd-news', 'jnd-news-del', 'jnd-reqs', 'jnd-sugs', 'jnd-log', 'jnd-site', 'jnd-admins', 'jnd-greet'];
  function adBind() {
    const on = (s, ev, fn) => { const x = $(s); if (x) x[ev] = fn; };
    const saveSite = msg => { try { localStorage.setItem('jnd-site', JSON.stringify(S.site)); } catch (e) { } applySite(); logIt('إعدادات', msg); toast('انحفظت'); };
    on('#as-save', 'onclick', () => { const g = i => { const x = $('#' + i); return x ? x.value.trim() : ''; }; S.site.name = g('as-name') || SITE0.name; S.site.welcome = g('as-welcome') || SITE0.welcome; S.site.lineage = g('as-lineage') || SITE0.lineage; S.site.contact = g('as-contact').replace(/[^\d+]/g, ''); saveSite('تعديل نصوص الموقع'); adminRender(); });
    on('#as-reset', 'onclick', () => { S.site = Object.assign({}, S.site, { name: SITE0.name, welcome: SITE0.welcome, lineage: SITE0.lineage }); saveSite('رجوع النصوص للافتراضي'); adminRender(); });
    $$('#admin [data-birth]').forEach(c => c.onchange = () => { S.site.birthOn = c.checked; saveSite(c.checked ? 'فتح تسجيل تاريخ الميلاد' : 'قفل تسجيل تاريخ الميلاد'); if (S.view === 'me') meRender(); });
    $$('#admin [data-sec]').forEach(c => c.onchange = () => { S.site.hide[c.dataset.sec] = !c.checked; saveSite((c.checked ? 'إظهار قسم ' : 'إخفاء قسم ') + (SECS.find(x => x[0] === c.dataset.sec) || [])[1]); });
    on('#bk-dl', 'onclick', bkDownload);
    on('#bk-up', 'onclick', () => { const f = $('#bk-file'); if (f) f.click(); });
    on('#bk-file', 'onchange', e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { let j = null; try { j = JSON.parse(r.result); } catch (x) { }
        const box = $('#bk-conf'); if (!box) return; box.hidden = false;
        if (!j || j.app !== 'jnd' || !j.data || !j.data['jnd-rows']) { box.innerHTML = '<b class="bad">هذا الملف مو نسخة من المنصة.</b>'; return; }
        let n = 0; try { n = JSON.parse(j.data['jnd-rows']).length; } catch (x) { }
        if (!n) { box.innerHTML = '<b class="bad">الملف ما فيه أسماء، ما نقدر نرجّعه.</b>'; return; }
        const AP = ['اسم واحد', 'اسمين', 'أسماء', 'اسماً'];
        box.innerHTML = `<b>نسخة بتاريخ ${esc(sd(() => hStr(String(j.at).slice(0, 10))))}، فيها ${nCount(n, AP)}</b><p>بتنمسح البيانات الحالية (${nCount(S.rows.length, AP)}) وتحل محلها هذي النسخة عند الجميع.</p><div class="as-act"><button type="button" class="btn danger" id="bk-go">نعم، رجّعها</button><button type="button" class="btn line" id="bk-no">إلغاء</button></div>`;
        $('#bk-no').onclick = () => { box.hidden = true; const fi = $('#bk-file'); if (fi) fi.value = ''; };
        $('#bk-go').onclick = () => { try { BK.forEach(k => { if (j.data[k] != null) localStorage.setItem(k, j.data[k]); else if (k !== 'jnd-greet') localStorage.removeItem(k); }); } catch (x) { toast('ما كفت مساحة الجهاز'); return; }
          logIt('استعادة نسخة احتياطية', String(j.at).slice(0, 10)); toast('رجعت النسخة'); reload(BK); setTimeout(() => go('admin'), 400); }; };
      r.readAsText(f); });
    on('#er-open', 'onclick', errOpen);
    on('#ad-q', 'oninput', e => { AD.q = e.target.value; AD.limit = 25; AD.open = null; adDraw(); });
  }
  /* ── الأقسام الأربعة ── */
  function adTreeTab(all, dups) {
    const o = AD.sec === 'dup';
    return `<div class="adp-h"><h2>أفراد الشجرة</h2><small>${nCount(all.length, NP)}</small></div>
      <div class="adrow2"><button type="button" class="abtn pri" data-adq="person">${sv('plus')}أضف فرداً</button><button type="button" class="abtn line" data-fold="dup" aria-expanded="${o}" aria-controls="ad-b-dup">${sv('copy')}المكررة (${ar(dups.length)})</button></div>
      <section class="adf" id="ad-s-dup"><div class="adx" id="ad-b-dup"${o ? ' data-f="1"' : ' hidden'}>${o ? AD_BODY.dup() : ''}</div></section>
      <label class="ad-q2">${sv('search')}<input id="ad-q" type="search" placeholder="ابحث عن اسم في الشجرة" aria-label="ابحث عن اسم في الشجرة" autocomplete="off" value="${esc(AD.q)}"></label>
      <div id="ad-list"></div>`;
  }
  // v58: إدارة لحظات الأسرة (adMomHtml في قسم «لحظات الأسرة» تحت) تنرسم فوق «المحتوى»
  function adMomTab() {
    const up = upcoming(), nL = newsSorted().length, g = grActive(), m = adMomHtml();
    return `${m}<div class="adp-h"><h2>المحتوى</h2><small>وش تشوفه الأسرة الحين</small></div>
      <div class="adrow2"><button type="button" class="abtn pri" data-adq="event">${sv('cal')}أضف مناسبة</button><button type="button" class="abtn line" data-adq="news">${sv('news')}أضف خبراً</button></div>
      ${adf('ev', 'cal', 'المناسبات', up.length ? nCount(up.length, ['مناسبة قادمة', 'مناسبتان قادمتان', 'مناسبات قادمة', 'مناسبة قادمة']) : 'ما فيه قادمة')}
      ${adf('nw', 'news', 'الأخبار', nL ? nCount(nL, ['خبر واحد', 'خبرين', 'أخبار', 'خبراً']) : 'ما فيه أخبار')}
      ${adf('gr', 'mail', 'تهنئة الأسرة', g ? 'شغّالة: ' + GR[g.k].b : 'مو شغّالة')}`;
  }
  function adToolsTab() {
    const ids = adminIds(), nE = errList().length, bt = +localStorage.getItem('jnd-bk-at') || 0, lv = bkLv(), bd = bt ? new Date(bt) : null;
    const last = bd ? `آخر نسخة: ${esc(nDate(ymd(bd)))} <small>· ${esc(sd(() => wday(ymd(bd)) + ' ' + hStr(ymd(bd))))}</small>` : 'ما نزّلت نسخة للحين';
    return `<div class="adp-h"><h2>الأدوات</h2><small>النسخ والتصدير والاستيراد</small></div>
      <div class="atl" id="ad-bk"><div class="atl-h"><span class="atl-ic">${sv('save')}</span><span><b>النسخ الاحتياطي</b><small>نسخة كاملة فيها الأسماء والمناسبات والأخبار والطلبات والسجل والإعدادات. الجوالات تبقى مشفّرة فيها.</small></span></div>
        <p class="atl-last ${lv}"><i></i><span>${last}</span></p>
        <div class="adrow2"><button type="button" class="abtn pri" id="bk-dl">${sv('down')}نزّل نسخة الحين</button><button type="button" class="abtn line" id="bk-up">${sv('up')}رجّع من نسخة</button></div>
        <input type="file" id="bk-file" accept=".json,application/json" hidden><div id="bk-conf" class="bk-conf" hidden></div></div>
      <div class="atl" id="ad-xl"><div class="atl-h"><span class="atl-ic gold">${sv('sheet')}</span><span><b>التصدير لإكسل</b><small>ملف فيه كل أفراد الشجرة، يفتح في إكسل.</small></span></div>
        <div class="atl-cols" aria-label="أعمدة الملف">${['الرقم', 'الاسم', 'رقم الأب', 'نسب الأب', 'الجنس', 'تاريخ الميلاد', 'حالة التأكيد'].map(t => `<span>${t}</span>`).join('')}</div>
        <div class="adrow2 one"><button type="button" class="abtn line" data-xl="tree">${sv('down')}صدّر الشجرة لإكسل</button><button type="button" class="abtn line" data-cmd="exportlog">${sv('down')}نزّل سجل التعديلات (إكسل)</button></div></div>
      <div class="atl" id="ad-imp"><div class="atl-h"><span class="atl-ic">${sv('up')}</span><span><b>أضف أسماء من إكسل</b><small>لما يكون عندك أسماء كثيرة. قبل الإضافة تنحفظ نسخة احتياطية تلقائياً، وتقدر تتراجع.</small></span></div>
        <div class="atl-steps"><span>الملف</span><span>المراجعة</span><span>الإضافة</span></div>
        <button type="button" class="abtn pri full" data-xl="imp">استورد من إكسل${ARW}</button></div>
      <h3 class="adp-sub">الإعدادات</h3>
      ${adf('set', 'gear', 'نصوص الموقع وأقسامه', 'اسم المنصة، الترحيب، وش يشوف الزوار')}
      ${adf('sup', 'shield', 'المشرفون', ids.length ? nCount(ids.length, ['مشرف واحد', 'مشرفين', 'مشرفين', 'مشرفاً']) : 'ما حددت مشرفين')}
      ${adf('log', 'pen', 'سجل التعديلات', (S.log || [])[0] ? 'آخر تعديل: ' + esc(nDate(String(S.log[0].at || ''))) : 'ما فيه تعديلات')}
      ${adf('err', 'alert', 'المشاكل التقنية', nE ? nCount(nE, ['مشكلة واحدة', 'مشكلتين', 'مشاكل', 'مشكلة']) : 'ما فيه')}`;
  }
  function adminRender() {
    const box = $('#admin'); if (!box) return; if (!isAdmin()) { box.innerHTML = ''; return; }
    if (!box.dataset.dg) { box.dataset.dg = '1'; box.addEventListener('click', adClick); box.addEventListener('keydown', adKey); }
    const ae = document.activeElement, fk = ae && box.contains(ae) && ae.id ? { id: ae.id, s: sd(() => ae.selectionStart), e: sd(() => ae.selectionEnd) } : null, back = whyKeep(box);
    const all = S.all.filter(n => !n.pending), dups = dupScan(), P = admPend(dups), tab = AD.tab, me = S.me || gateNode();
    if (AD.sec && AD_TAB[AD.sec] !== tab) AD.sec = '';
    const gens = all.length ? Math.max(...all.map(n => n.depth)) + 1 : 0, cnt = { ok: all.filter(n => n.lk === 'ok').length, pr: all.filter(n => n.lk === 'pr').length, un: all.filter(n => n.lk === 'un').length };
    const hd = sd(() => { const t = iso(today()); return wday(t) + ' ' + hStr(t); });
    const wl = [P.r ? nCount(P.r, ['طلب واحد', 'طلبان', 'طلبات', 'طلباً']) : '', P.s ? nCount(P.s, ['اقتراح واحد', 'اقتراحان', 'اقتراحات', 'اقتراحاً']) : '', P.d ? nCount(P.d, ['اسم مكرر محتمل', 'اسمان مكرران محتملان', 'أسماء مكررة محتملة', 'اسماً مكرراً محتملاً']) : ''].filter(Boolean);
    const wsub = wl.map(x => `<span class="nw">${esc(x)}</span>`).join(' و');
    box.innerHTML = `<header class="ad-hero" aria-labelledby="ad-hi"><div class="adh2-in">
        <div class="adh2-top"><span class="ad-badge">${sv('shield')}لوحة المشرف</span><button class="ad-out" type="button" data-cmd="logout">${sv('out')}اخرج</button></div>
        <h1 id="ad-hi">${me ? `${me.gender === 'female' ? 'حيّاكِ' : 'حيّاك'} الله يا ${esc(me.name)}` : 'حيّاك الله'}</h1>
        ${hd ? `<p class="ad-date">${sv('moon')}<time>${esc(hd)}</time></p>` : ''}
        <dl class="ad-k2" aria-label="أرقام المنصة"><div><dt>فرد</dt><dd>${ar(all.length)}</dd></div><div><dt>أجيال</dt><dd>${ar(gens)}</dd></div><div><dt>مناسبة قادمة</dt><dd>${ar(upcoming().length)}</dd></div><div><dt>خبر</dt><dd>${ar(newsSorted().length)}</dd></div></dl>
        <div class="ad-st2" role="group" aria-labelledby="ad-st2-t"><div class="ad-st2-h"><span id="ad-st2-t">حالة الأسماء</span><span>اضغط أي حالة وتفتح لك <b>الشجرة</b></span></div>
          <div class="ad-bar" aria-hidden="true">${['ok', 'pr', 'un'].map(k => cnt[k] ? `<i class="${k}" style="flex:${cnt[k]}"></i>` : '').join('')}</div>
          <div class="ad-st2-b">${[['ok', 'مؤكد'], ['pr', 'غير مؤكد'], ['un', 'غير واضح']].map(([k, t]) => `<button type="button" class="ast-${k}" data-adh="${k}" aria-pressed="${tab === 'tree' && AD.st === k}"><b>${ar(cnt[k])}</b><small><i></i>${t}</small></button>`).join('')}</div></div>
      </div>${P.n ? `<button type="button" class="ad-wait" data-adw><span class="w-ic">${sv('inbox')}</span><span>عندك ${nCount(P.n, ['أمر واحد', 'أمران', 'أمور', 'أمراً'])} بانتظار قرارك<small>${wsub}</small></span>${CHV.replace('class="arw"', 'class="w-go"')}</button>`
        : `<div class="ad-wait calm"><span class="w-ic">${sv('check')}</span><span>ما فيه شي بانتظارك اليوم<small>خلصت كل الطلبات والاقتراحات</small></span></div>`}
      </header>
      <nav class="adt" role="tablist" aria-label="أقسام لوحة المشرف">${AD_TABS.map(([k, ic, t]) => { const on = tab === k, n = k === 'inbox' ? P.n : 0;
        return `<button type="button" role="tab" id="adt-${k}" aria-controls="adp-${k}" data-adt="${k}" aria-selected="${on}" tabindex="${on ? 0 : -1}"${n ? ` aria-label="${t}، ${nCount(n, ['أمر واحد', 'أمران', 'أمور', 'أمراً'])}"` : ''}>${sv(ic)}<span>${t}</span>${n ? `<i class="adt-n" aria-hidden="true">${n > 99 ? '99+' : ar(n)}</i>` : ''}</button>`; }).join('')}</nav>
      <section class="adp" id="adp-${tab}" role="tabpanel" aria-labelledby="adt-${tab}">${tab === 'tree' ? adTreeTab(all, dups) : tab === 'mom' ? adMomTab() : tab === 'tools' ? adToolsTab() : ''}</section>`;
    if (tab === 'inbox') adInbox(dups);
    adBindAll();
    if (tab === 'tree') adDraw();
    if (AD.sec) adFill(AD.sec);
    back();
    if (fk) { const x = document.getElementById(fk.id); if (x && box.contains(x)) { x.focus({ preventScroll: true }); if (fk.s != null && fk.s !== '') sd(() => x.setSelectionRange(fk.s, fk.e)); } }
    if (AD.to) { const id = AD.to; AD.to = null; requestAnimationFrame(() => { const t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: dnRM() ? 'auto' : 'smooth', block: 'start' }); }); }
  }
  const LOGA = { edit: 'تعديل' }, logA = a => LOGA[a] || a;
  function logHTML(l) {
    if (!Array.isArray(l) || !l.length) return '<p class="as-note ad-none">ما فيه تعديلات للحين</p>';
    return l.slice(0, 40).map(x => `<div class="lg"><span class="lg-a">${esc(logA(x.action))}</span><span>${esc(x.text)}${x.by ? `<small class="lg-by"> — ${esc(x.by)}</small>` : ''}</span><time>${esc(sd(() => new Date(x.at).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' })))}</time></div>`).join('');
  }
  function openAdd(father) {
    A.father = father || null; A.rows = [{ name: '', gender: 'male', birth: '' }];
    $('#a-q').value = ''; $('#a-res').innerHTML = ''; $('#a-done').style.display = 'none'; $('#a-body').style.display = '';
    step(A.father ? 2 : 1); $('#addm').classList.add('open');
    if (!A.father) setTimeout(() => $('#a-q').focus(), 50);
  }
  function step(k) {
    A.step = k;
    $$('#addm .st').forEach((e, i) => { e.classList.toggle('on', i + 1 === k); e.classList.toggle('done', i + 1 < k); });
    $$('#addm .pane').forEach((e, i) => e.hidden = i + 1 !== k);
    if (k === 2) { $('#a-father').innerHTML = `<span class="dot" style="background:${ROLE[A.father.role].c}"></span><div><small>الأب</small><b>${esc(lineage(A.father, 6))}</b></div><button type="button" class="lnkbtn" id="a-change">تغيير</button>`;
      $('#a-change').onclick = () => step(1); drawRows(); }
    if (k === 3) drawReview();
  }
  function drawReview() {
    const list = A.rows.filter(r => r.name);
    $('#a-review').innerHTML = list.map(r => `<div class="rv-item"><span class="dot" style="background:${r.gender === 'female' ? 'var(--r-girl)' : 'var(--r-son)'}"></span>
      <div><b>${esc(r.name)}</b> ${r.gender === 'female' ? 'بنت' : 'بن'} ${esc(lineage(A.father, 5))}${r.birth ? `<small> · مواليد ${esc(r.birth)}</small>` : ''}</div></div>`).join('');
  }
  function bindAdd() {
    const m = $('#addm');
    m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); });
    $('#a-q').addEventListener('input', () => {
      const res = search($('#a-q').value).slice(0, 8);
      $('#a-res').innerHTML = res.map(n => `<button type="button" data-id="${n.id}"><span class="dot" style="background:${ROLE[n.role].c}"></span><span style="flex:1;min-width:0"><b>${esc(n.name)}</b> ${n.parent ? (n.gender === 'female' ? 'بنت ' : 'بن ') + esc(chain(n).slice(1, 6).map(dispName).join(' بن ').replace(' بن آل جنيدلي', ' آل جنيدلي')) : 'آل جنيدلي'}<small>${n.kids.length ? ` · ${n.kids.length} أبناء` : ''}</small></span>${relTag(n)}</button>`).join('')
        || ($('#a-q').value.trim() ? '<div class="empty">ما لقيته. اكتب اسم الأب ثم اسم أبوه، مثل «فيصل عثمان».</div>' : '');
      $$('#a-res button').forEach(b => b.onclick = () => { A.father = S.byId[b.dataset.id]; step(2); setTimeout(() => $('#a-rows [data-n]').focus(), 50); });
    });
    $('#a-more').onclick = addRow;
    $('#a-next').onclick = () => {
      if (!A.rows.some(r => r.name)) { toast('اكتب اسم واحد على الأقل'); return; }
      const exist = new Set(A.father.kids.map(k => norm(k.name)));
      const dup = A.rows.filter(r => r.name && exist.has(norm(r.name)));
      if (dup.length && !A.dupOk) { A.dupOk = true; drawRows(); toast('فيه اسم موجود أصلاً تحت ' + A.father.name + '، تأكد ثم اضغط التالي مرة ثانية'); return; }
      A.dupOk = false; step(3); };
    $('#a-back').onclick = () => step(2);
    $('#a-send').onclick = async () => {
      const kids = A.rows.filter(r => r.name);
      const who = {};
      const btn = $('#a-send'); btn.disabled = true;
      try {
        const r = S.cfg.addChildren ? await S.cfg.addChildren(A.father, kids, who) : { pending: false };
        const pending = !r || r.pending !== false;
        kids.forEach((k, i) => S.rows.push({ id: (r && r.ids && r.ids[i]) || 'n' + Date.now() + i, father_id: A.father.id, name: k.name, gender: k.gender, birth: k.birth,
          kind: 'ورقة', link: pending ? 'محتمل' : 'مؤكد', name_c: 'واضح', note: null, x: null, y: null, pending, at: new Date().toISOString() }));
        const father = A.father; father.collapsed = false;
        logIt('إضافة', `${kids.map(k => k.name).join('، ')} تحت ${lineage(father, 3)}`);
        refresh(); saveRows(); const f = S.byId[father.id];
        $('#a-body').style.display = 'none'; $('#a-done').style.display = 'block';
        $('#a-done-t').textContent = `أُضيف ${kids.length === 1 ? kids[0].name : kids.length + ' أسماء'} تحت ${f.name} في الشجرة.`;
        $('#a-show').onclick = () => { m.classList.remove('open'); go('tree', f); };
        $('#a-again').onclick = () => openAdd(f);
      } catch (e) { toast('ما تمت الإضافة، جرّب مرة ثانية'); }
      btn.disabled = false;
    };
  }
  /* ── المشرف ── */
  const momLeft = x => { const d = Math.round((momDay0(x.exp - 1) - momDay0(Date.now())) / MOM_DAY);
    return d <= 0 ? 'تختفي اليوم' : d === 1 ? 'تختفي غداً' : d === 2 ? 'تختفي بعد يومين' : `تختفي بعد ${ar(d)} ${d <= 10 ? 'أيام' : 'يوماً'}`; };
  const momTitle = m => m.k === 'p' ? (m.cap || 'صورة بدون تعليق') : m.k === 'b' ? `${m.n.gender === 'female' ? 'مولودة جديدة' : 'مولود جديد'}: ${m.n.name} ${m.n.gender === 'female' ? 'بنت' : 'بن'} ${m.n.parent.name}${m.n.parent.parent ? ' بن ' + m.n.parent.parent.name : ''}` : m.k === 'e' ? `اليوم ${evTitle(m.e)}` : `خبر جديد: ${m.n.title || ''}`;
  const MOM_AUTO = [['b', 'baby', 'مولود جديد'], ['e', 'cal', 'مناسبة اليوم'], ['n', 'news', 'خبر جديد']];
  function adMomHtml() {
    const L = momList().slice().reverse(), I = MOM.idx || momClean({});
    return `<div class="adp-h"><h2>لحظات الأسرة</h2><small>تطلع للأسرة في الشعار فوق</small></div>
      <button type="button" class="abtn gold full" data-mom-add>${sv('plus')}أضف لحظة</button>
      <h3 class="adp-sub">المنشورة الحين (${ar(L.length)})</h3>
      ${L.length ? `<div class="mm-l">${L.map(m => `<div class="mm-r">${m.k === 'p' ? `<span class="mm-th" data-mmth="${esc(m.id)}">${sv('img')}</span>` : `<span class="mm-th auto">${sv(m.k === 'b' ? 'baby' : m.k === 'e' ? 'cal' : 'news')}</span>`}
        <div class="mm-t"><b>${esc(momTitle(m))}</b><small><span class="mm-k${m.k === 'p' ? '' : ' auto'}">${m.k === 'p' ? 'صورة' : 'تلقائي'}</span>${momLeft(m)}</small></div>
        <button type="button" class="mm-del" data-mmdel="${esc(m.id)}" aria-label="احذف اللحظة">${sv('trash')}</button></div>`).join('')}</div>`
        : '<p class="ad-empty mm-none">ما فيه لحظات منشورة الحين. اضغط «أضف لحظة» وابدأ.</p>'}
      <h3 class="adp-sub">اللحظات التلقائية</h3><p class="mm-sub">تطلع لحالها من بيانات الأسرة</p>
      <div class="mm-sw">${MOM_AUTO.map(([k, ic, t]) => `<label>${sv(ic)}<span><b>${t}</b></span><input type="checkbox" data-mmsw="${k}"${I.auto[k] ? ' checked' : ''}><i aria-hidden="true"></i></label>`).join('')}</div>`;
  }
  function momAdBind() {
    const box = $('#admin'); if (!box || AD.tab !== 'mom') return;
    const add = $('[data-mom-add]', box); if (add) add.onclick = momAddOpen;
    $$('[data-mmdel]', box).forEach(b => b.onclick = () => armDelete(b, () => momDelete(b.dataset.mmdel, b)));
    $$('[data-mmsw]', box).forEach(c => c.onchange = async () => {
      const k = c.dataset.mmsw, on = c.checked; c.disabled = true;
      try { await momIdxWrite(I => { I.auto[k] = on; }); logIt('لحظات الأسرة', (on ? 'تشغيل' : 'إيقاف') + ' اللحظات التلقائية: ' + (MOM_AUTO.find(x => x[0] === k) || [])[2]); toast('انحفظ'); }
      catch (e) { c.checked = !on; toast('ما انحفظ، جرّب مرة ثانية'); }
      c.disabled = false; if (AD.tab === 'mom' && S.view === 'admin') adminRender();
    });
    $$('[data-mmth]', box).forEach(async el => { try { const s = await momImg(el.dataset.mmth); if (document.body.contains(el)) el.innerHTML = `<img src="${s}" alt="">`; } catch (e) { } });
  }
  // نقرأ الفهرس من السحابة قبل الكتابة (مشرف ثاني يمكن عدّله)، ونطبّق التعديل، ونكتبه
  async function momIdxWrite(fn) {
    if (!momCloud()) throw new Error('cloud');
    const d = await JNDCloud.momGet('idx'); let o = {}; if (d && typeof d.v === 'string') try { o = JSON.parse(d.v); } catch (e) { }
    const I = momClean(o), now = Date.now(); fn(I); Object.keys(I.hid).forEach(k => { if (I.hid[k] < now) delete I.hid[k]; });
    const v = JSON.stringify(I); if (v.length > MOM_IDX_MAX) throw new Error('full');
    await JNDCloud.momPut('idx', { v }); MOM.idx = I; MOM.at = now; IDB.set('idx', I); momLogo(); return I;
  }
  async function momDelete(id, btn) {
    const m = momList().find(x => x.id === id); if (!m) { adminRender(); return; } if (btn) btn.disabled = true;
    try {
      if (m.k === 'p') { await JNDCloud.momDel(id); await momIdxWrite(I => { I.l = I.l.filter(x => x.id !== id); }); IDB.del('img:' + id); }
      else await momIdxWrite(I => { I.hid[id] = m.exp; });
      logIt('لحظات الأسرة', 'حذف لحظة: ' + momTitle(m)); toast('انحذفت اللحظة');
    } catch (e) { toast('ما انحذفت، جرّب مرة ثانية'); }
    adminRender();
  }
  // المنتهية: يمسحها المشرف أول ما يدخل (مرة في الجلسة)، ومعها أي صورة يتيمة (انرفعت وما دخلت الفهرس)
  async function momSweep() {
    if (MOM.swept || !isAdmin() || !momCloud() || !JNDCloud.hasTok()) return; MOM.swept = 1;
    try {
      const now = Date.now(), d = await JNDCloud.momGet('idx'); let o = {}; if (d && typeof d.v === 'string') try { o = JSON.parse(d.v); } catch (e) { }
      const I = momClean(o), old = I.l.filter(x => x.exp <= now).map(x => x.id);
      let orph = []; try { orph = (await JNDCloud.momList()).filter(x => x.id !== 'idx' && !I.l.some(y => y.id === x.id) && now - x.ct > MOM_DAY).map(x => x.id); } catch (e) { }
      const staleHid = Object.keys(I.hid).some(k => I.hid[k] < now);
      if (!old.length && !orph.length && !staleHid) return;
      for (const id of old.concat(orph)) { try { await JNDCloud.momDel(id); } catch (e) { } IDB.del('img:' + id); }
      if (old.length || staleHid) await momIdxWrite(J => { J.l = J.l.filter(x => x.exp > now); });
      if (old.length) { toast(`انمسحت ${nCount(old.length, ['لحظة منتهية', 'لحظتان منتهيتان', 'لحظات منتهية', 'لحظة منتهية'])}`); logIt('لحظات الأسرة', 'مسح اللحظات المنتهية'); }
      if (S.view === 'admin' && AD.tab === 'mom') adminRender();
    } catch (e) { MOM.swept = 0; }
  }
  /* ── ضغط الصورة في الجوال: عرض 1080 بالكثير وحجم ≈120KB، والرسم على canvas يمسح بيانات الصورة (ومنها الموقع) ── */
  const momB64Size = s => Math.floor(s.length * 3 / 4);
  function momDecode(file) {
    return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode')); }; im.src = u; });
  }
  async function momCompress(file) {
    const im = await momDecode(file), W0 = im.naturalWidth, H0 = im.naturalHeight; if (!W0 || !H0) throw new Error('decode');
    let s = Math.min(1, 1080 / W0, 1920 / H0), out = '';
    for (let round = 0; round < 4; round++) {
      const w = Math.max(1, Math.round(W0 * s)), h = Math.max(1, Math.round(H0 * s)), c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, w, h);
      for (const q of [0.82, 0.74, 0.66, 0.58, 0.5]) { out = c.toDataURL('image/jpeg', q).split(',')[1] || ''; if (momB64Size(out) <= 125000) return { b: out, w, h, kb: Math.round(momB64Size(out) / 1024) }; }
      s *= 0.8; c.width = c.height = 0;
    }
    if (out && momB64Size(out) <= 200000) return { b: out, kb: Math.round(momB64Size(out) / 1024) };
    throw new Error('size');
  }
  function momAddOpen() {
    if (!momCloud() || !JNDCloud.hasTok()) { toast('سجّل دخول الإدارة عشان تنشر لحظة'); return; }
    const old = $('#mom-add'); if (old) old.remove();
    const MA = { b: '' }, ret = document.activeElement;
    const d = document.createElement('div'); d.className = 'sh'; d.id = 'mom-add'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'ma-h');
    d.innerHTML = `<div class="sh-c"><div class="sh-grip"></div>
      <div class="sh-h"><h3 id="ma-h">أضف لحظة</h3><button class="sh-x" type="button" aria-label="إغلاق">${sv('xmark')}</button></div>
      <div id="ma-ph"></div><input type="file" id="ma-file" accept="image/*" hidden>
      <label class="fld"><span>تعليق قصير (اختياري)<small id="ma-n">${ar(0)} من ${ar(MOM_CAP)}</small></span><input id="ma-cap" maxlength="${MOM_CAP}" placeholder="مثال: من اجتماع الأسرة في بريدة" autocomplete="off"></label>
      <div class="fld"><span id="ma-dl">تختفي بعد</span><div class="seg3" role="radiogroup" aria-labelledby="ma-dl">${[[1, 'يوم'], [3, '3 أيام'], [7, 'أسبوع']].map(([v, t]) => `<label><input type="radio" name="ma-d" value="${v}"${v === 3 ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <p class="ma-err" id="ma-err" role="alert" hidden></p>
      <p class="note">${sv('info')}<span>المنصة مفتوحة لكل من عنده الرابط، فاختر الصور بعناية.</span></p>
      <div class="adrow2"><button type="button" class="abtn gold" id="ma-go">انشر اللحظة</button><button type="button" class="abtn line" id="ma-no">إلغاء</button></div></div>`;
    document.body.appendChild(d); document.body.classList.add('sh-open');
    const ph = $('#ma-ph', d), file = $('#ma-file', d), cap = $('#ma-cap', d), go = $('#ma-go', d), er = $('#ma-err', d);
    const err = t => { er.textContent = t; er.hidden = !t; };
    const pick = () => { file.value = ''; file.click(); };
    const draw = (t) => { ph.innerHTML = MA.b ? `<div class="ph-pick"><img src="data:image/jpeg;base64,${MA.b}" alt="معاينة الصورة"><button type="button" class="ph-chg" id="ma-chg">${sv('img')}غيّر الصورة</button></div>`
      : `<button type="button" class="ph-empty" id="ma-pick"${t ? ' disabled' : ''}>${sv('img')}${t || 'اختر صورة'}</button>`; const b = $('#ma-pick, #ma-chg', ph); if (b) b.onclick = pick; };
    draw();
    file.onchange = async () => {
      const f = file.files && file.files[0]; if (!f) return; err('');
      const heic = /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name || '');
      if (!heic && !/^image\//.test(f.type || '')) { err('الملف مو صورة، اختر صورة JPG أو PNG'); return; }
      const keep = MA.b; MA.b = ''; draw('جاري تجهيز الصورة…'); go.disabled = true;
      try { const r = await momCompress(f); MA.b = r.b; MA.kb = r.kb; }
      catch (e) { MA.b = keep; err(heic ? 'صورة HEIC ما انفتحت في هالمتصفح، اختر صورة JPG أو PNG' : String(e && e.message) === 'decode' ? 'الملف مو صورة، اختر صورة JPG أو PNG' : 'ما تجهّزت الصورة، جرّب صورة ثانية'); }
      go.disabled = false; draw();
    };
    cap.oninput = () => { $('#ma-n', d).textContent = `${ar(cap.value.length)} من ${ar(MOM_CAP)}`; };
    const close = () => { d.remove(); document.body.classList.remove('sh-open'); document.removeEventListener('keydown', key, true); try { ret && ret.focus({ preventScroll: true }); } catch (e) { } };
    const key = e => { if (e.key === 'Escape' && !go.disabled) { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
    document.addEventListener('keydown', key, true);
    $('.sh-x', d).onclick = $('#ma-no', d).onclick = close;
    d.addEventListener('click', e => { if (e.target === d && !go.disabled) close(); });
    go.onclick = async () => {
      err(''); const c = cap.value.trim().replace(/\s+/g, ' ');
      if (!MA.b) { err('اختر صورة أول'); return; }
      if (c.length > MOM_CAP) { err('التعليق طويل، اختصره'); return; }
      if ((MOM.idx || momClean({})).l.filter(x => x.exp > Date.now()).length >= MOM_MAX) { err('مساحة اللحظات امتلأت، احذف لحظة أول'); return; }
      const dur = +(($('input[name=ma-d]:checked', d) || {}).value || 3), id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      go.disabled = true; go.textContent = 'جاري النشر…'; $('#ma-no', d).disabled = true;
      try {
        await JNDCloud.momPut(id, { b: MA.b });
        const now = Date.now();
        try { await momIdxWrite(I => { if (I.l.filter(x => x.exp > now).length >= MOM_MAX) throw new Error('full'); I.l.push({ id, at: now, exp: now + dur * MOM_DAY, cap: c }); }); }
        catch (e) { JNDCloud.momDel(id).catch(() => { }); throw e; }
        IDB.set('img:' + id, MA.b); logIt('لحظات الأسرة', 'نشر لحظة' + (c ? ': ' + c : '')); close(); toast('نُشرت اللحظة، وتطلع للأسرة في الشعار'); adminRender();
      } catch (e) { go.disabled = false; go.textContent = 'انشر اللحظة'; $('#ma-no', d).disabled = false; err(String(e && e.message) === 'full' ? 'مساحة اللحظات امتلأت، احذف لحظة أول' : 'ما تم النشر، جرّب مرة ثانية'); }
    };
    setTimeout(() => { const b = $('#ma-pick', d); try { b && b.focus({ preventScroll: true }); } catch (e) { } }, 50);
  }
  bindEdit(); bindAdd();
  return { decideReq, ccAdminPreview, exportLog, exportChanges, openEdit, openAdd, adminRender, momSweep };
};
