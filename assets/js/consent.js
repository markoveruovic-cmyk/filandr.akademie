/* FILANDR AKADEMIE: cookie lišta a Google Consent Mode v2
   Bez souhlasu se nenačte žádný měřicí skript. ID se berou z FA_CONFIG.mereni, prázdné ID = skript se nenačte.
   Volba se ukládá na 6 měsíců (localStorage). Tlačítko [data-fa-consent-open] lištu znovu otevře. */
(function () {
  'use strict';
  var C = window.FA_CONFIG || {};
  var M = C.mereni || {};
  var KEY = 'fa_consent';
  var MAX_AGE = 1000 * 60 * 60 * 24 * 182;
  var doc = document;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted',
    wait_for_update: 500
  });

  var hasTools = !!(M.ga4 || M.googleAds || M.metaPixel);

  function read() {
    try {
      var v = JSON.parse(window.localStorage.getItem(KEY));
      if (v && v.ts && (Date.now() - v.ts) < MAX_AGE) return v;
    } catch (e) { /* nedostupné */ }
    return null;
  }
  function save(analytics, marketing) {
    var v = { v: 1, ts: Date.now(), analytics: !!analytics, marketing: !!marketing };
    try { window.localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* nedostupné */ }
    return v;
  }

  var loaded = {};
  function loadScript(src) {
    var s = doc.createElement('script');
    s.async = true;
    s.src = src;
    doc.head.appendChild(s);
  }
  function apply(v) {
    window.FA_CONSENT = v;
    window.gtag('consent', 'update', {
      analytics_storage: v.analytics ? 'granted' : 'denied',
      ad_storage: v.marketing ? 'granted' : 'denied',
      ad_user_data: v.marketing ? 'granted' : 'denied',
      ad_personalization: v.marketing ? 'granted' : 'denied'
    });
    var ga = v.analytics && M.ga4 ? M.ga4 : '';
    var ads = v.marketing && M.googleAds ? M.googleAds : '';
    if ((ga || ads) && !loaded.gtag) {
      loaded.gtag = true;
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga || ads));
      window.gtag('js', new Date());
    }
    if (ga && !loaded.ga4) { loaded.ga4 = true; window.gtag('config', ga); }
    if (ads && !loaded.ads) { loaded.ads = true; window.gtag('config', ads); }
    if (v.marketing && M.metaPixel && !loaded.meta) {
      loaded.meta = true;
      /* Oficiální zavaděč Meta Pixel */
      (function (f, b, e, u) {
        if (f.fbq) return;
        var n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
        var t = b.createElement(e); t.async = true; t.src = u;
        b.head.appendChild(t);
      })(window, doc, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', M.metaPixel);
      window.fbq('track', 'PageView');
    }
    try { doc.dispatchEvent(new CustomEvent('fa:consent', { detail: v })); } catch (e) { /* starý prohlížeč */ }
  }

  /* ---------- Lišta ---------- */
  var bar = null;
  function rootUrl() {
    var s = doc.querySelector('script[src*="assets/js/consent.js"]');
    try { return new URL('../../', s.src).href; } catch (e) { return './'; }
  }
  function build() {
    if (bar) return bar;
    bar = doc.createElement('div');
    bar.className = 'fa-consent';
    bar.innerHTML =
      '<section class="fa-consent__box" role="dialog" aria-modal="false" aria-labelledby="fa-consent-title" aria-describedby="fa-consent-text">' +
        '<h2 class="fa-consent__title" id="fa-consent-title">Cookies a měření</h2>' +
        '<p class="fa-consent__text" id="fa-consent-text">Nezbytné cookies potřebujeme, aby web fungoval. S vaším souhlasem použijeme i analytické a marketingové nástroje (Google Analytics, Google Ads, Meta Pixel), které nám pomáhají web zlepšovat a měřit reklamu. Volbu můžete kdykoli změnit v patičce. <a href="' + rootUrl() + 'cookies/' + ((window.FA_CONFIG || {}).odkazyNaIndex ? 'index.html' : '') + '">Více o cookies</a></p>' +
        '<div class="fa-consent__cats" hidden>' +
          '<label class="fa-consent__cat"><input type="checkbox" checked disabled><span><strong>Nezbytné</strong><span>Chod webu, bezpečnost a uložení této volby. Vždy zapnuté.</span></span></label>' +
          '<label class="fa-consent__cat"><input type="checkbox" data-c="analytics"><span><strong>Analytické</strong><span>Anonymní statistiky návštěvnosti (Google Analytics 4).</span></span></label>' +
          '<label class="fa-consent__cat"><input type="checkbox" data-c="marketing"><span><strong>Marketingové</strong><span>Měření a cílení reklamy (Google Ads, Meta Pixel).</span></span></label>' +
        '</div>' +
        '<div class="fa-consent__actions">' +
          '<button type="button" class="fa-btn fa-btn--ghost-dark" data-a="accept">Přijmout vše</button>' +
          '<button type="button" class="fa-btn fa-btn--ghost-dark" data-a="reject">Odmítnout vše</button>' +
          '<button type="button" class="fa-btn fa-btn--ghost-dark" data-a="save" hidden>Uložit výběr</button>' +
          '<button type="button" class="fa-consent__more" data-a="more" aria-expanded="false">Nastavení</button>' +
        '</div>' +
      '</section>';
    doc.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'accept') choose(true, true);
      else if (a === 'reject') choose(false, false);
      else if (a === 'save') choose(bar.querySelector('[data-c="analytics"]').checked, bar.querySelector('[data-c="marketing"]').checked);
      else if (a === 'more') toggleCats(true);
    });
    bar.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && read()) close();
    });
    return bar;
  }
  function toggleCats(show) {
    var cats = bar.querySelector('.fa-consent__cats');
    var more = bar.querySelector('[data-a="more"]');
    cats.hidden = !show;
    more.hidden = show;
    more.setAttribute('aria-expanded', show ? 'true' : 'false');
    bar.querySelector('[data-a="save"]').hidden = !show;
    var cur = read() || {};
    bar.querySelector('[data-c="analytics"]').checked = !!cur.analytics;
    bar.querySelector('[data-c="marketing"]').checked = !!cur.marketing;
    if (show) bar.querySelector('[data-c="analytics"]').focus();
  }
  function open(withSettings) {
    build();
    bar.hidden = false;
    doc.documentElement.classList.add('fa-consent-open');
    toggleCats(!!withSettings);
    if (withSettings) bar.querySelector('[data-c="analytics"]').focus();
  }
  function close() {
    if (!bar) return;
    bar.hidden = true;
    doc.documentElement.classList.remove('fa-consent-open');
  }
  function choose(a, m) {
    var v = save(a, m);
    apply(v);
    close();
  }

  var current = read();
  if (current) apply(current);
  else window.FA_CONSENT = { analytics: false, marketing: false };

  function init() {
    if (!current && (hasTools || C.staging)) open(false);
    doc.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fa-consent-open]');
      if (b) { e.preventDefault(); open(true); }
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();

  window.FA_consentOpen = open;
})();
