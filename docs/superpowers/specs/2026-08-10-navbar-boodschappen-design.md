# Ontwerp: navbar + boodschappenlijst

Datum: 2026-08-10
Status: goedgekeurd

## Doel

Twee zaken die samen de site als app laten voelen:

1. Een **navigatiebalk** met de items *Recepten* en *Boodschappen* — op mobiel
   een vaste tabbalk onderaan (native-app-gevoel, zoals het referentieontwerp),
   op desktop een nette balk bovenaan.
2. Een werkende **boodschappenlijst**: vanaf een receptpagina zet je de
   (geschaalde) ingrediënten op de lijst; de boodschappenpagina toont ze
   samengevoegd en gegroepeerd op supermarktcategorie, afvinkbaar, met
   wisknop. Opslag in localStorage (net als de personen-schaling).

## 1. Navigatiebalk

- In `Basis.astro`, met prop `actief?: 'recepten' | 'boodschappen'`;
  de actieve tab kleurt groen, inactief grijs (`--inkt-zacht`).
- Twee tabs met inline-SVG-icoon + label: Recepten (kom-icoon),
  Boodschappen (boodschappentas-icoon).
- **Mobiel (< 40rem):** vast onderaan het scherm, wit, zachte schaduw,
  afgeronde bovenhoeken, `env(safe-area-inset-bottom)`-padding; `main` krijgt
  extra onderruimte zodat inhoud nooit achter de balk valt.
- **Desktop (≥ 40rem):** dezelfde balk als pilvormige balk bovenaan,
  gecentreerd, icoon en label naast elkaar.
- De terugknop op de receptpagina blijft bestaan.

## 2. Categorie in de data

- Nieuw optioneel ingrediëntveld `categorie` in `schema/recept.schema.json`
  en `typen.ts`, met vaste lijst (tevens loopvolgorde in de winkel):
  `groente-en-fruit`, `brood-en-bakkerij`, `vlees-en-vis`,
  `pasta-rijst-en-granen`, `conserven-en-potten`, `olie-en-sauzen`,
  `kruiden-en-specerijen`, `zuivel-en-eieren`, `kaas`, `diepvries`, `overig`.
  Ontbreekt het veld → `overig`.
- Weergavelabels via een mapping (bijv. `groente-en-fruit` → "Groente & fruit").
- De drie bestaande recepten krijgen categorieën; de recept-import-skill
  krijgt een regel zodat nieuwe imports het veld meteen vullen.

## 3. Boodschappenlijst

**Toevoegen.** Op de receptpagina onder de ingrediëntenkaart een groene
brede knop "Zet op boodschappenlijst" (de plek van "Start cooking" in de
referentie). Klik voegt de op dat moment geschaalde ingrediënten als losse
regels toe aan localStorage en bevestigt kort met "Toegevoegd ✓"; nogmaals
klikken voegt opnieuw toe (twee keer koken = dubbele hoeveelheden).

**Opslag.** Sleutel `boodschappen`:
`{ items: BoodschapItem[], afgevinkt: string[] }` met
`BoodschapItem = { naam, meervoud?, hoeveelheid?, eenheid?, categorie }`.
Rauwe regels; samenvoegen gebeurt bij het tonen.

**Samenvoegen** (nieuwe pure lib `src/lib/boodschappen.ts`, test-driven zoals
`schalen.ts`):
- Zelfde naam + verenigbare eenheid → optellen. `kg`→`g` en `l`→`ml` worden
  omgerekend vóór het optellen; bij tonen wordt ≥ 1000 g weer `kg` en
  ≥ 1000 ml weer `l`.
- Onverenigbare eenheden (el naast g) blijven aparte regels.
- Regels zonder hoeveelheid ("naar smaak") voegen samen op naam alleen.
- Meervoud bij totaal > 1 (zoals `ingredientDelen`); eenheid "stuk" wordt
  niet getoond.
- Afvinkstatus per samengevoegde regel via sleutel `naam|basiseenheid`.

**Boodschappenpagina** (`src/pages/boodschappen.astro`): statische schil,
clientscript rendert uit localStorage. Categorieën in de vaste loopvolgorde
als koppen, daaronder witte kaarten met rijen in de ingrediëntenstijl
(checkbox, naam, hoeveelheid rechts, afgevinkt = doorgestreept, status wordt
bewaard). Lege staat: tekst met link naar de recepten. Onderaan een
"Wis lijst"-knop die alles leegt.

## Buiten scope

Geen teller-badge op de tab, geen slimme suggesties, geen per-recept-groepen
of verwijderen per regel (afvinken + wissen dekt het gebruik), geen
samenvoegen van synoniemen ("rundergehakt" vs "gehakt").

## Aanpak

Vier taken: (1) types/schema + pure samenvoeg-lib met tests, (2) navbar en
alle nieuwe CSS, (3) boodschappenpagina, (4) receptknop + categorieën in de
drie recepten + importskill-regel. Bestaande tests blijven groen;
`npm run valideer` blijft groen.
