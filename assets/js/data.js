/* FILANDR AKADEMIE: data webu, JEDINÝ ZDROJ PRAVDY pro termíny, místa, ceny, kapacity a stav.
   Obyčejný skript (ne modul), plní globální objekt window.FA_DATA.

   Jak upravit:
   - Nový termín: zkopírujte jeden objekt v poli "terminy", změňte id (unikátní), datum a místo.
   - Nová cena nebo early bird: upravte "cena" u kurzu (nebo "cena" přímo u termínu, pokud se liší).
   - Volná místa: "volnaMista" je ruční číslo, null = nezobrazovat. 0 nebo stav "vyprodano" = VYPRODÁNO.
   - Stav termínu: "otevreno" | "vyprodano" | "pripravujeme" | "zruseno".
   - Datum vždy ve tvaru "RRRR-MM-DD", čas "9:00".
   - Texty označené NÁVRH COPY čekají na schválení klientem (viz DOPLNIT.md).
   Kontrola po úpravě: otevřete web s ?dnes=RRRR-MM-DD (jen ve stagingu) a projděte stránku kurzu. */
window.FA_DATA = {
  kurzy: [
    {
      slug: "granty-bez-chaosu",
      typ: "kurz",
      poradi: 1,
      nazev: "Granty bez chaosu",
      podnazev: "Od nápadu k financovanému projektu",
      url: "kurzy/granty-bez-chaosu/",
      mistaSouhrn: "Praha / Resort pod Landštejnem / online",
      delka: "8 hodin",
      cena: { earlyBird: 3490, standard: 3990, earlyBirdDo: null /* [DOPLNIT: "RRRR-MM-DD"] */ },
      // NÁVRH COPY: schválit klientem
      kratkyPopis: "Praktický kurz, na kterém se naučíte najít vhodnou výzvu, postavit projektový záměr, rozpočet a harmonogram a napsat žádost bez zbytečného stresu. Přijdete s nápadem, odejdete s kostrou vlastního projektu.",
      // NÁVRH COPY: schválit klientem
      coNajdete: [
        "Kde hledat peníze: evropské fondy, národní dotace, kraje, obce a nadace",
        "Jak číst výzvu a hodnoticí kritéria",
        "Projektový záměr: problém, cílová skupina, cíle, aktivity a výstupy",
        "Rozpočet a harmonogram bez chaosu",
        "Práce na vlastním projektu přímo na kurzu"
      ],
      lektori: ["pavel-filandr", "miroslav-udatny"],
      terminy: [
        {
          id: "gbc-praha-01",
          datum: null,                   // [DOPLNIT: "RRRR-MM-DD"]
          casOd: "9:00", casDo: "17:00", // [DOPLNIT: potvrdit]
          format: "prezencne",           // "prezencne" | "online"
          misto: "[DOPLNIT: název a adresa místa]",
          mesto: "Praha",
          kraj: "Hlavní město Praha",
          kapacita: null,                // [DOPLNIT]
          volnaMista: null,              // ručně aktualizované číslo, null = nezobrazovat
          stav: "otevreno"
        },
        {
          id: "gbc-landstejn-01",
          datum: null,                   // [DOPLNIT: "RRRR-MM-DD"]
          casOd: "9:00", casDo: "17:00", // [DOPLNIT: potvrdit]
          format: "prezencne",
          misto: "Resort pod Landštejnem",
          mesto: "Staré Město pod Landštejnem", // [DOPLNIT: ověřit]
          kraj: "Jihočeský kraj",               // [DOPLNIT: ověřit]
          kapacita: null, volnaMista: null, stav: "otevreno"
        },
        {
          id: "gbc-online-01",
          datum: null,                   // [DOPLNIT: "RRRR-MM-DD"]
          casOd: "9:00", casDo: "17:00", // [DOPLNIT: potvrdit]
          format: "online",
          misto: "Online",
          platforma: "[DOPLNIT: Zoom nebo MS Teams]",
          mesto: null, kraj: null,
          kapacita: null, volnaMista: null, stav: "otevreno"
        }
      ]
    },
    {
      slug: "ai-project-office",
      typ: "kurz",
      poradi: 2,
      nazev: "AI Project Office",
      podnazev: "AI pro projekty, granty a neziskovky",
      url: "kurzy/ai-project-office/",
      mistaSouhrn: null,               // [DOPLNIT]
      delka: null,                     // [DOPLNIT]
      cena: { earlyBird: null, standard: null, earlyBirdDo: null }, // [DOPLNIT]
      // NÁVRH COPY: schválit klientem
      kratkyPopis: "Praktický kurz o tom, jak využít umělou inteligenci při hledání výzev, psaní a revizi žádostí, práci s rozpočty i v reportingu. Bezpečně, s ohledem na ochranu dat a na vlastním notebooku.",
      // NÁVRH COPY: schválit klientem
      coNajdete: [
        "AI jako asistent pro vyhledávání výzev",
        "Psaní a revize textů žádostí s pomocí AI",
        "Tabulky, rozpočty a monitorovací zprávy",
        "Komunikace s donory a dobrovolníky",
        "Bezpečnost dat a GDPR, vlastní knihovna promptů"
      ],
      lektori: [],                     // [DOPLNIT]
      terminy: []                      // prázdné = karta ukáže „Termín připravujeme“ + čekací listinu
    }
  ],
  sluzby: [
    {
      slug: "project-office", typ: "sluzba", poradi: 3,
      nazev: "Externí projektová kancelář",
      url: "project-office/",
      // NÁVRH COPY: schválit klientem
      kratkyPopis: "Projektová kancelář pro organizace, které nemají vlastního projektového manažera. Najdeme vhodnou výzvu, připravíme a podáme žádost a pomůžeme s administrací projektu až po udržitelnost.",
      // NÁVRH COPY: schválit klientem
      coNajdete: [
        "Vyhledání vhodných výzev",
        "Příprava a podání žádosti včetně rozpočtu",
        "Administrace projektu a zprávy o realizaci",
        "Kontroly a udržitelnost",
        "Jednorázově na jeden projekt nebo dlouhodobě"
      ],
      proKoho: "Školy, obce a města, neziskové organizace, firmy"
    },
    {
      slug: "chuva", typ: "pripravujeme", poradi: 4,
      nazev: "CHŮVA",
      url: "chuva/",
      kratkyPopis: "[DOPLNIT: popis programu CHŮVA od klienta]",
      // NÁVRH COPY: schválit klientem (zobrazí se v produkci, dokud klient nepošle popis)
      popisProdukce: "Nový program připravujeme. Nechte si poslat informace o prvním termínu."
    }
  ],
  /* Lidé akademie. "lektor: false" = ukáže se jen v bloku Lidé za akademií (úvod, O nás), ne mezi lektory.
     foto: cesta k JPG, vedle musí ležet stejnojmenný .webp. fotoRozmer: [šířka, výška] v px. */
  lektori: [
    {
      id: "pavel-filandr",
      jmeno: "Pavel Filandr",
      role: "Ředitel akademie",
      foto: "assets/img/lide/pavel-filandr.jpg",   // [DOPLNIT: fotka ve vyšším rozlišení, tahle má jen 399 × 499 px]
      fotoRozmer: [399, 499],
      bio: "[DOPLNIT: krátké bio, 2 až 3 věty]",
      odbornost: []                    // [DOPLNIT] např. ["Granty a dotace", "Projektové řízení"]
    },
    {
      id: "miroslav-udatny",
      jmeno: "Mgr. Miroslav Udatný, LL.B.",
      role: "Odborný garant vybraných programů",
      foto: "assets/img/lide/miroslav-udatny.jpg",
      fotoRozmer: [800, 1000],
      bio: "[DOPLNIT: krátké bio, 2 až 3 věty]",
      odbornost: []                    // [DOPLNIT]
    },
    {
      id: "pavel-horyna",
      jmeno: "MUDr. Pavel Horyna",
      role: "Jednatel provozovatele",
      lektor: false,
      odkaz: "o-nas/#vedeni",
      foto: "assets/img/lide/pavel-horyna.jpg",
      fotoRozmer: [682, 852],
      bio: null,
      odbornost: []
    }
  ],
  // Pořadí v bloku „Lidé za akademií“ (úvod a O nás)
  tym: ["pavel-filandr", "miroslav-udatny", "pavel-horyna"],
  // { kurz: "granty-bez-chaosu", typ: "youtube" | "mp4", zdroj: "ID videa nebo cesta k mp4", nahled: "assets/img/videa/nahled.webp", titulek: "" }
  videa: [],
  webinar: {
    aktivni: false,
    nazev: "[DOPLNIT]",
    datum: null,                       // "RRRR-MM-DD"
    casOd: null, casDo: null,          // "18:00"
    platforma: "[DOPLNIT: Zoom nebo MS Teams]",
    popis: "[DOPLNIT]",
    body: [],                          // [DOPLNIT] 3 body „co se dozvíte“
    lektori: ["pavel-filandr", "miroslav-udatny"],
    kurz: "granty-bez-chaosu"
  }
};
