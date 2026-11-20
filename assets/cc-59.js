/* محرك بطاقات الأسرة — يتحمّل عند الحاجة فقط. يرسم البطاقة على الجهاز بدون أي صور شخصية. */
(function () {
  'use strict';
  var W = 1080, H = 1350;
  var TH = {
    m: { glow: 'rgba(120,215,200,.13)', a: '#16616A', b: '#27807F', g1: '#F3FCFA', g2: '#DDF3EE', g3: '#A6D6CB', soft: '#DDEEE9', acc: '#E3C98C' },
    f: { glow: 'rgba(255,255,255,.16)', a: '#84304F', b: '#A94A6D', g1: '#FFF5F2', g2: '#FFE6EB', g3: '#F2B4C3', soft: '#FBE4EC', acc: '#F0CF9A' }
  };
  var D = function (w, s) { return w + ' ' + s + 'px Amiri, serif'; };
  var P = function (w, s) { return w + ' ' + s + 'px "IBM Plex Sans Arabic", system-ui, sans-serif'; };
  var AI = function (s) { return String(s).replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); };

  /* ---- أحاديث بطاقة ختم القرآن (موثّقة من الشاملة) ---- */
  var QH = [
    { id: 'a', label: 'يقال لصاحب القرآن: اقرأ وارتقِ ورتّل', t: ['«يقال لصاحب القرآن: اقرأ وارتقِ ورتّل كما كنت', 'ترتّل في الدنيا، فإن منزلتك عند آخر آية تقرؤها»'], src: 'رواه أبو داود والترمذي' },
    { id: 'b', label: 'خيركم من تعلّم القرآن وعلّمه', t: ['«خيركم من تعلّم القرآن وعلّمه»'], src: 'رواه البخاري' },
    { id: 'c', label: 'الماهر بالقرآن مع السفرة الكرام البررة', t: ['«الماهر بالقرآن مع السفرة الكرام البررة،', 'والذي يقرأ القرآن ويتتعتع فيه وهو عليه شاقٌّ له أجران»'], src: 'متفق عليه، واللفظ لمسلم' },
    { id: 'd', label: 'اقرؤوا القرآن فإنه يأتي شفيعاً لأصحابه', t: ['«اقرؤوا القرآن، فإنه يأتي يوم القيامة', 'شفيعاً لأصحابه»'], src: 'رواه مسلم' },
    { id: 'e', label: 'من قرأ حرفاً من كتاب الله فله به حسنة', t: ['«من قرأ حرفاً من كتاب الله فله به حسنة،', 'والحسنة بعشر أمثالها»'], src: 'رواه الترمذي' },
    { id: 'f', label: 'إن الله يرفع بهذا الكتاب أقواماً', t: ['«إن الله يرفع بهذا الكتاب أقواماً،', 'ويضع به آخرين»'], src: 'رواه مسلم' }
  ];
  var QD = ['a', 'b'];

  /* ---- نصوص المناسبات (م = ذكر، ث = أنثى) ---- */
  // o.rel: صفة القرابة بصيغة المتكلم (مثل «ابن عمي»)؛ إن وُجدت تُصاغ البطاقة من المهنِّئ إلى قريبه
  function spec(o) {
    var f = o.g === 'f', date = o.date || '', occ = o.occ, r = o.rel ? String(o.rel) : '', sf = !!o.self && !r;
    // خطاب مباشر: إذا ذُكرت الصلة تُوجَّه البطاقة إلى القريب نفسه («أبارك لكِ يا أختي…»)
    var fe = occ === 'birth' ? !!o.mom : f;                 // جنس المخاطَب
    var K = fe ? 'كِ' : 'ك', voc = r ? ' يا ' + r : '';      // ضمير الخطاب، والنداء
    var base = function (x) { x.date = date; return x; };
    if (occ === 'birth') {
      var pm = o.mom, bf = o.g === 'f', baby = bf ? 'مولودةً' : 'مولوداً', pn = bf ? 'الموهوبة' : 'الموهوب';
      var hd = { t: ['أُعيذ' + (bf ? 'ها' : 'ه') + ' بكلمات الله التامة،', 'من كل شيطان وهامّة، ومن كل عين لامّة'], src: 'من تعويذ النبي ﷺ · رواه البخاري' };
      return base({ g: o.g, chip: 'بشرى سارة',
        pre: sf ? ['بحمد الله ومنّته', 'رُزقتُ ' + baby]
          : r ? ((voc + ' ' + o.father).length > 30 ? ['أبارك ل' + K + voc, o.father, 'برزق' + K + ' ' + baby] : ['أبارك ل' + K + voc + ' ' + o.father, 'برزق' + K + ' ' + baby])
          : [(pm ? 'رُزقت ' : 'رُزق ') + o.father + ' ' + baby],
        name: o.name,
        bless: sf ? ['أسأل الله أن يبارك لي في ' + pn + '،', 'ويعينني على شكر الواهب، ويرزقني برّ' + (bf ? 'ها' : 'ه')]
          : r ? ['بارك الله ل' + K + ' في ' + pn + '، وشكر' + (fe ? 'تِ' : 'تَ') + ' الواهب،', (bf ? 'وبلغت أشدّها، ورُزق' : 'وبلغ أشدّه، ورُزق') + (fe ? 'تِ' : 'تَ') + ' برّ' + (bf ? 'ها' : 'ه')]
          : ['بارك الله لهما في ' + pn + '، وشكرا الواهب،', (bf ? 'وبلغت أشدّها، ورُزقا برّها' : 'وبلغ أشدّه، ورُزقا برّه')],
        hadith: hd });
    }
    if (occ === 'grad') return base({ g: o.g, chip: sf ? 'بشرى التخرج' : 'مبروك التخرج', pre: [sf ? 'بحمد الله وتوفيقه تخرّجتُ' : r ? 'أبارك ل' + K + voc + ' بالتخرج' : (f ? 'نبارك للخريجة' : 'نبارك للخريج')], name: o.name, main: [o.degree],
      bless: sf ? ['أسأل الله أن يوفقني ويسدد خطاي،', 'وأن ينفع بعلمي أهلي ومجتمعي']
        : r ? ['وفّق' + K + ' الله وسدّد خطا' + K + '،', 'ونفع بعلم' + K + ' أهل' + K + ' ومجتمع' + K]
        : f ? ['وفقها الله وسدد خطاها،', 'ونفع بعلمها أهلها ومجتمعها'] : ['وفقه الله وسدد خطاه،', 'ونفع بعلمه أهله ومجتمعه'],
      hadith: { t: ['«من سلك طريقاً يلتمس فيه علماً', 'سهّل الله له به طريقاً إلى الجنة»'], src: 'رواه مسلم' } });
    if (occ === 'quran') {
      var ids = (o.hadiths && o.hadiths.length ? o.hadiths : QD).slice(0, 2), L = ids.map(function (id) { return QH.filter(function (h) { return h.id === id; })[0]; }).filter(Boolean);
      if (!L.length) L = QD.map(function (id) { return QH.filter(function (h) { return h.id === id; })[0]; });
      L = L.map(function (h, i) { return { h: h, i: i }; }).sort(function (a, b) { return (b.h.t.length - a.h.t.length) || (a.i - b.i); }).map(function (x) { return { t: x.h.t, src: x.h.src }; });
      return base({ g: o.g, chip: 'ختم القرآن الكريم', pre: sf ? ['بحمد الله ومنّته', 'أتممتُ حفظ كتاب الله'] : r ? ['أبارك ل' + K + voc, 'بإتمام حفظ كتاب الله'] : [f ? 'نبارك لحافظة كتاب الله' : 'نبارك لحافظ كتاب الله'], name: o.name,
        bless: sf ? ['أسأل الله أن يجعلني من أهل القرآن، وأن يجعله ربيع قلبي،', 'وأن ينفع بي، ويبارك لي في علمي وعمري']
          : r ? ['جعل' + K + ' الله من أهل القرآن، وجعل القرآن ربيع قلب' + K + '،', 'ونفع ب' + K + ' وبارك في علم' + K + ' وعمر' + K]
          : f ? ['جعلها الله من أهل القرآن، وجعل القرآن ربيع قلبها،', 'ونفع بها وبارك في علمها وعمرها'] : ['جعله الله من أهل القرآن، وجعل القرآن ربيع قلبه،', 'ونفع به وبارك في علمه وعمره'],
        hadith: L });
    }
    if (occ === 'hajj') return base({ g: o.g, chip: 'حج مبرور', pre: sf ? ['بحمد الله ومنّته', 'أتممتُ حجّي'] : [r ? 'تقبّل الله حجّ' + K + voc : (f ? 'تقبّل الله حجّ أختنا' : 'تقبّل الله حجّ أخينا')], name: o.name,
      bless: sf ? ['أسأل الله أن يتقبّله حجاً مبروراً وسعياً مشكوراً،', 'وأن يغفر لي ذنبي ويكتب لي أجره']
        : r ? ['وجعله حجاً مبروراً وسعياً مشكوراً،', 'وغفر ذنب' + K + ' وأعاد' + K + (fe ? ' سالمةً غانمة' : ' سالماً غانماً')]
        : f ? ['وجعله حجاً مبروراً وسعياً مشكوراً،', 'وغفر ذنبها وأعادها سالمةً غانمة'] : ['وجعله حجاً مبروراً وسعياً مشكوراً،', 'وغفر ذنبه وأعاده سالماً غانماً'],
      hadith: { t: ['«من حجّ لله فلم يرفث ولم يفسق،', 'رجع كيوم ولدته أمه»'], src: 'رواه البخاري' } });
    if (occ === 'shifa') return base({ g: o.g, chip: 'سلامات', pre: [r ? 'أسأل الله ل' + K + ' الشفاء العاجل' + voc : (f ? 'نسأل الله الشفاء العاجل لأختنا' : 'نسأل الله الشفاء العاجل لأخينا')], name: o.name, main: ['«لا بأس، طهور إن شاء الله»'],
      bless: r ? ['شفا' + K + ' الله وعافا' + K + '،', 'وألبس' + K + ' ثوب الصحة والعافية'] : f ? ['شفاها الله وعافاها،', 'وألبسها ثوب الصحة والعافية'] : ['شفاه الله وعافاه،', 'وألبسه ثوب الصحة والعافية'],
      hadith: { t: ['«أذهِب البأس، ربَّ الناس، اشفِ وأنت الشافي،', 'لا شفاء إلا شفاؤك، شفاءً لا يغادر سقماً»'], src: 'من رقية النبي ﷺ للمريض · رواه البخاري' } });
    if (occ === 'wed' && sf) return base({ g: o.g, chip: 'بشرى سارة', pre: ['بحمد الله وتوفيقه', 'تمّ زواجي'], name: o.name, main: ['وأسألكم صالح الدعاء'],
      bless: ['اللهم بارك لنا وبارك علينا،', 'واجمع بيننا في خير'],
      hadith: { t: ['﴿ومن آياته أن خلق لكم من أنفسكم أزواجاً', 'لتسكنوا إليها وجعل بينكم مودةً ورحمةً﴾'], src: 'سورة الروم · ٢١' } });
    if (occ === 'wed') return base({ g: o.g, chip: 'مبروك الزواج', pre: [r ? 'أبارك ل' + K + voc + ' بزواج' + K : (f ? 'نبارك لأختنا العروس' : 'نبارك لأخينا العريس')], name: o.name, main: ['زواجاً مباركاً وبيتاً عامراً'],
      bless: ['وجعل الله بينكما مودةً ورحمة،', 'وأقرّ عينيكما بصالح الذرية'],
      hadith: { t: [f ? 'بارك الله لكِ، وبارك عليكِ،' : 'بارك الله لك، وبارك عليك،', 'وجمع بينكما في خير'], src: 'من دعاء النبي ﷺ للمتزوج · رواه أبو داود والترمذي' } });
    if (occ === 'eid') {
      var rm = o.eid === 'ramadan', fit = o.eid !== 'adha' && !rm, chip = rm ? 'رمضان مبارك' : fit ? 'عيد الفطر المبارك' : 'عيد الأضحى المبارك',
        had = rm ? { t: ['«من صام رمضان إيماناً واحتساباً', 'غُفر له ما تقدّم من ذنبه»'], src: 'متفق عليه' }
          : fit ? { t: ['﴿ولتكبروا الله على ما هداكم', 'ولعلكم تشكرون﴾'], src: 'سورة البقرة · ١٨٥' } : { t: ['«أيام التشريق أيام', 'أكل وشرب وذكر لله»'], src: 'رواه مسلم' };
      var occT = rm ? 'بحلول شهر رمضان المبارك' : fit ? 'بعيد الفطر المبارك' : 'بعيد الأضحى المبارك';
      // تهنئة الأسرة لفرد بعينه (تُولَّد باسم كل فرد من لوحة الإدارة)
      // تهنئة شخصية من فرد للجميع: اسمه على البطاقة، بلا إشارة للأسرة ولا لأي رابط
      if (o.pers && o.name) return base({ g: o.g, chip: chip, pre: [f ? 'تتقدّم إليكم' : 'يتقدّم إليكم'], name: o.name, main: ['بأطيب التهاني ' + occT],
        bless: rm ? ['بلّغنا الله وإيّاكم صيامه وقيامه،', 'وكل عام وأنتم بخير'] : fit ? ['تقبّل الله منا ومنكم صالح الأعمال،', 'وكل عام وأنتم بخير'] : ['تقبّل الله منا ومنكم صالح الأعمال،', 'وأعاده علينا وعليكم باليُمن والبركات'], hadith: had });
      if (o.fam && o.name) return base({ g: o.g, chip: chip, pre: ['تهنّئ أسرة الجنيدلي'], name: o.name, main: [occT],
        bless: rm ? ['بلّغنا الله وإيّا' + K + ' صيامه وقيامه،', f ? 'وكل عام وأنتِ بخير' : 'وكل عام وأنت بخير']
          : ['تقبّل الله منا ومن' + K + ' صالح الأعمال،', f ? 'وكل عام وأنتِ بخير' : 'وكل عام وأنت بخير'], hadith: had });
      if (o.name) return base({ g: o.g, chip: chip, pre: [r ? 'أهنّئ' + K + voc : (f ? 'أهنّئ أختنا' : 'أهنّئ أخانا')], name: o.name, main: [rm ? (f ? 'رمضانكِ مبارك' : 'رمضانك مبارك') : (f ? 'عيدكِ مبارك' : 'عيدك مبارك')],
        bless: rm ? ['بلّغنا الله وإيّا' + (f ? 'كِ' : 'ك') + ' صيامه وقيامه،', f ? 'وكل عام وأنتِ بخير' : 'وكل عام وأنت بخير']
          : ['تقبّل الله منا ومنك' + (f ? 'ِ' : '') + ' صالح الأعمال،', f ? 'وكل عام وأنتِ بخير' : 'وكل عام وأنت بخير'], hadith: had });
      if (rm) return base({ g: 'm', chip: chip, pre: ['تتقدّم أسرة الجنيدلي إليكم بأطيب التهاني'], name: 'رمضان مبارك', main: [occT],
        bless: ['بلّغنا الله وإيّاكم صيامه وقيامه،', 'وكل عام وأنتم بخير'], hadith: had });
      return base({ g: 'm', chip: chip, pre: ['تتقدّم أسرة الجنيدلي إليكم بأطيب التهاني'], name: 'عيدكم مبارك', main: ['تقبّل الله منا ومنكم صالح الأعمال'],
        bless: ['وأعاده علينا وعليكم باليُمن والبركات،', 'وكل عام وأنتم بخير'], hadith: had });
    }
    return null;
  }

  /* ---- تنظيف المدخلات ---- */
  function cleanText(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 60); }
  function cleanArName(s, max) { return String(s == null ? '' : s).replace(/[^ء-يٱـ ]/g, '').replace(/\s+/g, ' ').trim().slice(0, max || 24); }

  var fontsP = null;
  function ready() {
    if (fontsP) return fontsP;
    var L = ['700 40px Amiri', '400 30px Amiri', '400 30px "IBM Plex Sans Arabic"', '500 30px "IBM Plex Sans Arabic"', '600 30px "IBM Plex Sans Arabic"'].map(function (f) { return document.fonts.load(f, 'أسرة الجنيدلي').catch(function () { }); });
    fontsP = Promise.all(L).then(function () { return document.fonts.ready; }).catch(function () { });
    return fontsP;
  }

  /* ---- الرسم ---- */
  function card(S, logo) {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d', { willReadFrequently: false }); x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    var t = TH[S.g] || TH.m, male = S.g !== 'f';
    var g = x.createLinearGradient(0, 0, W * .4, H); g.addColorStop(0, t.b); g.addColorStop(.5, t.a); g.addColorStop(1, t.a); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = .055; x.strokeStyle = t.g1; x.lineWidth = 1.6;
    for (var yy = -10; yy < H + 90; yy += 80) for (var xx = -10; xx < W + 90; xx += 80) { x.beginPath(); x.arc(xx, yy, 56, 0, 7); x.stroke(); }
    x.restore();
    var tg = x.createRadialGradient(W / 2, 170, 20, W / 2, 170, male ? 430 : 560); tg.addColorStop(0, t.glow); tg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = tg; x.fillRect(0, 0, W, H);
    var rg = x.createRadialGradient(W / 2, 640, 60, W / 2, 640, 720); rg.addColorStop(0, male ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.10)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
    var rr = function (X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    x.strokeStyle = t.acc; x.globalAlpha = .75; x.lineWidth = 2.5; rr(34, 34, W - 68, H - 68, 30); x.stroke(); x.globalAlpha = .35; x.lineWidth = 1.5; rr(54, 54, W - 108, H - 108, 22); x.stroke(); x.globalAlpha = 1;
    // الشعار
    x.save(); x.beginPath(); x.arc(W / 2, 146, 58, 0, 7); x.clip(); x.fillStyle = '#fff'; x.fillRect(W / 2 - 58, 88, 116, 116);
    if (logo) { try { x.drawImage(logo, W / 2 - 58, 88, 116, 116); } catch (e) { } } x.restore();
    x.strokeStyle = t.acc; x.lineWidth = 3; x.beginPath(); x.arc(W / 2, 146, 64, 0, 7); x.stroke();
    x.fillStyle = t.g1; x.font = D(700, 44); x.fillText('أسرة الجنيدلي', W / 2, 262);
    x.font = D(700, 46); var cw = x.measureText(S.chip).width + 100; x.fillStyle = 'rgba(255,255,255,.12)'; rr(W / 2 - cw / 2, 296, cw, 78, 39); x.fill();
    x.strokeStyle = t.acc; x.lineWidth = 2; x.globalAlpha = .8; rr(W / 2 - cw / 2, 296, cw, 78, 39); x.stroke(); x.globalAlpha = 1; x.fillStyle = t.acc; x.fillText(S.chip, W / 2, 351);

    // ===== التخطيط: كل سطر يتحدد مكانه من قياس حبره الفعلي، فما يلمس سطرٌ سطراً =====
    var NAME = { w: 700, s: 68, f: 'A' };
    var NF = function (w, z) { return D(w, z); };
    var HS = S.hadith ? (Array.isArray(S.hadith) ? S.hadith : [S.hadith]) : [];
    var mz = function (txt, font) { x.font = font; var m = x.measureText(txt); return { w: m.width, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent }; };
    var fitW = function (ls, ff, max, start, min) { var z = start; while (z > min && Math.max.apply(null, ls.map(function (l) { return mz(l, ff(z)).w; })) > max) z -= 2; return z; };
    var inkC = {};
    var scan = document.createElement('canvas'); scan.width = W; scan.height = 420; var q = scan.getContext('2d', { willReadFrequently: true });
    function edges(txt, font, dil, bottom) { // أقصى/أدنى حبر لكل عمود
      q.clearRect(0, 0, W, 420); q.direction = 'rtl'; q.textAlign = 'center'; q.font = font; q.fillStyle = '#000'; q.strokeStyle = '#000'; q.lineJoin = 'round';
      if (dil) { q.lineWidth = dil * 2; q.strokeText(txt, W / 2, 210); } q.fillText(txt, W / 2, 210);
      var d = q.getImageData(0, 0, W, 420).data, out = new Int16Array(W);
      for (var cx = 0; cx < W; cx++) { var v = bottom ? -999 : 999; for (var ry = 0; ry < 420; ry++) { if (d[(ry * W + cx) * 4 + 3] > 8) { if (bottom) v = ry; else { v = ry; break; } } } out[cx] = v; }
      return out;
    }
    var inkP = function (a, b, font, floor, mg) {
      var key = a + '|' + b + '|' + font + '|' + floor; if (inkC[key] != null) return inkC[key];
      var A = edges(a, font, mg, true), B = edges(b, font, 0, false), need = 0;
      for (var cx = 0; cx < W; cx++) if (A[cx] > -999 && B[cx] < 999) need = Math.max(need, A[cx] - B[cx] + 1);
      return inkC[key] = Math.max(floor, need);
    };
    var build = function (sc, gm) {
      var R = function (v) { return Math.round(v * sc); }, ops = [], cur = 0, ok = true;
      var SZ = { pre: R(38), bless: R(45), had: R(40), src: R(28) };
      SZ.pre = fitW(S.pre, function (z) { return P(500, z); }, 860, R(38), 24);
      SZ.main = S.main ? fitW(S.main, function (z) { return D(700, z); }, 860, R(48), 30) : 0;
      var nl = [S.name], ns = fitW(nl, function (z) { return NF(NAME.w, z); }, 840, R(NAME.s), 60);
      if (mz(S.name, NF(NAME.w, ns)).w > 840 && S.name.indexOf(' ') > 0) {
        var ws = S.name.split(' '), best = null;
        for (var i = 1; i < ws.length; i++) { var A = ws.slice(0, i).join(' '), B = ws.slice(i).join(' '), dd = Math.abs(mz(A, NF(NAME.w, 60)).w - mz(B, NF(NAME.w, 60)).w); if (!best || dd < best.d) best = { d: dd, l: [A, B] }; }
        nl = best.l; ns = fitW(nl, function (z) { return NF(NAME.w, z); }, 840, R(NAME.s) - 6, 40);
      }
      var G = function (v) { return Math.round(v * gm); };
      var grp = function (ls, font, fill, pitch, gap, o, maxW) {
        var ms = ls.map(function (l) { return mz(l, font); });
        if (ms.some(function (m) { return m.w > maxW; })) ok = false;
        for (var i = 0; i + 1 < ls.length; i++) pitch = Math.max(pitch, inkP(ls[i], ls[i + 1], font, pitch, 8));
        var a0 = ms[0].a, d1 = ms[ms.length - 1].d; cur += gap; var y0 = cur + a0;
        ls.forEach(function (l, i) { ops.push(Object.assign({ t: l, font: font, fill: fill, y: y0 + i * pitch }, o)); });
        cur = y0 + (ls.length - 1) * pitch + d1;
      };
      grp(S.pre, P(500, SZ.pre), t.g1, S.pre.length > 1 ? Math.round(SZ.pre * 1.6) : 0, 0, { al: .93 }, 860);
      grp(nl, NF(NAME.w, ns), '#fff', Math.round(ns * 1.3), G(26), { sh: 1 }, 840);
      if (S.main) grp(S.main, D(700, SZ.main), t.g1, Math.round(SZ.main * 1.3), G(28), {}, 860);
      grp(S.bless, D(400, SZ.bless), t.g1, Math.round(SZ.bless * 1.3), S.main ? G(12) : G(26), { al: .95 }, 860);
      if (HS.length) {
        cur += G(28); var pt = cur; cur += G(24);
        HS.forEach(function (e, i) {
          grp(e.t, D(400, SZ.had), t.g1, Math.round(SZ.had * 1.3), 0, {}, 780); grp([e.src], P(500, SZ.src), t.acc, 0, G(10), {}, 780);
          if (i < HS.length - 1) { cur += G(20); ops.push({ sep: 1, y: cur }); cur += G(22); }
        });
        cur += G(24); ops.push({ panel: 1, top: pt, bot: cur });
      }
      return { ops: ops, cur: cur, ok: ok };
    };
    var RT = 412, RB = 1156, AV = RB - RT, sc0 = S.sc || 1, L = build(sc0, 1);
    if (L.cur < AV) {
      var top = build(sc0, 2.4);
      if (top.cur <= AV) L = top; else { var lo = 1, hi = 2.4; for (var k = 0; k < 9; k++) { var mid = (lo + hi) / 2; if (build(sc0, mid).cur <= AV) lo = mid; else hi = mid; } L = build(sc0, lo); }
    } else if (L.cur > AV) { var gg = 1; do { gg -= .05; L = build(sc0, gg); } while (L.cur > AV && gg > .7); }
    var off = RT + Math.max(0, (AV - L.cur) / 2);
    L.ops.filter(function (o) { return o.panel; }).forEach(function (o) {
      x.fillStyle = 'rgba(0,0,0,.2)'; rr(120, off + o.top, W - 240, o.bot - o.top, 28); x.fill();
      x.strokeStyle = t.acc; x.globalAlpha = .5; x.lineWidth = 1.6; rr(120, off + o.top, W - 240, o.bot - o.top, 28); x.stroke(); x.globalAlpha = 1;
    });
    L.ops.forEach(function (o) {
      if (o.panel) return;
      if (o.sep) { x.strokeStyle = t.acc; x.globalAlpha = .35; x.lineWidth = 1.4; x.beginPath(); x.moveTo(W / 2 - 210, off + o.y); x.lineTo(W / 2 + 210, off + o.y); x.stroke(); x.globalAlpha = 1; return; }
      x.font = o.font; x.fillStyle = o.fill; x.globalAlpha = o.al || 1; if (o.sh) { x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 18; }
      x.fillText(o.t, W / 2, off + o.y); x.shadowBlur = 0; x.globalAlpha = 1;
    });
    if (S.date) { x.font = P(600, 34); var dw = x.measureText(S.date).width + 80; rr(W / 2 - dw / 2, 1190, dw, 58, 29); x.fillStyle = 'rgba(255,255,255,.11)'; x.fill(); x.fillStyle = t.g1; x.fillText(S.date, W / 2, 1230); }
    x.fillStyle = t.g3; x.globalAlpha = .9; x.font = P(500, 26); x.fillText('منصة أسرة الجنيدلي الرقمية', W / 2, 1278); x.globalAlpha = 1;
    return c;
  }

  var SCM = { birth: 1.06, hajj: 1.06 };
  function make(o, logo) {
    var S = spec(o); if (!S) return Promise.reject(new Error('occ'));
    S.sc = SCM[o.occ] || 1;
    return ready().then(function () { return card(S, logo); });
  }
  function toBlob(c, type, q) { return new Promise(function (res) { c.toBlob(res, type || 'image/png', q); }); }
  function loadLogo(src) {
    return new Promise(function (res) { if (!src) return res(null); var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; });
  }
  window.JCC = { make: make, toBlob: toBlob, loadLogo: loadLogo, ready: ready, QH: QH, QD: QD, cleanText: cleanText, cleanArName: cleanArName, AI: AI, spec: spec, v: 1 };
})();
