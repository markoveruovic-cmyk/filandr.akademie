/* FILANDR AKADEMIE: formuláře a prodejní systém (bez online plateb)
   Rezervace, objednávka na organizaci, poptávka, Project Office, čekací listina, webinář, kontakt.
   Odesílání: Web3Forms (fetch, JSON) nebo volitelný PHP adaptér. Děkovací stránka a .ics.
   Ověřené názvy polí Web3Forms (docs.web3forms.com, říjen 2026): access_key, subject, from_name,
   email (automaticky Reply-To), replyto (vlastní Reply-To), redirect (jen bez JS), botcheck (honeypot). */
(function () {
  'use strict';
  var FA = window.FA;
  if (!FA) return;
  var C = FA.C, D = FA.D, doc = document;
  var CF = C.formulare || {};
  var CR = C.rezervace || {};
  var LOADED = Date.now();
  var NBSP = '\u00a0';
  var W3F = 'https://api.web3forms.com/submit';
  var ARES = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/';

  /* ---------- UTM a identifikátory kampaní: uložit při prvním příchodu ---------- */
  (function () {
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
    var got = {};
    keys.forEach(function (k) { var v = FA.params.get(k); if (v) got[k] = v.slice(0, 200); });
    if (Object.keys(got).length && !FA.store.get('fa_utm')) FA.store.set('fa_utm', JSON.stringify(got));
    if (!FA.store.get('fa_landing')) FA.store.set('fa_landing', window.location.href.split('#')[0]);
  })();
  function utm() { try { return JSON.parse(FA.store.get('fa_utm')) || {}; } catch (e) { return {}; } }

  /* ---------- Validace ---------- */
  var MSG = {
    req: 'Vyplňte prosím toto pole.',
    select: 'Vyberte prosím jednu možnost.',
    email: 'Zadejte e-mail ve tvaru jmeno@domena.cz.',
    tel: 'Zadejte telefon, třeba +420 777 123 456.',
    ico: 'IČO má 8 číslic a musí projít kontrolním součtem. Zkontrolujte ho prosím.',
    psc: 'PSČ má 5 číslic, třeba 110 00.',
    vop: 'Pro odeslání rezervace je potřeba souhlas s obchodními podmínkami.',
    termin: 'Vyberte prosím termín.',
    pocet: 'Počet účastníků je 1 až ' + (CR.maxUcastniku || 30) + '.'
  };
  FA.validIco = function (v) {
    v = String(v || '').replace(/\s/g, '');
    if (!/^\d{8}$/.test(v)) return false;
    var s = 0;
    for (var i = 0; i < 7; i++) s += (+v.charAt(i)) * (8 - i);
    var r = s % 11;
    var c = r === 0 ? 1 : (r === 1 ? 0 : 11 - r);
    return c === +v.charAt(7);
  };
  FA.validEmail = function (v) { return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(String(v || '').trim()); };
  FA.validTel = function (v) {
    v = String(v || '').trim();
    var digits = v.replace(/\D/g, '');
    return /^\+?[\d\s()./-]+$/.test(v) && digits.length >= 9 && digits.length <= 15;
  };
  FA.validPsc = function (v) { return /^\d{3}\s?\d{2}$/.test(String(v || '').trim()); };

  function isHidden(el) { return !!el.closest('[hidden]') || el.disabled; }
  function errEl(el) { return el.id ? doc.getElementById(el.id + '-err') : null; }
  function setError(el, msg) {
    var e = errEl(el);
    if (msg) { el.setAttribute('aria-invalid', 'true'); if (e) e.textContent = msg; }
    else { el.removeAttribute('aria-invalid'); if (e) e.textContent = ''; }
  }
  function isRequired(el, form) {
    if (el.hasAttribute('data-req') || el.hasAttribute('data-req-check') || el.getAttribute('data-req-dyn') === '1') return true;
    var org = form._payer && form._payer() === 'organizace';
    if (el.hasAttribute('data-req-org')) return org;
    if (el.hasAttribute('data-req-indiv-opt')) return !org && CR.adresaJednotlivecPovinna === true;
    return false;
  }
  function checkField(el, form) {
    if (isHidden(el)) { setError(el, ''); return true; }
    var v = el.type === 'checkbox' ? el.checked : String(el.value || '').trim();
    var req = isRequired(el, form);
    var msg = '';
    if (req && !v) {
      msg = el.type === 'checkbox' ? MSG.vop : (el.tagName === 'SELECT' ? (el.getAttribute('data-k') === 'terminSelect' ? MSG.termin : MSG.select) : MSG.req);
    } else if (v && el.type !== 'checkbox') {
      var t = el.getAttribute('data-v');
      if (t === 'email' && !FA.validEmail(v)) msg = MSG.email;
      else if (t === 'tel' && !FA.validTel(v)) msg = MSG.tel;
      else if (t === 'ico' && !FA.validIco(v)) msg = MSG.ico;
      else if (t === 'psc' && !FA.validPsc(v)) msg = MSG.psc;
    }
    setError(el, msg);
    return !msg;
  }
  function fieldsOf(form) {
    return Array.prototype.slice.call(form.querySelectorAll('input:not([type="hidden"]):not([name="botcheck"]), select, textarea'))
      .filter(function (el) { return el.type !== 'radio' && !el.closest('.fa-hp'); });
  }
  function validateForm(form) {
    var first = null;
    fieldsOf(form).forEach(function (el) { if (!checkField(el, form) && !first) first = el; });
    if (form._extraValidate) { var x = form._extraValidate(); if (x && !first) first = x; }
    return first;
  }
  function bindValidation(form) {
    form.addEventListener('focusout', function (e) {
      var el = e.target;
      if (!el.matches || !el.matches('input, select, textarea') || el.type === 'radio' || el.type === 'hidden') return;
      if (el.type === 'checkbox' && !el.hasAttribute('data-req-check')) return;
      checkField(el, form);
    });
    form.addEventListener('input', function (e) {
      var el = e.target;
      if (el.getAttribute && el.getAttribute('aria-invalid') === 'true') checkField(el, form);
    });
    form.addEventListener('change', function (e) {
      var el = e.target;
      if (el.type === 'checkbox' && el.hasAttribute('data-req-check')) checkField(el, form);
      if (el.tagName === 'SELECT' && el.getAttribute('aria-invalid') === 'true') checkField(el, form);
    });
  }

  /* ---------- Odeslání ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function genNumber(prefix) {
    var d = new Date();
    return prefix + '-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + String(Math.floor(1000 + Math.random() * 9000));
  }
  var PREFIX = { rezervace: 'R', poptavka: 'P', projectoffice: 'O', cekaci: 'C', webinar: 'W', kontakt: 'K' };
  function nowText() {
    var d = new Date();
    return FA.fmtDate(d) + ' ' + d.getHours() + ':' + pad(d.getMinutes());
  }
  function contactLine() {
    return FA.isTodo(C.email) ? 'nám napište e-mailem' : 'nám napište na ' + C.email;
  }
  function metaFields(o) {
    var u = utm();
    o['Stránka'] = window.location.href.split('#')[0];
    var land = FA.store.get('fa_landing');
    if (land && land !== o['Stránka']) o['Vstupní stránka'] = land;
    var utmText = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
      .map(function (k) { return u[k] ? k.replace('utm_', '') + ': ' + u[k] : ''; }).filter(Boolean).join(' | ');
    if (utmText) o['UTM'] = utmText;
    if (u.gclid) o['gclid'] = u.gclid;
    if (u.fbclid) o['fbclid'] = u.fbclid;
    o['Odesláno'] = nowText();
    return o;
  }
  function stripEmpty(o) {
    var r = {};
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if (v === undefined || v === null || v === '' || v === false) return;
      r[k] = typeof v === 'string' ? FA.plain(v) : v;
    });
    return r;
  }

  FA.odeslatFormular = function (typ, data) {
    var key = CF.web3formsKey;
    var provider = CF.provider || 'web3forms';
    if (provider === 'web3forms' && FA.isTodo(key) && C.staging) {
      if (window.console) console.warn('[FA formuláře] Chybí Access Key Web3Forms, odeslání je jen simulované (staging).', data);
      return new Promise(function (res) { setTimeout(function () { res({ success: true, simulated: true }); }, 500); });
    }
    var url = provider === 'php' ? FA.url(CF.phpEndpoint || 'api/odeslat.php') : W3F;
    var body = provider === 'php' ? Object.assign({ _typ: typ, _vyplneno_ms: Date.now() - LOADED }, data) : data;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (res.status === 429) { var e = new Error('rate'); e.code = 429; throw e; }
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (res.ok && j && j.success) return j;
        var err = new Error((j && j.message) || 'chyba'); err.code = res.status; throw err;
      });
    }, function () { var e = new Error('network'); e.code = 'network'; throw e; });
  };

  function errorText(err) {
    if (err && err.code === 429) return 'Zkuste to prosím za chvíli. Formulář teď přijal příliš mnoho požadavků.';
    var mail = FA.isTodo(C.email) ? '' : ' na ' + C.email;
    return 'Odeslání se nepodařilo' + (err && err.code === 'network' ? ' (problém se spojením)' : '') + '. Vyplněné údaje zůstaly ve formuláři. Zkuste to prosím znovu, nebo nám napište' + mail + '.';
  }

  var hcaptchaLoading = null;
  function ensureHcaptcha(form) {
    if (!CF.hcaptcha) return;
    var box = form.querySelector('.fa-hcaptcha');
    if (!box) {
      box = doc.createElement('div');
      box.className = 'fa-hcaptcha';
      var sub = form.querySelector('.fa-submit');
      sub.insertBefore(box, sub.firstChild);
    }
    if (!hcaptchaLoading) {
      hcaptchaLoading = new Promise(function (res) {
        window.faHcaptchaReady = res;
        var s = doc.createElement('script');
        s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off&hl=cs&onload=faHcaptchaReady';
        s.async = true; s.defer = true;
        doc.head.appendChild(s);
      });
    }
    hcaptchaLoading.then(function () {
      if (box.getAttribute('data-rendered')) return;
      box.setAttribute('data-rendered', '1');
      form._hcaptchaId = window.hcaptcha.render(box, { sitekey: CF.hcaptchaSitekey });
    });
  }
  function hcaptchaToken(form) {
    if (!CF.hcaptcha || !window.hcaptcha || form._hcaptchaId == null) return null;
    return window.hcaptcha.getResponse(form._hcaptchaId) || '';
  }

  /* Společný průběh odeslání pro všechny formuláře */
  function submitFlow(form, typ, buildPayload, summary) {
    var statusEl = form.querySelector('[data-k="status"]');
    var btn = form.querySelector('[data-k="submit"]') || form.querySelector('[type="submit"]');
    statusEl.className = 'fa-form-status';
    statusEl.textContent = '';
    var bad = validateForm(form);
    if (bad) {
      statusEl.textContent = 'Zkontrolujte prosím zvýrazněná pole.';
      bad.focus();
      if (bad.scrollIntoView) bad.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (Date.now() - LOADED < 3000) {
      statusEl.textContent = 'Moment, formulář se ještě připravuje. Klikněte prosím znovu.';
      return;
    }
    var hp = form.querySelector('[name="botcheck"]');
    var cislo = genNumber(PREFIX[typ] || 'F');
    var thanksUrl = FA.url('dekujeme/odeslano/?typ=' + typ + '&c=' + encodeURIComponent(cislo));
    if (hp && hp.checked) { window.location.href = thanksUrl; return; } // robot: tváříme se, že je hotovo

    var token = hcaptchaToken(form);
    if (CF.hcaptcha && token === '') { statusEl.textContent = 'Potvrďte prosím, že nejste robot.'; return; }

    var built = buildPayload(cislo);
    var email = built.email;
    var payload = Object.assign({
      access_key: CF.web3formsKey,
      subject: built.subject,
      from_name: CF.fromName || 'Web FILANDR AKADEMIE',
      replyto: email,
      botcheck: false
    }, stripEmpty(metaFields(built.fields)));
    if (token) payload['h-captcha-response'] = token;

    btn.disabled = true;
    btn.classList.add('is-loading');
    var label = btn.textContent;
    btn.textContent = 'Odesílám…';
    FA.odeslatFormular(typ, payload).then(function (res) {
      var sum = Object.assign({ cislo: cislo, typ: typ, simulated: !!res.simulated, cas: Date.now() }, summary ? summary(cislo) : {});
      FA.store.set('fa_last_' + typ, JSON.stringify(sum));
      FA.store.set('fa_pending_conv', JSON.stringify({ c: cislo, typ: typ, value: sum.celkem || null, platce: sum.platce || null, kurz: sum.kurzSlug || null }));
      window.location.href = thanksUrl;
    }).catch(function (err) {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.textContent = label;
      statusEl.textContent = errorText(err);
      statusEl.focus && statusEl.setAttribute('tabindex', '-1');
      statusEl.focus();
      if (window.grecaptcha === undefined && window.hcaptcha && form._hcaptchaId != null) window.hcaptcha.reset(form._hcaptchaId);
    });
  }

  function q(form, k) { return form.querySelector('[data-k="' + k + '"]'); }
  function val(form, k) { var el = q(form, k); return el ? String(el.value || '').trim() : ''; }

  /* ---------- ARES ---------- */
  function fetchJson(url, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 6000) : null;
    return fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined }).then(function (r) {
      if (t) clearTimeout(t);
      if (r.status === 404) { var e = new Error('nenalezeno'); e.code = 404; throw e; }
      if (!r.ok) throw new Error('chyba');
      return r.json();
    });
  }
  function parseAres(j) {
    var s = j.sidlo || {};
    var ulice = s.nazevUlice || s.nazevCastiObce || s.nazevObce || '';
    var cislo = s.cisloDomovni ? String(s.cisloDomovni) + (s.cisloOrientacni ? '/' + s.cisloOrientacni + (s.cisloOrientacniPismeno || '') : '') : '';
    var psc = s.psc ? String(s.psc).padStart(5, '0').replace(/^(\d{3})(\d{2})$/, '$1 $2') : '';
    return {
      nazev: j.obchodniJmeno || '',
      ulice: [ulice, cislo].filter(Boolean).join(' '),
      mesto: s.nazevMestskehoObvodu || s.nazevObce || '',
      psc: psc,
      dic: j.dic || ''
    };
  }
  FA.aresLookup = function (ico) {
    return fetchJson(ARES + ico, 6000).catch(function (e) {
      if (e && e.code === 404) throw e;
      if (CF.provider === 'php' && CF.aresProxy) return fetchJson(FA.url(CF.aresProxy) + '?ico=' + ico, 6000);
      throw e;
    }).then(parseAres);
  };
  function bindAres(form) {
    var ico = form.querySelector('[data-ares]');
    if (!ico) return;
    var status = q(form, 'aresStatus');
    var defaultHint = status ? status.textContent : '';
    var last = '';
    function run() {
      var v = ico.value.replace(/\s/g, '');
      if (v === last || !FA.validIco(v)) return;
      last = v;
      if (status) status.textContent = 'Načítám údaje z ARES…';
      FA.aresLookup(v).then(function (d) {
        form.querySelectorAll('[data-ares-f]').forEach(function (el) {
          var f = el.getAttribute('data-ares-f');
          if (!d[f]) return;
          if (!el.value || el.getAttribute('data-ares-filled') === '1') {
            el.value = d[f];
            el.setAttribute('data-ares-filled', '1');
            if (el.getAttribute('aria-invalid') === 'true') checkField(el, form);
          }
        });
        if (status) status.textContent = 'Údaje jsme načetli z ARES. Zkontrolujte je prosím, můžete je upravit.';
        form.dispatchEvent(new Event('change', { bubbles: true }));
      }).catch(function (e) {
        if (status) status.textContent = e && e.code === 404 ? 'Toto IČO jsme v ARES nenašli. Vyplňte prosím údaje ručně.' : defaultHint;
      });
    }
    ico.addEventListener('input', function () { if (ico.value.replace(/\s/g, '').length === 8) run(); });
    ico.addEventListener('change', run);
    form.querySelectorAll('[data-ares-f]').forEach(function (el) {
      el.addEventListener('input', function () { el.removeAttribute('data-ares-filled'); });
    });
  }

  /* ---------- Rezervační formulář (.fa-booking) ---------- */
  function initBooking(form) {
    var mode = form.getAttribute('data-mode') || 'course';
    var max = CR.maxUcastniku || 30;
    var st = { kurz: null, termin: null, fmailTouched: false };
    form._state = st;
    form.querySelectorAll('[data-show-mode]').forEach(function (el) { el.hidden = el.getAttribute('data-show-mode') !== mode; });

    var pocet = q(form, 'pocet');
    pocet.max = max;
    var splat = q(form, 'oSplat');
    if (splat && CR.splatnostOrganizaceMoznosti && CR.splatnostOrganizaceMoznosti.length) {
      splat.innerHTML = CR.splatnostOrganizaceMoznosti.map(function (d) { return '<option>' + d + NBSP + 'dní</option>'; }).join('');
    }

    function payer() {
      var r = form.querySelector('[data-k="platce"]:checked');
      return r && r.value === 'Organizace' ? 'organizace' : 'jednotlivec';
    }
    form._payer = payer;
    form._setPayer = function (p) {
      form.querySelectorAll('[data-k="platce"]').forEach(function (r) { r.checked = (p === 'organizace') === (r.value === 'Organizace'); });
      update();
    };
    function count() {
      var n = parseInt(pocet.value, 10);
      if (!(n >= 1)) n = 1;
      if (n > max) n = max;
      return n;
    }

    /* Účastníci */
    var pWrap = q(form, 'participants');
    var selfCb = q(form, 'self'), laterCb = q(form, 'later');
    function participantValues() {
      return Array.prototype.map.call(pWrap.querySelectorAll('.fa-participant'), function (row) {
        return { jmeno: row.querySelector('[data-p="jmeno"]').value, email: row.querySelector('[data-p="email"]').value };
      });
    }
    function renderParticipants() {
      var org = payer() === 'organizace', n = count();
      var block = q(form, 'ucastniciBlock');
      block.hidden = !(org || n > 1);
      q(form, 'selfWrap').hidden = org;
      q(form, 'laterWrap').hidden = !org;
      var rows = block.hidden ? 0 : (org ? n : (selfCb.checked ? n - 1 : n));
      var start = (!org && selfCb.checked) ? 2 : 1;
      var keep = participantValues();
      var req = !(org && laterCb.checked);
      var id = form.id;
      var htmlStr = '';
      for (var i = 0; i < rows; i++) {
        var num = start + i, k = keep[i] || { jmeno: '', email: '' };
        htmlStr += '<div class="fa-participant"><span class="fa-participant__n" aria-hidden="true">' + num + '.</span>' +
          '<div class="fa-field"><label class="fa-label" for="' + id + '-p' + num + '-j">Účastník ' + num + ': jméno a příjmení' + (req ? '<span class="fa-req" aria-hidden="true">*</span><span class="fa-sr"> (povinné)</span>' : '') + '</label>' +
          '<input class="fa-input" id="' + id + '-p' + num + '-j" data-p="jmeno" data-req-dyn="' + (req ? 1 : 0) + '" type="text" autocomplete="off" value="' + FA.h(k.jmeno) + '" aria-describedby="' + id + '-p' + num + '-j-err"><p class="fa-err" id="' + id + '-p' + num + '-j-err"></p></div>' +
          '<div class="fa-field"><label class="fa-label" for="' + id + '-p' + num + '-e">E-mail' + (req ? '<span class="fa-req" aria-hidden="true">*</span><span class="fa-sr"> (povinné)</span>' : '') + '</label>' +
          '<input class="fa-input" id="' + id + '-p' + num + '-e" data-p="email" data-v="email" data-req-dyn="' + (req ? 1 : 0) + '" type="email" inputmode="email" autocomplete="off" value="' + FA.h(k.email) + '" aria-describedby="' + id + '-p' + num + '-e-err"><p class="fa-err" id="' + id + '-p' + num + '-e-err"></p></div>' +
        '</div>';
      }
      pWrap.innerHTML = htmlStr;
    }

    /* Stepper */
    function syncStepper() {
      var n = count();
      q(form, 'minus').disabled = n <= 1;
      q(form, 'plus').disabled = n >= max;
    }
    q(form, 'minus').addEventListener('click', function () { pocet.value = Math.max(1, count() - 1); update(); });
    q(form, 'plus').addEventListener('click', function () { pocet.value = Math.min(max, count() + 1); update(); });
    pocet.addEventListener('change', function () { pocet.value = count(); update(); });
    pocet.addEventListener('input', function () { if (pocet.value !== '') update(); });

    /* E-mail pro fakturu se předvyplní kontaktním */
    var mail = q(form, 'email'), fmail = q(form, 'oFmail');
    mail.addEventListener('input', function () { if (!st.fmailTouched) fmail.value = mail.value; });
    fmail.addEventListener('input', function () { st.fmailTouched = fmail.value !== mail.value; });

    form.addEventListener('change', function (e) {
      if (e.target.matches('[data-k="platce"], [data-k="self"], [data-k="later"]')) update();
    });

    /* Shrnutí */
    function summaryHTML() {
      var k = st.kurz, t = st.termin;
      var n = count();
      var p = k ? FA.pricing(k, t) : null;
      var per = p && p.known ? p.current : null;
      var rows = [];
      rows.push(['Termín', t && t.datum ? FA.fmtDate(FA.parseDate(t.datum), true) + (FA.timeText(t) ? ', ' + FA.h(FA.timeText(t)) : '') : 'vyberte termín']);
      if (t) rows.push(['Místo', FA.placeHTML(t)]);
      rows.push(['Účastníci', n + NBSP + FA.plural(n, 'osoba', 'osoby', 'osob')]);
      rows.push(['Cena za osobu', per != null ? FA.fmtPrice(per) + (p.ebActive && p.earlyBird != null ? ' (early bird)' : '') : 'upřesníme']);
      rows.push(['Plátce', payer() === 'organizace' ? 'organizace, faktura' : 'jednotlivec']);
      return '<p class="fa-summary__title">Shrnutí rezervace</p>' +
        '<p class="fa-summary__course">' + (k ? FA.h(k.nazev) : 'Vyberte kurz') + '</p>' +
        '<dl>' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
        '<div class="fa-summary__total"><span>Celkem</span><strong>' + (per != null ? FA.fmtPrice(per * n) : 'upřesníme') + '</strong></div>' +
        '<p class="fa-summary__note">' + FA.vatNote() + ' Platba převodem na základě faktury, kterou vám pošleme e-mailem.</p>';
    }
    function update() {
      var org = payer() === 'organizace';
      q(form, 'billIndiv').hidden = org;
      q(form, 'billOrg').hidden = !org;
      if (org && !fmail.value) fmail.value = mail.value;
      renderParticipants();
      syncStepper();
      var n = 0;
      form.querySelectorAll('.fa-legend__n').forEach(function (el) { if (!el.closest('[hidden]')) el.textContent = String(++n); });
      var s = summaryHTML();
      var a = q(form, 'summary'), b = q(form, 'summaryMobile');
      if (a) a.innerHTML = s;
      if (b) b.innerHTML = s;
    }
    form._update = update;

    /* Výběr termínu */
    form._setTerm = function (kurz, termin) {
      st.kurz = kurz; st.termin = termin;
      var picked = q(form, 'pickedText');
      if (picked && kurz && termin) {
        var d = FA.parseDate(termin.datum);
        picked.innerHTML = FA.h(kurz.nazev) + ': ' + (d ? FA.fmtDate(d, true) : 'termín upřesníme') + (FA.timeText(termin) ? ', ' + FA.h(FA.timeText(termin)) : '') +
          '<span>' + FA.placeHTML(termin) + ' · ' + FA.formatLabel(termin) + '</span>';
      }
      update();
    };

    /* Samostatná stránka: výběr kurzu a termínu */
    if (mode === 'standalone') {
      var selK = q(form, 'kurzSelect'), selT = q(form, 'terminSelect'), hint = q(form, 'terminHint');
      selK.setAttribute('data-req', '');
      selT.setAttribute('data-req', '');
      selK.innerHTML = '<option value="">Vyberte kurz</option>' + D.kurzy.map(function (k) { return '<option value="' + FA.h(k.slug) + '">' + FA.h(k.nazev) + '</option>'; }).join('');
      var fillTerms = function (preferId) {
        var k = FA.kurz(selK.value);
        var ts = k ? FA.terms(k).filter(FA.isBookable) : [];
        if (!k) {
          selT.innerHTML = '<option value="">Nejdřív vyberte kurz</option>';
          hint.hidden = true;
        } else if (!ts.length) {
          selT.innerHTML = '<option value="">Termín zatím není vypsaný</option>';
          hint.hidden = false;
          hint.innerHTML = 'Otevřený termín kurzu ' + FA.h(k.nazev) + ' zatím nemáme vypsaný. <a class="fa-link" href="' + FA.url(k.url) + '#rezervace">Nechte nám kontakt</a>, nebo <a class="fa-link" href="' + FA.url('pro-organizace/#poptavka') + '">poptejte školení přímo pro vaši organizaci</a>.';
        } else {
          hint.hidden = true;
          selT.innerHTML = (ts.length > 1 ? '<option value="">Vyberte termín</option>' : '') + ts.map(function (t) {
            return '<option value="' + FA.h(t.id) + '">' + FA.h(FA.termLabel(t)) + '</option>';
          }).join('');
          if (preferId && ts.some(function (t) { return t.id === preferId; })) selT.value = preferId;
        }
        var f = selT.value ? FA.findTerm(selT.value) : null;
        form._setTerm(k, f ? f.termin : null);
      };
      selK.addEventListener('change', function () { fillTerms(); checkField(selK, form); });
      selT.addEventListener('change', function () {
        var f = selT.value ? FA.findTerm(selT.value) : null;
        form._setTerm(FA.kurz(selK.value), f ? f.termin : null);
        if (f && FA.track) FA.track('begin_checkout', { kurz: selK.value, termin: selT.value });
      });
      var pk = FA.params.get('kurz'), pt = FA.params.get('termin');
      if (pt && !pk) { var ff = FA.findTerm(pt); if (ff) pk = ff.kurz.slug; }
      if (pk && FA.kurz(pk)) selK.value = pk;
      else {
        var withOpen = D.kurzy.filter(function (k) { return FA.nextOpen(k); })[0] || D.kurzy[0];
        if (withOpen) selK.value = withOpen.slug;
      }
      fillTerms(pt);
      var pp = FA.params.get('platce');
      form._setPayer(pp === 'jednotlivec' ? 'jednotlivec' : 'organizace');
    } else {
      var pp2 = FA.params.get('platce');
      if (pp2 === 'organizace') form._setPayer('organizace');
    }

    form._extraValidate = function () {
      if (mode === 'course' && (!st.termin || !FA.isBookable(st.termin))) {
        var stat = q(form, 'status');
        var first = doc.querySelector('[data-fa-terms] input');
        if (stat) stat.textContent = MSG.termin;
        return first || pocet;
      }
      var n = parseInt(pocet.value, 10);
      if (!(n >= 1 && n <= max)) { setError(pocet, MSG.pocet); return pocet; }
      setError(pocet, '');
      return null;
    };

    bindValidation(form);
    bindAres(form);
    update();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitFlow(form, 'rezervace', function (cislo) {
        var k = st.kurz, t = st.termin, n = count();
        var p = FA.pricing(k, t);
        var per = p.current;
        var org = payer() === 'organizace';
        var d = FA.parseDate(t.datum);
        var where = t.format === 'online' ? 'Online' : (t.mesto || FA.placeText(t));
        var orgName = val(form, 'oNazev');
        var who = org ? orgName : val(form, 'jmeno');
        var subject = ['REZERVACE', k.nazev, where + ' ' + FA.fmtDate(d), n + ' os.', org ? 'ORGANIZACE' : 'JEDNOTLIVEC', who, cislo].join(' | ');
        var lines = [];
        if (!org && selCbChecked()) lines.push('1. ' + val(form, 'jmeno') + ', ' + val(form, 'email') + ' (kontaktní osoba)');
        pWrap.querySelectorAll('.fa-participant').forEach(function (row) {
          var j = row.querySelector('[data-p="jmeno"]').value.trim(), m = row.querySelector('[data-p="email"]').value.trim();
          var num = row.querySelector('.fa-participant__n').textContent.trim();
          if (j || m) lines.push(num + ' ' + [j, m].filter(Boolean).join(', '));
        });
        if (org && laterCb.checked) lines.push('Jména účastníků doplníme později');
        if (n === 1 && !org && !lines.length) lines.push('1. ' + val(form, 'jmeno') + ' (kontaktní osoba)');
        var f = {};
        f['Číslo rezervace'] = cislo;
        f['Kurz'] = k.nazev + (k.podnazev ? ': ' + k.podnazev : '');
        f['Termín'] = FA.fmtDate(d) + (FA.timeText(t) ? ', ' + FA.timeText(t) : '');
        f['Místo'] = FA.placeText(t) + ' (' + FA.formatLabel(t) + ')';
        f['Plátce'] = org ? 'Organizace, požaduje fakturu' : 'Jednotlivec, faktura na jméno';
        f['Počet účastníků'] = String(n);
        f['Cena za osobu'] = FA.fmtPrice(per, false) + (p.ebActive && p.earlyBird != null ? ' (early bird)' : ' (standard)');
        f['Celkem'] = FA.fmtPrice(per * n, false) + ' (' + FA.vatNotePlain() + ')';
        f['Jméno'] = val(form, 'jmeno');
        f['email'] = val(form, 'email');
        f['Telefon'] = val(form, 'telefon');
        f['Účastníci'] = lines.join('\n');
        if (org) {
          f['Organizace'] = orgName;
          f['Typ organizace'] = val(form, 'oTyp');
          f['IČO'] = val(form, 'oIco').replace(/\s/g, '');
          f['DIČ'] = val(form, 'oDic');
          f['Fakturační adresa'] = [val(form, 'oUlice'), [val(form, 'oPsc'), val(form, 'oMesto')].filter(Boolean).join(' ')].filter(Boolean).join(', ');
          f['E-mail pro fakturu'] = val(form, 'oFmail');
          f['Číslo objednávky'] = val(form, 'oObj');
          f['Splatnost'] = val(form, 'oSplat');
          f['Poznámka k fakturaci'] = val(form, 'oPozn');
        } else {
          f['Fakturační adresa'] = [val(form, 'iUlice'), [val(form, 'iPsc'), val(form, 'iMesto')].filter(Boolean).join(' ')].filter(Boolean).join(', ');
        }
        f['Poznámka'] = val(form, 'poznamka');
        f['Newsletter'] = q(form, 'newsletter').checked ? 'Ano, chce informace o nových kurzech' : 'Ne';
        return { subject: subject, email: val(form, 'email'), fields: f };
      }, function () {
        var k = st.kurz, t = st.termin, n = count(), p = FA.pricing(k, t);
        return {
          kurz: k.nazev, kurzSlug: k.slug, kurzUrl: k.url, terminId: t.id,
          datum: t.datum, casOd: t.casOd || '', casDo: t.casDo || '', format: t.format,
          misto: FA.placeText(t), pocet: n, cenaOsoba: p.current, celkem: p.current * n,
          earlyBird: !!(p.ebActive && p.earlyBird != null),
          platce: payer(), organizace: payer() === 'organizace' ? val(form, 'oNazev') : '',
          email: val(form, 'email'), jmeno: val(form, 'jmeno')
        };
      });
    });
    function selCbChecked() { return selfCb && selfCb.checked && count() > 1; }
  }

  /* ---------- Sekce termínů a rezervace na stránce kurzu ---------- */
  function initReservation(section) {
    var slug = section.getAttribute('data-kurz');
    var kurz = FA.kurz(slug);
    if (!kurz) return;
    var list = section.querySelector('[data-fa-terms]');
    var bookWrap = section.querySelector('[data-fa-booking-wrap]');
    var waitWrap = section.querySelector('[data-fa-waitlist-wrap]');
    var bookForm = bookWrap ? bookWrap.querySelector('form[data-fa-form="rezervace"]') : null;
    var waitForm = waitWrap ? waitWrap.querySelector('form') : null;
    var bookTitle = section.querySelector('[data-fa-booking-title]');
    var waitTitle = section.querySelector('[data-fa-waitlist-title]');
    var waitText = section.querySelector('[data-fa-waitlist-text]');
    var hintEl = section.querySelector('[data-fa-terms-hint]');
    var terms = FA.terms(kurz);
    var wantOrg = false;

    if (!terms.length) {
      list.innerHTML = '<div class="fa-terms-empty"><p class="fa-terms-empty__title">Termín otevřeného kurzu: připravujeme</p><p>Nechte nám kontakt a dáme vám vědět, jakmile termín vypíšeme. Školení pro vaši organizaci připravíme i mimo vypsané termíny.</p></div>';
      if (bookWrap) bookWrap.hidden = true;
      showWait(null);
      return;
    }
    list.innerHTML = terms.map(function (t) { return FA.termCardHTML(kurz, t, 'termin-' + slug); }).join('');
    if (bookWrap) bookWrap.hidden = true;

    function showWait(t) {
      if (!waitWrap || !waitForm) return;
      waitWrap.hidden = false;
      var sold = t && FA.termState(t) === 'vyprodano';
      var btn = waitForm.querySelector('[data-k="submit"]');
      var where = t ? FA.termShort(t) : '';
      if (waitTitle) waitTitle.textContent = t ? (sold ? 'Čekací listina: ' + FA.plain(where) : 'Chci vědět o termínu: ' + FA.plain(where)) : 'Chci vědět o termínu';
      if (waitText) waitText.textContent = sold
        ? 'Tento termín je obsazený. Zapíšeme vás na čekací listinu a ozveme se, jakmile se místo uvolní nebo vypíšeme další termín.'
        : 'Termín zatím upřesňujeme. Nechte nám kontakt a dáme vám vědět jako prvním.';
      if (btn) btn.textContent = sold ? 'Chci na čekací listinu' : 'Chci vědět o termínu';
      var tt = waitForm.querySelector('[data-k="terminText"]');
      if (tt) tt.value = t ? FA.termLabel(t) + ' (' + FA.placeText(t) + ')' : 'zatím bez termínu';
      waitForm.setAttribute('data-termin', t ? t.id : '');
    }
    function select(id, scroll) {
      var t = null;
      terms.forEach(function (x) { if (x.id === id) t = x; });
      if (!t) return;
      var input = list.querySelector('input[value="' + id + '"]');
      if (input) input.checked = true;
      if (hintEl) hintEl.hidden = true;
      if (history.replaceState) history.replaceState(null, '', '#rezervace-' + id);
      if (FA.isBookable(t)) {
        if (waitWrap) waitWrap.hidden = true;
        if (bookWrap) bookWrap.hidden = false;
        if (bookTitle) bookTitle.textContent = 'Rezervace: ' + FA.plain(FA.termShort(t));
        if (bookForm && bookForm._setTerm) {
          bookForm._setTerm(kurz, t);
          if (wantOrg && bookForm._setPayer) bookForm._setPayer('organizace');
        }
        if (FA.track) FA.track('begin_checkout', { kurz: slug, termin: id });
        if (scroll && bookWrap) setTimeout(function () { bookWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
      } else {
        if (bookWrap) bookWrap.hidden = true;
        showWait(t);
        if (scroll && waitWrap) setTimeout(function () { waitWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
      }
    }
    list.addEventListener('change', function (e) {
      if (e.target.matches('.fa-term__input')) select(e.target.value, false);
    });
    // Klik myší na kartu: po výběru plynule k formuláři
    list.addEventListener('click', function (e) {
      var lab = e.target.closest('.fa-term');
      if (!lab || e.detail === 0) return;
      var id = lab.getAttribute('data-term');
      setTimeout(function () { select(id, true); }, 0);
    });

    /* Změnit termín */
    if (bookForm) {
      var ch = bookForm.querySelector('[data-k="changeTerm"]');
      if (ch) ch.addEventListener('click', function () {
        list.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var c = list.querySelector('input:checked') || list.querySelector('input');
        if (c) c.focus({ preventScroll: true });
      });
    }

    /* Odkazy „Objednávám na organizaci, požaduji fakturu.“ na této stránce */
    doc.querySelectorAll('[data-fa-org-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        wantOrg = true;
        var checked = list.querySelector('input:checked');
        if (bookForm && bookForm._setPayer) bookForm._setPayer('organizace');
        if (checked && !bookWrap.hidden) {
          bookWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
          var r = bookForm.querySelector('[data-k="platce"][value="Organizace"]');
          if (r) setTimeout(function () { r.focus({ preventScroll: true }); }, 400);
        } else {
          if (hintEl) { hintEl.hidden = false; hintEl.textContent = 'Nejdřív vyberte termín. Formulář s předvolenou objednávkou na organizaci se ukáže hned pod ním.'; }
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          var f = list.querySelector('input');
          if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 400);
        }
      });
    });

    /* Předvýběr: z adresy (#rezervace-id nebo ?termin=), jinak jediný termín */
    function fromHash() {
      var m = /^#rezervace-(.+)$/.exec(window.location.hash);
      return m ? decodeURIComponent(m[1]) : null;
    }
    var pre = fromHash() || FA.params.get('termin');
    if (FA.params.get('platce') === 'organizace') wantOrg = true;
    if (pre && terms.some(function (t) { return t.id === pre; })) {
      select(pre, false);
      if (fromHash()) setTimeout(function () { section.scrollIntoView({ block: 'start' }); }, 50);
    } else if (terms.length === 1) select(terms[0].id, false);
    window.addEventListener('hashchange', function () {
      var h = fromHash();
      if (h) select(h, true);
    });
  }

  /* ---------- Obecné formuláře ---------- */
  var SUBJECT = {
    poptavka: function (f, c) { return ['POPTÁVKA ŠKOLENÍ', f['Organizace'], f['Typ organizace'], f['Odhad počtu účastníků'] ? f['Odhad počtu účastníků'] + ' os.' : '', c]; },
    projectoffice: function (f, c) { return ['PROJECT OFFICE', f['Organizace'], f['Typ organizace'], c]; },
    cekaci: function (f, c) { return ['ČEKACÍ LISTINA', f['Kurz'] || 'web', f['Termín'] || 'bez termínu', f['Jméno a příjmení'], c]; },
    webinar: function (f, c) { return ['WEBINÁŘ', f['Webinář'] || 'webinář', f['Jméno a příjmení'], c]; },
    kontakt: function (f, c) { return ['KONTAKT', f['Jméno a příjmení'], c]; }
  };
  var CISLO_LABEL = { poptavka: 'Číslo poptávky', projectoffice: 'Číslo poptávky', cekaci: 'Číslo zápisu', webinar: 'Číslo registrace', kontakt: 'Číslo zprávy' };
  var SKIP = { access_key: 1, redirect: 1, subject: 1, from_name: 1, botcheck: 1, 'Typ formuláře': 1 };

  function collect(form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || SKIP[el.name] || el.disabled || isHidden(el) && el.type !== 'hidden') return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      var v = String(el.value || '').trim();
      if (!v) return;
      out[el.name] = out[el.name] ? out[el.name] + ', ' + v : v;
    });
    return out;
  }
  function initGeneric(form) {
    var typ = form.getAttribute('data-fa-form');
    bindValidation(form);
    bindAres(form);
    if (typ === 'cekaci') {
      var slug = form.getAttribute('data-kurz');
      var o = slug ? FA.offer(slug) : null;
      var kn = form.querySelector('[data-k="kurzNazev"]');
      if (o && kn && !kn.value) kn.value = o.nazev;
    }
    if (typ === 'webinar') {
      var w = D.webinar || {}, wd = FA.parseDate(w.datum);
      var wt = form.querySelector('[data-k="webinarText"]');
      if (wt) wt.value = [FA.isTodo(w.nazev) ? 'Webinář' : w.nazev, wd ? FA.fmtDate(wd) : '', w.casOd || ''].filter(Boolean).join(', ');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitFlow(form, typ, function (cislo) {
        var raw = collect(form);
        var f = {};
        f[CISLO_LABEL[typ] || 'Číslo'] = cislo;
        Object.keys(raw).forEach(function (k) { f[k] = raw[k]; });
        var subj = (SUBJECT[typ] || SUBJECT.kontakt)(raw, cislo).filter(Boolean).join(' | ');
        return { subject: subj, email: raw.email || '', fields: f };
      }, function () {
        var raw = collect(form);
        var s = { jmeno: raw['Jméno a příjmení'] || raw['Kontaktní osoba'] || '', email: raw.email || '' };
        if (typ === 'cekaci') { s.kurz = raw['Kurz'] || ''; s.termin = raw['Termín'] || ''; s.kurzSlug = form.getAttribute('data-kurz') || ''; }
        if (typ === 'poptavka' || typ === 'projectoffice') s.organizace = raw['Organizace'] || '';
        return s;
      });
    });
  }

  /* ---------- .ics (uložení do kalendáře) ---------- */
  function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsFold(line) {
    var out = [], cur = '';
    Array.from(line).forEach(function (ch) {
      if (unescape(encodeURIComponent(cur + ch)).length > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch;
    });
    out.push(cur);
    return out.join('\r\n');
  }
  function icsTime(date, time) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(time || '');
    return date.replace(/-/g, '') + 'T' + (m ? pad(m[1]) + m[2] : '0900') + '00';
  }
  FA.buildIcs = function (ev) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FILANDR AKADEMIE//Web//CS', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE', 'TZID:Europe/Prague',
      'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
      'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:' + ev.uid + '@filandr-akademie',
      'DTSTAMP:' + stamp,
      'DTSTART;TZID=Europe/Prague:' + icsTime(ev.date, ev.start),
      'DTEND;TZID=Europe/Prague:' + icsTime(ev.date, ev.end || ev.start),
      'SUMMARY:' + icsEscape(ev.title),
      'LOCATION:' + icsEscape(ev.location),
      'DESCRIPTION:' + icsEscape(ev.description),
      ev.url ? 'URL:' + ev.url : '',
      'END:VEVENT', 'END:VCALENDAR'
    ].filter(Boolean);
    return lines.map(icsFold).join('\r\n') + '\r\n';
  };
  FA.downloadIcs = function (ev, filename) {
    var blob = new Blob([FA.buildIcs(ev)], { type: 'text/calendar;charset=utf-8' });
    var a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'filandr-akademie.ics';
    doc.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };

  /* ---------- Děkovací stránka ---------- */
  function initThanks(box) {
    var typ = FA.params.get('typ') || 'kontakt';
    var c = FA.params.get('c') || '';
    if (!/^[a-z]+$/.test(typ) || !box.querySelector('[data-typ~="' + typ + '"]')) typ = 'kontakt';
    box.querySelectorAll('[data-typ]').forEach(function (el) { el.hidden = el.getAttribute('data-typ').split(' ').indexOf(typ) === -1; });
    var TITLES = {
      rezervace: 'Děkujeme, rezervaci jsme přijali.', poptavka: 'Děkujeme, poptávku jsme přijali.',
      projectoffice: 'Děkujeme, poptávku jsme přijali.', cekaci: 'Děkujeme, jste na seznamu.',
      webinar: 'Děkujeme, jste zaregistrovaní.', kontakt: 'Děkujeme za zprávu.'
    };
    var tEl = box.querySelector('[data-fa-thanks-title]');
    if (tEl) tEl.textContent = TITLES[typ];
    if (!c) { var cl = box.querySelector('[data-fa-cislo]'); if (cl && cl.parentNode) cl.parentNode.hidden = true; }
    var sum = null;
    try { sum = JSON.parse(FA.store.get('fa_last_' + typ)); } catch (e) { sum = null; }
    if (sum && c && sum.cislo !== c) sum = null;

    if (sum && sum.simulated) {
      var sim = box.querySelector('[data-fa-simulated]');
      if (sim) sim.hidden = false;
    }
    doc.querySelectorAll('[data-fa-cislo]').forEach(function (el) { el.textContent = c || (sum && sum.cislo) || ''; });

    if (typ === 'rezervace') {
      var recap = box.querySelector('[data-fa-recap]');
      var generic = box.querySelector('[data-fa-recap-generic]');
      if (sum && recap) {
        var d = FA.parseDate(sum.datum);
        var rows = [
          ['Číslo rezervace', '<span class="fa-recap__num">' + FA.h(sum.cislo) + '</span>'],
          ['Kurz', FA.h(sum.kurz)],
          ['Termín', (d ? FA.fmtDate(d, true) : '') + (sum.casOd ? ', ' + FA.h(sum.casOd) + (sum.casDo ? ' až ' + FA.h(sum.casDo) : '') : '')],
          ['Místo', FA.h(sum.misto) + (sum.format === 'online' ? ' (online)' : '')],
          ['Počet osob', String(sum.pocet)],
          ['Celková cena', sum.celkem != null ? FA.fmtPrice(sum.celkem) + (sum.earlyBird ? ' (early bird)' : '') + ' <span class="fa-muted fa-small">' + FA.h(FA.vatNotePlain()) + '</span>' : 'upřesníme'],
          ['Plátce', sum.platce === 'organizace' ? 'Organizace' + (sum.organizace ? ': ' + FA.h(sum.organizace) : '') + ', faktura' : 'Jednotlivec, faktura na jméno'],
          ['E-mail pro fakturu', FA.h(sum.email)]
        ];
        recap.querySelector('dl').innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
        recap.hidden = false;
        if (generic) generic.hidden = true;
        var online = box.querySelector('[data-fa-online-note]');
        if (online) online.hidden = sum.format !== 'online';
        var ics = box.querySelector('[data-fa-ics]');
        if (ics && sum.datum) {
          ics.hidden = false;
          ics.addEventListener('click', function () {
            FA.downloadIcs({
              uid: sum.cislo, date: sum.datum, start: sum.casOd, end: sum.casDo,
              title: sum.kurz + ' (FILANDR AKADEMIE)', location: sum.misto,
              description: 'Rezervace ' + sum.cislo + '. Místo je potvrzené po zaplacení faktury. Praktické informace pošleme před kurzem.',
              url: FA.url(sum.kurzUrl || '')
            }, 'filandr-akademie-' + sum.cislo + '.ics');
          });
        }
      } else {
        if (recap) recap.hidden = true;
        if (generic) generic.hidden = false;
      }
    }
    if (typ === 'webinar') {
      var w = D.webinar || {};
      var wics = box.querySelector('[data-fa-ics-webinar]');
      if (wics && w.datum) {
        wics.hidden = false;
        wics.addEventListener('click', function () {
          FA.downloadIcs({ uid: c || 'webinar', date: w.datum, start: w.casOd, end: w.casDo || w.casOd, title: (FA.isTodo(w.nazev) ? 'Webinář' : w.nazev) + ' (FILANDR AKADEMIE)', location: 'Online' + (w.platforma && !FA.isTodo(w.platforma) ? ' · ' + w.platforma : ''), description: 'Odkaz na připojení pošleme e-mailem.', url: FA.url('webinar/') }, 'filandr-akademie-webinar.ics');
        });
      }
    }
    box.querySelectorAll('[data-fa-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

    /* Konverze: jen jednou na číslo, jen po úspěšném odeslání */
    var pending = null;
    try { pending = JSON.parse(FA.store.get('fa_pending_conv')); } catch (e) { pending = null; }
    if (pending && pending.c === c && !FA.store.get('fa_conv_' + c) && FA.track) {
      FA.store.set('fa_conv_' + c, '1');
      FA.store.del('fa_pending_conv');
      var ev = (typ === 'cekaci' || typ === 'webinar') ? 'sign_up' : (typ === 'kontakt' ? 'contact' : 'generate_lead');
      FA.track(ev, { typ: typ, value: typeof pending.value === 'number' ? pending.value : undefined, platce: pending.platce || undefined, kurz: pending.kurz || undefined, cislo: c, method: typ === 'kontakt' ? 'formular' : undefined });
    }
  }

  /* ---------- Spuštění ---------- */
  function init() {
    doc.querySelectorAll('form[data-fa-form]').forEach(function (form) {
      form.noValidate = true;
      var ak = form.querySelector('[name="access_key"]');
      if (ak) ak.value = CF.web3formsKey || '';
      var typ = form.getAttribute('data-fa-form');
      try {
        if (typ === 'rezervace') initBooking(form); else initGeneric(form);
        if (CF.hcaptcha) ensureHcaptcha(form);
      } catch (e) { if (window.console) console.error('[FA formuláře]', e); }
    });
    doc.querySelectorAll('[data-fa-reservation]').forEach(function (s) {
      try { initReservation(s); } catch (e) { if (window.console) console.error('[FA rezervace]', e); }
    });
    var t = doc.querySelector('[data-fa-thanks]');
    if (t) initThanks(t);
  }
  init();
})();
