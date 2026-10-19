/* FILANDR AKADEMIE: nastavení webu
   Obyčejný skript (ne modul), plní globální objekt window.FA_CONFIG.
   Hodnoty v hranatých závorkách [DOPLNIT: ...] jsou chybějící údaje, viz DOPLNIT.md.
   Po změně e-mailu, telefonu, klíče Web3Forms nebo domény spusťte: node tools/sync-partials.mjs */
window.FA_CONFIG = {
  staging: true,                 // true: noindex, povolí ?dnes=RRRR-MM-DD, ?demo=1 a ?zvyraznit=1 (žluté zvýraznění chybějících údajů) pro testy
  // Základní URL webu (s lomítkem na konci). Teď staging na GitHub Pages.
  odkazyNaIndex: false,          // true jen v náhledu (tools/nahled.mjs): odkazy na složky dostanou /index.html
  zakladniUrl: "https://user00mv.github.io/akademie/", // [DOPLNIT: produkční doména, např. https://www.filandrakademie.cz/]
  email: "info@filandracademy.cz",
  telefon: "+420 604 216 093",
  adresa: "[DOPLNIT: kontaktní adresa]",   // dokud chybí, řádek s adresou se na webu nezobrazuje
  provozovatel: {
    nazev: "FILANDR spol. s r.o.",
    // IČO, DIČ, sídlo a zápis převzaty z ARES a obchodního rejstříku 18. 10. 2026 (jednatel MUDr. Pavel Horyna souhlasí). [DOPLNIT: klient potvrdí]
    ico: "04618076",
    dic: "CZ04618076",
    sidlo: "Na Moráni 1687/19, Nové Město, 128 00 Praha 2",
    zapis: "spisová značka C 250853 vedená u Městského soudu v Praze",
    platceDph: null              // [DOPLNIT] true nebo false; ARES uvádí aktivní registraci k DPH, klient potvrdí, zda jsou ceny 3 490 / 3 990 Kč včetně DPH
  },
  formulare: {
    provider: "web3forms",       // "web3forms" (výchozí, zdarma) | "php" (volitelně, jen hosting s PHP, viz README)
    web3formsKey: "[DOPLNIT: Access Key z web3forms.com]", // klíč je svázaný s e-mailem, kam chodí rezervace
    fromName: "Web FILANDR AKADEMIE",
    hcaptcha: false,             // zapnout až při spamu (a zároveň v administraci Web3Forms)
    hcaptchaSitekey: "50b2fe65-b00b-4b9e-ad62-3ba471098be2", // veřejný sitekey Web3Forms pro free tarif [DOPLNIT: ověřit v docs.web3forms.com, sekce hCaptcha]
    phpEndpoint: "api/odeslat.php",
    aresProxy: "api/ares.php"    // použije se jen u provider "php", když přímé volání ARES zablokuje prohlížeč
  },
  mereni: {
    ga4: "",                     // G-XXXXXXX
    googleAds: "",               // AW-XXXXXXX
    googleAdsKonverze: { rezervace: "", lead: "" }, // štítek konverze nebo celé "AW-XXXXXXX/abcDEF"
    metaPixel: ""                // číslo pixelu
  },
  rezervace: {
    lhutaOdpovedi: "[DOPLNIT: do 1 pracovního dne]",  // kdy akademie odpoví a pošle fakturu
    splatnostJednotlivec: "[DOPLNIT: 7 dní]",
    splatnostOrganizaceMoznosti: [14, 30],            // dny; [DOPLNIT: potvrdit s klientem]
    maxUcastniku: 30,
    adresaJednotlivecPovinna: false                   // [DOPLNIT: klient potvrdí, zda u jednotlivce potřebuje adresu na fakturu]
  }
};
