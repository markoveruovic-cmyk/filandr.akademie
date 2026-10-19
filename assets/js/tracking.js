/* FILANDR AKADEMIE: měření událostí (GA4, Google Ads, Meta Pixel)
   Události se odešlou jen se souhlasem dané kategorie (viz consent.js).
   Online platba není, purchase se neměří. Konverze se odpaluje po úspěšném odeslání formuláře. */
(function () {
  'use strict';
  var C = window.FA_CONFIG || {};
  var M = C.mereni || {};
  var FA = window.FA = window.FA || {};

  var MAP = {
    view_item: { ga: 'view_item', meta: 'ViewContent' },
    begin_checkout: { ga: 'begin_checkout', meta: 'InitiateCheckout' },
    generate_lead: { ga: 'generate_lead', meta: 'Lead' },
    sign_up: { ga: 'sign_up', meta: 'CompleteRegistration' },
    contact: { ga: 'contact', meta: 'Contact' },
    video_start: { ga: 'video_start' }
  };
  var once = {};

  function clean(o) {
    var r = {};
    Object.keys(o || {}).forEach(function (k) { if (o[k] !== undefined && o[k] !== null && o[k] !== '') r[k] = o[k]; });
    return r;
  }

  FA.track = function (ev, params) {
    params = clean(params);
    if (ev === 'begin_checkout') { if (once.bc) return; once.bc = true; }
    var m = MAP[ev] || { ga: ev };
    var consent = window.FA_CONSENT || {};
    var gaParams = clean({
      value: typeof params.value === 'number' ? params.value : undefined,
      currency: typeof params.value === 'number' ? 'CZK' : undefined,
      typ: params.typ, platce: params.platce, kurz: params.kurz, termin: params.termin, method: params.method
    });

    if (consent.analytics && M.ga4 && typeof window.gtag === 'function') {
      window.gtag('event', m.ga, Object.assign({ send_to: M.ga4 }, gaParams));
    }
    if (consent.marketing && M.metaPixel && typeof window.fbq === 'function' && m.meta) {
      var metaParams = clean({
        value: gaParams.value, currency: gaParams.currency,
        content_name: params.nazev || params.kurz, content_category: params.typ
      });
      if (ev === 'generate_lead' && params.cislo) window.fbq('track', m.meta, metaParams, { eventID: params.cislo });
      else window.fbq('track', m.meta, metaParams);
    }
    if (ev === 'generate_lead' && consent.marketing && M.googleAds && typeof window.gtag === 'function') {
      var k = M.googleAdsKonverze || {};
      var label = params.typ === 'rezervace' ? k.rezervace : k.lead;
      if (label) {
        window.gtag('event', 'conversion', clean({
          send_to: label.indexOf('/') > -1 ? label : M.googleAds + '/' + label,
          value: gaParams.value, currency: gaParams.currency, transaction_id: params.cislo
        }));
      }
    }
    if (C.staging && window.console) console.info('[FA měření]', ev, params, 'souhlas:', consent);
  };
})();
