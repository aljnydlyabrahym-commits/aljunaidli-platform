/* منصة أسرة الجنيدلي — وحدة إكسل (الإصدار 58)
   تتحمّل عند الضغط فقط من لوحة المشرف. بدون أي مكتبة خارجية.
   - الكتابة: xlsx (zip بطريقة store مع CRC32) بتنسيق الهوية: ترويسة خضراء، حد ذهبي، صفوف بلون الورق، ورقة من اليمين لليسار.
   - القراءة: xlsx عبر DecompressionStream('deflate-raw')، و csv (UTF-8/UTF-16/Windows-1256، والفواصل , ; ؛ tab).
   - التحقق: أخضر جاهز، أصفر يحتاج قرار، أحمر خطأ مع طريقة الإصلاح. الأب وأبناؤه يقدرون يكونون في نفس الملف.
   كل نص ترجعه الوحدة نص خام: الواجهة تمرره على esc() قبل الرسم. */
(function (G) {
  'use strict';
  var LIMITS = { bytes: 5 * 1024 * 1024, rows: 2000, unz: 60 * 1024 * 1024, cands: 6 };
  var ENC = new TextEncoder();

  /* ───────── أدوات عامة ───────── */
  var ar = function (n) { return Number(n).toLocaleString('ar-SA-u-nu-latn'); };
  var nW = function (n, w) { var r = n % 100; return n === 1 ? w[0] : n === 2 ? w[1] : r >= 3 && r <= 10 ? w[2] : w[3]; };
  var nCount = function (n, w) { return n === 1 || n === 2 ? nW(n, w) : ar(n) + ' ' + nW(n, w); };
  var NP = ['اسم واحد', 'اسمين', 'أسماء', 'اسماً'];
  var HM = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  var HMd = function (m) { return m === 11 ? 'ذي القعدة' : m === 12 ? 'ذي الحجة' : HM[m - 1]; };
  var GM = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var toLat = function (s) { return String(s == null ? '' : s).replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }).replace(/[۰-۹]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); }); };
  // نفس تطبيع الموقع (norm في index.html) + الحروف الفارسية: همزات، ة/ه، ى/ي، تشكيل، تطويل، مسافات
  var norm = function (s) {
    return String(s || '').replace(/[\u064B-\u065F\u0670\u0640\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىی]/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ک/g, 'ك').replace(/\s+/g, '').toLowerCase();
  };
  // تنظيف نص الخانة: بدون رموز اتجاه خفية، والمسافات وحدة، وبدون علامة الحماية ' اللي نضيفها قبل = + - @
  var clean = function (v) {
    var s = String(v == null ? '' : v).replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '').replace(/[\u00A0\u2000-\u200A\u3000]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^'[=+\-@\t\r]/.test(s)) s = s.slice(1);
    return s;
  };
  // منع حقن الصيغ: أي نص يبدأ بـ = + - @ أو tab أو CR تسبقه '
  var safe = function (s) { s = String(s == null ? '' : s); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  function hijri(date) {
    try {
      var p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date), o = {};
      p.forEach(function (x) { if (x.type === 'year' || x.type === 'month' || x.type === 'day') o[x.type] = parseInt(x.value, 10); });
      if (o.year > 1300) return { y: o.year, m: o.month, d: o.day };
    } catch (e) { }
    return null;
  }
  var hTxt = function (h) { return h ? h.d + ' ' + HMd(h.m) + ' ' + h.y + 'هـ' : ''; };
  var gTxt = function (d) { return d.getDate() + ' ' + GM[d.getMonth()] + ' ' + d.getFullYear() + 'م'; };
  var tTxt = function (d) { var h = d.getHours(), m = pad(d.getMinutes()); return (h % 12 || 12) + ':' + m + ' ' + (h < 12 ? 'ص' : 'م'); };
  function XLErr(code, msg) { var e = new Error(msg); e.code = code; e.xl = 1; return e; }

  /* ───────── شجرة الصفوف (نفس منطق lineage في الموقع) ───────── */
  function treeIndex(rows) {
    var byId = new Map(), byName = new Map(), list = [], root = null;
    (rows || []).forEach(function (r) {
      if (!r || r.id == null) return;
      var n = { id: String(r.id), name: String(r.name || ''), n: norm(r.name), gender: r.gender === 'female' ? 'female' : 'male', link: r.link, fid: r.father_id == null ? null : String(r.father_id), parent: null, kids: [], tree: 1, row: r };
      byId.set(n.id, n); list.push(n);
    });
    list.forEach(function (n) { var f = n.fid != null && byId.get(n.fid); if (f && f !== n) { n.parent = f; f.kids.push(n); } else if (!root) root = n; });
    list.forEach(function (n) { if (!n.parent) n.isRoot = 1; var a = byName.get(n.n); if (a) a.push(n); else byName.set(n.n, [n]); });
    // ترتيب العرض: الأب ثم أبناؤه (نفس ترتيب الصفوف)
    var order = [], seen = new Set();
    (function walk(L, d) { L.forEach(function (n) { if (seen.has(n)) return; seen.add(n); n.depth = d; order.push(n); walk(n.kids, d + 1); }); })(list.filter(function (n) { return !n.parent; }), 0);
    // حماية من الحلقات (أب يرجع لابنه): أي صف ما انزار يدخل آخر القائمة
    list.forEach(function (n) { if (!seen.has(n)) { n.depth = 0; order.push(n); } });
    return { byId: byId, byName: byName, list: list, order: order, root: root };
  }
  var chainOf = function (n) { var a = [], g = 0; while (n && g++ < 200) { a.push(n); n = n.parent; } return a; };
  var dispName = function (n) { return n.tree && n.isRoot ? 'آل جنيدلي' : n.name; };
  function lineage(n, max) {
    var c = chainOf(n), s = (max ? c.slice(0, max) : c).map(dispName).map(function (x, i) { return i === 0 ? x : (i === 1 && n.gender === 'female' ? ' بنت ' : ' بن ') + x; }).join('')
      .replace(' بن آل جنيدلي', ' آل جنيدلي').replace(' بنت آل جنيدلي', ' آل جنيدلي');
    return max && c.length > max ? s + ' …' : s;
  }
  var LINK = { 'مؤكد': 'مؤكد', 'محتمل': 'غير مؤكد', 'غير واضح': 'غير واضح' };
  var linkTxt = function (l) { return LINK[l] || 'غير مؤكد'; };
  function birthTxt(r) {
    var y = 0, m = 0, d = 0;
    if (r.bfull) { var p = String(r.bfull).split('-').map(function (v) { return parseInt(v, 10) || 0; }); y = p[0]; m = p[1] || 0; d = m ? (p[2] || 0) : 0; }
    if (!y) y = parseInt(toLat(r.birth), 10) || 0;
    return !y ? '' : y + (m ? '/' + pad(m) + (d ? '/' + pad(d) : '') : '');
  }

  /* ───────── zip (store) ───────── */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u) { var c = 0xFFFFFFFF; for (var i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function concat(parts) { var n = 0; parts.forEach(function (p) { n += p.length; }); var o = new Uint8Array(n), off = 0; parts.forEach(function (p) { o.set(p, off); off += p.length; }); return o; }
  function zip(files, when) {
    var d = when || new Date(), dt = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var parts = [], cen = [], off = 0;
    files.forEach(function (f) {
      var nb = ENC.encode(f[0]), body = typeof f[1] === 'string' ? ENC.encode(f[1]) : f[1], crc = crc32(body);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true);
      h.setUint32(14, crc, true); h.setUint32(18, body.length, true); h.setUint32(22, body.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nb, body);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
      c.setUint32(16, crc, true); c.setUint32(20, body.length, true); c.setUint32(24, body.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), nb);
      off += 30 + nb.length + body.length;
    });
    var csz = 0; cen.forEach(function (p) { csz += p.length; });
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csz, true); e.setUint32(16, off, true);
    return concat(parts.concat(cen, [new Uint8Array(e.buffer)]));
  }

  /* ───────── كتابة xlsx ───────── */
  var xe = function (s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var colL = function (i) { var s = ''; i++; while (i) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };
  var C = { teal: 'FF2D6369', dark: 'FF1C4448', gold: 'FFC9A45C', paper: 'FFF7F1E3', line: 'FFDDD3BC', ink: 'FF23302F', mute: 'FF6B7471', white: 'FFFFFFFF' };
  // الخطوط: Arial (فيه العربي في ويندوز وماك، والإكسل يبدّل تلقائياً إذا ما لقاه)
  var FONTS = [
    { sz: 11, c: C.ink },                         // 0 عادي
    { sz: 11, c: C.white, b: 1 },                 // 1 الترويسة
    { sz: 16, c: C.dark, b: 1 },                  // 2 العنوان
    { sz: 10, c: C.mute },                        // 3 تحت العنوان
    { sz: 11, c: 'FF8C8C8C', i: 1 },              // 4 المثال
    { sz: 11, c: 'FF2E7D4F', b: 1 },              // 5 مؤكد
    { sz: 11, c: 'FF8A6A1F', b: 1 },              // 6 غير مؤكد
    { sz: 11, c: 'FFB3261E', b: 1 },              // 7 غير واضح
    { sz: 12, c: C.teal, b: 1 },                  // 8 عنوان قسم
    { sz: 12, c: C.dark, b: 1 },                  // 9 رقم في الملخص
    { sz: 11, c: C.ink, b: 1 }                    // 10 عادي عريض
  ];
  var FILLS = ['none', 'gray125', C.teal, C.paper, 'FFE4F1E8', 'FFF6EDD6', 'FFF8E1DE', 'FFFFFDF7', 'FFF2F2F2', 'FFEAF2F2'];
  // 0 بدون، 1 رفيع، 2 الترويسة (حد ذهبي تحت)، 3 خط ذهبي تحت العنوان
  var BORDERS = ['', 'all', 'head', 'gold'];
  var XF = {}; var XFS = [];
  function xf(k, o) { XF[k] = XFS.length; XFS.push(o); }
  xf('def', {});
  xf('title', { f: 2, v: 'center', h: 'right' });
  xf('sub', { f: 3, v: 'center', h: 'right', b: 3 });
  xf('head', { f: 1, fl: 2, b: 2, h: 'center', v: 'center', w: 1 });
  xf('txt', { f: 0, b: 1, h: 'right', v: 'center' });
  xf('txtA', { f: 0, fl: 3, b: 1, h: 'right', v: 'center' });
  xf('num', { f: 0, b: 1, h: 'center', v: 'center' });
  xf('numA', { f: 0, fl: 3, b: 1, h: 'center', v: 'center' });
  xf('stOk', { f: 5, fl: 4, b: 1, h: 'center', v: 'center' });
  xf('stPr', { f: 6, fl: 5, b: 1, h: 'center', v: 'center' });
  xf('stUn', { f: 7, fl: 6, b: 1, h: 'center', v: 'center' });
  xf('ex', { f: 4, fl: 8, b: 1, h: 'right', v: 'center', nf: 49 });
  xf('exC', { f: 4, fl: 8, b: 1, h: 'center', v: 'center', nf: 49 });
  xf('inp', { f: 0, fl: 7, b: 1, h: 'right', v: 'center', nf: 49 });
  xf('sec', { f: 8, h: 'right', v: 'center' });
  xf('wrap', { f: 0, h: 'right', v: 'center', w: 1 });
  xf('lab', { f: 0, fl: 3, b: 1, h: 'right', v: 'center' });
  xf('big', { f: 9, b: 1, h: 'center', v: 'center' });
  xf('step', { f: 1, fl: 2, b: 1, h: 'center', v: 'center' });
  xf('stepT', { f: 0, fl: 9, b: 1, h: 'right', v: 'center', w: 1 });
  xf('txtW', { f: 0, b: 1, h: 'right', v: 'center', w: 1 });
  xf('txtWA', { f: 0, fl: 3, b: 1, h: 'right', v: 'center', w: 1 });
  xf('bold', { f: 10, b: 1, h: 'right', v: 'center' });
  xf('note', { f: 3, h: 'right', v: 'center', w: 1 });
  function stylesXml() {
    var fonts = FONTS.map(function (f) { return '<font>' + (f.b ? '<b/>' : '') + (f.i ? '<i/>' : '') + '<sz val="' + f.sz + '"/><color rgb="' + f.c + '"/><name val="Arial"/><family val="2"/><charset val="178"/></font>'; }).join('');
    var fills = FILLS.map(function (f) { return f === 'none' || f === 'gray125' ? '<fill><patternFill patternType="' + f + '"/></fill>' : '<fill><patternFill patternType="solid"><fgColor rgb="' + f + '"/><bgColor indexed="64"/></patternFill></fill>'; }).join('');
    var bd = function (t, c, st) { return st ? '<' + t + ' style="' + st + '"><color rgb="' + c + '"/></' + t + '>' : '<' + t + '/>'; };
    var borders = BORDERS.map(function (b) {
      if (b === 'all') return '<border>' + bd('left', C.line, 'thin') + bd('right', C.line, 'thin') + bd('top', C.line, 'thin') + bd('bottom', C.line, 'thin') + '<diagonal/></border>';
      if (b === 'head') return '<border>' + bd('left', C.dark, 'thin') + bd('right', C.dark, 'thin') + bd('top', C.dark, 'thin') + bd('bottom', C.gold, 'medium') + '<diagonal/></border>';
      if (b === 'gold') return '<border><left/><right/><top/>' + bd('bottom', C.gold, 'medium') + '<diagonal/></border>';
      return '<border><left/><right/><top/><bottom/><diagonal/></border>';
    }).join('');
    var xfs = XFS.map(function (o) {
      var a = '<xf numFmtId="' + (o.nf || 0) + '" fontId="' + (o.f || 0) + '" fillId="' + (o.fl || 0) + '" borderId="' + (o.b || 0) + '" xfId="0"' + (o.nf ? ' applyNumberFormat="1"' : '') + ' applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">';
      return a + '<alignment' + (o.h ? ' horizontal="' + o.h + '"' : '') + (o.v ? ' vertical="' + o.v + '"' : '') + (o.w ? ' wrapText="1"' : '') + (o.h === 'right' && o.b ? ' indent="1"' : '') + ' readingOrder="2"/></xf>';
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="' + FONTS.length + '">' + fonts + '</fonts><fills count="' + FILLS.length + '">' + fills + '</fills><borders count="' + BORDERS.length + '">' + borders + '</borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + XFS.length + '">' + xfs + '</cellXfs>'
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>';
  }
  // عرض العمود: الحروف العربية في Arial تقريباً بعرض الحرف اللاتيني
  var wOf = function (s) { s = String(s == null ? '' : s); var w = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); w += c >= 0x064B && c <= 0x065F ? 0 : c < 128 ? 1 : 0.95; } return w; };
  /* ورقة: { name, rows: [[{v, s}|null]], ht: {row: h}, cols: [w], merges: [], freeze: n, filter: 'A3:G9', dv: [], land: 1, titles: n, tab: color } */
  function book(sheets, meta) {
    var ss = [], ssi = new Map();
    var si = function (s) { if (ssi.has(s)) return ssi.get(s); var i = ss.length; ss.push(s); ssi.set(s, i); return i; };
    var sx = sheets.map(function (sh, k) {
      var maxC = 0, x = [];
      sh.rows.forEach(function (r, ri) {
        if (!r) return; var cs = [];
        r.forEach(function (c, ci) {
          if (!c) return; var ref = colL(ci) + (ri + 1), st = c.s != null ? ' s="' + c.s + '"' : ''; maxC = Math.max(maxC, ci + 1);
          if (c.v == null || c.v === '') cs.push('<c r="' + ref + '"' + st + '/>');
          else if (typeof c.v === 'number' && isFinite(c.v)) cs.push('<c r="' + ref + '"' + st + '><v>' + c.v + '</v></c>');
          else cs.push('<c r="' + ref + '"' + st + ' t="s"><v>' + si(String(c.v)) + '</v></c>');
        });
        var h = sh.ht && sh.ht[ri + 1];
        x.push('<row r="' + (ri + 1) + '"' + (h ? ' ht="' + h + '" customHeight="1"' : '') + '>' + cs.join('') + '</row>');
      });
      var last = colL(Math.max(0, maxC - 1)) + Math.max(1, sh.rows.length);
      var fr = sh.freeze ? '<pane ySplit="' + sh.freeze + '" topLeftCell="A' + (sh.freeze + 1) + '" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A' + (sh.freeze + 1) + '" sqref="A' + (sh.freeze + 1) + '"/>' : '<selection activeCell="A1" sqref="A1"/>';
      var cols = (sh.cols || []).map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w.toFixed(1) + '" customWidth="1"' + (sh.colS && sh.colS[i] != null ? ' style="' + sh.colS[i] + '"' : '') + '/>'; }).join('');
      var dv = (sh.dv || []).map(function (d) {
        return '<dataValidation' + (d.type ? ' type="' + d.type + '"' : '') + ' allowBlank="1"' + (d.type ? ' showErrorMessage="1"' : '') + ' showInputMessage="1"'
          + (d.et ? ' errorTitle="' + xe(d.et) + '" error="' + xe(d.e) + '"' : '') + (d.pt ? ' promptTitle="' + xe(d.pt) + '" prompt="' + xe(d.p) + '"' : '') + ' sqref="' + d.ref + '">'
          + (d.list ? '<formula1>"' + xe(d.list.join(',')) + '"</formula1>' : '') + '</dataValidation>';
      }).join('');
      var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + '<sheetPr>' + (sh.tab ? '<tabColor rgb="' + sh.tab + '"/>' : '') + '<pageSetUpPr fitToPage="1"/></sheetPr>'
        + '<dimension ref="A1:' + last + '"/>'
        + '<sheetViews><sheetView' + (k === 0 ? ' tabSelected="1"' : '') + ' rightToLeft="1" showGridLines="0" zoomScale="100" zoomScaleNormal="100" workbookViewId="0">' + fr + '</sheetView></sheetViews>'
        + '<sheetFormatPr defaultRowHeight="20" customHeight="1"/>'
        + (cols ? '<cols>' + cols + '</cols>' : '')
        + '<sheetData>' + x.join('') + '</sheetData>'
        + (sh.filter ? '<autoFilter ref="' + sh.filter + '"/>' : '')
        + (sh.merges && sh.merges.length ? '<mergeCells count="' + sh.merges.length + '">' + sh.merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>' : '')
        + (dv ? '<dataValidations count="' + sh.dv.length + '">' + dv + '</dataValidations>' : '')
        + '<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>'
        + '<pageSetup paperSize="9" orientation="' + (sh.land ? 'landscape' : 'portrait') + '" fitToWidth="1" fitToHeight="0"/>'
        + '<headerFooter><oddFooter>&amp;R' + xe(meta.title) + '&amp;L&amp;P / &amp;N</oddFooter></headerFooter>'
        + '</worksheet>';
      return xml;
    });
    var q = function (n) { return "'" + String(n).replace(/'/g, "''") + "'"; };
    var names = [];
    sheets.forEach(function (sh, k) {
      if (sh.filter) { var p = sh.filter.split(':'), a = p[0].match(/([A-Z]+)(\d+)/), b = p[1].match(/([A-Z]+)(\d+)/); names.push('<definedName name="_xlnm._FilterDatabase" localSheetId="' + k + '" hidden="1">' + xe(q(sh.name)) + '!$' + a[1] + '$' + a[2] + ':$' + b[1] + '$' + b[2] + '</definedName>'); }
      if (sh.titles) names.push('<definedName name="_xlnm.Print_Titles" localSheetId="' + k + '">' + xe(q(sh.name)) + '!$1:$' + sh.titles + '</definedName>');
    });
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<workbookPr defaultThemeVersion="124226"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="16000" windowHeight="10000" activeTab="0"/></bookViews><sheets>'
      + sheets.map(function (sh, k) { return '<sheet name="' + xe(sh.name) + '" sheetId="' + (k + 1) + '" r:id="rId' + (k + 1) + '"/>'; }).join('') + '</sheets>'
      + (names.length ? '<definedNames>' + names.join('') + '</definedNames>' : '') + '<calcPr calcId="191029"/></workbook>';
    var n = sheets.length;
    var wbr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map(function (sh, k) { return '<Relationship Id="rId' + (k + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (k + 1) + '.xml"/>'; }).join('')
      + '<Relationship Id="rId' + (n + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '<Relationship Id="rId' + (n + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>';
    var sst = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + ss.length + '" uniqueCount="' + ss.length + '">'
      + ss.map(function (s) { return '<si><t' + (/^\s|\s$/.test(s) ? ' xml:space="preserve"' : '') + '>' + xe(s) + '</t></si>'; }).join('') + '</sst>';
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + sheets.map(function (sh, k) { return '<Override PartName="/xl/worksheets/sheet' + (k + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('')
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
      + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>';
    var iso = meta.now.toISOString().replace(/\.\d+Z$/, 'Z');
    var core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + '<dc:title>' + xe(meta.title) + '</dc:title><dc:subject>' + xe(meta.subject || '') + '</dc:subject><dc:creator>منصة أسرة الجنيدلي</dc:creator><cp:lastModifiedBy>منصة أسرة الجنيدلي</cp:lastModifiedBy>'
      + '<dc:language>ar-SA</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">' + iso + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + iso + '</dcterms:modified></cp:coreProperties>';
    var app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
      + '<Application>Microsoft Excel</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company>منصة أسرة الجنيدلي</Company>'
      + '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>' + n + '</vt:i4></vt:variant></vt:vector></HeadingPairs>'
      + '<TitlesOfParts><vt:vector size="' + n + '" baseType="lpstr">' + sheets.map(function (sh) { return '<vt:lpstr>' + xe(sh.name) + '</vt:lpstr>'; }).join('') + '</vt:vector></TitlesOfParts>'
      + '<LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion></Properties>';
    var files = [['[Content_Types].xml', ct], ['_rels/.rels', rels], ['docProps/core.xml', core], ['docProps/app.xml', app], ['xl/workbook.xml', wb], ['xl/_rels/workbook.xml.rels', wbr], ['xl/styles.xml', stylesXml()]]
      .concat(sx.map(function (x, k) { return ['xl/worksheets/sheet' + (k + 1) + '.xml', x]; }), [['xl/sharedStrings.xml', sst]]);
    return zip(files, meta.now);
  }
  var MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var blobOf = function (u8) { return new Blob([u8], { type: MIME }); };
  var cell = function (v, s) { return { v: v, s: XF[s] }; };
  // رأس الورقة: عنوان مدموج + سطر التاريخ (هجري وميلادي) بحد ذهبي
  function head(rows, ht, merges, nc, title, sub) {
    var r1 = [cell(title, 'title')], r2 = [cell(sub, 'sub')];
    for (var i = 1; i < nc; i++) { r1.push(cell('', 'title')); r2.push(cell('', 'sub')); }
    rows.push(r1, r2); ht[1] = 34; ht[2] = 22;
    merges.push('A1:' + colL(nc - 1) + '1', 'A2:' + colL(nc - 1) + '2');
  }
  var fitCols = function (rows, from, nc, min, max) {
    var w = []; for (var c = 0; c < nc; c++) { var m = min[c] || 8; for (var r = from; r < rows.length; r++) { var x = rows[r] && rows[r][c]; if (x && x.v != null) m = Math.max(m, wOf(x.v) + 3); } w.push(Math.min(max[c] || 60, m)); } return w;
  };
  var dateLine = function (now) { var h = hijri(now); return h ? hTxt(h) + ' الموافق ' + gTxt(now) : gTxt(now); };
  var idCell = function (id) { var s = String(id == null ? '' : id); return /^\d{1,15}$/.test(s) ? +s : safe(s); };

  /* ───────── التصدير ───────── */
  function exportTree(rows, opts) {
    opts = opts || {}; var now = opts.now || new Date(), T = treeIndex(rows), H = ['الرقم', 'الاسم', 'رقم الأب', 'نسب الأب', 'الجنس', 'تاريخ الميلاد', 'حالة التأكيد'], NC = H.length;
    var R = [], ht = {}, mg = [];
    head(R, ht, mg, NC, 'منصة أسرة الجنيدلي', 'أفراد الشجرة، تاريخ التصدير ' + dateLine(now));
    R.push(H.map(function (h) { return cell(h, 'head'); })); ht[3] = 28;
    var ST = { 'مؤكد': 'stOk', 'غير مؤكد': 'stPr', 'غير واضح': 'stUn' };
    T.order.forEach(function (n, i) {
      var a = i % 2 ? 'A' : '', f = n.parent, st = linkTxt(n.link), r = n.row;
      var nas = f ? lineage(f) : '— الجد الأول —';
      R.push([cell(idCell(n.id), 'num' + a), cell(safe(n.name), 'txt' + a), cell(f ? idCell(f.id) : '', 'num' + a), cell(safe(nas), 'txtW' + a),
        cell(n.gender === 'female' ? 'أنثى' : 'ذكر', 'num' + a), cell(birthTxt(r), 'num' + a), cell(st, ST[st])]);
    });
    var cols = fitCols(R, 2, NC, [8, 12, 9, 30, 8, 13, 13], [14, 24, 14, 80, 9, 15, 14]);
    // نسب الأب الطويل يلتف داخل خانته، وارتفاع السطر يتحسب من طوله
    for (var ri = 3; ri < R.length; ri++) { var L = Math.ceil(wOf(R[ri][3].v) / Math.max(1, cols[3] - 3)); ht[ri + 1] = L > 1 ? 16 * L + 6 : 21; }
    var data = { name: 'الأفراد', rows: R, ht: ht, cols: cols, merges: mg, freeze: 3, filter: 'A3:' + colL(NC - 1) + Math.max(4, R.length), land: 1, titles: 3, tab: C.teal };
    return blobOf(book([data, summary(T, now)], { now: now, title: 'شجرة أسرة الجنيدلي', subject: 'أفراد الشجرة' }));
  }
  function summary(T, now) {
    var L = T.order, R = [], ht = {}, mg = [], NC = 2;
    head(R, ht, mg, NC, 'ملخص الشجرة', 'منصة أسرة الجنيدلي');
    var sec = function (t) { R.push(null); R.push([cell(t, 'sec'), null]); ht[R.length] = 24; };
    var row = function (a, b, s) { R.push([cell(a, s || 'lab'), cell(b, 'big')]); ht[R.length] = 22; };
    var cnt = function (f) { return L.filter(f).length; };
    sec('التصدير');
    R.push([cell('التاريخ', 'lab'), cell(dateLine(now), 'txtW')]); ht[R.length] = 36;
    R.push([cell('الساعة', 'lab'), cell(tTxt(now), 'txt')]); ht[R.length] = 22;
    sec('الأفراد');
    row('كل الأفراد', L.length);
    row('الذكور', cnt(function (n) { return n.gender !== 'female'; }));
    row('الإناث', cnt(function (n) { return n.gender === 'female'; }));
    row('مسجّل لهم تاريخ ميلاد', cnt(function (n) { return !!birthTxt(n.row); }));
    sec('حسب حالة التأكيد');
    [['مؤكد', 'stOk'], ['غير مؤكد', 'stPr'], ['غير واضح', 'stUn']].forEach(function (p) { row(p[0], cnt(function (n) { return linkTxt(n.link) === p[0]; }), p[1]); });
    var g = {}; L.forEach(function (n) { g[n.depth] = (g[n.depth] || 0) + 1; });
    var ks = Object.keys(g).map(Number).sort(function (a, b) { return a - b; });
    sec('حسب الجيل');
    ks.forEach(function (k) { row('الجيل ' + (k + 1), g[k]); });
    return { name: 'ملخص', rows: R, ht: ht, cols: [28, 30], merges: mg, tab: C.gold, titles: 2 };
  }

  /* ───────── النموذج ───────── */
  var TH = ['الاسم', 'رقم الأب أو نسبه', 'الجنس', 'تاريخ الميلاد (هجري، اختياري)'];
  var SAMPLES = [['نورة', '245', 'أنثى', '1445/03/12'], ['عبدالله', 'فهد بن عثمان بن إبراهيم', 'ذكر', '']];
  var NOTE = 'امسح سطري المثال قبل الرفع. رقم الأب تلقاه في ملف التصدير، أو اكتب نسبه الكامل. والأب وأبناؤه يقدرون يكونون في نفس الملف.';
  function template(rows, opts) {
    opts = opts || {}; var now = opts.now || new Date(), T = treeIndex(rows || []), NC = 4, R = [], ht = {}, mg = [];
    head(R, ht, mg, NC, 'نموذج إضافة أسماء', 'منصة أسرة الجنيدلي، جهّزناه ' + dateLine(now));
    R.push([cell(NOTE, 'note'), cell('', 'note'), cell('', 'note'), cell('', 'note')]); mg.push('A3:D3'); ht[3] = 36;
    R.push(TH.map(function (h) { return cell(h, 'head'); })); ht[4] = 30;
    SAMPLES.forEach(function (s) { R.push(s.map(function (v, i) { return cell(v, i === 0 || (i === 1 && !/^\d+$/.test(v)) ? 'ex' : 'exC'); })); ht[R.length] = 22; });
    var first = R.length + 1, lastIn = first + 199;
    for (var i = 0; i < 200; i++) { R.push([cell('', 'inp'), cell('', 'inp'), cell('', 'inp'), cell('', 'inp')]); ht[R.length] = 22; }
    var add = {
      name: 'أضف الأسماء', rows: R, ht: ht, cols: [18, 40, 12, 26], colS: [XF.inp, XF.inp, XF.inp, XF.inp], merges: mg, freeze: 4, land: 1, titles: 4, tab: C.teal,
      dv: [
        { ref: 'A5:A' + lastIn, pt: 'الاسم', p: 'الاسم الأول بس، بالحروف العربية' },
        { ref: 'B5:B' + lastIn, pt: 'رقم الأب أو نسبه', p: 'رقم الأب من ورقة «الآباء»، أو نسبه الكامل مثل: فهد بن عثمان بن إبراهيم' },
        { ref: 'C5:C' + lastIn, type: 'list', list: ['ذكر', 'أنثى'], et: 'الجنس', e: 'اختر «ذكر» أو «أنثى»', pt: 'الجنس', p: 'اختر «ذكر» أو «أنثى»' },
        { ref: 'D5:D' + lastIn, pt: 'تاريخ الميلاد', p: 'هجري بهالشكل 1445/03/12، أو اتركه فاضي' }
      ]
    };
    // طريقة التعبئة
    var I = [], iht = {}, img = [];
    head(I, iht, img, 2, 'طريقة التعبئة', 'اقرأها قبل ما تعبّي النموذج');
    [
      'اكتب كل اسم في سطر بورقة «أضف الأسماء»، تحت سطري المثال.',
      'الاسم: اكتب الاسم الأول بس، بالحروف العربية. ونسب الأب في عموده.',
      'رقم الأب أو نسبه: رقم الأب تلقاه في ورقة «الآباء» أو في ملف التصدير، أو اكتب نسبه الكامل مثل «فهد بن عثمان بن إبراهيم».',
      'الجنس: اختر «ذكر» أو «أنثى» من القائمة.',
      'تاريخ الميلاد (هجري، اختياري): اكتبه بهالشكل 1445/03/12، أو اتركه فاضي.',
      'الأب وأبناؤه يقدرون يكونون في نفس الملف.',
      'امسح سطري المثال قبل الرفع.',
      'ارفع الملف من «الأدوات» ثم «أضف أسماء من إكسل»، وراجع الأسماء قبل الإضافة. قبل الإضافة تنحفظ نسخة احتياطية تلقائياً، وتقدر تتراجع.'
    ].forEach(function (t, i) { I.push([cell(i + 1, 'step'), cell(t, 'stepT')]); var L = Math.ceil(wOf(t) / 64); iht[I.length] = L > 1 ? 18 * L + 10 : 26; });
    var ins = { name: 'طريقة التعبئة', rows: I, ht: iht, cols: [6, 72], merges: img, tab: C.gold };
    // الآباء: كل رجل في الشجرة برقمه ونسبه، عشان تنسخ الرقم الصحيح
    var F = [], fht = {}, fmg = [];
    head(F, fht, fmg, 2, 'الآباء: رقم الأب ونسبه', 'انسخ رقم الأب من هنا والصقه في عمود «رقم الأب أو نسبه»');
    F.push([cell('رقم الأب', 'head'), cell('النسب', 'head')]); fht[3] = 28;
    T.order.filter(function (n) { return n.gender !== 'female'; }).forEach(function (n, i) { var a = i % 2 ? 'A' : ''; F.push([cell(idCell(n.id), 'num' + a), cell(safe(lineage(n)), 'txtW' + a)]); });
    var fc = fitCols(F, 3, 2, [10, 40], [14, 80]);
    for (var r = 3; r < F.length; r++) { var L = Math.ceil(wOf(F[r][1].v) / Math.max(1, fc[1] - 3)); fht[r + 1] = L > 1 ? 16 * L + 6 : 21; }
    var fa = { name: 'الآباء', rows: F, ht: fht, cols: fc, merges: fmg, freeze: 3, filter: 'A3:B' + Math.max(4, F.length), titles: 3, tab: C.dark };
    return blobOf(book([add, ins, fa], { now: now, title: 'نموذج إضافة أسماء', subject: 'إضافة أسماء لشجرة أسرة الجنيدلي' }));
  }

  /* ───────── القراءة ───────── */
  var E = {
    type: 'الملف لازم يكون إكسل (xlsx) أو csv',
    read: 'ما قدرنا نقرأ الملف. احفظه من إكسل مرة ثانية وجرّب',
    locked: 'الملف محمي بكلمة مرور، احفظه بدونها وجرّب',
    empty: 'الملف فاضي، ما فيه أسماء',
    noname: 'ما لقينا عمود «الاسم». نزّل النموذج وانسخ أسماءك فيه',
    nofather: 'ما لقينا عمود «رقم الأب أو نسبه». نزّل النموذج وانسخ أسماءك فيه',
    nogender: 'ما لقينا عمود «الجنس». نزّل النموذج وانسخ أسماءك فيه',
    toomany: 'الملف فيه أسطر كثيرة، الحد ' + ar(LIMITS.rows) + ' سطر في المرة. قسّمه على أكثر من ملف',
    big: 'الملف كبير، الحد ' + ar(LIMITS.bytes / 1048576) + ' ميجا. قسّمه على أكثر من ملف',
    nostream: 'متصفحك ما يقرأ ملفات إكسل. احفظ الملف csv من إكسل وارفعه، أو جرّب من متصفح أحدث'
  };
  var u16 = function (b, o) { return b[o] | (b[o + 1] << 8); };
  var u32 = function (b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; };
  function unzipDir(b) {
    var e = -1; for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw XLErr('read', E.read);
    var cnt = u16(b, e + 10), off = u32(b, e + 16), map = {}, dec = new TextDecoder('utf-8');
    for (var k = 0; k < cnt; k++) {
      if (off + 46 > b.length || u32(b, off) !== 0x02014b50) throw XLErr('read', E.read);
      var fl = u16(b, off + 8), m = u16(b, off + 10), cs = u32(b, off + 20), us = u32(b, off + 24), nl = u16(b, off + 28), el = u16(b, off + 30), cl = u16(b, off + 32), lo = u32(b, off + 42);
      var name = dec.decode(b.subarray(off + 46, off + 46 + nl));
      if (lo + 30 > b.length || u32(b, lo) !== 0x04034b50) throw XLErr('read', E.read);
      var ds = lo + 30 + u16(b, lo + 26) + u16(b, lo + 28);
      map[name.replace(/\\/g, '/')] = { m: m, enc: fl & 1, data: b.subarray(ds, ds + cs), size: us };
      off += 46 + nl + el + cl;
    }
    return map;
  }
  function canInflate() { try { if (typeof DecompressionStream === 'undefined') return false; new DecompressionStream('deflate-raw'); return true; } catch (e) { return false; } }
  async function inflate(u8) {
    var rd = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(), out = [], n = 0;
    for (; ;) { var x = await rd.read(); if (x.done) break; n += x.value.length; if (n > LIMITS.unz) { try { rd.cancel(); } catch (e) { } throw XLErr('big', E.big); } out.push(x.value); }
    return concat(out);
  }
  async function entry(Z, name) {
    var z = Z[name]; if (!z) { var k = Object.keys(Z).find(function (x) { return x.toLowerCase() === name.toLowerCase(); }); z = k && Z[k]; }
    if (!z) return null; if (z.enc) throw XLErr('locked', E.locked);
    if (z.size > LIMITS.unz) throw XLErr('big', E.big);
    var u = z.m === 0 ? z.data : z.m === 8 ? await inflate(z.data) : null; if (!u) throw XLErr('read', E.read);
    return new TextDecoder('utf-8').decode(u);
  }
  var ent = function (s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, function (m, g) { g = g.toLowerCase(); if (g[0] === '#') { var c = g[1] === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10); try { return String.fromCodePoint(c); } catch (e) { return ''; } } return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[g]; })
      .replace(/_x([0-9A-Fa-f]{4})_/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); });
  };
  var attrs = function (s) { var o = {}, re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, m; while ((m = re.exec(s))) { var k = m[1], v = ent(m[2] != null ? m[2] : m[3]); o[k] = v; var i = k.indexOf(':'); if (i >= 0 && !(k.slice(i + 1) in o)) o[k.slice(i + 1)] = v; } return o; };
  var tText = function (x) { var s = '', re = /<(?:\w+:)?t\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?t>)/g, m; x = x.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, ''); while ((m = re.exec(x))) s += m[1] ? ent(m[1]) : ''; return s; };
  var tagBody = function (x, tag) { var m = x.match(new RegExp('<(?:\\w+:)?' + tag + '\\b[^>]*?(?:/>|>([\\s\\S]*?)</(?:\\w+:)?' + tag + '>)')); return m ? (m[1] || '') : null; };
  var DATE_IDS = { 14: 1, 15: 1, 16: 1, 17: 1, 22: 1, 27: 1, 28: 1, 29: 1, 30: 1, 31: 1, 34: 1, 35: 1, 36: 1, 50: 1, 51: 1, 52: 1, 53: 1, 54: 1, 57: 1, 58: 1 };
  function dateStyles(sx) {
    var custom = {}, re = /<(?:\w+:)?numFmt\b([^>]*)\/?>/g, m;
    while ((m = re.exec(sx))) { var a = attrs(m[1]), code = String(a.formatCode || '').replace(/"[^"]*"|\\.|\[(?!h\]|m\]|s\])[^\]]*\]/gi, ''); custom[a.numFmtId] = /[dy]/i.test(code) || /m/i.test(code) && !/[hs]/i.test(code) && !/^[#0.,%\s]*$/.test(code); }
    var cx = tagBody(sx, 'cellXfs') || '', out = [], xr = /<(?:\w+:)?xf\b([^>]*?)\/?>/g;
    while ((m = xr.exec(cx))) { var id = +attrs(m[1]).numFmtId || 0; out.push(!!(DATE_IDS[id] || custom[id])); }
    return out;
  }
  var colIdx = function (ref) { var m = /^([A-Z]+)/i.exec(ref || ''); if (!m) return -1; var n = 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].toUpperCase().charCodeAt(i) - 64); return n - 1; };
  // خلية: { s: نص, n: رقم (إن كان)، d: تاريخ (إن كان) }
  function sheetGrid(x, ss, isDate, d1904) {
    var rows = [], rr = /<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g, m, last = -1;
    var sd = tagBody(x, 'sheetData'); if (sd == null) return rows;
    while ((m = rr.exec(sd))) {
      var ra = attrs(m[1]), ri = ra.r ? +ra.r - 1 : last + 1; last = ri; if (ri > LIMITS.rows * 3 + 100) break;
      var row = [], cr = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g, c, lc = -1;
      var body = m[2] || '';
      while ((c = cr.exec(body))) {
        var a = attrs(c[1]), ci = a.r ? colIdx(a.r) : lc + 1; lc = ci; if (ci < 0 || ci > 200) continue;
        var inner = c[2] || '', t = a.t || 'n', v = tagBody(inner, 'v'), o = null;
        v = v == null ? null : ent(v);
        if (t === 's') o = { s: v != null && ss[+v] != null ? ss[+v] : '' };
        else if (t === 'inlineStr') o = { s: tText(tagBody(inner, 'is') || '') };
        else if (t === 'str') o = { s: v || '' };
        else if (t === 'b') o = { s: v === '1' ? 'TRUE' : 'FALSE' };
        else if (t === 'e') o = { s: '' };
        else if (t === 'd') { var dd = new Date(v); o = isNaN(dd) ? { s: v || '' } : { s: v, d: dd }; }
        else if (v != null && v !== '') {
          var num = +v; if (!isFinite(num)) o = { s: v };
          else if (isDate[+a.s || 0] && num > 0 && num < 2958466) o = { s: v, n: num, d: new Date(Math.round((num - 25569 + (d1904 ? 1462 : 0)) * 864e5)) };
          else o = { s: Number.isInteger(num) ? String(num) : String(+num.toPrecision(15)), n: num };
        }
        if (o) row[ci] = o;
      }
      rows[ri] = row;
    }
    return rows;
  }
  async function readXlsx(b) {
    if (!canInflate()) {
      // الملف بطريقة store (مثل ملفاتنا) نقدر نقرأه بدون DecompressionStream
      var Z0 = unzipDir(b); if (Object.keys(Z0).some(function (k) { return Z0[k].m === 8; })) throw XLErr('nostream', E.nostream);
    }
    var Z = unzipDir(b);
    if (Z['EncryptedPackage'] || Z['EncryptionInfo']) throw XLErr('locked', E.locked);
    var wb = await entry(Z, 'xl/workbook.xml'); if (wb == null) throw XLErr('type', E.type);
    var rels = (await entry(Z, 'xl/_rels/workbook.xml.rels')) || '', R = {}, ssPath = null, stPath = null, m, re = /<(?:\w+:)?Relationship\b([^>]*?)\/?>/g;
    var res = function (t) { t = String(t || ''); var p = t[0] === '/' ? t.slice(1) : 'xl/' + t; var o = []; p.split('/').forEach(function (s) { if (s === '..') o.pop(); else if (s && s !== '.') o.push(s); }); return o.join('/'); };
    while ((m = re.exec(rels))) { var a = attrs(m[1]); R[a.Id] = res(a.Target); if (/\/sharedStrings$/.test(a.Type || '')) ssPath = res(a.Target); if (/\/styles$/.test(a.Type || '')) stPath = res(a.Target); }
    var ss = [], ssx = await entry(Z, ssPath || 'xl/sharedStrings.xml');
    if (ssx) { var sr = /<(?:\w+:)?si\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?si>)/g; while ((m = sr.exec(ssx))) ss.push(tText(m[1] || '')); }
    var stx = await entry(Z, stPath || 'xl/styles.xml'), isDate = stx ? dateStyles(stx) : [];
    var d1904 = /<(?:\w+:)?workbookPr\b[^>]*date1904\s*=\s*"(1|true)"/i.test(wb);
    var sheets = [], shr = /<(?:\w+:)?sheet\b([^>]*?)\/?>/g;
    while ((m = shr.exec(wb))) { var sa = attrs(m[1]), p = R[sa.id]; if (p && sa.state !== 'hidden' && sa.state !== 'veryHidden') sheets.push({ name: sa.name || '', path: p }); }
    if (!sheets.length) Object.keys(Z).filter(function (k) { return /^xl\/worksheets\/[^/]+\.xml$/i.test(k); }).sort().forEach(function (k) { sheets.push({ name: k, path: k }); });
    var out = [];
    for (var i = 0; i < sheets.length; i++) { var x = await entry(Z, sheets[i].path); if (x != null) out.push({ name: sheets[i].name, grid: sheetGrid(x, ss, isDate, d1904) }); }
    return out;
  }
  function decodeText(b) {
    if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) return new TextDecoder('utf-8').decode(b.subarray(3));
    if (b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder('utf-16le').decode(b.subarray(2));
    if (b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(b.subarray(2));
    var z0 = 0, z1 = 0, n = Math.min(b.length, 4000); for (var i = 0; i < n; i++) if (!b[i]) { if (i % 2) z1++; else z0++; }
    if (z1 > n / 8 && z0 < n / 50) return new TextDecoder('utf-16le').decode(b);
    if (z0 > n / 8 && z1 < n / 50) return new TextDecoder('utf-16be').decode(b);
    if (z0 + z1) throw XLErr('type', E.type);
    try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { }
    try { return new TextDecoder('windows-1256').decode(b); } catch (e) { throw XLErr('read', E.read); }
  }
  function csvGrid(txt) {
    var lines = txt.split(/\r\n|\n|\r/), sep = null, start = 0;
    var m0 = /^"?sep=(.)"?\s*$/i.exec(lines[0] || ''); if (m0) { sep = m0[1]; start = lines[0].length; while (txt[start] === '\r' || txt[start] === '\n') start++; }
    if (!sep) {
      var first = lines.find(function (l) { return l.trim(); }) || '', best = ',', bc = 0;
      [',', ';', '؛', '\t', '|'].forEach(function (s) { var c = 0, q = false; for (var i = 0; i < first.length; i++) { var ch = first[i]; if (ch === '"') q = !q; else if (!q && ch === s) c++; } if (c > bc) { bc = c; best = s; } });
      sep = best;
    }
    var rows = [], row = [], f = '', q = false, i = start, s = txt;
    var push = function () { row.push({ s: f }); f = ''; };
    for (; i < s.length; i++) {
      var ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; continue; }
      if (ch === '"' && f.replace(/\s/g, '') === '') { f = ''; q = true; }
      else if (ch === sep) push();
      else if (ch === '\r' || ch === '\n') { push(); rows.push(row); row = []; if (ch === '\r' && s[i + 1] === '\n') i++; if (rows.length > LIMITS.rows * 3 + 100) break; }
      else f += ch;
    }
    if (f !== '' || row.length) { push(); rows.push(row); }
    return [{ name: 'csv', grid: rows }];
  }
  // مطابقة رؤوس الأعمدة بالاسم العربي (بأي ترتيب، وأي أعمدة زيادة تنترك)
  function role(h) {
    var k = norm(String(h || '').replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, '')).replace(/[^\u0621-\u064Aa-z]/g, '');
    if (!k) return '';
    if (k === 'الرقم' || k === 'رقم' || k === 'id' || k === 'المعرف' || k === 'الرقمالتسلسلي' || k === 'م') return 'id';
    if (k.indexOf('رقمالاب') >= 0 || k.indexOf('رقمابوه') >= 0 || k === 'fatherid') return 'fid';
    if (k.indexOf('نسبالاب') >= 0 || k === 'الاب' || k === 'اسمالاب' || k === 'ابوه' || k === 'النسب' || k === 'نسبه' || k === 'father') return 'fnas';
    if (k === 'الاسم' || k === 'اسم' || k === 'الاسمالاول' || k === 'اسمالشخص' || k === 'name') return 'name';
    if (k.indexOf('جنس') >= 0 || k === 'gender' || k === 'sex') return 'gender';
    if (k.indexOf('ميلاد') >= 0 || k.indexOf('تاريخ') >= 0 || k === 'birth' || k === 'المواليد') return 'birth';
    if (k.indexOf('حاله') >= 0) return 'status';
    return '';
  }
  var cTxt = function (c) { return c ? clean(c.s) : ''; };
  function bDate(c) {
    if (!c) return '';
    if (c.d) { var h = hijri(c.d); return h ? h.y + '/' + pad(h.m) + '/' + pad(h.d) : cTxt(c); }
    return cTxt(c);
  }
  function tableRows(sheets) {
    var noFather = false, noGender = false;
    for (var si = 0; si < sheets.length; si++) {
      var g = sheets[si].grid;
      for (var r = 0, seen = 0; r < g.length && seen < 25; r++) {
        if (!g[r] || !g[r].some(function (c) { return c && cTxt(c); })) continue; seen++;
        var map = {}; g[r].forEach(function (c, ci) { var k = role(cTxt(c)); if (k && map[k] == null) map[k] = ci; });
        if (map.name == null) continue;
        if (map.fid == null && map.fnas == null) { noFather = true; continue; }
        if (map.gender == null) { noGender = true; continue; }
        var out = [];
        for (var j = r + 1; j < g.length; j++) {
          var row = g[j]; if (!row) continue;
          var at = function (k) { return map[k] == null ? '' : cTxt(row[map[k]]); };
          var fid = at('fid'), fn = at('fnas');
          var o = { line: j + 1, name: at('name'), father: fid || fn, fatherAlt: fid && fn && fid !== fn ? fn : '', gender: at('gender'), birth: map.birth == null ? '' : bDate(row[map.birth]) };
          if (!o.name && !o.father && !o.gender && !o.birth) continue;
          if (SAMPLES.some(function (s) { return s[0] === o.name && s[1] === o.father && s[2] === o.gender && s[3] === o.birth; })) o.sample = true;
          out.push(o);
          if (out.length > LIMITS.rows) throw XLErr('toomany', E.toomany);
        }
        out.sheet = sheets[si].name;
        if (!out.some(function (o) { return !o.sample; })) throw XLErr('empty', E.empty);
        return out;
      }
    }
    if (noFather) throw XLErr('nofather', E.nofather);
    if (noGender) throw XLErr('nogender', E.nogender);
    var any = sheets.some(function (s) { return s.grid.some(function (row) { return row && row.some(function (c) { return c && cTxt(c); }); }); });
    throw any ? XLErr('noname', E.noname) : XLErr('empty', E.empty);
  }
  /* parse(file) → Promise<Row[]>: Row = { line, name, father, fatherAlt, gender, birth, sample? } — كلها نصوص خام.
     الخطأ يرجع Error فيه code و message بالعربي جاهزة للعرض (عبر esc). */
  async function parse(file) {
    var b;
    try {
      if (file instanceof Uint8Array) b = file; else if (file instanceof ArrayBuffer) b = new Uint8Array(file);
      else { if (file && file.size > LIMITS.bytes) throw XLErr('big', E.big); b = new Uint8Array(await file.arrayBuffer()); }
    } catch (e) { if (e.xl) throw e; throw XLErr('read', E.read); }
    if (b.length > LIMITS.bytes) throw XLErr('big', E.big);
    if (!b.length) throw XLErr('empty', E.empty);
    var name = String(file && file.name || '').toLowerCase(), sheets;
    try {
      if (b[0] === 0x50 && b[1] === 0x4B && b[2] === 0x03 && b[3] === 0x04) sheets = await readXlsx(b);
      else if (b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0) {
        var probe = new TextDecoder('utf-16le').decode(b.subarray(0, Math.min(b.length, 1 << 20)));
        throw /EncryptionInfo|EncryptedPackage/.test(probe) ? XLErr('locked', E.locked) : XLErr('type', E.type);
      }
      else if (/\.(xls|xlsb|ods|numbers|xlsm)$/.test(name)) throw XLErr('type', E.type);
      else sheets = csvGrid(decodeText(b));
    } catch (e) { if (e.xl) throw e; throw XLErr('read', E.read); }
    return tableRows(sheets);
  }

  /* ───────── التحقق ───────── */
  var MALE = ['ذكر', 'ابن', 'ولد', 'رجل', 'ذ', 'm', 'male', 'boy', 'son'], FEMALE = ['انثي', 'بنت', 'امراه', 'انثا', 'ا', 'f', 'female', 'girl', 'daughter'];
  var gOf = function (v) { var k = norm(v); return MALE.indexOf(k) >= 0 ? 'male' : FEMALE.indexOf(k) >= 0 ? 'female' : null; };
  function hToday() { return hijri(new Date()) || { y: 1448, m: 1, d: 1 }; }
  function pDate(v, today) {
    var s = toLat(v).replace(/هجري[ةه]?|هـ|ه$/g, '').trim(); if (!s) return { ok: 1 };
    if (!/^[\d\s\/\-.\\]+$/.test(s)) return { bad: 1 };
    var p = s.split(/[\s\/\-.\\]+/).filter(Boolean).map(function (x) { return x; }), y = 0, m = 0, d = 0;
    if (p.length === 1 && /^\d{4}$/.test(p[0])) y = +p[0];
    else if (p.length === 2) { if (/^\d{4}$/.test(p[0])) { y = +p[0]; m = +p[1]; } else if (/^\d{4}$/.test(p[1])) { y = +p[1]; m = +p[0]; } else return { bad: 1 }; }
    else if (p.length === 3) { if (/^\d{4}$/.test(p[0])) { y = +p[0]; m = +p[1]; d = +p[2]; } else if (/^\d{4}$/.test(p[2])) { y = +p[2]; m = +p[1]; d = +p[0]; } else return { bad: 1 }; }
    else return { bad: 1 };
    // تاريخ ميلادي كامل (مثل 2023-09-27) واضح: نحوّله هجري مثل خانات التاريخ في إكسل
    if (y >= 1900 && y <= 2100 && p.length === 3 && m >= 1 && m <= 12 && d >= 1 && d <= 31) { var gd = new Date(Date.UTC(y, m - 1, d, 12)); if (gd.getUTCDate() !== d) return { bad: 1 }; var hh = hijri(gd); if (!hh) return { bad: 1 }; y = hh.y; m = hh.m; d = hh.d; }
    if (y < 1300 || y > 1600 || (p.length > 1 && (m < 1 || m > 12)) || (p.length > 2 && (d < 1 || d > 30))) return { bad: 1 };
    var t = today, k = y * 10000 + m * 100 + d, tk = t.y * 10000 + (m ? t.m : 0) * 100 + (d ? t.d : 0);
    if (k > tk) return { future: 1 };
    return { ok: 1, y: y, m: m, d: d };
  }
  var STOP = ['بن', 'ابن', 'بنت', 'ال', 'الجنيدلي', 'جنيدلي', 'الجنيدل', 'من'];
  function toks(v) { return String(v || '').replace(/[،,؛;:\-–—_|\/\\().]/g, ' ').split(/\s+/).map(norm).filter(function (t) { return t && STOP.indexOf(t) < 0; }); }
  function nameIssue(name) {
    if (!name) return 'name_empty';
    if (!/^[\u0621-\u063A\u0641-\u064A\u064B-\u065F\u0670\u0671-\u06D3\u0640\s]+$/.test(name)) return 'name_chars';
    var w = name.split(' '), g = 0;
    for (var i = 0; i < w.length; i++) { var k = norm(w[i]); if (k === 'بن' || k === 'ابن' || k === 'بنت') return 'name_long'; if ((k === 'عبد' || k === 'ابو') && i < w.length - 1) i++; g++; }
    if (g > 2 || name.length > 40) return 'name_long';
    return '';
  }
  var MSG = {
    name_empty: ['الاسم فاضي', 'اكتب الاسم في عمود «الاسم»'],
    name_chars: ['الاسم فيه أرقام أو رموز', 'اكتب الاسم بالحروف العربية بس'],
    name_long: ['الاسم طويل، يبدو إنه نسب كامل', 'اكتب الاسم الأول بس، ونسب الأب في عموده'],
    father_empty: ['الأب فاضي', 'اكتب رقم الأب أو نسبه الكامل'],
    gender_empty: ['الجنس فاضي', 'اكتب «ذكر» أو «أنثى»'],
    exists: ['الاسم موجود تحت نفس الأب ومؤكد', 'هذا الشخص في الشجرة أصلاً، امسح السطر'],
    self: ['السطر يرجع لنفسه كأب', 'تأكد من عمود الأب'],
    date_future: ['التاريخ ما جاء للحين', 'تأكد من السنة الهجرية']
  };
  /* validate(rows, tree, opts) → { items, ok, warn, err, skip, n, need, plan }
     rows: ناتج parse. tree: S.rows (صفوف الشجرة كما هي). opts.decisions: { [line]: 'same'|'new'|'t:<id>'|'r:<line>' }، opts.today: {y,m,d} هجري */
  function validate(rows, tree, opts) {
    opts = opts || {}; var dec = opts.decisions || {}, today = opts.today || hToday(), T = treeIndex(tree);
    var items = (rows || []).map(function (r) {
      return { line: r.line, name: clean(r.name).replace(/\u0640/g, ''), raw: r, level: '', code: '', msg: '', fix: '', errs: [], choices: [], decision: dec[r.line] != null ? String(dec[r.line]) : '', gender: null, birth: '', bfull: null, birthTxt: '' };
    });
    var byLine = {}; items.forEach(function (it) { byLine[it.line] = it; });
    var bad = function (it, code, msg, fix) { it.errs.push({ code: code, msg: msg, fix: fix }); };
    // 1) الخانات
    items.forEach(function (it) {
      var r = it.raw; if (r.sample) { it.level = 'skip'; it.code = 'sample'; it.msg = 'سطر المثال من النموذج، ما ينضاف'; return; }
      var ni = nameIssue(it.name); if (ni) bad(it, ni, MSG[ni][0], MSG[ni][1]);
      if (!clean(r.father)) bad(it, 'father_empty', MSG.father_empty[0], MSG.father_empty[1]);
      var g = clean(r.gender); it.gender = gOf(g);
      if (!g) bad(it, 'gender_empty', MSG.gender_empty[0], MSG.gender_empty[1]);
      else if (!it.gender) bad(it, 'gender', 'الجنس غير واضح: ' + g, 'اكتب «ذكر» أو «أنثى»');
      var b = clean(r.birth), d = pDate(b, today);
      if (d.bad) bad(it, 'date', 'التاريخ غير صحيح: ' + b, 'اكتبه هجري بهالشكل 1445/03/12، أو اتركه فاضي');
      else if (d.future) bad(it, 'date_future', MSG.date_future[0], MSG.date_future[1]);
      else if (d.y) { it.birth = String(d.y); it.bfull = d.m ? d.y + '-' + d.m + '-' + (d.d || 0) : null; it.birthTxt = d.y + (d.m ? '/' + pad(d.m) + (d.d ? '/' + pad(d.d) : '') : ''); }
      it.n = norm(it.name);
    });
    var live = function (it) { return !it.level && !it.errs.length; };
    // 2) الأب: رقم من الشجرة، أو نسب يطابق الشجرة أو أسطر الملف
    var FN = new Map();   // الاسم المطبّع ← عُقد أسطر الملف اللي تحدد أبوها
    var vnode = function (it) { var v = { name: it.name, n: it.n, gender: it.gender, parent: it.fnode, line: it.line, it: it }; it.v = v; var a = FN.get(it.n); if (a) a.push(v); else FN.set(it.n, [v]); };
    var rest = function (t, i, node) { if (i >= t.length) return true; if (!node) return false; for (var g = 1; g <= 3 && i + g <= t.length; g++) if (t.slice(i, i + g).join('') === node.n && rest(t, i + g, node.parent)) return true; return false; };
    var match = function (t) {
      var out = []; for (var g = 1; g <= 3 && g <= t.length; g++) {
        var k = t.slice(0, g).join(''); [].concat(T.byName.get(k) || [], FN.get(k) || []).forEach(function (n) { if (n.gender !== 'female' && rest(t, g, n.parent) && out.indexOf(n) < 0) out.push(n); });
      } return out;
    };
    // الكيان: صف من الملف قررت إنه «نفس الشخص» يرجع للشخص الأصلي
    var entOf = function (n) { var g = 0; while (n && !n.tree && n.it.dupOf && n.it.decision === 'same' && g++ < 50) n = n.it.dupOf; return n; };
    var key = function (n) { return n.tree ? 't:' + n.id : 'r:' + n.line; };
    var dupCheck = function (it) {
      var F = entOf(it.fnode); if (!F) return;
      if (F.tree) {
        var X = F.kids.find(function (k) { return k.n === it.n && k.gender === it.gender; });
        if (X) { if (X.link === 'مؤكد') { bad(it, 'exists', MSG.exists[0], MSG.exists[1]); return; } it.dupOf = X; it.dup = 'tree'; return; }
      }
      var fk = key(F), Y = null;
      FN.forEach(function (L) { L.forEach(function (v) { if (!Y && v.it !== it && v.n === it.n && v.gender === it.gender && v.parent && key(entOf(v.parent)) === fk) Y = v; }); });
      if (Y) { it.dupOf = Y; it.dup = 'file'; }
    };
    var resolve = function (it, node) { it.fnode = node; dupCheck(it); if (!it.errs.length) vnode(it); };
    items.filter(live).forEach(function (it) {
      var s = clean(it.raw.father), id = toLat(s).replace(/\s/g, '');
      var byId = T.byId.get(s) || (/^\d+$/.test(id) ? T.byId.get(id) : null);
      if (byId) { if (byId.gender === 'female') bad(it, 'father_female', 'الرقم ' + byId.id + ' لبنت، والأب لازم يكون رجل', 'تأكد من رقم الأب'); else it.fid0 = byId; return; }
      if (/^\d+$/.test(id)) { if (it.raw.fatherAlt) { it.t = toks(it.raw.fatherAlt); return; } bad(it, 'father_id', 'رقم الأب (' + id + ') مو موجود في الشجرة', 'انسخ الرقم من ملف التصدير، أو اكتب نسبه بدل الرقم'); return; }
      it.t = toks(s); if (!it.t.length) bad(it, 'father_nasab', 'ما لقينا أب بهالنسب: ' + s, 'تأكد من كتابة النسب، أو أضف الأب في سطر بنفس الملف');
    });
    // الأب المعروف برقمه أول، بعدين النسب على دفعات لين ما يتغير شي (الأب قبل أبنائه حتى لو جاء بعدهم في الملف)
    items.filter(function (it) { return live(it) && it.fid0; }).forEach(function (it) { resolve(it, it.fid0); });
    var pend = function () { return items.filter(function (it) { return live(it) && it.t && !it.fnode && !it.choose && !it.waitOn; }); };
    var could = function (it) {   // سطر ما تحدد أبوه للحين (أو ينتظر قرارك) وممكن يكون هو الأب
      return items.filter(function (k) { if (!live(k) || k.fnode || !(k.t || k.choose)) return false; if (k === it || k.gender === 'female') return false; for (var g = 1; g <= 3 && g <= it.t.length; g++) if (it.t.slice(0, g).join('') === k.n) return true; return false; });
    };
    var step = function (it, force) {
      var cw = could(it);
      if (cw.length && !force) return false;
      var cq = cw.find(function (k) { return k.choose || k.waitOn; }); if (cq) { it.waitOn = cq; return true; }
      var c = match(it.t); if (!c.length) return false;
      if (c.length > LIMITS.cands) { bad(it, 'father_short', 'النسب قصير، يطابق أسماء كثيرة: ' + clean(it.raw.father), 'اكتب اسم الأب واسم جده على الأقل'); return true; }
      // صفوف «يمكن تكون نفس الشخص» تُعتبر شخص واحد: الأصل (من الشجرة) أو أول سطر
      var EN = [], seen = {};
      c.forEach(function (n) { var e = entOf(n), k = key(e); if (!seen[k]) { seen[k] = 1; EN.push(e); } });
      EN = EN.filter(function (e) { return !(e.tree && EN.some(function (x) { return x.it && x.it.dupOf === e && x.it.decision !== 'new'; })); });
      if (EN.length === 1) { resolve(it, EN[0]); return true; }
      var pick = EN.find(function (e) { return key(e) === it.decision; });
      if (pick) { resolve(it, pick); it.picked = 1; return true; }
      it.choose = EN; return true;
    };
    for (var pass = 0; pass < 2; pass++) { var ch = true, guard = 0; while (ch && guard++ < 5000) { ch = false; pend().forEach(function (it) { if (live(it) && step(it, pass === 1)) ch = true; }); } }
    // اللي ما تحدد أبوه: نشرح السبب. سطر أبوه في الملف وما تحدد للحين ينتظر لين يتشرح سطر الأب
    var fatherRow = function (it) { var first = it.t.slice(0, 3); return items.find(function (k) { if (k === it || k.gender === 'female' || !k.n || k.level) return false; for (var g = 1; g <= first.length; g++) if (first.slice(0, g).join('') === k.n) return true; return false; }); };
    var diag = function (it, last) {
      var s = clean(it.raw.father);
      if (norm(s) === it.n || it.t.join('') === it.n) { bad(it, 'self', MSG.self[0], MSG.self[1]); return true; }
      var fr = fatherRow(it);
      if (fr && fr.errs.length) { bad(it, 'father_row', 'الأب في سطر فيه خطأ (السطر ' + ar(fr.line) + ')', 'صلّح سطر الأب أول'); return true; }
      if (fr && (fr.choose || fr.waitOn)) { it.waitOn = fr; return true; }
      if (fr && !fr.fnode && !last) return false;
      if (fr && !fr.fnode) { bad(it, 'self', MSG.self[0], MSG.self[1]); return true; }   // حلقة: كل سطر يقول الثاني أبوه
      bad(it, 'father_nasab', 'ما لقينا أب بهالنسب: ' + s, 'تأكد من كتابة النسب، أو أضف الأب في سطر بنفس الملف'); return true;
    };
    for (var dg = 0, more = true; more && dg < 5000; dg++) { more = false; pend().forEach(function (it) { if (diag(it, false)) more = true; }); }
    pend().forEach(function (it) { diag(it, true); });
    // 3) المستوى النهائي لكل سطر
    var lin = function (n) { return lineage(n, 5); };
    var fin = function (it, depth) {
      if (it.level) return it.level; if (depth > 60) { bad(it, 'self', MSG.self[0], MSG.self[1]); }
      if (it.errs.length) { it.level = 'err'; it.code = it.errs[0].code; it.msg = it.errs[0].msg; it.fix = it.errs[0].fix; return it.level; }
      var fem = it.gender === 'female';
      if (it.choose) {
        it.level = 'warn'; it.code = 'fathers'; it.msg = 'فيه أكثر من أب بهالنسب، اختر الصحيح:';
        it.choices = it.choose.map(function (e) { return { v: key(e), t: lin(e) + (e.tree ? ' · رقمه ' + e.id : ' · السطر ' + ar(e.line)) }; });
        return it.level;
      }
      if (it.waitOn) { it.level = 'warn'; it.code = 'wait'; it.msg = 'ينتظر قرارك في السطر ' + ar(it.waitOn.line); it.wait = it.waitOn.line; return it.level; }
      if (it.dupOf && it.decision !== 'same' && it.decision !== 'new') {
        it.level = 'warn'; it.code = it.dup === 'tree' ? 'dup_tree' : 'dup_file';
        it.msg = it.dup === 'tree' ? 'يمكن يكون موجود: ' + lin(it.dupOf) + ' (رقمه ' + it.dupOf.id + ')' : 'نفس الاسم والأب في السطر ' + ar(it.dupOf.line);
        it.choices = [{ v: 'same', t: 'نفس الشخص، لا تضيفه' }, { v: 'new', t: it.dup === 'tree' ? 'شخص جديد، أضفه' : 'شخص ثاني، أضفه' }];
        return it.level;
      }
      if (it.dupOf && it.decision === 'same') { it.level = 'skip'; it.code = 'same'; it.msg = 'ما ينضاف'; return it.level; }
      var F = entOf(it.fnode);
      if (!F.tree) {
        var fl = fin(F.it, (depth || 0) + 1);
        if (fl === 'warn') { it.level = 'warn'; it.code = 'wait'; it.msg = 'ينتظر قرارك في السطر ' + ar(F.it.line); it.wait = F.it.line; return it.level; }
        if (fl !== 'ok') { it.level = 'err'; it.code = 'father_row'; it.msg = 'الأب في سطر فيه خطأ (السطر ' + ar(F.it.line) + ')'; it.fix = 'صلّح سطر الأب أول'; return it.level; }
        it.level = 'ok'; it.code = 'ok_row'; it.fatherLine = F.it.line;
        it.msg = fem ? 'جاهزة · أبوها في السطر ' + ar(F.it.line) + '، تنضاف معه' : 'جاهز · أبوه في السطر ' + ar(F.it.line) + '، ينضاف معه';
        return it.level;
      }
      it.level = 'ok'; it.code = 'ok'; it.fatherId = F.id; it.msg = (fem ? 'جاهزة' : 'جاهز') + ' · تحت ' + lin(F); return it.level;
    };
    items.forEach(function (it) { fin(it, 0); });
    // الخطة: الآباء قبل الأبناء
    // رقم الأب يرجع بنفس نوعه في صفوف الشجرة (رقم أو نص)
    var rowId = {}; (tree || []).forEach(function (r) { if (r && r.id != null) rowId[String(r.id)] = r.id; });
    var rid = function (k) { return k == null ? null : k in rowId ? rowId[k] : k; };
    var plan = [], done = {};
    var put = function (it) { if (done[it.line]) return; done[it.line] = 1; if (it.fatherLine) put(byLine[it.fatherLine]); plan.push({ line: it.line, name: it.name, gender: it.gender, birth: it.birth, bfull: it.bfull, father_id: rid(it.fatherId), father_line: it.fatherLine || null }); };
    items.filter(function (it) { return it.level === 'ok'; }).forEach(put);
    var out = items.map(function (it) {
      return { line: it.line, name: it.name, level: it.level, code: it.code, msg: it.msg, fix: it.fix, errs: it.errs.map(function (e) { return { msg: e.msg, fix: e.fix }; }), choices: it.choices, decision: it.decision, wait: it.wait || null,
        gender: it.gender, birth: it.birthTxt, father: it.raw.father, fatherId: rid(it.fatherId), fatherLine: it.fatherLine || null };
    });
    var by = function (l) { return out.filter(function (x) { return x.level === l; }); };
    var res = { items: out, ok: by('ok'), warn: by('warn'), err: by('err'), skip: by('skip'), plan: plan };
    res.n = { ok: res.ok.length, warn: res.warn.length, err: res.err.length, skip: res.skip.length };
    res.need = res.warn.filter(function (x) { return x.choices.length; }).length;
    res.add = plan.length;
    return res;
  }

  /* ───────── الإضافة والتراجع ───────── */
  // build(plan, opts) → { rows, rec }: صفوف جديدة بنفس شكل صفوف الموقع، و rec يحفظه اللوحة عشان «تراجع»
  function build(plan, opts) {
    opts = opts || {}; var now = opts.now || new Date(), base = Date.now(), map = {}, rows = [];
    var newId = opts.newId || function (i) { return 'n' + base + String(i).padStart(4, '0'); };
    (plan || []).forEach(function (p, i) {
      var id = newId(i, p); map[p.line] = id;
      var fid = p.father_line ? map[p.father_line] : p.father_id; if (fid == null) throw new Error('plan order');
      rows.push({ id: id, father_id: fid, name: p.name, gender: p.gender === 'female' ? 'female' : 'male', birth: p.birth || '', bfull: p.bfull || null,
        kind: 'ورقة', link: opts.link || 'مؤكد', name_c: 'واضح', note: null, x: null, y: null, at: now.toISOString() });
    });
    var sig = {}; rows.forEach(function (r) { sig[r.id] = sigOf(r); });
    return { rows: rows, rec: { at: now.toISOString(), n: rows.length, ids: rows.map(function (r) { return r.id; }), sig: sig } };
  }
  var sigOf = function (r) { return [r.name, r.father_id, r.gender, r.birth || '', r.bfull || ''].map(String).join('|'); };
  // undo(treeRows, rec) → { ok:true, rows (بدون اللي انضاف), n } أو { ok:false, code, msg }
  function undo(treeRows, rec) {
    if (!rec || !Array.isArray(rec.ids) || !rec.ids.length) return { ok: false, code: 'none', msg: 'ما تم التراجع، جرّب مرة ثانية' };
    var set = new Set(rec.ids.map(String)), L = treeRows || [];
    var blocked = L.some(function (r) { return r && ((set.has(String(r.id)) && rec.sig && rec.sig[r.id] != null && sigOf(r) !== rec.sig[r.id]) || (!set.has(String(r.id)) && r.father_id != null && set.has(String(r.father_id)))); });
    if (blocked) return { ok: false, code: 'blocked', msg: 'ما نقدر نتراجع تلقائياً: بعض الأسماء انضاف لها أبناء أو تعدّلت بعد الاستيراد. عدّلها يدوياً، أو رجّع النسخة الاحتياطية من «الأدوات».' };
    var keep = L.filter(function (r) { return !(r && set.has(String(r.id))); });
    return { ok: true, rows: keep, n: L.length - keep.length };
  }

  /* ───────── أسماء الملفات والتنزيل ───────── */
  var names = { tree: function (d) { return 'شجرة-أسرة-الجنيدلي-' + ymd(d || new Date()) + '.xlsx'; }, template: function () { return 'نموذج-إضافة-أسماء.xlsx'; } };
  function save(blob, name) {
    var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  G.JNDXL = { v: '58', LIMITS: LIMITS, exportTree: exportTree, template: template, parse: parse, validate: validate, build: build, undo: undo, names: names, save: save,
    canInflate: canInflate, norm: norm, nCount: nCount, NP: NP, _t: { zip: zip, unzipDir: unzipDir, crc32: crc32, pDate: pDate, toks: toks, role: role, safe: safe, hijri: hijri } };
})(typeof window !== 'undefined' ? window : globalThis);
