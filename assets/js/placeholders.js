/* FILANDR AKADEMIE: zástupné texty pro chybějící údaje.
   Ve zdroji zůstává značka [DOPLNIT: …] (v atributu data-doplnit, aby ji našel tools/doplnit.mjs),
   návštěvník ale vidí neutrální text podle prvního pravidla, které na značku sedí.
   Prázdný text = prvek se nezobrazí (interní poznámky). Používá app.js i tools/sync-partials.mjs. */
window.FA_PLACEHOLDERS = {
  vychozi: "Zatím nemáme informace, po konzultaci doplníme.",
  pravidla: [
    // Interní poznámky pro klienta a právníka: nezobrazovat
    ["^\\[PRÁVNÍ KONTROLA(\\]|: údaje)", ""],
    ["adresu na fakturu|schválí lektoři|^\\[DOPLNIT: potvrdit|potvrdit úroveň|potvrdit splatnost|chybějící údaj|nadpis sekce|nadpis programu|podnázev|odbornost|kontaktní adresa|Access Key", ""],
    // Právní texty
    ["1837", "Podmínky odstoupení od smlouvy doplníme po konzultaci."],
    ["datum účinnosti", "(datum doplníme)"],
    ["DOPLNIT: lhůta\\]", "(lhůtu doplníme)"],
    ["2 roky", "(dobu doplníme po konzultaci)"],
    ["storno|podle VOP", "Storno podmínky doplníme po konzultaci."],
    ["pořadí", "Pravidla doplníme po konzultaci."],
    // Údaje v textu
    ["pracovního dne|lhůta odpovědi", "co nejdříve"],
    ["DPH", "Informaci o DPH doplníme po konzultaci."],
    ["CHŮV", "Nový program připravujeme. Nechte si poslat informace o prvním termínu."],
    ["bio", "Medailonek připravujeme."],
    ["lektoři tohoto kurzu", "Lektory kurzu brzy představíme."],
    ["adresa místa|DOPLNIT: místo", "místo upřesníme"],
    ["délka", "délku upřesníme"],
    ["Zoom|platform", "platformu upřesníme"],
    ["časy|DOPLNIT: čas\\]|\\d:\\d\\d až", "časy upřesníme"],
    ["14 nebo 30|splatnost|7 dní", "podle dohody"],
    ["orientační cena|DOPLNIT: cena", "cenu upřesníme"],
    ["prezenčně / online", "formu upřesníme"],
    ["datum", "termín upřesníme"]
  ]
};
