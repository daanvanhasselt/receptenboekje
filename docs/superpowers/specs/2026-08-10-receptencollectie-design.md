# Ontwerp: persoonlijke receptencollectie

*Datum: 2026-08-10 — status: goedgekeurd*

## Doel

Een statische webapp om een persoonlijke receptencollectie te bekijken, gebouwd op gestandaardiseerde JSON-recepten die extern (bijv. door een LLM) gegenereerd worden. Mobiel-eerst: gebruik op telefoon/tablet in de keuken. Nu ~5 recepten, ingericht op honderden. Nederlandstalig.

Kerneisen:

- Centrale opslag van recepten als JSON; de JSON is de bron van waarheid.
- Receptteksten altijd identiek geformatteerd; de generator kan formulering/plaatsing niet beïnvloeden.
- Vooruitkijk-waarschuwingen ("Zet nu de oven aan op 180°C") worden door de app **berekend** uit stapmetadata, nooit met de hand geschreven.
- Aantal personen instelbaar; alle hoeveelheden (ook in stapteksten) schalen mee.

## Architectuur

**Astro, volledig statisch**, deploy naar GitHub Pages via GitHub Actions. Elke JSON wordt bij de build een eigen HTML-pagina. Waarschuwingen worden bij de build berekend en geplaatst (deterministisch uit de JSON). Alleen het personen-schalen is client-side JS (klein vanilla-eiland, geen framework-runtime).

```
recepten/                    ← JSON's + foto's (de bron, framework-agnostisch)
schema/recept.schema.json    ← formeel JSON Schema (contract voor de generator)
src/                         ← Astro-site: pagina's, componenten, logica
```

`recepten/` staat bewust buiten `src/`: de collectie is data, de site een weergave.

## Receptschema (JSON)

Eén bestand per recept in `recepten/` (bijv. `lasagne.json`), foto ernaast (`lasagne.jpg`).

```jsonc
{
  "titel": "Lasagne",
  "beschrijving": "Klassieke lasagne met ragù die lang mag pruttelen.",
  "personen": 4,                    // basisaantal waarvoor de hoeveelheden gelden
  "tags": ["pasta", "oven", "italiaans"],
  "foto": "lasagne.jpg",

  "ingredienten": [
    {
      "id": "gehakt",               // uniek binnen het recept
      "naam": "rundergehakt",
      "hoeveelheid": 500,
      "eenheid": "g",
      "schaling": "lineair"         // "lineair" | "stuks" | "vast"
    },
    { "id": "ei", "naam": "ei", "hoeveelheid": 1, "eenheid": "stuk", "schaling": "stuks" },
    { "id": "zout", "naam": "zout", "schaling": "vast", "notitie": "naar smaak" }
  ],

  "stappen": [
    {
      "tekst": "Fruit de ui glazig in {olie}.",  // {id} → naam + geschaalde hoeveelheid
      "duur": 5,                     // actieve minuten (optioneel)
      "wachttijd": 0,                // passieve minuten ná deze stap (optioneel)
      "vereist": { "apparaat": "oven", "temperatuur": 180 }  // optioneel
    }
  ]
}
```

Kernbeslissingen:

1. **Stapteksten verwijzen met `{id}` naar ingrediënten.** De app vervangt `{gehakt}` door "500 g rundergehakt", geschaald naar het gekozen aantal personen. Een staptekst kan dus nooit een verouderde of niet-schalende hoeveelheid bevatten.
2. **`vereist`** (apparaat + evt. temperatuur) is de enige bron voor waarschuwingen; de generator zegt *wat* nodig is, de app berekent *wanneer* de melding komt.
3. **`duur`/`wachttijd`** voeden de waarschuwingsberekening en de totaaltijd op de receptkaart. Optioneel; ontbrekend telt als "kort" (0 min).
4. **Schalingsmodi**: `lineair` (nette afronding), `stuks` (hele stuks, naar boven), `vast` (schaalt niet; hoeveelheid optioneel, evt. alleen `notitie`).

## Waarschuwingslogica (build-time)

- **Apparaat-waarschuwingen.** Per stap met `vereist`: tel de kooktijd (duur + wachttijd) van alle eerdere stappen op en plaats de waarschuwing bij de laatste stap waar de opwarmtijd nog past. Opwarmtijden per apparaat in een klein configuratiebestand (oven 15 min, waterkoker 3 min, pan kokend water 10 min, …).
  - Onvoldoende voortijd → waarschuwing helemaal bovenaan, vóór stap 1.
  - Zelfde apparaat, andere temperatuur later → nieuwe waarschuwing op het juiste moment ("Verhoog de oven naar 220°C").
- **Wachttijd-signalering.** Stappen met `wachttijd` ≥ 30 min worden bovenaan het recept samengevat ("reken naast ±40 min koken op 1 uur rijstijd") en bij de stap zelf herhaald.
- **Templates in de app**, nooit vrije tekst uit de JSON: "Zet nu de {apparaat} aan op {temperatuur}°C". Altijd exact dezelfde formulering en opmaak.

## Pagina's en interactie

- **Overzicht `/`** — receptkaarten (foto, titel, tags, actieve tijd / wachttijd). Zoekveld (titel + ingrediëntnamen) en tag-filters, client-side op een bij de build gegenereerde compacte `zoekindex.json`.
- **Receptpagina `/recept/[naam]`** — beschrijving, wachttijd-samenvatting, personen-instelling, afvinkbare ingrediëntenlijst, stappen met waarschuwingen op hun berekende plek. Grote letters, ruime regelafstand.
- **Schalen** — hoeveelheden gerenderd als `<span data-hoeveelheid data-basis="500" data-schaling="lineair">500 g</span>`; de −/+-knop herrekent alleen die spans. Afrondingsregels in één module: nette kookmaten (375 g, 1,25 l, ¾ tl), stuks naar boven. Personenkeuze per recept onthouden in localStorage.
- **Voorbereid op kookmodus** (later, buiten scope): stappen zijn losse componenten met metadata in de HTML; een stap-voor-stap-weergave met timers/wake-lock kan erbovenop zonder schema- of buildwijzigingen.

## Validatie en foutafhandeling

1. **JSON Schema** (`schema/recept.schema.json`): structuur, types, verplichte velden. Meegeefbaar aan de generator; live validatie in editors.
2. **Semantische build-checks**: elke `{id}` in stapteksten bestaat als ingrediënt; niet-`vast` ingrediënten hebben hoeveelheid + eenheid; foto's bestaan; geen dubbele id's; `vereist.apparaat` komt voor in de opwarmtijden-config. Eén kapot recept breekt de build met bestand + veld in de foutmelding.

## Testen

- Unit tests (Vitest) voor de logica met randgevallen: afronding, stuks-schaling, waarschuwingsplaatsing (te weinig voortijd, temperatuurwissel), wachttijd-samenvatting, `{id}`-substitutie.
- Astro-componenten blijven dun; één smoke-test bouwt de site met voorbeeldrecepten.

## Deployment

GitHub Action op push naar `main`: valideren → testen → bouwen → publiceren naar GitHub Pages. Workflow voor nieuwe recepten: JSON (laten) genereren → in `recepten/` zetten → committen en pushen.

## Buiten scope (bewust)

- Kookmodus (stap-voor-stap, timers, wake lock) — voorbereid, niet gebouwd.
- Sorteren op kooktijd, favorieten, "wat kan ik maken met X".
- Recepten toevoegen/bewerken via de UI; meertaligheid.
