---
name: recept-import
description: Zet een recept (URL, afbeelding of geplakte tekst) om naar het gestandaardiseerde recept-JSON-formaat in recepten/, inclusief foto, validatie en commit. Gebruik bij "importeer dit recept", "voeg dit recept toe", een geplakte recepttekst, een recept-URL of een foto van een kookboekpagina.
---

# Recept importeren

Zet de gegeven invoer om naar één nieuw bestand in `recepten/` volgens `schema/recept.schema.json`: gevalideerd, gecommit, gepusht (het recept gaat dus direct live), met rapport.

## Werkwijze

1. **Invoer binnenhalen.**
   - URL → `npx tsx scripts/haal-pagina.ts <url>` (headless Chrome; receptensites blokkeren gewone fetches vaak met een 403). Lees het recept bij voorkeur uit het `Recipe`-object in de `jsonld`-blokken — daar staan titel, porties, ingrediënten, stappen, tijden én foto-URL's gestructureerd in; `zichtbareTekst` is het vangnet. Gebruik geen WebFetch of curl.
   - Afbeeldingspad → Read (vision) en lees het recept af.
   - Geplakte tekst → direct gebruiken.
   - Anderstalige bron → vertaal alles naar het Nederlands.
2. **Bestaande stijl peilen.** Bekijk de tags die al in gebruik zijn: `grep -h '"tags"' recepten/*.json`. Hergebruik bestaande tags waar passend; introduceer geen synoniem naast een bestaande tag (geen "vegetarisch" naast "vega").
3. **Slug en bestandscheck.** `npx tsx scripts/slug.ts "<titel>"` → het recept wordt `recepten/<slug>.json`. Bestaat dat bestand al, meld het dan en stop.
4. **JSON opbouwen** volgens de regels hieronder.
5. **Foto.** Heeft de bron een receptfoto (foto-URL uit de JSON-LD, of de invoer wás een foto van het gerecht — een kookboekpagina vol tekst is géén receptfoto): `npx tsx scripts/foto-import.ts <foto-url-of-pad> <slug> <pagina-url>` — de derde parameter laat het script bij een geblokkeerde download de foto via de browsercontext van de receptpagina ophalen. Zet `"foto": "<slug>.jpg"` in de JSON. Geen foto of mislukt → veld weglaten en dit in het rapport melden.
6. **Poort.** `npm run valideer && npm test` — beide moeten groen. Fouten eerst fixen; de foutmeldingen noemen bestand en veld.
7. **Commit en push.** `git add recepten/ && git commit -m "Recept toegevoegd: <titel>" && git push` — de deploy-Action zet het recept daarna automatisch live. Commit alléén het nieuwe recept (+ foto); staan er andere wijzigingen in de werkboom, laat die staan.
8. **Rapport.** Meld: samenvatting (titel, personen, tags, totaaltijd), álle aannames en schattingen (met stapnummer), wat er niet te vinden was (foto, tijden, personen), en dat het recept gepusht is.

Stel de gebruiker alléén een vraag als het aantal personen nergens uit af te leiden is. Al het andere: beste aanname doen en rapporteren.

## Regels voor de JSON

**Basis.** `titel` zoals de bron (Nederlands); `beschrijving` is één zin die je zelf formuleert — feitelijk, geen marketingtekst uit de bron; `personen` uit de bron; `bron` = de URL, of vrije tekst zoals "Kookboek X, p. 34"; bij geplakte tekst zonder herkomst: veld weglaten.

**Ingrediënten.** Kebab-case `id`'s, uniek binnen het recept.
- Telbare stuks (ui, ei, teen knoflook, citroen, paprika) → `"eenheid": "stuk"`, `"schaling": "stuks"`, én `meervoud` ("uien", "eieren", "tenen knoflook").
- Smaakmakers en bakvet zonder echte maat ("naar smaak", "snufje", "scheutje om te bakken") → `"schaling": "vast"` zonder hoeveelheid, met `notitie`.
- Al het andere → `"schaling": "lineair"` met `hoeveelheid` + `eenheid` uit: `g`, `ml`, `kg`, `l`, `el`, `tl`, `stuk`. Reken afwijkende maten om (kopje ≈ 250 ml, eetlepel = el).
- Elk ingrediënt krijgt een `categorie` (supermarktschap) uit: `groente-en-fruit`, `brood-en-bakkerij`, `vlees-en-vis`, `pasta-rijst-en-granen`, `conserven-en-potten`, `olie-en-sauzen`, `kruiden-en-specerijen`, `zuivel-en-eieren`, `kaas`, `diepvries`, `overig`. Kies het schap waar je het product pakt (passata → `conserven-en-potten`, boter → `zuivel-en-eieren`, verse basilicum → `groente-en-fruit`); twijfel → `overig`.

**Stappen.**
- Elke hoeveelheid in een staptekst wordt een `{id}`-verwijzing: `"Voeg {gehakt} toe"` — nooit een hoeveelheid als losse tekst, ook niet gedeeltelijk ("de helft van {olijfolie}" mag wél: de verwijzing schaalt, de breuk is tekst).
- Aanwijzingen als "verwarm de oven voor op 200°C", "breng een pan water aan de kook", "laat de waterkoker koken" **verdwijnen uit de staptekst**. Zet in plaats daarvan `"vereist": { "apparaat": "...", "temperatuur": ... }` op de stap die het apparaat daadwerkelijk gebruikt (de bakstap, de kookstap). Geldige apparaten: `oven` (met temperatuur), `grill`, `waterkoker`, `pan-water`. De site berekent zelf wanneer de melding verschijnt.
- `duur` = actieve minuten, `wachttijd` = passieve minuten ná de handeling (oventijd, rijzen, marineren). Noemt de bron geen tijd → schat ruim en meld de schatting in het rapport.
- Splits samengestelde bronstappen in losse doe-stappen; houd de volgorde van de bron aan.

## Voorbeeld

Bron (geplakte tekst):

> **Spaghetti aglio e olio** — voor 2 personen. 200 g spaghetti, 4 tenen knoflook, 1 rode peper, 60 ml olijfolie, peterselie, zout. Breng een grote pan gezouten water aan de kook en kook de spaghetti al dente. Verhit intussen de olie en fruit de fijngesneden knoflook en peper zachtjes. Meng de spaghetti met wat kookvocht door de olie en bestrooi met peterselie.

Wordt `recepten/spaghetti-aglio-e-olio.json`:

```json
{
  "titel": "Spaghetti aglio e olio",
  "beschrijving": "Snelle pasta met langzaam gefruite knoflook, rode peper en olijfolie.",
  "personen": 2,
  "tags": ["pasta", "snel", "vega"],
  "ingredienten": [
    { "id": "spaghetti", "naam": "spaghetti", "hoeveelheid": 200, "eenheid": "g", "schaling": "lineair", "categorie": "pasta-rijst-en-granen" },
    { "id": "knoflook", "naam": "teen knoflook", "meervoud": "tenen knoflook", "hoeveelheid": 4, "eenheid": "stuk", "schaling": "stuks", "categorie": "groente-en-fruit" },
    { "id": "peper", "naam": "rode peper", "meervoud": "rode pepers", "hoeveelheid": 1, "eenheid": "stuk", "schaling": "stuks", "categorie": "groente-en-fruit" },
    { "id": "olijfolie", "naam": "olijfolie", "hoeveelheid": 60, "eenheid": "ml", "schaling": "lineair", "categorie": "olie-en-sauzen" },
    { "id": "peterselie", "naam": "verse peterselie", "schaling": "vast", "categorie": "groente-en-fruit", "notitie": "handje, fijngehakt" },
    { "id": "zout", "naam": "zout", "schaling": "vast", "categorie": "kruiden-en-specerijen", "notitie": "voor het kookwater" }
  ],
  "stappen": [
    { "tekst": "Kook {spaghetti} al dente in ruim water met {zout}.", "duur": 10, "vereist": { "apparaat": "pan-water" } },
    { "tekst": "Snijd {knoflook} en {peper} fijn en fruit ze zachtjes in {olijfolie}.", "duur": 6 },
    { "tekst": "Meng de spaghetti met een scheutje kookvocht door de olie en bestrooi met {peterselie}.", "duur": 2 }
  ]
}
```

Let op wat er met de bronstappen gebeurde: "breng een pan water aan de kook" is metadata geworden (`vereist` op de kookstap), de hoeveelheden zijn `{id}`-verwijzingen, en de tijden zijn geschat (rapporteer: "duur stap 1–3 geschat").
