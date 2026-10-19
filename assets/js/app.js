/* FILANDR AKADEMIE: logika webu (vykreslování z dat, early bird, termíny, menu, sticky lišta, JSON-LD)
   Klasický skript s defer. Pomocné funkce jsou ve window.FA, používá je i forms.js. */
(function () {
  'use strict';

  var C = window.FA_CONFIG || {};
  var D = window.FA_DATA || {};
  D.kurzy = D.kurzy || []; D.sluzby = D.sluzby || []; D.lektori = D.lektori || [];
  D.videa = D.videa || []; D.webinar = D.webinar || {}; D.tym = D.tym || [];
  var FA = window.FA = window.FA || {};
  var doc = document;
  var html = doc.documentElement;
  FA.C = C; FA.D = D;

  /* ---------- Kořen webu (funguje v podsložce i lokálně) ---------- */
  FA.root = (function () {
    var s = doc.currentScript;
    try { return new URL('../../', s.src).href; } catch (e) { return './'; }
  })();
  FA.url = function (rel) {
    var u = FA.root + String(rel || '').replace(/^\.?\//, '');
    /* Offline náhled a náhled v Claude: složky nemají automatický index.html, proto odkaz doplníme */
    if (C.odkazyNaIndex) u = u.replace(/\/(?=[?#]|$)/, '/index.html');
    return u;
  };

  /* ---------- Bezpečné úložiště ---------- */
  FA.store = {
    get: function (k, area) { try { return (area || window.sessionStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, v, area) { try { (area || window.sessionStorage).setItem(k, v); } catch (e) { /* nedostupné */ } },
    del: function (k, area) { try { (area || window.sessionStorage).removeItem(k); } catch (e) { /* nedostupné */ } }
  };

  FA.params = new URLSearchParams(window.location.search);
  if (C.staging) html.classList.add('fa-staging');
  /* Žluté zvýraznění chybějících údajů jen na vyžádání (?zvyraznit=1, staging), jinak neutrální zástupné texty */
  (function () {
    if (!C.staging) return;
    var z = FA.params.get('zvyraznit');
    try {
      if (z === '1') sessionStorage.setItem('fa_hl', '1');
      if (z === '0') sessionStorage.removeItem('fa_hl');
      if (sessionStorage.getItem('fa_hl') === '1') html.classList.add('fa-highlight');
    } catch (e) { /* nedostupné */ }
  })();

  /* ---------- Pomocné funkce ---------- */
  var NBSP = ' ';
  FA.isTodo = function (v) { return v == null || v === '' || (typeof v === 'string' && /^\s*\[/.test(v)); };
  FA.h = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  /* Typografie pro texty z dat: nezlomitelné mezery po jednopísmenných předložkách a u čísel */
  FA.typo = function (s) {
    return String(s == null ? '' : s)
      .replace(/(^|[\s(„])([kKsSvVzZoOuUaAiI]) (?=\S)/g, '$1$2' + NBSP)
      .replace(/(^|[\s(„])([kKsSvVzZoOuUaAiI]) (?=\S)/g, '$1$2' + NBSP)
      .replace(/(\d) (Kč|hodin|hodiny|hodina|minut|dní|dny|den|osob|os\.)/g, '$1' + NBSP + '$2');
  };
  /* Text z dat do HTML, [DOPLNIT] zvýrazní */
  FA.txt = function (v, fallback) {
    if (v == null || v === '') return fallback != null ? fallback : '';
    if (FA.isTodo(v)) return '<span class="fa-todo">' + FA.h(v) + '</span>';
    return FA.h(FA.typo(v));
  };
  FA.plain = function (s) { return String(s == null ? '' : s).replace(/ /g, ' '); };
  FA.icon = function (name, cls) {
    return '<svg class="fa-icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  };

  /* ---------- Zástupné texty místo [DOPLNIT: …] ---------- */
  var PH = window.FA_PLACEHOLDERS || { vychozi: '', pravidla: [] };
  FA.placeholder = function (marker) {
    var m = String(marker || '');
    for (var i = 0; i < PH.pravidla.length; i++) {
      try { if (new RegExp(PH.pravidla[i][0], 'i').test(m)) return PH.pravidla[i][1]; } catch (e) { /* špatný vzor */ }
    }
    return PH.vychozi;
  };
  function isIgnorable(n) {
    return (n.nodeType === 3 && !n.textContent.trim()) || (n.nodeType === 1 && (n.tagName.toLowerCase() === 'svg' || n.classList.contains('fa-sr'))) || n.nodeType === 8;
  }
  function startsBlock(el) {
    var n = el;
    while (n && n.parentNode && n !== doc.body) {
      var p = n.previousSibling;
      while (p && isIgnorable(p)) p = p.previousSibling;
      if (p) return /[.!?]\s*$/.test(p.textContent || ''); // po konci věty velké písmeno
      n = n.parentNode;
      var d = window.getComputedStyle ? getComputedStyle(n).display : 'block';
      if (d !== 'inline' && d !== 'contents') return true;
    }
    return true;
  }
  FA.fixTodos = function (root) {
    (root || doc).querySelectorAll('.fa-todo').forEach(function (el) {
      if (el.closest('[data-fa-keep-todo]')) return;
      var marker = el.getAttribute('data-doplnit');
      if (!marker) {
        marker = el.textContent.replace(/\s+/g, ' ').trim();
        if (!/^\[(DOPLNIT|PRÁVNÍ)/.test(marker)) { el.setAttribute('data-ph', ''); return; }
        el.setAttribute('data-doplnit', marker);
      }
      var t = FA.placeholder(marker);
      if (!t) { el.hidden = true; el.setAttribute('data-ph', ''); return; }
      if (/^[a-záčďéěíňóřšťúůýž]/.test(t) && startsBlock(el)) t = t.charAt(0).toUpperCase() + t.slice(1);
      if (el.textContent !== t) el.textContent = t;
      el.setAttribute('data-ph', '');
      if (html.classList.contains('fa-highlight')) el.title = marker;
    });
  };

  /* ---------- Datum a čas ---------- */
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  FA.parseDate = function (s) {
    if (!s || typeof s !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  FA.isoDate = function (d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  var dfNum = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
  var dfLong = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var nf = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });
  /* „20. 11. 2026“; nb = true vrátí nezlomitelné mezery pro HTML */
  FA.fmtDate = function (d, nb) {
    if (!d) return '';
    var s = dfNum.format(d).replace(/\s+/g, ' ');
    return nb ? s.replace(/ /g, NBSP) : s;
  };
  FA.dateParts = function (d) {
    var out = {};
    dfLong.formatToParts(d).forEach(function (p) { out[p.type] = p.value; });
    return out; // weekday, day, month (genitiv), year
  };
  FA.fmtNum = function (n) { return nf.format(n).replace(/\s/g, NBSP); };
  FA.fmtPrice = function (n, nb) {
    if (typeof n !== 'number') return '';
    var s = FA.fmtNum(n) + NBSP + 'Kč';
    return nb === false ? FA.plain(s) : s;
  };
  FA.plural = function (n, one, few, many) { return n === 1 ? one : (n >= 2 && n <= 4 ? few : many); };

  /* Dnešek: ve stagingu jde přepsat parametrem ?dnes=RRRR-MM-DD (pamatuje se v rámci relace) */
  FA.today = (function () {
    var t = startOfDay(new Date());
    if (!C.staging) return t;
    var p = FA.params.get('dnes');
    if (p !== null) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(p)) FA.store.set('fa_dnes', p); else FA.store.del('fa_dnes');
    }
    var s = FA.store.get('fa_dnes');
    return (s && FA.parseDate(s)) || t;
  })();

  /* ---------- Ukázková data pro náhled (jen staging, ?demo=1) ---------- */
  FA.demo = (function () {
    if (!C.staging) return false;
    var p = FA.params.get('demo');
    if (p === '1') FA.store.set('fa_demo', '1');
    if (p === '0') FA.store.del('fa_demo');
    return FA.store.get('fa_demo') === '1';
  })();
  if (FA.demo) {
    var addDays = function (n) { var d = new Date(FA.today); d.setDate(d.getDate() + n); return FA.isoDate(d); };
    D.kurzy.forEach(function (k) {
      if (k.cena && k.cena.earlyBird != null && !k.cena.earlyBirdDo) k.cena.earlyBirdDo = addDays(9);
      (k.terminy || []).forEach(function (t, i) {
        if (!t.datum) t.datum = addDays(30 + i * 9);
        if (i === 0 && t.volnaMista == null) { t.volnaMista = 11; t.kapacita = t.kapacita || 20; }
        if (i === 1 && t.volnaMista == null) { t.volnaMista = 3; t.kapacita = t.kapacita || 20; }
      });
    });
  }

  /* ---------- Data: kurzy, termíny, ceny ---------- */
  FA.allOffers = function () {
    return D.kurzy.concat(D.sluzby).slice().sort(function (a, b) { return (a.poradi || 99) - (b.poradi || 99); });
  };
  FA.kurz = function (slug) {
    for (var i = 0; i < D.kurzy.length; i++) if (D.kurzy[i].slug === slug) return D.kurzy[i];
    return null;
  };
  FA.offer = function (slug) {
    var all = FA.allOffers();
    for (var i = 0; i < all.length; i++) if (all[i].slug === slug) return all[i];
    return null;
  };
  FA.lektor = function (id) {
    for (var i = 0; i < D.lektori.length; i++) if (D.lektori[i].id === id) return D.lektori[i];
    return null;
  };
  FA.findTerm = function (id) {
    for (var i = 0; i < D.kurzy.length; i++) {
      var ts = D.kurzy[i].terminy || [];
      for (var j = 0; j < ts.length; j++) if (ts[j].id === id) return { kurz: D.kurzy[i], termin: ts[j] };
    }
    return null;
  };

  FA.termState = function (t) {
    if (!t || t.stav === 'zruseno') return 'zruseno';
    var d = FA.parseDate(t.datum);
    if (d && d < FA.today) return 'probehlo';
    if (t.stav === 'vyprodano' || t.volnaMista === 0) return 'vyprodano';
    if (!d || t.stav === 'pripravujeme') return 'pripravujeme';
    return 'otevreno';
  };
  FA.isBookable = function (t) { return FA.termState(t) === 'otevreno'; };
  /* Budoucí termíny bez zrušených, podle data, termíny bez data na konci */
  FA.terms = function (kurz) {
    return (kurz && kurz.terminy || []).filter(function (t) {
      var s = FA.termState(t);
      return s !== 'zruseno' && s !== 'probehlo';
    }).sort(function (a, b) {
      var da = FA.parseDate(a.datum), db = FA.parseDate(b.datum);
      if (da && db) return da - db;
      if (da) return -1;
      if (db) return 1;
      return 0;
    });
  };
  FA.nextOpen = function (kurz) {
    var ts = FA.terms(kurz);
    for (var i = 0; i < ts.length; i++) if (FA.isBookable(ts[i])) return ts[i];
    return null;
  };
  FA.nextOpenAny = function () {
    var best = null;
    D.kurzy.forEach(function (k) {
      var t = FA.nextOpen(k);
      if (t && (!best || FA.parseDate(t.datum) < FA.parseDate(best.termin.datum))) best = { kurz: k, termin: t };
    });
    return best;
  };

  FA.pricing = function (kurz, termin) {
    var c = (termin && termin.cena) || (kurz && kurz.cena) || {};
    var eb = typeof c.earlyBird === 'number' ? c.earlyBird : null;
    var st = typeof c.standard === 'number' ? c.standard : null;
    var ebDo = FA.parseDate(c.earlyBirdDo);
    var r = { earlyBird: eb, standard: st, earlyBirdDo: ebDo, ebActive: false, daysLeft: null, current: null };
    if (eb != null) {
      if (!ebDo) r.ebActive = true;
      else if (FA.today <= ebDo) { r.ebActive = true; r.daysLeft = Math.round((ebDo - FA.today) / 864e5); }
    }
    r.current = r.ebActive ? eb : (st != null ? st : (ebDo ? null : eb));
    r.known = r.current != null;
    return r;
  };
  FA.minPrice = function (kurz) {
    var ts = FA.terms(kurz).filter(FA.isBookable);
    var list = (ts.length ? ts : [null]).map(function (t) { return FA.pricing(kurz, t).current; }).filter(function (n) { return n != null; });
    return list.length ? Math.min.apply(null, list) : null;
  };
  FA.countdownText = function (p) {
    if (!p.ebActive || p.daysLeft == null || p.daysLeft > 14) return '';
    if (p.daysLeft === 0) return 'Early bird končí dnes';
    if (p.daysLeft === 1) return 'Early bird končí zítra';
    return 'Early bird končí za ' + p.daysLeft + NBSP + FA.plural(p.daysLeft, 'den', 'dny', 'dní');
  };
  FA.vatNote = function () {
    var v = C.provozovatel ? C.provozovatel.platceDph : null;
    if (v === true) return 'Cena je uvedena včetně DPH.';
    if (v === false) return 'Nejsme plátci DPH, cena je konečná.';
    return '';
  };
  FA.vatNotePlain = function () {
    var v = C.provozovatel ? C.provozovatel.platceDph : null;
    if (v === true) return 'včetně DPH';
    if (v === false) return 'neplátce DPH';
    return 'DPH: [DOPLNIT]';
  };

  /* Místo ve formátu „místo · město · kraj“, online „Online · platforma“ */
  FA.placeParts = function (t) {
    if (!t) return [];
    if (t.format === 'online') return ['Online'].concat(t.platforma ? [t.platforma] : []);
    var parts = [];
    [t.misto, t.mesto, t.kraj].forEach(function (p) {
      if (p && parts.indexOf(p) === -1) parts.push(p);
    });
    return parts;
  };
  FA.placeHTML = function (t) { return FA.placeParts(t).map(function (p) { return FA.txt(p); }).join(' · '); };
  FA.placeText = function (t) { return FA.placeParts(t).join(' · '); };
  FA.formatLabel = function (t) { return t && t.format === 'online' ? 'online' : 'prezenčně'; };
  FA.timeText = function (t) {
    if (!t || !t.casOd) return '';
    return t.casOd + (t.casDo ? ' až ' + t.casDo : '');
  };
  /* „20. 11. 2026, Praha, Hlavní město Praha, prezenčně“ */
  FA.termLabel = function (t) {
    var d = FA.parseDate(t.datum);
    var bits = [d ? FA.fmtDate(d) : 'Termín upřesníme'];
    if (t.format === 'online') bits.push('online');
    else {
      if (t.mesto) bits.push(t.mesto);
      if (t.kraj && t.kraj !== t.mesto) bits.push(t.kraj);
      bits.push('prezenčně');
    }
    return bits.join(', ');
  };
  /* Krátký popis termínu do nadpisu „Rezervace: Praha, 20. 11. 2026“ */
  FA.termShort = function (t) {
    var d = FA.parseDate(t.datum);
    var where = t.format === 'online' ? 'Online' : (t.mesto || (FA.isTodo(t.misto) ? '' : t.misto) || '');
    return [where, d ? FA.fmtDate(d) : 'termín upřesníme'].filter(Boolean).join(', ');
  };

  /* ---------- Vykreslení: cenový blok ---------- */
  FA.priceHTML = function (kurz, termin, opts) {
    opts = opts || {};
    var p = FA.pricing(kurz, termin);
    var out = '';
    if (!p.known) {
      return '<div class="fa-price__main"><span class="fa-price__value fa-price__value--tbd">Cenu upřesníme</span></div>';
    }
    var big = function (n) {
      return '<span class="fa-price__value">' + FA.fmtNum(n) + NBSP + '<span class="fa-price__cur">Kč</span></span>';
    };
    if (p.ebActive) {
      out += '<div class="fa-price__main">' + big(p.earlyBird) + ' <span class="fa-badge fa-badge--eb">early bird</span></div>';
      if (p.standard != null) out += '<div class="fa-price__alt">' + FA.fmtPrice(p.standard) + ' standard</div>';
      if (p.earlyBirdDo) out += '<div class="fa-price__note">Early bird platí do ' + FA.fmtDate(p.earlyBirdDo, true) + '</div>';
      var cd = FA.countdownText(p);
      if (cd) out += '<div class="fa-price__countdown">' + cd + '</div>';
    } else {
      out += '<div class="fa-price__main">' + big(p.current) + '</div>';
    }
    if (opts.vat && FA.vatNote()) out += '<div class="fa-price__note">' + FA.vatNote() + '</div>';
    return out;
  };

  /* Celý řádek termínu: „Termín otevřeného kurzu: 20. 11. 2026“, jinak „Termín upřesníme“ */
  FA.termLineHTML = function (kurz) {
    var t = FA.nextOpen(kurz);
    if (t) return '<span class="fa-meta__label">Termín otevřeného kurzu:</span> <strong>' + FA.fmtDate(FA.parseDate(t.datum), true) + '</strong>';
    var ts = FA.terms(kurz);
    if (ts.length) {
      var sold = ts.filter(function (x) { return FA.termState(x) === 'vyprodano'; });
      if (sold.length === ts.length) return '<span class="fa-meta__label">Termín otevřeného kurzu:</span> <strong>vyprodáno</strong>';
      return '<strong>Termín upřesníme</strong>';
    }
    return '<span class="fa-meta__label">Termín otevřeného kurzu:</span> <strong>připravujeme</strong>';
  };
  /* Text termínu do meta údajů */
  FA.termDisplay = function (kurz) {
    var t = FA.nextOpen(kurz);
    if (t) return FA.fmtDate(FA.parseDate(t.datum), true);
    var ts = FA.terms(kurz);
    if (ts.length) {
      var sold = ts.filter(function (x) { return FA.termState(x) === 'vyprodano'; });
      return sold.length === ts.length ? 'vyprodáno' : 'Termín upřesníme';
    }
    return 'připravujeme';
  };
  FA.placeDisplay = function (kurz) {
    var ts = FA.terms(kurz);
    if (ts.length > 1 && kurz.mistaSouhrn) return FA.txt(kurz.mistaSouhrn);
    if (ts.length === 1) return FA.placeHTML(ts[0]);
    if (kurz.mistaSouhrn) return FA.txt(kurz.mistaSouhrn);
    return '<span class="fa-todo">[DOPLNIT: místo]</span>';
  };
  /* Všechny termíny kurzu: datum + „místo · město · kraj“ (chybějící části vynechá) */
  FA.termsPlacesHTML = function (kurz) {
    var ts = FA.terms(kurz).slice(0, 4);
    if (!ts.length) return '<ul class="fa-offer__terms"><li class="is-empty">Termín a místo otevřeného kurzu připravujeme</li></ul>';
    return '<ul class="fa-offer__terms">' + ts.map(function (t) {
      var d = FA.parseDate(t.datum);
      var parts = FA.placeParts(t).filter(function (p) { return !FA.isTodo(p); });
      var st = FA.termState(t);
      return '<li><span class="fa-offer__tdate">' + (d ? FA.fmtDate(d, true) : 'Termín upřesníme') + '</span>' +
        '<span class="fa-offer__tplace">' + parts.map(function (p) { return FA.h(FA.typo(p)); }).join(' · ') +
        (st === 'vyprodano' ? ' <span class="fa-badge fa-badge--sold">vyprodáno</span>' : '') + '</span></li>';
    }).join('') + '</ul>';
  };
  FA.priceFromDisplay = function (kurz) {
    var m = FA.minPrice(kurz);
    if (m == null) {
      var p = FA.pricing(kurz, null);
      m = p.current;
    }
    return m != null ? 'od ' + FA.fmtPrice(m) : 'Cenu upřesníme';
  };

  /* Vazby v HTML: [data-fa-kurz="slug"] obsahuje [data-fa-f="termin|misto|delka|cenaOd|kapacita"] a [data-fa-price] */
  function renderBindings() {
    doc.querySelectorAll('[data-fa-kurz]').forEach(function (box) {
      var kurz = FA.kurz(box.getAttribute('data-fa-kurz'));
      if (!kurz) return;
      box.querySelectorAll('[data-fa-f]').forEach(function (el) {
        var f = el.getAttribute('data-fa-f');
        if (f === 'termin') el.innerHTML = FA.termDisplay(kurz);
        else if (f === 'terminLine') el.innerHTML = FA.termLineHTML(kurz);
        else if (f === 'misto') el.innerHTML = FA.placeDisplay(kurz);
        else if (f === 'delka') el.innerHTML = FA.txt(kurz.delka, '<span class="fa-todo">[DOPLNIT: délka]</span>');
        else if (f === 'cenaOd') el.innerHTML = FA.priceFromDisplay(kurz);
        else if (f === 'terminyMista') el.innerHTML = FA.termsPlacesHTML(kurz);
        else if (f === 'kapacita') {
          var t = FA.nextOpen(kurz);
          var row = el.closest('[data-fa-row]') || el;
          if (t && typeof t.kapacita === 'number') { el.textContent = 'Kapacita ' + t.kapacita + NBSP + 'míst'; row.hidden = false; }
          else row.hidden = true;
        }
      });
      box.querySelectorAll('[data-fa-price]').forEach(function (el) {
        el.innerHTML = FA.priceHTML(kurz, FA.nextOpen(kurz), { vat: el.hasAttribute('data-fa-price-vat') });
      });
    });
  }

  /* ---------- Karty termínů (stránka kurzu) ---------- */
  FA.termCardHTML = function (kurz, t, name) {
    var d = FA.parseDate(t.datum);
    var st = FA.termState(t);
    var p = FA.pricing(kurz, t);
    var dateCol;
    if (d) {
      var parts = FA.dateParts(d);
      dateCol = '<span class="fa-term__day">' + parts.day + '.</span><span class="fa-term__month">' + parts.month + NBSP + parts.year + '</span><span class="fa-term__wd">' + parts.weekday + '</span>';
    } else {
      dateCol = '<span class="fa-term__tbd">Termín upřesníme</span>';
    }
    var badges = '<span class="fa-badge fa-badge--format">' + (t.format === 'online' ? 'online' : 'prezenčně') + '</span>';
    if (st === 'vyprodano') badges += '<span class="fa-badge fa-badge--sold">vyprodáno</span>';
    else if (st === 'pripravujeme') badges += '<span class="fa-badge fa-badge--soon">připravujeme</span>';
    else if (typeof t.volnaMista === 'number' && t.volnaMista > 0 && t.volnaMista <= 3) badges += '<span class="fa-badge fa-badge--last">poslední místa</span>';
    if (st === 'otevreno' && p.ebActive && p.earlyBird != null) badges += '<span class="fa-badge fa-badge--eb">early bird</span>';

    var aside = '';
    if (st === 'otevreno' && p.known) {
      aside += '<span class="fa-term__price">' + FA.fmtPrice(p.current) + (p.ebActive && p.standard != null ? '<small>místo ' + FA.fmtPrice(p.standard) + '</small>' : '') + '</span>';
      if (typeof t.volnaMista === 'number') aside += '<span class="fa-term__seats">Volná místa: ' + t.volnaMista + '</span>';
    } else if (st === 'vyprodano') {
      aside += '<span class="fa-term__seats">Chci na čekací listinu</span>';
    } else {
      aside += '<span class="fa-term__seats">Chci vědět o termínu</span>';
    }
    var time = FA.timeText(t);
    return '<label class="fa-term' + (st !== 'otevreno' ? ' is-disabled' : '') + '" data-term="' + FA.h(t.id) + '">' +
      '<input class="fa-term__input" type="radio" name="' + FA.h(name || 'termin-volba') + '" value="' + FA.h(t.id) + '">' +
      '<span class="fa-term__date">' + dateCol + '</span>' +
      '<span class="fa-term__body">' +
        (time ? '<span class="fa-term__time">' + FA.h(time) + '</span>' : '') +
        '<span class="fa-term__place">' + FA.placeHTML(t) + '</span>' +
        '<span class="fa-term__badges">' + badges + '</span>' +
      '</span>' +
      '<span class="fa-term__aside">' + aside + '</span>' +
      '<span class="fa-term__dot" aria-hidden="true"></span>' +
    '</label>';
  };

  /* ---------- Přehled kurzů: velké karty z dat ---------- */
  function offerTypeBadge(o) {
    if (o.typ === 'kurz') return '<span class="fa-badge fa-badge--type">kurz</span>';
    if (o.typ === 'sluzba') return '<span class="fa-badge fa-badge--type">služba</span>';
    return '<span class="fa-badge fa-badge--soon">připravujeme</span>';
  }
  FA.offerCardHTML = function (o, idx, wide) {
    var num = String(idx + 1).padStart(2, '0');
    var url = FA.url(o.url);
    var desc;
    if (o.typ === 'pripravujeme') {
      desc = FA.isTodo(o.kratkyPopis) ? FA.txt(o.popisProdukce || 'Nový program připravujeme. Nechte si poslat informace o prvním termínu.') : FA.txt(o.kratkyPopis);
    } else desc = FA.txt(o.kratkyPopis);
    var list = (o.coNajdete || []).filter(function (x) { return !FA.isTodo(x); });
    var listHTML = list.length ? '<p class="fa-offer__listhead">Co zde najdete</p><ul class="fa-checklist">' + list.map(function (x) { return '<li>' + FA.icon('check') + '<span>' + FA.txt(x) + '</span></li>'; }).join('') + '</ul>' : '';
    var meta = '', cta = '';
    if (o.typ === 'kurz') {
      meta = '<ul class="fa-meta fa-offer__meta">' +
        '<li class="fa-offer__meta-full">' + FA.icon('calendar') + '<span>' + FA.termLineHTML(o) + '</span></li>' +
        '<li>' + FA.icon('clock') + '<span>' + FA.txt(o.delka, '<span class="fa-todo">[DOPLNIT: délka]</span>') + '</span></li>' +
        '<li>' + FA.icon('tag') + '<span><strong>' + FA.priceFromDisplay(o) + '</strong></span></li>' +
      '</ul>' +
      '<p class="fa-offer__listhead">Kde a kdy</p>' + FA.termsPlacesHTML(o);
      var open = FA.nextOpen(o);
      cta = '<a class="fa-btn fa-btn--secondary-light fa-btn--sm" href="' + url + '">Zobrazit celý program</a>' +
        (open ? '<a class="fa-btn fa-btn--primary fa-btn--sm" href="' + url + '#rezervace-' + FA.h(open.id) + '" data-fa-track="begin_checkout">REZERVOVAT MÍSTO</a>'
              : '<a class="fa-btn fa-btn--primary fa-btn--sm" href="' + url + '#rezervace">' + (FA.terms(o).length ? 'REZERVOVAT MÍSTO' : 'Chci vědět o termínu') + '</a>');
    } else if (o.typ === 'sluzba') {
      meta = '<ul class="fa-meta fa-offer__meta fa-offer__meta--wide"><li>' + FA.icon('building') + '<span><span class="fa-meta__label">Pro:</span> ' + FA.txt(String(o.proKoho || '').toLowerCase()) + '</span></li></ul>';
      cta = '<a class="fa-btn fa-btn--secondary-light fa-btn--sm" href="' + url + '">Jak to funguje</a>';
    } else {
      cta = '<a class="fa-btn fa-btn--secondary-light fa-btn--sm" href="' + url + '#cekaci-listina">Chci vědět o prvním termínu</a>';
    }
    var typeCls = o.typ === 'kurz' ? ' fa-offer--kurz' : (o.typ === 'sluzba' ? ' fa-offer--sluzba' : ' fa-offer--soon');
    var head = '<div class="fa-offer__head"><div class="fa-offer__top">' + offerTypeBadge(o) + '<span class="fa-offer__num" aria-hidden="true">' + num + '</span></div>' +
      '<h3 class="fa-h3 fa-offer__title"><a href="' + url + '">' + FA.h(o.nazev) + '</a></h3>' +
      (o.podnazev ? '<p class="fa-subtitle fa-offer__sub">' + FA.h(o.podnazev) + '</p>' : '') + '</div>';
    var descHTML = '<p class="fa-offer__desc">' + desc + '</p>';
    if (wide) {
      return '<article class="fa-offer fa-offer--wide' + typeCls + '">' + head + '<div class="fa-offer__body"><div class="fa-offer__main">' + descHTML + listHTML + '</div><div class="fa-offer__aside">' + meta + '<div class="fa-offer__cta">' + cta + '</div></div></div></article>';
    }
    return '<article class="fa-offer' + typeCls + '">' + head + '<div class="fa-offer__body">' + descHTML + listHTML + '<div class="fa-offer__foot">' + meta + '<div class="fa-offer__cta">' + cta + '</div></div></div></article>';
  };

  function renderCourseList() {
    doc.querySelectorAll('[data-fa-course-list]').forEach(function (el) {
      var items = D.kurzy.concat(D.sluzby.filter(function (s) { return s.typ === 'pripravujeme'; }))
        .sort(function (a, b) { return (a.poradi || 99) - (b.poradi || 99); });
      el.innerHTML = items.map(function (o, i) { return FA.offerCardHTML(o, i, true); }).join('');
    });
  }

  /* ---------- Tabulka všech termínů s filtry ---------- */
  function renderTermsTable() {
    var wrap = doc.querySelector('[data-fa-terms-table]');
    if (!wrap) return;
    var rows = [];
    D.kurzy.forEach(function (k) { FA.terms(k).forEach(function (t) { rows.push({ kurz: k, termin: t }); }); });
    rows.sort(function (a, b) {
      var da = FA.parseDate(a.termin.datum), db = FA.parseDate(b.termin.datum);
      if (da && db) return da - db; if (da) return -1; if (db) return 1; return 0;
    });
    var filtersEl = doc.querySelector('[data-fa-terms-filters]');
    var uniq = function (arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); };
    var kraje = uniq(rows.map(function (r) { return r.termin.format === 'online' ? null : r.termin.kraj; }));
    var kurzy = uniq(rows.map(function (r) { return r.kurz.slug; }));
    var state = { kraj: '', format: '', kurz: '' };

    function group(name, label, opts) {
      return '<fieldset class="fa-filter"><legend>' + label + '</legend>' +
        '<label><input type="radio" name="f-' + name + '" value="" checked><span>Vše</span></label>' +
        opts.map(function (o) { return '<label><input type="radio" name="f-' + name + '" value="' + FA.h(o.v) + '"><span>' + FA.h(o.l) + '</span></label>'; }).join('') +
        '</fieldset>';
    }
    if (filtersEl && rows.length) {
      var g = '';
      if (kurzy.length > 1) g += group('kurz', 'Kurz', kurzy.map(function (s) { return { v: s, l: FA.kurz(s).nazev }; }));
      if (kraje.length) g += group('kraj', 'Kraj', kraje.filter(function (k) { return !FA.isTodo(k); }).map(function (k) { return { v: k, l: k }; }));
      g += group('format', 'Formát', [{ v: 'prezencne', l: 'Prezenčně' }, { v: 'online', l: 'Online' }]);
      filtersEl.innerHTML = g;
      filtersEl.addEventListener('change', function (e) {
        var n = e.target.name.replace('f-', '');
        state[n] = e.target.value;
        draw();
      });
    }

    function draw() {
      var list = rows.filter(function (r) {
        if (state.kurz && r.kurz.slug !== state.kurz) return false;
        if (state.format && r.termin.format !== state.format) return false;
        if (state.kraj && r.termin.kraj !== state.kraj) return false;
        return true;
      });
      if (!list.length) {
        wrap.innerHTML = '<p class="fa-table-empty">' + (rows.length ? 'Pro zvolený filtr teď nemáme vypsaný termín.' : 'Termíny otevřených kurzů připravujeme.') + ' <a class="fa-link" href="' + FA.url('pro-organizace/#poptavka') + '">Chcete školení na míru?</a></p>';
        return;
      }
      wrap.innerHTML = '<table class="fa-table"><caption class="fa-sr">Všechny termíny otevřených kurzů</caption><thead><tr>' +
        '<th scope="col">Datum</th><th scope="col">Kurz</th><th scope="col">Místo</th><th scope="col">Město</th><th scope="col">Kraj</th><th scope="col">Formát</th><th scope="col">Cena</th><th scope="col">Volná místa</th><th scope="col"><span class="fa-sr">Akce</span></th>' +
        '</tr></thead><tbody>' + list.map(function (r) {
          var t = r.termin, k = r.kurz, st = FA.termState(t), p = FA.pricing(k, t);
          var d = FA.parseDate(t.datum);
          var url = FA.url(k.url);
          var btn;
          if (st === 'otevreno') btn = '<a class="fa-btn fa-btn--primary fa-btn--sm" href="' + url + '#rezervace-' + FA.h(t.id) + '" data-fa-track="begin_checkout">Rezervovat</a>';
          else if (st === 'vyprodano') btn = '<a class="fa-btn fa-btn--secondary-light fa-btn--sm" href="' + url + '#rezervace-' + FA.h(t.id) + '">Čekací listina</a>';
          else btn = '<a class="fa-btn fa-btn--secondary-light fa-btn--sm" href="' + url + '#rezervace-' + FA.h(t.id) + '">Chci vědět o termínu</a>';
          var seats = st === 'vyprodano' ? '<span class="fa-badge fa-badge--sold">vyprodáno</span>' :
            (typeof t.volnaMista === 'number' ? (t.volnaMista <= 3 ? '<span class="fa-badge fa-badge--last">' + t.volnaMista + NBSP + 'poslední</span>' : String(t.volnaMista)) : '<span class="fa-muted">neuvádíme</span>');
          var online = t.format === 'online';
          return '<tr>' +
            '<td class="fa-table__date" data-label="Datum">' + (d ? FA.fmtDate(d, true) + '<br><span class="fa-muted fa-small">' + FA.h(FA.timeText(t)) + '</span>' : 'Termín upřesníme') + '</td>' +
            '<td class="fa-table__course" data-label="Kurz"><a href="' + url + '">' + FA.h(k.nazev) + '</a></td>' +
            '<td class="fa-table__place" data-label="Místo">' + (online ? 'Online' + (t.platforma ? ' · ' + FA.txt(t.platforma) : '') : FA.txt(t.misto)) + '</td>' +
            '<td data-label="Město">' + (online ? '<span class="fa-muted">online</span>' : FA.txt(t.mesto)) + '</td>' +
            '<td data-label="Kraj">' + (online ? '<span class="fa-muted">online</span>' : FA.txt(t.kraj)) + '</td>' +
            '<td data-label="Formát"><span class="fa-badge fa-badge--format">' + FA.formatLabel(t) + '</span></td>' +
            '<td class="fa-table__price" data-label="Cena">' + (p.known ? FA.fmtPrice(p.current) + (p.ebActive && p.standard != null ? '<br><span class="fa-muted fa-small">early bird</span>' : '') : 'upřesníme') + '</td>' +
            '<td data-label="Volná místa">' + seats + '</td>' +
            '<td class="fa-table__action">' + btn + '</td>' +
          '</tr>';
        }).join('') + '</tbody></table>';
    }
    draw();
  }

  /* ---------- Lektoři a lidé akademie ---------- */
  FA.photoHTML = function (l, cls) {
    cls = cls || 'fa-photo';
    if (l.foto) {
      var src = FA.url(l.foto), webp = src.replace(/\.(jpe?g|png)$/i, '.webp');
      var wh = l.fotoRozmer || [800, 1000];
      return '<div class="' + cls + '"><picture>' + (webp !== src ? '<source srcset="' + webp + '" type="image/webp">' : '') +
        '<img src="' + src + '" alt="' + FA.h(l.jmeno) + '" width="' + wh[0] + '" height="' + wh[1] + '" loading="lazy" decoding="async"></picture></div>';
    }
    return '<div class="' + cls + ' fa-ph fa-velvet" role="img" aria-label="Fotografie připravujeme: ' + FA.h(l.jmeno) + '">' +
      '<svg class="fa-ph__mono" aria-hidden="true" focusable="false"><use href="#fa-mono"/></svg>' +
      '<span class="fa-ph__label fa-todo">FOTO: ' + FA.h(l.jmeno) + ' [DOPLNIT]</span></div>';
  };
  /* Dlaždice s fotkou (úvod, O nás, hero kurzu) */
  FA.memberHTML = function (l, tag, noLink) {
    var link = null;
    if (!noLink) {
      if (l.lektor === false) {
        var here = window.location.href.split('#')[0].split('?')[0];
        if (l.odkaz && FA.url(l.odkaz).split('#')[0] !== here) link = { href: FA.url(l.odkaz), text: 'O' + NBSP + 'akademii' };
      }
      else link = { href: FA.url('lektori/#' + l.id), text: 'Profil lektora' };
    }
    return '<article class="fa-member">' + FA.photoHTML(l, 'fa-member__photo') +
      '<div class="fa-member__body"><p class="fa-member__role">' + FA.h(FA.typo(l.role)) + '</p>' +
      '<' + tag + ' class="fa-member__name">' + FA.h(l.jmeno) + '</' + tag + '>' +
      (link ? '<a class="fa-member__link" href="' + link.href + '">' + link.text + '<span class="fa-sr">: ' + FA.h(l.jmeno) + '</span>' + FA.icon('arrow') + '</a>' : '') +
      '</div></article>';
  };
  function coursesOf(lid) {
    return D.kurzy.filter(function (k) { return (k.lektori || []).indexOf(lid) !== -1; });
  }
  function renderLecturers() {
    var lecturerIds = D.lektori.filter(function (l) { return l.lektor !== false; }).map(function (l) { return l.id; });
    doc.querySelectorAll('[data-fa-lecturers]').forEach(function (el) {
      var key = el.getAttribute('data-fa-lecturers');
      var variant = el.getAttribute('data-variant') || 'card';
      var ids;
      if (key === 'all') ids = lecturerIds;
      else if (key === 'tym') ids = D.tym.length ? D.tym : D.lektori.map(function (l) { return l.id; });
      else if (key.indexOf('kurz:') === 0) { var k = FA.kurz(key.slice(5)); ids = k ? (k.lektori || []) : []; }
      else if (key === 'webinar') ids = D.webinar.lektori || [];
      else ids = key.split(',');
      var list = ids.map(FA.lektor).filter(Boolean);
      if (!list.length) {
        if (variant === 'hero') { el.hidden = true; return; }
        el.innerHTML = '<p class="fa-muted"><span class="fa-todo">[DOPLNIT: lektoři tohoto kurzu]</span></p>';
        return;
      }
      if (variant === 'tile') {
        el.innerHTML = list.map(function (l) { return FA.memberHTML(l, 'h3'); }).join('');
        return;
      }
      if (variant === 'hero') {
        el.innerHTML = '<div class="fa-hero-people__pair">' + list.slice(0, 2).map(function (l) { return FA.memberHTML(l, 'p', true); }).join('') + '</div>' +
          '<p class="fa-hero-people__caption">' + (list.length > 1 ? 'Kurz vedou' : 'Kurz vede') + '</p>';
        return;
      }
      el.innerHTML = list.map(function (l) {
        var bio = FA.txt(l.bio, '<span class="fa-todo">[DOPLNIT: bio]</span>');
        if (variant === 'profile') {
          var tags = (l.odbornost && l.odbornost.length) ? '<ul class="fa-chips fa-person__tags">' + l.odbornost.map(function (t) { return '<li class="fa-chip">' + FA.txt(t) + '</li>'; }).join('') + '</ul>'
            : '<p class="fa-person__tags fa-small"><span class="fa-todo">[DOPLNIT: odbornost jako štítky]</span></p>';
          var cs = coursesOf(l.id);
          var csHTML = cs.length ? '<p class="fa-person__courses"><strong>Vede kurzy:</strong> ' + cs.map(function (k) { return '<a class="fa-link" href="' + FA.url(k.url) + '">' + FA.h(k.nazev) + '</a>'; }).join(', ') + '</p>' : '';
          return '<article class="fa-person fa-person--row fa-person--profile" id="' + FA.h(l.id) + '">' + FA.photoHTML(l) + '<div><p class="fa-person__role">' + FA.h(FA.typo(l.role)) + '</p><h2 class="fa-person__name">' + FA.h(l.jmeno) + '</h2><p class="fa-person__bio">' + bio + '</p>' + tags + csHTML + '</div></article>';
        }
        return '<article class="fa-person fa-person--row">' + FA.photoHTML(l) + '<div><h3 class="fa-person__name">' + FA.h(l.jmeno) + '</h3><p class="fa-person__role">' + FA.h(FA.typo(l.role)) + '</p><p class="fa-person__bio">' + bio + '</p></div></article>';
      }).join('');
    });
  }

  /* ---------- Patička: seznam kurzů ---------- */
  function renderFooterCourses() {
    doc.querySelectorAll('[data-fa-footer-courses]').forEach(function (ul) {
      var items = FA.allOffers().filter(function (o) { return o.typ !== 'sluzba'; });
      ul.innerHTML = items.map(function (o) { return '<li><a href="' + FA.url(o.url) + '">' + FA.h(o.nazev) + '</a></li>'; }).join('') +
        '<li><a href="' + FA.url('kurzy/') + '">Všechny termíny</a></li>';
    });
  }

  /* ---------- Hodnoty z configu (e-mail, telefon, adresa, provozovatel) ---------- */
  function getConf(key) { return key.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, C); }
  function renderConfig() {
    doc.querySelectorAll('[data-fa-config]').forEach(function (el) {
      var v = getConf(el.getAttribute('data-fa-config'));
      if (v == null || v === '') return;
      var row = el.closest('[data-fa-config-row]');
      if (FA.isTodo(v)) {
        var t = FA.placeholder(v);
        if (!t && row) { row.hidden = true; return; }
        el.textContent = t || v;
        el.setAttribute('data-doplnit', v);
        el.classList.add('fa-todo');
        el.setAttribute('data-ph', '');
        if (!t) el.hidden = true;
      } else {
        el.textContent = v;
        el.classList.remove('fa-todo');
        if (row) row.hidden = false;
      }
    });
    doc.querySelectorAll('[data-fa-config-link]').forEach(function (a) {
      var k = a.getAttribute('data-fa-config-link');
      var v = getConf(k);
      if (FA.isTodo(v)) {
        var span = doc.createElement('span');
        span.className = a.className;
        span.innerHTML = a.innerHTML;
        a.parentNode.replaceChild(span, a);
        return;
      }
      a.href = (k === 'email' ? 'mailto:' : 'tel:') + String(v).replace(/\s/g, '');
    });
    doc.querySelectorAll('[data-fa-lhuta]').forEach(function (el) {
      var v = C.rezervace && C.rezervace.lhutaOdpovedi;
      el.innerHTML = FA.txt(v);
    });
  }

  /* ---------- Videa (facade, YouTube až po kliknutí přes youtube-nocookie.com) ---------- */
  function ytId(s) {
    var m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(s || '');
    return m ? m[1] : (/^[\w-]{11}$/.test(s || '') ? s : null);
  }
  function renderVideos() {
    doc.querySelectorAll('[data-fa-videos]').forEach(function (el) {
      var key = el.getAttribute('data-fa-videos');
      var list = D.videa.filter(function (v) { return key === 'all' || v.kurz === key; });
      var section = el.closest('[data-fa-videos-section]');
      var frame = section && section.parentNode ? section.parentNode.querySelector('[data-fa-frame]') : null;
      if (!list.length) { if (section) section.hidden = true; return; }
      if (section) section.hidden = false;
      if (frame) frame.hidden = true;
      el.innerHTML = list.slice(0, 5).map(function (v, i) {
        var thumb = v.nahled ? '<img src="' + FA.url(v.nahled) + '" alt="" width="640" height="360" loading="lazy">' : '';
        return '<div class="fa-video fa-velvet" data-video="' + i + '"><button class="fa-video__btn" type="button" aria-label="Přehrát video: ' + FA.h(v.titulek || 'video') + '">' + thumb +
          '<span class="fa-video__play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg></span>' +
          (v.titulek ? '<span class="fa-video__title">' + FA.h(v.titulek) + '</span>' : '') + '</button></div>';
      }).join('');
      el.addEventListener('click', function (e) {
        var btn = e.target.closest('.fa-video__btn');
        if (!btn) return;
        var box = btn.parentNode;
        var v = list[+box.getAttribute('data-video')];
        if (v.typ === 'youtube') {
          var id = ytId(v.zdroj);
          if (!id) return;
          box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="' + FA.h(v.titulek || 'Video') + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
        } else {
          box.innerHTML = '<video src="' + FA.url(v.zdroj) + '" controls autoplay playsinline' + (v.nahled ? ' poster="' + FA.url(v.nahled) + '"' : '') + '></video>';
        }
        if (FA.track) FA.track('video_start', { video: v.titulek || v.zdroj });
      });
    });
  }

  /* ---------- Webinář (pruh na úvodu) ---------- */
  FA.webinarActive = function () {
    var w = D.webinar;
    if (!w || !w.aktivni) return false;
    var d = FA.parseDate(w.datum);
    return !d || d >= FA.today;
  };
  function renderWebinarStrip() {
    doc.querySelectorAll('[data-fa-webinar-strip]').forEach(function (el) {
      if (!FA.webinarActive()) { el.hidden = true; return; }
      var w = D.webinar, d = FA.parseDate(w.datum);
      el.hidden = false;
      el.querySelectorAll('[data-w]').forEach(function (n) {
        var k = n.getAttribute('data-w');
        if (k === 'nazev') n.innerHTML = FA.txt(w.nazev);
        if (k === 'kdy') n.innerHTML = (d ? FA.fmtDate(d, true) : '<span class="fa-todo">[DOPLNIT: datum]</span>') + (w.casOd ? ', ' + FA.h(w.casOd) : '');
      });
    });
  }

  /* ---------- Stránka webináře ---------- */
  function renderWebinarPage() {
    var on = doc.querySelectorAll('[data-fa-webinar-on]'), off = doc.querySelectorAll('[data-fa-webinar-off]');
    if (!on.length && !off.length) return;
    var active = FA.webinarActive();
    on.forEach(function (el) { el.hidden = !active; });
    off.forEach(function (el) { el.hidden = active; });
    if (!active) return;
    var w = D.webinar, d = FA.parseDate(w.datum);
    var kurz = FA.kurz(w.kurz);
    doc.querySelectorAll('[data-wp]').forEach(function (n) {
      var k = n.getAttribute('data-wp');
      if (k === 'nazev') n.innerHTML = FA.txt(w.nazev);
      else if (k === 'kdy') n.innerHTML = (d ? FA.dateParts(d).weekday + ' ' + FA.fmtDate(d, true) : '<span class="fa-todo">[DOPLNIT: datum]</span>') + (w.casOd ? ', ' + FA.h(w.casOd) + (w.casDo ? ' až ' + FA.h(w.casDo) : '') : '');
      else if (k === 'popis') n.innerHTML = FA.txt(w.popis);
      else if (k === 'platforma') n.innerHTML = 'Online' + (w.platforma ? ' · ' + FA.txt(w.platforma) : '');
      else if (k === 'body') {
        var body = (w.body && w.body.length) ? w.body : ['[DOPLNIT: co se dozvíte, bod 1]', '[DOPLNIT: bod 2]', '[DOPLNIT: bod 3]'];
        n.innerHTML = body.map(function (b) { return '<li>' + FA.icon('check') + '<span>' + FA.txt(b) + '</span></li>'; }).join('');
      } else if (k === 'kurz' && kurz) n.href = FA.url(kurz.url);
    });
  }

  /* ---------- Odkazy REZERVOVAT MÍSTO na nejbližší otevřený termín ---------- */
  function renderReserveLinks() {
    var best = FA.nextOpenAny();
    var first = D.kurzy[0];
    var href = best ? FA.url(best.kurz.url) + '#rezervace-' + best.termin.id : (first ? FA.url(first.url) + '#rezervace' : FA.url('kurzy/'));
    doc.querySelectorAll('[data-fa-reserve-link]').forEach(function (a) { a.href = href; });
    doc.querySelectorAll('[data-fa-reserve-kurz]').forEach(function (a) {
      var k = FA.kurz(a.getAttribute('data-fa-reserve-kurz'));
      if (!k) return;
      var t = FA.nextOpen(k);
      var onPage = doc.body.getAttribute('data-fa-course') === k.slug;
      a.href = (onPage ? '' : FA.url(k.url)) + (t ? '#rezervace-' + t.id : '#rezervace');
    });
  }

  /* ---------- Sticky mobilní lišta ---------- */
  function initSticky() {
    var bar = doc.querySelector('[data-fa-sticky]');
    var slug = doc.body.getAttribute('data-fa-sticky');
    if (!bar || !slug) return;
    var kurz = FA.kurz(slug);
    if (!kurz) return;
    var t = FA.nextOpen(kurz);
    bar.hidden = false;
    var priceEl = bar.querySelector('[data-fa-sticky-price]');
    var dateEl = bar.querySelector('[data-fa-sticky-date]');
    var link = bar.querySelector('[data-fa-sticky-link]');
    priceEl.innerHTML = FA.priceFromDisplay(kurz);
    dateEl.innerHTML = t ? FA.h(FA.termShort(t)) : (FA.terms(kurz).length ? 'Termín upřesníme' : 'Termín připravujeme');
    var onCourse = doc.body.getAttribute('data-fa-course') === slug;
    link.href = onCourse ? '#rezervace' : FA.url(kurz.url) + (t ? '#rezervace-' + t.id : '#rezervace');
    if (!FA.terms(kurz).length) link.textContent = 'Chci vědět o termínu';

    var hero = doc.querySelector('[data-fa-hero]');
    var hide = [doc.querySelector('#rezervace'), doc.querySelector('.fa-footer'), doc.querySelector('[data-fa-sticky-hide]')].filter(Boolean);
    var heroPassed = !hero, hiddenBy = {};
    function update() {
      var anyHide = Object.keys(hiddenBy).some(function (k) { return hiddenBy[k]; });
      bar.classList.toggle('is-visible', heroPassed && !anyHide);
    }
    if (!('IntersectionObserver' in window)) { heroPassed = true; update(); return; }
    if (hero) {
      new IntersectionObserver(function (en) {
        heroPassed = !en[0].isIntersecting && en[0].boundingClientRect.top < 0;
        update();
      }, { threshold: 0 }).observe(hero);
    }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { hiddenBy[e.target.id || e.target.className] = e.isIntersecting; });
      update();
    }, { threshold: 0 });
    hide.forEach(function (el) { io.observe(el); });
    update();
  }

  /* ---------- Hlavička a mobilní menu ---------- */
  function initHeader() {
    var header = doc.querySelector('[data-fa-header]');
    if (!header) return;
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var burger = doc.querySelector('[data-fa-burger]');
    var menu = doc.querySelector('[data-fa-menu]');
    if (!burger || !menu) return;
    var label = burger.querySelector('[data-fa-burger-label]');
    var lastFocus = null;
    function focusables() {
      return Array.prototype.slice.call(doc.querySelectorAll('[data-fa-header] a[href], [data-fa-burger], [data-fa-menu] a[href], [data-fa-menu] button'))
        .filter(function (el) { return el.getClientRects().length > 0 && el.tabIndex >= 0; });
    }
    function open() {
      lastFocus = doc.activeElement;
      menu.hidden = false;
      html.classList.add('fa-menu-open');
      burger.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Zavřít';
      var first = menu.querySelector('a');
      if (first) first.focus();
    }
    function close(restore) {
      menu.hidden = true;
      html.classList.remove('fa-menu-open');
      burger.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Menu';
      if (restore !== false) (lastFocus && lastFocus.focus ? lastFocus : burger).focus();
    }
    burger.addEventListener('click', function () { menu.hidden ? open() : close(); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
    doc.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = focusables();
        if (!f.length) return;
        var i = f.indexOf(doc.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024 && !menu.hidden) close(false); });
  }

  /* ---------- Pohyb: vyjetí při scrollu, nadpisy po slovech, reflektor, paralaxa, průběh čtení, FAQ ---------- */
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  FA.reducedMotion = reducedMotion;

  /* Rozdělí textové uzly nadpisu na slova (nezlomitelné mezery drží slova pohromadě) */
  FA.splitWords = function (el) {
    if (!el || el.hasAttribute('data-fa-split')) return;
    el.setAttribute('data-fa-split', '');
    var i = 0;
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;
      var parts = n.textContent.split(/([ \t\r\n]+)/);
      var frag = doc.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^[ \t\r\n]+$/.test(p)) { frag.appendChild(doc.createTextNode(' ')); return; }
        var w = doc.createElement('span'); w.className = 'fa-w';
        var t = doc.createElement('span'); t.textContent = p; t.style.setProperty('--wi', i++);
        w.appendChild(t); frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
  };

  var REVEAL = [
    ['.fa-section__head', 'up'], ['.fa-offer', 'up'], ['.fa-card', 'up'], ['.fa-steps', 'none'], ['.fa-step', 'up'],
    ['.fa-benefit', 'left'], ['.fa-member', 'unveil'], ['.fa-person', 'up'], ['.fa-callout', 'scale'],
    ['.fa-faq details', 'up'], ['.fa-faq-help', 'up'], ['.fa-timeline > li', 'left'], ['.fa-orgbox', 'scale'],
    ['.fa-plaque', 'scale'], ['.fa-promise', 'scale'], ['.fa-formcard', 'up'], ['.fa-keyfacts', 'up'],
    ['.fa-b2b__cta', 'up'], ['.fa-b2b .fa-chips', 'up'], ['.fa-final__claim', 'scale'], ['.fa-final__sub', 'up'],
    ['.fa-final .fa-btn-row', 'up'], ['.fa-table-wrap', 'up'], ['.fa-filters', 'up'], ['.fa-contact-list > li', 'up'],
    ['.fa-prose', 'up'], ['.fa-crosslink', 'left'], ['.fa-b2b-strip__inner > *', 'up'], ['[data-fa-reveal]', '']
  ];
  function initReveal() {
    if (!('IntersectionObserver' in window) || reducedMotion) return;
    var vh = window.innerHeight;
    var seen = [];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        el.classList.add('is-in');
        var delay = parseInt(el.style.getPropertyValue('--fa-delay'), 10) || 0;
        setTimeout(function () {
          el.classList.remove('fa-reveal', 'is-in');
          el.style.removeProperty('--fa-delay');
        }, delay + 1900);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    REVEAL.forEach(function (pair) {
      doc.querySelectorAll(pair[0]).forEach(function (el) {
        if (seen.indexOf(el) !== -1) return;
        if (el.closest('.fa-hero, .fa-page-hero, .fa-menu, .fa-consent, .fa-booking-wrap, [hidden]')) return;
        seen.push(el);
        if (el.getBoundingClientRect().top < vh * 0.92) return; // co je vidět hned, neschovávat
        if (pair[1] && !el.hasAttribute('data-anim')) el.setAttribute('data-anim', pair[1]);
        if (pair[1] === 'unveil') el.querySelectorAll('img[loading="lazy"]').forEach(function (i) { i.loading = 'eager'; });
        var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.tagName === el.tagName; });
        var idx = Math.max(0, sibs.indexOf(el));
        el.style.setProperty('--fa-delay', Math.min(idx, 5) * 90 + 'ms');
        el.classList.add('fa-reveal');
        if (el.classList.contains('fa-section__head')) el.querySelectorAll('.fa-h2').forEach(FA.splitWords);
        io.observe(el);
      });
    });
  }

  /* Reflektor sledující kurzor v hero (jen myš, bez omezeného pohybu) */
  function initSpotlight() {
    var hero = doc.querySelector('[data-fa-hero]');
    var spot = hero && hero.querySelector('.fa-spot');
    if (!spot || reducedMotion || !(window.matchMedia && window.matchMedia('(pointer: fine)').matches)) return;
    var raf = 0, x = 0, y = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      x = e.clientX - r.left; y = e.clientY - r.top;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        spot.style.setProperty('--mx', x + 'px');
        spot.style.setProperty('--my', y + 'px');
      });
    });
  }

  /* Průběh čtení v hlavičce a jemná paralaxa vodoznaků */
  function initScrollFx() {
    var header = doc.querySelector('[data-fa-header]');
    var hasBar = header && header.querySelector('.fa-header__progress');
    var par = reducedMotion ? [] : Array.prototype.slice.call(doc.querySelectorAll('[data-fa-parallax]'));
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      var max = doc.documentElement.scrollHeight - vh;
      if (hasBar) header.style.setProperty('--fa-progress', max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)).toFixed(4) : '0');
      par.forEach(function (el) {
        var r = el.parentNode.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var f = parseFloat(el.getAttribute('data-fa-parallax')) || 0;
        el.style.setProperty('--fa-py', ((r.top + r.height / 2 - vh / 2) * f).toFixed(1) + 'px');
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* Plynulé otevírání FAQ (nativní details zůstává, bez JS funguje normálně) */
  function initFaq() {
    if (reducedMotion || !Element.prototype.animate) return;
    doc.querySelectorAll('.fa-faq details').forEach(function (d) {
      var s = d.querySelector('summary'), a = d.querySelector('.fa-faq__a');
      if (!s || !a) return;
      a.style.overflow = 'hidden';
      var anim = null;
      s.addEventListener('click', function (e) {
        e.preventDefault();
        if (anim) { anim.cancel(); anim = null; }
        var ease = 'cubic-bezier(.2,.7,.2,1)';
        if (!d.open) {
          d.open = true;
          var h = a.offsetHeight;
          anim = a.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 420, easing: ease });
          anim.onfinish = function () { anim = null; };
        } else {
          var h2 = a.offsetHeight;
          anim = a.animate([{ height: h2 + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: ease });
          anim.onfinish = function () { d.open = false; anim = null; };
        }
      });
    });
  }

  /* Zástupné texty: hned po vykreslení a u všeho, co se doplní později (formuláře, děkovací stránka) */
  function initTodos() {
    FA.fixTodos(doc);
    if (!('MutationObserver' in window)) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      (window.requestAnimationFrame || setTimeout)(function () { pending = false; FA.fixTodos(doc); });
    }).observe(doc.body, { childList: true, subtree: true });
  }

  /* ---------- JSON-LD: kurz, drobečková navigace, FAQ ---------- */
  function addJsonLd(obj) {
    var s = doc.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    doc.head.appendChild(s);
  }
  function hoursToISO(delka) {
    var m = /(\d+(?:[.,]\d+)?)\s*hod/.exec(delka || '');
    return m ? 'PT' + String(m[1]).replace(',', '.') + 'H' : undefined;
  }
  function dt(date, time) {
    if (!date) return undefined;
    if (!time) return date;
    var m = /^(\d{1,2}):(\d{2})$/.exec(time);
    return m ? date + 'T' + m[1].padStart(2, '0') + ':' + m[2] + ':00' : date;
  }
  function courseJsonLd() {
    var slug = doc.body.getAttribute('data-fa-course');
    var k = slug && FA.kurz(slug);
    if (!k) return;
    var desc = doc.querySelector('meta[name="description"]');
    var org = { '@type': 'EducationalOrganization', name: 'FILANDR AKADEMIE', url: FA.root, parentOrganization: { '@type': 'Organization', name: (C.provozovatel && C.provozovatel.nazev) || 'FILANDR spol. s r.o.' } };
    var course = {
      '@context': 'https://schema.org', '@type': 'Course',
      name: k.nazev + (k.podnazev ? ': ' + k.podnazev : ''),
      description: desc ? desc.content : (FA.isTodo(k.kratkyPopis) ? k.nazev : k.kratkyPopis),
      url: FA.url(k.url), inLanguage: 'cs', provider: org
    };
    var instances = FA.terms(k).filter(function (t) { return t.datum; }).map(function (t) {
      var st = FA.termState(t), p = FA.pricing(k, t);
      var online = t.format === 'online';
      var inst = {
        '@type': 'CourseInstance',
        courseMode: online ? 'online' : 'onsite',
        startDate: dt(t.datum, t.casOd), endDate: dt(t.datum, t.casDo),
        inLanguage: 'cs'
      };
      var wl = hoursToISO(k.delka); if (wl) inst.courseWorkload = wl;
      if (online) inst.location = { '@type': 'VirtualLocation', url: FA.url(k.url) };
      else {
        var addr = [t.misto, t.mesto].filter(function (x) { return x && !FA.isTodo(x); });
        inst.location = { '@type': 'Place', name: !FA.isTodo(t.misto) ? t.misto : (t.mesto || 'Místo upřesníme'), address: { '@type': 'PostalAddress', addressLocality: t.mesto || undefined, addressRegion: t.kraj || undefined, addressCountry: 'CZ', streetAddress: addr.length > 1 ? undefined : undefined } };
      }
      if (p.known) {
        inst.offers = {
          '@type': 'Offer', price: p.current, priceCurrency: 'CZK', category: p.ebActive ? 'Early bird' : 'Standard',
          availability: st === 'vyprodano' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          url: FA.url(k.url) + '#rezervace-' + t.id
        };
        if (p.ebActive && p.earlyBirdDo) inst.offers.priceValidUntil = FA.isoDate(p.earlyBirdDo);
      }
      return inst;
    });
    if (instances.length) course.hasCourseInstance = instances;
    var p0 = FA.pricing(k, null);
    if (p0.known) course.offers = { '@type': 'Offer', price: p0.current, priceCurrency: 'CZK', category: 'Paid', url: FA.url(k.url) };
    addJsonLd(course);
  }
  function breadcrumbJsonLd() {
    var nav = doc.querySelector('.fa-breadcrumb');
    if (!nav) return;
    var items = [];
    nav.querySelectorAll('li').forEach(function (li, i) {
      var a = li.querySelector('a');
      items.push({ '@type': 'ListItem', position: i + 1, name: li.textContent.trim(), item: a ? a.href : window.location.href.split('#')[0] });
    });
    addJsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items });
  }
  function faqJsonLd() {
    var faqs = doc.querySelectorAll('.fa-faq details');
    if (!faqs.length) return;
    var q = [];
    faqs.forEach(function (d) {
      var s = d.querySelector('summary'), a = d.querySelector('.fa-faq__a');
      if (!s || !a) return;
      var text = a.textContent.replace(/\s+/g, ' ').trim();
      if (/\[DOPLNIT/.test(text) || a.querySelector('[data-doplnit]')) return; // neúplné odpovědi do strukturovaných dat nedáváme
      q.push({ '@type': 'Question', name: s.textContent.trim(), acceptedAnswer: { '@type': 'Answer', text: text } });
    });
    if (q.length) addJsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: q });
  }

  /* ---------- Měření: obecné kliky ---------- */
  function initClickTracking() {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('a, button');
      if (!a || !FA.track) return;
      var href = a.getAttribute('href') || '';
      if (/^mailto:/.test(href)) FA.track('contact', { method: 'email' });
      else if (/^tel:/.test(href)) FA.track('contact', { method: 'telefon' });
      var ev = a.getAttribute('data-fa-track');
      if (ev) FA.track(ev, { kurz: doc.body.getAttribute('data-fa-course') || undefined, misto: 'tlacitko' });
    });
    var slug = doc.body.getAttribute('data-fa-course');
    if (slug && FA.track) {
      var k = FA.kurz(slug), p = k ? FA.pricing(k, FA.nextOpen(k)) : null;
      FA.track('view_item', { kurz: slug, value: p && p.current, nazev: k && k.nazev });
    }
  }

  /* ---------- Demo pruh ---------- */
  function demoBanner() {
    if (!FA.demo) return;
    var b = doc.createElement('div');
    b.className = 'fa-demo-banner';
    b.setAttribute('role', 'note');
    b.innerHTML = 'Náhled s ukázkovými termíny (jen staging). Data nejsou skutečná. <a href="?demo=0" style="color:inherit">Vypnout</a>';
    doc.body.insertBefore(b, doc.body.firstChild);
    html.classList.add('fa-demo');
  }

  /* ---------- Spuštění ---------- */
  FA.ready = [];
  function run(fn) { try { fn(); } catch (e) { if (window.console) console.error('[FA]', e); } }
  [demoBanner, renderConfig, renderBindings, renderCourseList, renderTermsTable, renderLecturers, renderFooterCourses,
    renderVideos, renderWebinarStrip, renderWebinarPage, renderReserveLinks, initHeader, initSticky, initReveal,
    initSpotlight, initScrollFx, initFaq, initTodos, courseJsonLd, breadcrumbJsonLd, faqJsonLd].forEach(run);
  doc.addEventListener('DOMContentLoaded', function () { run(initClickTracking); });
})();
