# Ontwerp: recept-import-skill

*Datum: 2026-08-10 — status: goedgekeurd*

## Doel

Een project-skill (`.claude/skills/recept-import/`) die een recept in willekeurige vorm — URL, afbeelding (kookboekfoto, screenshot) of geplakte tekst — omzet naar het gestandaardiseerde recept-JSON-formaat van deze repo, inclusief foto waar beschikbaar. Eindpunt van een run: `npm run valideer` en `npm test` groen én het recept gecommit. Pushen blijft een bewuste actie van de gebruiker.

Aanpak: pure instructie-skill (het converteren is LLM-werk) plus twee deterministische hulpscripts (slug, foto). Best-effort met expliciete aannames-rapportage; de skill vraagt alléén iets als iets essentieels niet te raden valt (bijv. aantal personen ontbreekt volledig).

## Onderdeel 1: `bron`-uitbreiding van schema en site

- `schema/recept.schema.json`: optioneel veld `bron` (string, minLength 1) — URL of vrije tekst ("Bijbel van de Italiaanse keuken, p. 212").
- `src/lib/typen.ts`: `bron?: string` op `Recept`.
- Receptpagina (`src/pages/recept/[slug].astro`): discreet regeltje onder de bereiding: "Bron: …". Begint de waarde met `http` → klikbare link met alleen de domeinnaam als linktekst; anders platte tekst.
- Tests: validator accepteert recepten mét en zonder `bron`; buildcheck dat de regel gerenderd wordt.
- Bestaande recepten blijven ongewijzigd geldig.

## Onderdeel 2: de skill `recept-import`

**Aanroep:** `/recept-import <URL | pad naar afbeelding | geplakte tekst>`.

**Protocol (kern van de SKILL.md):**

1. **Invoer binnenhalen.** URL → pagina ophalen (WebFetch); afbeelding → inlezen (vision); tekst → direct. Meertalige bron → vertalen naar Nederlands.
2. **Basisgegevens.** Titel; beschrijving (één zin, zelf formuleren — geen marketingtekst uit de bron); `personen` (ontbreekt dit écht → de ene toegestane vraag aan de gebruiker); `bron` invullen; tags in kleine letters. Vóór het kiezen van tags eerst bestaande tags uit `recepten/*.json` bekijken en hergebruiken waar passend (geen "vegetarisch" naast bestaand "vega").
3. **Ingrediënten.** Kebab-case `id`'s. `schaling`-regels: telbare stuks (ui, ei, teen knoflook) → `stuks` mét `meervoud`; smaakmakers/bakvet ("naar smaak", "scheutje") → `vast` met `notitie`; al het andere → `lineair` met hoeveelheid + eenheid (`g`, `ml`, `kg`, `l`, `el`, `tl`, `stuk`).
4. **Stappen — strengste regels:**
   - Elke hoeveelheid in een staptekst wordt een `{id}`-verwijzing; nooit een hoeveelheid als losse tekst.
   - Aanwijzingen als "verwarm de oven voor op 200°C" of "breng water aan de kook" verdwijnen uit de staptekst en worden `vereist`-metadata (`oven`/`grill`/`waterkoker`/`pan-water` + temperatuur) op de stap die het apparaat gebruikt; de app genereert de melding zelf op het berekende moment.
   - `duur` (actieve minuten) en `wachttijd` (passieve minuten) per stap; niet vermeld → schatten en de schatting rapporteren.
5. **Foto.** Als de bron een foto heeft: via `scripts/foto-import.ts` (onderdeel 3) naar `recepten/<slug>.jpg`, en `foto` in de JSON zetten. Geen bruikbare foto → expliciet melden, veld weglaten.
6. **Poort.** `npm run valideer` én `npm test` moeten groen zijn; fouten eerst fixen. Daarna committen: `Recept toegevoegd: <titel>`.
7. **Rapport.** Samenvatting van het recept + álle aannames en schattingen op een rij + wat niet te vinden was (foto, tijden).

De SKILL.md bevat één volledig uitgewerkt voorbeeld (bron-tekst → JSON) dat de stijl vastlegt.

## Onderdeel 3: hulpscripts

- **`scripts/slug.ts <titel>`** — drukt de slug af. Logica als pure functie `maakSlug` in `src/lib/slug.ts`: kleine letters, diakrieten strippen ("Boeuf bourguignon" → `boeuf-bourguignon`), reeksen niet-alfanumeriek → één streepje, geen streepjes aan de randen. Unit tests.
- **`scripts/foto-import.ts <url-of-pad> <slug>`** — downloadt (URL) of kopieert (lokaal pad) de foto, verkleint naar max. 1600 px breed met `sharp` (bestaande dependency), schrijft `recepten/<slug>.jpg`. Faalt hard met duidelijke melding bij onbereikbare URL of onbruikbaar bestand; de skill rapporteert dat als "geen foto".

## Testen

Unit tests voor `maakSlug` en de `bron`-validatie. Het foto-script bewijst zichzelf bij gebruik; de bestaande buildvalidatie controleert al dat een foto waarnaar verwezen wordt echt bestaat.

## Buiten scope (bewust)

- Dedup-detectie ("dit recept heb je al").
- Batch-import van meerdere URL's tegelijk.
