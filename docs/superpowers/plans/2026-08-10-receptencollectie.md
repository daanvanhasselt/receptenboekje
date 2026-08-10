# Receptencollectie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statische Astro-site die JSON-recepten uit `recepten/` rendert als mobielvriendelijke pagina's met berekende vooruitkijk-waarschuwingen en client-side personen-schaling.

**Architecture:** Pure logica (schalen, waarschuwingen, substitutie, validatie) staat als geteste TypeScript-modules in `src/lib/`. Astro-pagina's gebruiken die modules bij de build; het enige client-side JS is het personen-schalen (hergebruikt `schalen.ts`) en zoeken/filteren op het overzicht. Deploy naar GitHub Pages via GitHub Actions.

**Tech Stack:** Astro 5 (statisch), TypeScript (strict), Vitest, Ajv (JSON Schema-validatie), tsx (CLI-script), sharp (astro:assets).

**Spec:** `docs/superpowers/specs/2026-08-10-receptencollectie-design.md`

## Global Constraints

- Alle code, identifiers, teksten en commitboodschappen in het Nederlands (Engelse keywords van de taal uiteraard uitgezonderd).
- Recept-JSON's en foto's staan in `recepten/` (repo-root, búiten `src/`). Logica in `src/lib/` is puur (geen DOM, geen fs — behalve `laden.ts` dat bewust node-only is).
- Geen framework-runtime client-side: alleen vanilla `<script>`-eilanden in Astro.
- Waarschuwingsteksten komen ALTIJD uit templates in `src/lib/apparaten.ts`, nooit uit de JSON.
- Weergegeven hoeveelheden bij het basisaantal personen zijn exact de JSON-waarden (afronding alléén bij geschaalde waarden).
- Node ≥ 22, npm. Tests: `npm test` (Vitest, bestanden in `tests/*.test.ts`).
- Commits per taak; commitboodschap Nederlands, gevolgd door de standaard co-author-regel.

---

### Task 1: Projectscaffold + types

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/env.d.ts`, `src/pages/index.astro` (placeholder), `src/lib/typen.ts`

**Interfaces:**
- Produces: de types uit `src/lib/typen.ts` die alle latere taken gebruiken (exacte inhoud hieronder).

- [ ] **Step 1: Schrijf de configuratiebestanden**

`package.json`:

```json
{
  "name": "recepten",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "valideer": "tsx scripts/valideer.ts"
  },
  "dependencies": {
    "astro": "^5.13.0",
    "sharp": "^0.34.0"
  },
  "devDependencies": {
    "ajv": "^8.17.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  }
}
```

`astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://daanvanhasselt.github.io',
  base: process.env.BASE_PATH ?? '/',
});
```

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src", "tests", "scripts"],
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
});
```

`.gitignore`:

```
node_modules/
dist/
.astro/
```

`src/env.d.ts`:

```ts
/// <reference types="astro/client" />
```

`src/pages/index.astro` (tijdelijke placeholder, wordt in Task 9 vervangen):

```astro
---
---
<!doctype html>
<html lang="nl">
  <head><meta charset="utf-8" /><title>Recepten</title></head>
  <body><p>In aanbouw</p></body>
</html>
```

- [ ] **Step 2: Schrijf `src/lib/typen.ts`**

```ts
export type Schaling = 'lineair' | 'stuks' | 'vast';

export interface Ingredient {
  id: string;
  naam: string;
  meervoud?: string;
  hoeveelheid?: number;
  eenheid?: string;
  schaling: Schaling;
  notitie?: string;
}

export interface Vereist {
  apparaat: string;
  temperatuur?: number;
}

export interface Stap {
  tekst: string;
  duur?: number;
  wachttijd?: number;
  vereist?: Vereist;
}

export interface Recept {
  titel: string;
  beschrijving: string;
  personen: number;
  tags: string[];
  foto?: string;
  ingredienten: Ingredient[];
  stappen: Stap[];
}

export interface ReceptMetSlug extends Recept {
  slug: string;
}
```

- [ ] **Step 3: Installeer en bouw**

Run: `npm install && npm run build`
Expected: build slaagt, `dist/index.html` bestaat.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Projectscaffold: Astro, Vitest, types"
```

---

### Task 2: Schaal- en formatteerlogica (`schalen.ts`)

**Files:**
- Create: `src/lib/schalen.ts`
- Test: `tests/schalen.test.ts`

**Interfaces:**
- Consumes: `Ingredient`, `Schaling` uit `src/lib/typen.ts` (Task 1).
- Produces:
  - `schaalHoeveelheid(basis: number, schaling: Schaling, factor: number, eenheid?: string): number`
  - `formatteerHoeveelheid(waarde: number, eenheid?: string): string`
  - `ingredientTekst(ing: Ingredient, factor: number): string` — volledige weergavetekst ("375 g rundergehakt", "2 eieren", "zout"); dit is de functie die zowel build- als client-side gebruikt wordt.

Afrondingsregels (alleen bij `factor !== 1`):
- `g`/`ml`: < 10 → op 0,5; < 100 → op 5; ≥ 100 → op 25.
- `kg`/`l`: op 0,05.
- overig (incl. `el`, `tl`, `stuk`, ontbrekend): op 0,25.
- Nooit naar 0 afronden (minimaal één afrondstap).
- `stuks`: naar boven op hele stuks (`Math.ceil`), minimaal 1.
- `vast`: waarde ongewijzigd.

Weergaveregels:
- Decimalen met komma ("7,5 g", "1,25 l").
- Niet-metrische eenheden: kwartbreuken als ¼ ½ ¾, gemengd zonder spatie ("1½ el").
- Eenheid `stuk` wordt níét getoond: "2 eieren", niet "2 stuks ei". Bij afgeronde waarde > 1 en aanwezig `meervoud` wordt `meervoud` gebruikt i.p.v. `naam`.
- Ingredient zonder `hoeveelheid` (vast): alleen `naam` (notitie rendert de component apart).

- [ ] **Step 1: Schrijf de failing tests**

`tests/schalen.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { formatteerHoeveelheid, ingredientTekst, schaalHoeveelheid } from '../src/lib/schalen';
import type { Ingredient } from '../src/lib/typen';

const gehakt: Ingredient = { id: 'gehakt', naam: 'rundergehakt', hoeveelheid: 250, eenheid: 'g', schaling: 'lineair' };
const ei: Ingredient = { id: 'ei', naam: 'ei', meervoud: 'eieren', hoeveelheid: 1, eenheid: 'stuk', schaling: 'stuks' };
const olie: Ingredient = { id: 'olie', naam: 'olijfolie', hoeveelheid: 2, eenheid: 'el', schaling: 'vast' };
const zout: Ingredient = { id: 'zout', naam: 'zout', schaling: 'vast', notitie: 'naar smaak' };

describe('schaalHoeveelheid', () => {
  test('lineair, nette afronding op 25 g', () => {
    expect(schaalHoeveelheid(250, 'lineair', 1.5, 'g')).toBe(375);
  });
  test('factor 1 verandert niets, ook geen afronding', () => {
    expect(schaalHoeveelheid(333, 'lineair', 1, 'g')).toBe(333);
  });
  test('kleine waarden ronden niet naar 0', () => {
    expect(schaalHoeveelheid(1, 'lineair', 0.25, 'g')).toBe(0.5);
  });
  test('liters op 0,05', () => {
    expect(schaalHoeveelheid(1, 'lineair', 1.25, 'l')).toBe(1.25);
  });
  test('stuks naar boven op hele stuks', () => {
    expect(schaalHoeveelheid(1, 'stuks', 1.5)).toBe(2);
    expect(schaalHoeveelheid(2, 'stuks', 2)).toBe(4);
  });
  test('vast schaalt niet', () => {
    expect(schaalHoeveelheid(2, 'vast', 3, 'el')).toBe(2);
  });
});

describe('formatteerHoeveelheid', () => {
  test('metrisch met komma', () => {
    expect(formatteerHoeveelheid(375, 'g')).toBe('375 g');
    expect(formatteerHoeveelheid(7.5, 'g')).toBe('7,5 g');
    expect(formatteerHoeveelheid(1.25, 'l')).toBe('1,25 l');
  });
  test('breuken voor lepels', () => {
    expect(formatteerHoeveelheid(0.75, 'tl')).toBe('¾ tl');
    expect(formatteerHoeveelheid(1.5, 'el')).toBe('1½ el');
  });
});

describe('ingredientTekst', () => {
  test('lineair geschaald', () => {
    expect(ingredientTekst(gehakt, 1.5)).toBe('375 g rundergehakt');
  });
  test('stuks met meervoud, eenheid stuk onzichtbaar', () => {
    expect(ingredientTekst(ei, 1)).toBe('1 ei');
    expect(ingredientTekst(ei, 1.5)).toBe('2 eieren');
  });
  test('vast met hoeveelheid blijft gelijk', () => {
    expect(ingredientTekst(olie, 3)).toBe('2 el olijfolie');
  });
  test('vast zonder hoeveelheid: alleen naam', () => {
    expect(ingredientTekst(zout, 2)).toBe('zout');
  });
});
```

- [ ] **Step 2: Run de tests, verwacht falen**

Run: `npx vitest run tests/schalen.test.ts`
Expected: FAIL — module `../src/lib/schalen` bestaat niet.

- [ ] **Step 3: Implementeer `src/lib/schalen.ts`**

```ts
import type { Ingredient, Schaling } from './typen';

const BREUKEN: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };
const METRISCH = new Set(['g', 'ml', 'kg', 'l']);

function rondOp(waarde: number, stap: number): number {
  return Number((Math.max(1, Math.round(waarde / stap)) * stap).toFixed(4));
}

function afrondstap(waarde: number, eenheid?: string): number {
  if (eenheid === 'g' || eenheid === 'ml') {
    if (waarde < 10) return 0.5;
    if (waarde < 100) return 5;
    return 25;
  }
  if (eenheid === 'kg' || eenheid === 'l') return 0.05;
  return 0.25;
}

export function schaalHoeveelheid(basis: number, schaling: Schaling, factor: number, eenheid?: string): number {
  if (schaling === 'vast' || factor === 1) return basis;
  if (schaling === 'stuks') return Math.max(1, Math.ceil(basis * factor - 1e-9));
  const geschaald = basis * factor;
  return rondOp(geschaald, afrondstap(geschaald, eenheid));
}

export function formatteerHoeveelheid(waarde: number, eenheid?: string): string {
  let getal: string;
  if (eenheid !== undefined && METRISCH.has(eenheid)) {
    getal = String(Number(waarde.toFixed(2))).replace('.', ',');
  } else {
    const heel = Math.floor(waarde + 1e-9);
    const rest = Number((waarde - heel).toFixed(2));
    const breuk = BREUKEN[String(rest)];
    if (breuk !== undefined) getal = heel > 0 ? `${heel}${breuk}` : breuk;
    else getal = String(Number(waarde.toFixed(2))).replace('.', ',');
  }
  return eenheid === undefined ? getal : `${getal} ${eenheid}`;
}

export function ingredientTekst(ing: Ingredient, factor: number): string {
  if (ing.hoeveelheid === undefined) return ing.naam;
  const waarde = schaalHoeveelheid(ing.hoeveelheid, ing.schaling, factor, ing.eenheid);
  const naam = waarde > 1 && ing.meervoud !== undefined ? ing.meervoud : ing.naam;
  const toonEenheid = ing.eenheid !== undefined && ing.eenheid !== 'stuk' ? ing.eenheid : undefined;
  return `${formatteerHoeveelheid(waarde, toonEenheid)} ${naam}`;
}
```

Let op `rondOp`: `Math.max(1, …)` zorgt dat er nooit naar 0 wordt afgerond (minimaal één afrondstap).

- [ ] **Step 4: Run de tests, verwacht groen**

Run: `npx vitest run tests/schalen.test.ts`
Expected: PASS, alle tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schalen.ts tests/schalen.test.ts
git commit -m "Schaal- en formatteerlogica voor hoeveelheden"
```

---

### Task 3: Staptekst-substitutie (`substitutie.ts`)

**Files:**
- Create: `src/lib/substitutie.ts`
- Test: `tests/substitutie.test.ts`

**Interfaces:**
- Produces:
  - `type Segment = { type: 'tekst'; waarde: string } | { type: 'ingredient'; id: string }`
  - `parseStaptekst(tekst: string): Segment[]` — splitst een staptekst op `{id}`-verwijzingen (id-patroon: `[a-z0-9-]+`). Tekst zonder verwijzingen levert één tekst-segment. Onbekende ids worden hier NIET gecontroleerd (dat doet `valideer.ts`, Task 6).

- [ ] **Step 1: Schrijf de failing tests**

`tests/substitutie.test.ts`:

```ts
import { expect, test } from 'vitest';
import { parseStaptekst } from '../src/lib/substitutie';

test('tekst zonder verwijzingen is één segment', () => {
  expect(parseStaptekst('Giet de pasta af.')).toEqual([{ type: 'tekst', waarde: 'Giet de pasta af.' }]);
});

test('verwijzing middenin', () => {
  expect(parseStaptekst('Voeg {gehakt} toe.')).toEqual([
    { type: 'tekst', waarde: 'Voeg ' },
    { type: 'ingredient', id: 'gehakt' },
    { type: 'tekst', waarde: ' toe.' },
  ]);
});

test('meerdere verwijzingen, ook aan het eind', () => {
  expect(parseStaptekst('Meng {bloem} met {gist}')).toEqual([
    { type: 'tekst', waarde: 'Meng ' },
    { type: 'ingredient', id: 'bloem' },
    { type: 'tekst', waarde: ' met ' },
    { type: 'ingredient', id: 'gist' },
  ]);
});

test('accolades die geen geldig id vormen blijven tekst', () => {
  expect(parseStaptekst('vouw {NIET} dicht')).toEqual([{ type: 'tekst', waarde: 'vouw {NIET} dicht' }]);
});
```

- [ ] **Step 2: Run de tests, verwacht falen**

Run: `npx vitest run tests/substitutie.test.ts`
Expected: FAIL — module bestaat niet.

- [ ] **Step 3: Implementeer `src/lib/substitutie.ts`**

```ts
export type Segment = { type: 'tekst'; waarde: string } | { type: 'ingredient'; id: string };

const VERWIJZING = /\{([a-z0-9-]+)\}/g;

export function parseStaptekst(tekst: string): Segment[] {
  const segmenten: Segment[] = [];
  let vorige = 0;
  for (const match of tekst.matchAll(VERWIJZING)) {
    if (match.index > vorige) segmenten.push({ type: 'tekst', waarde: tekst.slice(vorige, match.index) });
    segmenten.push({ type: 'ingredient', id: match[1] });
    vorige = match.index + match[0].length;
  }
  if (vorige < tekst.length) segmenten.push({ type: 'tekst', waarde: tekst.slice(vorige) });
  return segmenten;
}
```

- [ ] **Step 4: Run de tests, verwacht groen**

Run: `npx vitest run tests/substitutie.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/substitutie.ts tests/substitutie.test.ts
git commit -m "Staptekst-substitutie: parser voor {id}-verwijzingen"
```

---

### Task 4: Tijdrekenen (`tijden.ts`)

**Files:**
- Create: `src/lib/tijden.ts`
- Test: `tests/tijden.test.ts`

**Interfaces:**
- Consumes: `Stap` uit `src/lib/typen.ts`.
- Produces:
  - `totaalTijd(stappen: Stap[]): { actief: number; wachten: number }` — som van `duur` resp. `wachttijd` (ontbrekend telt als 0).
  - `cumulatieveTijd(stappen: Stap[]): number[]` — array van lengte `stappen.length + 1`; element `i` is de totale tijd (duur + wachttijd) vóór stap `i`.
  - `formatteerMinuten(minuten: number): string` — "45 min.", "1 uur", "1 uur 15 min."

- [ ] **Step 1: Schrijf de failing tests**

`tests/tijden.test.ts`:

```ts
import { expect, test } from 'vitest';
import { cumulatieveTijd, formatteerMinuten, totaalTijd } from '../src/lib/tijden';
import type { Stap } from '../src/lib/typen';

const stappen: Stap[] = [
  { tekst: 'a', duur: 5 },
  { tekst: 'b', duur: 2, wachttijd: 60 },
  { tekst: 'c' },
  { tekst: 'd', duur: 8 },
];

test('totaalTijd telt duur en wachttijd apart op', () => {
  expect(totaalTijd(stappen)).toEqual({ actief: 15, wachten: 60 });
});

test('cumulatieveTijd geeft tijd vóór elke stap', () => {
  expect(cumulatieveTijd(stappen)).toEqual([0, 5, 67, 67, 75]);
});

test('formatteerMinuten', () => {
  expect(formatteerMinuten(45)).toBe('45 min.');
  expect(formatteerMinuten(60)).toBe('1 uur');
  expect(formatteerMinuten(75)).toBe('1 uur 15 min.');
});
```

- [ ] **Step 2: Run de tests, verwacht falen**

Run: `npx vitest run tests/tijden.test.ts`
Expected: FAIL — module bestaat niet.

- [ ] **Step 3: Implementeer `src/lib/tijden.ts`**

```ts
import type { Stap } from './typen';

export function totaalTijd(stappen: Stap[]): { actief: number; wachten: number } {
  let actief = 0;
  let wachten = 0;
  for (const stap of stappen) {
    actief += stap.duur ?? 0;
    wachten += stap.wachttijd ?? 0;
  }
  return { actief, wachten };
}

export function cumulatieveTijd(stappen: Stap[]): number[] {
  const cum = [0];
  for (const stap of stappen) {
    cum.push(cum[cum.length - 1] + (stap.duur ?? 0) + (stap.wachttijd ?? 0));
  }
  return cum;
}

export function formatteerMinuten(minuten: number): string {
  if (minuten < 60) return `${minuten} min.`;
  const uur = Math.floor(minuten / 60);
  const rest = minuten % 60;
  return rest === 0 ? `${uur} uur` : `${uur} uur ${rest} min.`;
}
```

- [ ] **Step 4: Run de tests, verwacht groen**

Run: `npx vitest run tests/tijden.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tijden.ts tests/tijden.test.ts
git commit -m "Tijdrekenen: totalen, cumulatief, minutenformattering"
```

---

### Task 5: Waarschuwingslogica (`apparaten.ts` + `waarschuwingen.ts`)

**Files:**
- Create: `src/lib/apparaten.ts`, `src/lib/waarschuwingen.ts`
- Test: `tests/waarschuwingen.test.ts`

**Interfaces:**
- Consumes: `Stap` uit `typen.ts`; `cumulatieveTijd`, `totaalTijd`, `formatteerMinuten` uit `tijden.ts` (Task 4).
- Produces:
  - `apparaten.ts`: `interface Apparaat { opwarmtijd: number; aanzetten: string; wijzigen?: string }` en `const APPARATEN: Record<string, Apparaat>` met sleutels `oven`, `grill`, `waterkoker`, `pan-water`. Templates bevatten `{wanneer}` (wordt vervangen door `'nu '`, `'eerst '` of `''`) en optioneel `{temperatuur}`.
  - `waarschuwingen.ts`:
    - `interface WaarschuwingsPlaatsing { vooraf: string[]; perStap: string[][] }` — `perStap[i]` zijn meldingen die vóór stap `i` getoond worden; `vooraf` komt helemaal bovenaan het recept.
    - `plaatsWaarschuwingen(stappen: Stap[], apparaten?: Record<string, Apparaat>): WaarschuwingsPlaatsing`
    - `wachttijdSamenvatting(stappen: Stap[]): string | null` — samenvatting als een stap `wachttijd >= 30` heeft, anders `null`.

Plaatsingsalgoritme voor een stap `i` met `vereist`:
1. Sla over als het apparaat al aangekondigd is op dezelfde temperatuur; gebruik het `wijzigen`-template als het apparaat al aan is maar de temperatuur wijzigt.
2. Zoek de grootste `k ≤ i` waarvoor `cum[i] − cum[k] ≥ opwarmtijd`.
3. Geen `k` → melding in `vooraf` met `{wanneer}` = `'eerst '`, eindigend op punt.
4. Als stap `k` zelf `wachttijd ≥ opwarmtijd` heeft én `cum[i] − cum[k+1] < opwarmtijd` (de benodigde tijd zit dus ín de wachttijd van stap `k`): melding in `perStap[k]` als `"Tegen het einde van de wachttijd: {template met {wanneer}=''} …"` met kleine beginletter van het ingevulde template, eindigend op punt.
5. Anders: melding in `perStap[k]` met `{wanneer}` = `'nu '` en suffix `" — nodig over ±X min."` waar `X = cum[i] − cum[k]`.

- [ ] **Step 1: Schrijf de failing tests**

`tests/waarschuwingen.test.ts`:

```ts
import { expect, test } from 'vitest';
import { plaatsWaarschuwingen, wachttijdSamenvatting } from '../src/lib/waarschuwingen';
import type { Stap } from '../src/lib/typen';

function stap(duur: number, extra: Partial<Stap> = {}): Stap {
  return { tekst: 'x', duur, ...extra };
}

test('oven-waarschuwing op de laatste stap met genoeg voortijd', () => {
  // cum = [0, 5, 13, 28, 36, 43]; oven (15 min) nodig bij stap 5 → cum[5]-cum[k] >= 15 → k=3 (43-28=15)
  const stappen = [stap(5), stap(8), stap(15), stap(8), stap(7), stap(5, { vereist: { apparaat: 'oven', temperatuur: 180 } })];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.vooraf).toEqual([]);
  expect(p.perStap[3]).toEqual(['Zet nu de oven aan op 180°C — nodig over ±15 min.']);
});

test('onvoldoende voortijd → vooraf met "eerst"', () => {
  const stappen = [stap(5), stap(12, { vereist: { apparaat: 'pan-water' } })];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.vooraf).toEqual(['Breng eerst een pan water aan de kook.']);
  expect(p.perStap.flat()).toEqual([]);
});

test('temperatuurwissel gebruikt wijzigen-template op het juiste moment', () => {
  const stappen = [
    stap(20, { vereist: { apparaat: 'oven', temperatuur: 180 } }),
    stap(20),
    stap(5, { vereist: { apparaat: 'oven', temperatuur: 220 } }),
  ];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.perStap[1]).toEqual(['Zet nu de oven op 220°C — nodig over ±20 min.']);
});

test('zelfde apparaat en temperatuur nogmaals → geen tweede melding', () => {
  const stappen = [
    stap(20, { vereist: { apparaat: 'oven', temperatuur: 180 } }),
    stap(20, { vereist: { apparaat: 'oven', temperatuur: 180 } }),
  ];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.vooraf.length + p.perStap.flat().length).toBe(1);
});

test('lange wachttijd → melding "tegen het einde van de wachttijd"', () => {
  // cum = [0, 12, 74, 82, 84]; oven nodig bij stap 3; k=1 (82-12=70 >= 15), stap 1 heeft wachttijd 60 >= 15 en cum[3]-cum[2]=8 < 15
  const stappen = [stap(12), stap(2, { wachttijd: 60 }), stap(8), stap(2, { vereist: { apparaat: 'oven', temperatuur: 220 } })];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.perStap[1]).toEqual(['Tegen het einde van de wachttijd: zet de oven aan op 220°C.']);
});

test('wachttijdSamenvatting alleen bij wachttijd >= 30', () => {
  expect(wachttijdSamenvatting([stap(10), stap(2, { wachttijd: 60 })])).toBe(
    'Reken naast ±12 min. actief koken op ±1 uur wachttijd.'
  );
  expect(wachttijdSamenvatting([stap(10), stap(2, { wachttijd: 10 })])).toBeNull();
});
```

- [ ] **Step 2: Run de tests, verwacht falen**

Run: `npx vitest run tests/waarschuwingen.test.ts`
Expected: FAIL — modules bestaan niet.

- [ ] **Step 3: Implementeer `src/lib/apparaten.ts`**

```ts
export interface Apparaat {
  opwarmtijd: number;
  aanzetten: string;
  wijzigen?: string;
}

export const APPARATEN: Record<string, Apparaat> = {
  oven: {
    opwarmtijd: 15,
    aanzetten: 'Zet {wanneer}de oven aan op {temperatuur}°C',
    wijzigen: 'Zet {wanneer}de oven op {temperatuur}°C',
  },
  grill: { opwarmtijd: 10, aanzetten: 'Zet {wanneer}de grill aan' },
  waterkoker: { opwarmtijd: 3, aanzetten: 'Zet {wanneer}de waterkoker aan' },
  'pan-water': { opwarmtijd: 10, aanzetten: 'Breng {wanneer}een pan water aan de kook' },
};
```

- [ ] **Step 4: Implementeer `src/lib/waarschuwingen.ts`**

```ts
import { APPARATEN, type Apparaat } from './apparaten';
import { cumulatieveTijd, formatteerMinuten, totaalTijd } from './tijden';
import type { Stap } from './typen';

export interface WaarschuwingsPlaatsing {
  vooraf: string[];
  perStap: string[][];
}

function vul(sjabloon: string, wanneer: '' | 'nu ' | 'eerst ', temperatuur?: number): string {
  return sjabloon.replace('{wanneer}', wanneer).replace('{temperatuur}', String(temperatuur ?? ''));
}

export function plaatsWaarschuwingen(
  stappen: Stap[],
  apparaten: Record<string, Apparaat> = APPARATEN
): WaarschuwingsPlaatsing {
  const cum = cumulatieveTijd(stappen);
  const vooraf: string[] = [];
  const perStap: string[][] = stappen.map(() => []);
  const status: Record<string, number | 'aan'> = {};

  stappen.forEach((stap, i) => {
    if (!stap.vereist) return;
    const apparaat = apparaten[stap.vereist.apparaat];
    const gewenst = stap.vereist.temperatuur ?? 'aan';
    const huidig = status[stap.vereist.apparaat];
    if (huidig === gewenst) return;
    const alAan = huidig !== undefined;
    status[stap.vereist.apparaat] = gewenst;
    const sjabloon = alAan && apparaat.wijzigen !== undefined ? apparaat.wijzigen : apparaat.aanzetten;

    let k = -1;
    for (let kandidaat = i; kandidaat >= 0; kandidaat--) {
      if (cum[i] - cum[kandidaat] >= apparaat.opwarmtijd) {
        k = kandidaat;
        break;
      }
    }

    if (k === -1) {
      vooraf.push(`${vul(sjabloon, 'eerst ', stap.vereist.temperatuur)}.`);
    } else if ((stappen[k].wachttijd ?? 0) >= apparaat.opwarmtijd && cum[i] - cum[k + 1] < apparaat.opwarmtijd) {
      const ingevuld = vul(sjabloon, '', stap.vereist.temperatuur);
      perStap[k].push(`Tegen het einde van de wachttijd: ${ingevuld.charAt(0).toLowerCase()}${ingevuld.slice(1)}.`);
    } else {
      perStap[k].push(`${vul(sjabloon, 'nu ', stap.vereist.temperatuur)} — nodig over ±${cum[i] - cum[k]} min.`);
    }
  });

  return { vooraf, perStap };
}

export function wachttijdSamenvatting(stappen: Stap[]): string | null {
  if (!stappen.some((stap) => (stap.wachttijd ?? 0) >= 30)) return null;
  const { actief, wachten } = totaalTijd(stappen);
  return `Reken naast ±${formatteerMinuten(actief)} actief koken op ±${formatteerMinuten(wachten)} wachttijd.`;
}
```

- [ ] **Step 5: Run de tests, verwacht groen**

Run: `npx vitest run tests/waarschuwingen.test.ts`
Expected: PASS, alle 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/apparaten.ts src/lib/waarschuwingen.ts tests/waarschuwingen.test.ts
git commit -m "Waarschuwingslogica: plaatsing van apparaat- en wachttijdmeldingen"
```

---

### Task 6: JSON Schema + validatie (`valideer.ts`)

**Files:**
- Create: `schema/recept.schema.json`, `src/lib/valideer.ts`, `scripts/valideer.ts`
- Test: `tests/valideer.test.ts`

**Interfaces:**
- Consumes: `parseStaptekst` (Task 3), `APPARATEN` (Task 5), `Recept` (Task 1).
- Produces:
  - `interface ValidatieFout { bestand: string; fout: string }`
  - `valideerRecept(bestand: string, data: unknown, fotoBestaat?: (naam: string) => boolean): ValidatieFout[]` — leeg array = geldig. Ajv-schemacontrole eerst; alleen als die slaagt volgen semantische checks: unieke ingredient-ids, `{id}`-verwijzingen bestaan, niet-`vast` ingrediënten hebben `hoeveelheid` én `eenheid`, `vereist.apparaat` bestaat in `APPARATEN`, foto bestaat (via callback, default altijd waar).
  - `scripts/valideer.ts`: CLI die `laadRecepten()` (Task 7) aanroept — maar Task 7 bestaat nog niet, dus in déze taak valideert de CLI de losse bestanden in `recepten/` rechtstreeks; zie Step 5. (Task 7 vervangt de CLI-body door `laadRecepten()`.)

- [ ] **Step 1: Schrijf `schema/recept.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "recept.schema.json",
  "title": "Recept",
  "type": "object",
  "required": ["titel", "beschrijving", "personen", "tags", "ingredienten", "stappen"],
  "additionalProperties": false,
  "properties": {
    "titel": { "type": "string", "minLength": 1 },
    "beschrijving": { "type": "string" },
    "personen": { "type": "integer", "minimum": 1 },
    "tags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "foto": { "type": "string" },
    "ingredienten": { "type": "array", "minItems": 1, "items": { "$ref": "#/definitions/ingredient" } },
    "stappen": { "type": "array", "minItems": 1, "items": { "$ref": "#/definitions/stap" } }
  },
  "definitions": {
    "ingredient": {
      "type": "object",
      "required": ["id", "naam", "schaling"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
        "naam": { "type": "string", "minLength": 1 },
        "meervoud": { "type": "string", "minLength": 1 },
        "hoeveelheid": { "type": "number", "exclusiveMinimum": 0 },
        "eenheid": { "type": "string", "minLength": 1 },
        "schaling": { "enum": ["lineair", "stuks", "vast"] },
        "notitie": { "type": "string" }
      }
    },
    "stap": {
      "type": "object",
      "required": ["tekst"],
      "additionalProperties": false,
      "properties": {
        "tekst": { "type": "string", "minLength": 1 },
        "duur": { "type": "number", "minimum": 0 },
        "wachttijd": { "type": "number", "minimum": 0 },
        "vereist": {
          "type": "object",
          "required": ["apparaat"],
          "additionalProperties": false,
          "properties": {
            "apparaat": { "type": "string" },
            "temperatuur": { "type": "number" }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Schrijf de failing tests**

`tests/valideer.test.ts`:

```ts
import { expect, test } from 'vitest';
import { valideerRecept } from '../src/lib/valideer';

const geldig = {
  titel: 'Test',
  beschrijving: 'Testrecept',
  personen: 2,
  tags: ['test'],
  ingredienten: [
    { id: 'pasta', naam: 'penne', hoeveelheid: 200, eenheid: 'g', schaling: 'lineair' },
    { id: 'zout', naam: 'zout', schaling: 'vast' },
  ],
  stappen: [{ tekst: 'Kook {pasta} met {zout}.', duur: 10, vereist: { apparaat: 'pan-water' } }],
};

test('geldig recept levert geen fouten', () => {
  expect(valideerRecept('test.json', geldig)).toEqual([]);
});

test('schemafout: personen ontbreekt', () => {
  const { personen: _weg, ...zonder } = geldig;
  const fouten = valideerRecept('test.json', zonder);
  expect(fouten.length).toBeGreaterThan(0);
  expect(fouten[0]!.bestand).toBe('test.json');
});

test('verwijzing naar onbekend ingredient', () => {
  const kapot = { ...geldig, stappen: [{ tekst: 'Voeg {kaas} toe.' }] };
  expect(valideerRecept('test.json', kapot).map((f) => f.fout)).toEqual([
    'stap 1: verwijzing {kaas} bestaat niet als ingrediënt',
  ]);
});

test('dubbel ingredient-id', () => {
  const kapot = { ...geldig, ingredienten: [...geldig.ingredienten, { id: 'pasta', naam: 'nogmaals', hoeveelheid: 1, eenheid: 'g', schaling: 'lineair' }] };
  expect(valideerRecept('test.json', kapot).map((f) => f.fout)).toEqual(['dubbel ingrediënt-id "pasta"']);
});

test('niet-vast zonder hoeveelheid/eenheid', () => {
  const kapot = { ...geldig, ingredienten: [{ id: 'pasta', naam: 'penne', schaling: 'lineair' }], stappen: [{ tekst: 'Kook {pasta}.' }] };
  expect(valideerRecept('test.json', kapot).map((f) => f.fout)).toEqual([
    'ingrediënt "pasta": schaling "lineair" vereist hoeveelheid en eenheid',
  ]);
});

test('onbekend apparaat', () => {
  const kapot = { ...geldig, stappen: [{ tekst: 'Kook {pasta} met {zout}.', vereist: { apparaat: 'airfryer' } }] };
  expect(valideerRecept('test.json', kapot).map((f) => f.fout)).toEqual(['stap 1: onbekend apparaat "airfryer"']);
});

test('ontbrekende foto', () => {
  const met = { ...geldig, foto: 'test.jpg' };
  expect(valideerRecept('test.json', met, () => false).map((f) => f.fout)).toEqual(['foto "test.jpg" niet gevonden']);
});
```

- [ ] **Step 3: Run de tests, verwacht falen**

Run: `npx vitest run tests/valideer.test.ts`
Expected: FAIL — module bestaat niet.

- [ ] **Step 4: Implementeer `src/lib/valideer.ts`**

```ts
import Ajv from 'ajv';
import receptSchema from '../../schema/recept.schema.json';
import { APPARATEN } from './apparaten';
import { parseStaptekst } from './substitutie';
import type { Recept } from './typen';

const ajv = new Ajv({ allErrors: true });
const schemaControle = ajv.compile(receptSchema);

export interface ValidatieFout {
  bestand: string;
  fout: string;
}

export function valideerRecept(
  bestand: string,
  data: unknown,
  fotoBestaat: (naam: string) => boolean = () => true
): ValidatieFout[] {
  const fouten: ValidatieFout[] = [];

  if (!schemaControle(data)) {
    for (const fout of schemaControle.errors ?? []) {
      fouten.push({ bestand, fout: `${fout.instancePath || '(root)'} ${fout.message}` });
    }
    return fouten;
  }

  const recept = data as unknown as Recept;
  const ids = new Set<string>();
  for (const ingredient of recept.ingredienten) {
    if (ids.has(ingredient.id)) fouten.push({ bestand, fout: `dubbel ingrediënt-id "${ingredient.id}"` });
    ids.add(ingredient.id);
    if (ingredient.schaling !== 'vast' && (ingredient.hoeveelheid === undefined || ingredient.eenheid === undefined)) {
      fouten.push({
        bestand,
        fout: `ingrediënt "${ingredient.id}": schaling "${ingredient.schaling}" vereist hoeveelheid en eenheid`,
      });
    }
  }

  recept.stappen.forEach((stap, i) => {
    for (const segment of parseStaptekst(stap.tekst)) {
      if (segment.type === 'ingredient' && !ids.has(segment.id)) {
        fouten.push({ bestand, fout: `stap ${i + 1}: verwijzing {${segment.id}} bestaat niet als ingrediënt` });
      }
    }
    if (stap.vereist && !(stap.vereist.apparaat in APPARATEN)) {
      fouten.push({ bestand, fout: `stap ${i + 1}: onbekend apparaat "${stap.vereist.apparaat}"` });
    }
  });

  if (recept.foto !== undefined && !fotoBestaat(recept.foto)) {
    fouten.push({ bestand, fout: `foto "${recept.foto}" niet gevonden` });
  }

  return fouten;
}
```

- [ ] **Step 5: Schrijf de voorlopige CLI `scripts/valideer.ts`**

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { valideerRecept, type ValidatieFout } from '../src/lib/valideer';

const map = join(process.cwd(), 'recepten');
const bestanden = existsSync(map) ? readdirSync(map).filter((b) => b.endsWith('.json')).sort() : [];
const fouten: ValidatieFout[] = [];

for (const bestand of bestanden) {
  try {
    const data = JSON.parse(readFileSync(join(map, bestand), 'utf8'));
    fouten.push(...valideerRecept(bestand, data, (naam) => existsSync(join(map, naam))));
  } catch (fout) {
    fouten.push({ bestand, fout: `geen geldige JSON: ${(fout as Error).message}` });
  }
}

if (fouten.length > 0) {
  for (const { bestand, fout } of fouten) console.error(`✗ ${bestand}: ${fout}`);
  process.exit(1);
}
console.log(`✓ ${bestanden.length} recept(en) geldig`);
```

- [ ] **Step 6: Run tests en CLI, verwacht groen**

Run: `npx vitest run tests/valideer.test.ts && npm run valideer`
Expected: alle tests PASS; CLI meldt "✓ 0 recept(en) geldig" (map is nog leeg).

- [ ] **Step 7: Commit**

```bash
git add schema/recept.schema.json src/lib/valideer.ts scripts/valideer.ts tests/valideer.test.ts
git commit -m "JSON Schema en validatie met semantische checks"
```

---

### Task 7: Receptlader (`laden.ts`) + voorbeeldrecepten

**Files:**
- Create: `src/lib/laden.ts`, `recepten/pasta-pesto.json`, `recepten/lasagne.json`, `recepten/focaccia.json`, `tests/fixtures/kapot/ongeldig.json`
- Modify: `scripts/valideer.ts` (body vervangen door `laadRecepten()`)
- Test: `tests/laden.test.ts`

**Interfaces:**
- Consumes: `valideerRecept` (Task 6), `ReceptMetSlug` (Task 1).
- Produces: `laadRecepten(map?: string): ReceptMetSlug[]` — leest alle `*.json` uit de map (default `<cwd>/recepten`), valideert, kent `slug` toe (bestandsnaam zonder `.json`), sorteert op titel (nl-collatie). Gooit één `Error` met álle fouten (formaat `  <bestand>: <fout>` per regel) als er iets mis is. Ook JSON-parsefouten worden zo gemeld.

- [ ] **Step 1: Schrijf de voorbeeldrecepten**

`recepten/pasta-pesto.json`:

```json
{
  "titel": "Pasta met pesto en cherrytomaatjes",
  "beschrijving": "Snelle doordeweekse pasta: pesto, zacht gebakken cherrytomaatjes en geroosterde pijnboompitten.",
  "personen": 2,
  "tags": ["pasta", "snel", "vega"],
  "ingredienten": [
    { "id": "pasta", "naam": "penne", "hoeveelheid": 200, "eenheid": "g", "schaling": "lineair" },
    { "id": "pesto", "naam": "groene pesto", "hoeveelheid": 80, "eenheid": "g", "schaling": "lineair" },
    { "id": "tomaatjes", "naam": "cherrytomaatjes", "hoeveelheid": 250, "eenheid": "g", "schaling": "lineair" },
    { "id": "pijnboompitten", "naam": "pijnboompitten", "hoeveelheid": 30, "eenheid": "g", "schaling": "lineair" },
    { "id": "parmezaan", "naam": "geraspte Parmezaanse kaas", "hoeveelheid": 40, "eenheid": "g", "schaling": "lineair" },
    { "id": "olijfolie", "naam": "olijfolie", "schaling": "vast", "notitie": "scheutje" },
    { "id": "zout", "naam": "zout", "schaling": "vast", "notitie": "naar smaak" }
  ],
  "stappen": [
    { "tekst": "Halveer {tomaatjes} en bak ze zacht in {olijfolie} op middelhoog vuur.", "duur": 5 },
    { "tekst": "Kook {pasta} beetgaar in ruim water met {zout}.", "duur": 12, "vereist": { "apparaat": "pan-water" } },
    { "tekst": "Rooster {pijnboompitten} goudbruin in een droge koekenpan.", "duur": 3 },
    { "tekst": "Giet de pasta af, roer {pesto} en de tomaatjes erdoor en serveer met {parmezaan} en de pijnboompitten.", "duur": 2 }
  ]
}
```

`recepten/lasagne.json`:

```json
{
  "titel": "Lasagne",
  "beschrijving": "Klassieke lasagne met ragù en bechamel.",
  "personen": 4,
  "tags": ["pasta", "oven", "italiaans"],
  "ingredienten": [
    { "id": "gehakt", "naam": "rundergehakt", "hoeveelheid": 500, "eenheid": "g", "schaling": "lineair" },
    { "id": "ui", "naam": "ui", "meervoud": "uien", "hoeveelheid": 1, "eenheid": "stuk", "schaling": "stuks" },
    { "id": "knoflook", "naam": "teen knoflook", "meervoud": "tenen knoflook", "hoeveelheid": 2, "eenheid": "stuk", "schaling": "stuks" },
    { "id": "tomatenblokjes", "naam": "tomatenblokjes", "hoeveelheid": 800, "eenheid": "g", "schaling": "lineair" },
    { "id": "lasagnebladen", "naam": "lasagnebladen", "hoeveelheid": 250, "eenheid": "g", "schaling": "lineair" },
    { "id": "boter", "naam": "boter", "hoeveelheid": 40, "eenheid": "g", "schaling": "lineair" },
    { "id": "bloem", "naam": "bloem", "hoeveelheid": 40, "eenheid": "g", "schaling": "lineair" },
    { "id": "melk", "naam": "melk", "hoeveelheid": 500, "eenheid": "ml", "schaling": "lineair" },
    { "id": "kaas", "naam": "geraspte kaas", "hoeveelheid": 100, "eenheid": "g", "schaling": "lineair" },
    { "id": "olijfolie", "naam": "olijfolie", "schaling": "vast", "notitie": "om te bakken" },
    { "id": "zout", "naam": "zout en peper", "schaling": "vast", "notitie": "naar smaak" }
  ],
  "stappen": [
    { "tekst": "Snipper {ui} en snijd {knoflook} fijn. Fruit beide glazig in {olijfolie}.", "duur": 5 },
    { "tekst": "Voeg {gehakt} toe en bak rul. Breng op smaak met {zout}.", "duur": 8 },
    { "tekst": "Roer {tomatenblokjes} erdoor en laat de saus zachtjes pruttelen.", "duur": 15 },
    { "tekst": "Smelt {boter} in een steelpan, roer {bloem} erdoor en laat 2 minuten garen. Giet {melk} er al roerend bij tot een gladde bechamel.", "duur": 8 },
    { "tekst": "Vet een ovenschaal in en bouw lagen: saus, {lasagnebladen}, bechamel. Eindig met bechamel en {kaas}.", "duur": 7 },
    { "tekst": "Bak de lasagne goudbruin en gaar in de oven, ±35 minuten.", "duur": 5, "wachttijd": 35, "vereist": { "apparaat": "oven", "temperatuur": 180 } }
  ]
}
```

`recepten/focaccia.json`:

```json
{
  "titel": "Focaccia met rozemarijn",
  "beschrijving": "Luchtig Italiaans platbrood met olijfolie, grof zeezout en rozemarijn.",
  "personen": 4,
  "tags": ["brood", "oven", "vega"],
  "ingredienten": [
    { "id": "bloem", "naam": "tarwebloem", "hoeveelheid": 400, "eenheid": "g", "schaling": "lineair" },
    { "id": "gist", "naam": "gedroogde gist", "hoeveelheid": 7, "eenheid": "g", "schaling": "lineair" },
    { "id": "water", "naam": "lauwwarm water", "hoeveelheid": 280, "eenheid": "ml", "schaling": "lineair" },
    { "id": "olijfolie", "naam": "olijfolie", "hoeveelheid": 4, "eenheid": "el", "schaling": "lineair" },
    { "id": "zeezout", "naam": "grof zeezout", "hoeveelheid": 1, "eenheid": "tl", "schaling": "lineair" },
    { "id": "rozemarijn", "naam": "takje rozemarijn", "meervoud": "takjes rozemarijn", "hoeveelheid": 2, "eenheid": "stuk", "schaling": "stuks" },
    { "id": "zout", "naam": "zout", "hoeveelheid": 8, "eenheid": "g", "schaling": "lineair" }
  ],
  "stappen": [
    { "tekst": "Meng {bloem}, {gist} en {zout} in een kom. Voeg {water} en de helft van {olijfolie} toe en kneed ±10 minuten tot een soepel deeg.", "duur": 12 },
    { "tekst": "Dek de kom af en laat het deeg rijzen tot het verdubbeld is.", "duur": 2, "wachttijd": 60 },
    { "tekst": "Druk het deeg uit in een ingevette bakvorm, maak kuiltjes met je vingers en verdeel de rest van {olijfolie}, {zeezout} en de naaldjes van {rozemarijn} erover.", "duur": 8 },
    { "tekst": "Bak de focaccia goudbruin in de oven, ±20 minuten.", "duur": 2, "wachttijd": 20, "vereist": { "apparaat": "oven", "temperatuur": 220 } }
  ]
}
```

`tests/fixtures/kapot/ongeldig.json`:

```json
{
  "titel": "Kapot",
  "beschrijving": "Recept met fouten",
  "personen": 2,
  "tags": [],
  "ingredienten": [{ "id": "pasta", "naam": "penne", "hoeveelheid": 200, "eenheid": "g", "schaling": "lineair" }],
  "stappen": [{ "tekst": "Voeg {kaas} toe." }]
}
```

- [ ] **Step 2: Schrijf de failing tests**

`tests/laden.test.ts`:

```ts
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { laadRecepten } from '../src/lib/laden';

test('laadt en valideert de echte receptenmap', () => {
  const recepten = laadRecepten();
  expect(recepten.length).toBeGreaterThanOrEqual(3);
  const slugs = recepten.map((r) => r.slug);
  expect(slugs).toContain('lasagne');
  const titels = recepten.map((r) => r.titel);
  expect(titels).toEqual([...titels].sort((a, b) => a.localeCompare(b, 'nl')));
});

test('kapotte map gooit een fout met bestand en omschrijving', () => {
  expect(() => laadRecepten(join(process.cwd(), 'tests', 'fixtures', 'kapot'))).toThrowError(
    /ongeldig\.json: stap 1: verwijzing \{kaas\} bestaat niet/
  );
});
```

- [ ] **Step 3: Run de tests, verwacht falen**

Run: `npx vitest run tests/laden.test.ts`
Expected: FAIL — module bestaat niet.

- [ ] **Step 4: Implementeer `src/lib/laden.ts`**

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { valideerRecept, type ValidatieFout } from './valideer';
import type { Recept, ReceptMetSlug } from './typen';

export function laadRecepten(map: string = join(process.cwd(), 'recepten')): ReceptMetSlug[] {
  const bestanden = readdirSync(map).filter((bestand) => bestand.endsWith('.json')).sort();
  const fouten: ValidatieFout[] = [];
  const recepten: ReceptMetSlug[] = [];

  for (const bestand of bestanden) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(map, bestand), 'utf8'));
    } catch (fout) {
      fouten.push({ bestand, fout: `geen geldige JSON: ${(fout as Error).message}` });
      continue;
    }
    const receptFouten = valideerRecept(bestand, data, (naam) => existsSync(join(map, naam)));
    if (receptFouten.length > 0) fouten.push(...receptFouten);
    else recepten.push({ ...(data as Recept), slug: bestand.replace(/\.json$/, '') });
  }

  if (fouten.length > 0) {
    throw new Error('Ongeldige recepten:\n' + fouten.map(({ bestand, fout }) => `  ${bestand}: ${fout}`).join('\n'));
  }

  return recepten.sort((a, b) => a.titel.localeCompare(b.titel, 'nl'));
}
```

- [ ] **Step 5: Vervang de body van `scripts/valideer.ts`**

```ts
import { laadRecepten } from '../src/lib/laden';

try {
  const recepten = laadRecepten();
  console.log(`✓ ${recepten.length} recept(en) geldig`);
} catch (fout) {
  console.error((fout as Error).message);
  process.exit(1);
}
```

- [ ] **Step 6: Run alle tests en de CLI, verwacht groen**

Run: `npm test && npm run valideer`
Expected: alle tests PASS; CLI meldt "✓ 3 recept(en) geldig".

- [ ] **Step 7: Commit**

```bash
git add src/lib/laden.ts scripts/valideer.ts recepten/ tests/laden.test.ts tests/fixtures/
git commit -m "Receptlader met validatie en drie voorbeeldrecepten"
```

---

### Task 8: Receptpagina met componenten en schaal-script

**Files:**
- Create: `src/layouts/Basis.astro`, `src/styles/global.css`, `src/lib/pad.ts`, `src/lib/fotos.ts`, `src/components/Waarschuwing.astro`, `src/components/PersonenKiezer.astro`, `src/components/IngredientenLijst.astro`, `src/components/Stap.astro`, `src/pages/recept/[slug].astro`

**Interfaces:**
- Consumes: `laadRecepten` (Task 7), `plaatsWaarschuwingen`, `wachttijdSamenvatting` (Task 5), `totaalTijd`, `formatteerMinuten` (Task 4), `parseStaptekst` (Task 3), `ingredientTekst` (Task 2), types (Task 1).
- Produces:
  - `pad(p: string): string` in `src/lib/pad.ts` — prefixt een pad met `import.meta.env.BASE_URL` (voor GitHub Pages-subpad).
  - `fotoVoor(bestand?: string): ImageMetadata | undefined` in `src/lib/fotos.ts`.
  - Elke ingredient-weergave (lijst én staptekst) is een `<span data-ingredient …>` met data-attributen `data-hoeveelheid`, `data-eenheid`, `data-schaling`, `data-naam`, `data-meervoud`; het schaal-script herschrijft de tekst van precies die spans. Task 9 hergebruikt `Basis.astro`, `pad`, `fotos` en de CSS.

- [ ] **Step 1: Schrijf `src/lib/pad.ts` en `src/lib/fotos.ts`**

`src/lib/pad.ts`:

```ts
export function pad(p: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${p}`;
}
```

`src/lib/fotos.ts`:

```ts
import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>('../../recepten/*.{jpg,jpeg,png,webp}', {
  eager: true,
});

export function fotoVoor(bestand?: string): ImageMetadata | undefined {
  if (bestand === undefined) return undefined;
  return modules[`../../recepten/${bestand}`]?.default;
}
```

- [ ] **Step 2: Schrijf `src/layouts/Basis.astro` en `src/styles/global.css`**

`src/layouts/Basis.astro`:

```astro
---
import '../styles/global.css';
import { pad } from '../lib/pad';

const { titel } = Astro.props as { titel: string };
---
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{titel}</title>
  </head>
  <body>
    <header class="site-kop">
      <a href={pad('')}>🍲 Recepten</a>
    </header>
    <main>
      <slot />
    </main>
  </body>
</html>
```

`src/styles/global.css`:

```css
* { box-sizing: border-box; }

[hidden] { display: none !important; }

:root {
  --inkt: #2d2a26;
  --papier: #faf7f2;
  --kaart: #ffffff;
  --accent: #b4552d;
  --rand: #e6e0d6;
  --waarschuwing-achtergrond: #fdf3d8;
  --waarschuwing-rand: #e0b950;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 1.125rem;
  line-height: 1.65;
  color: var(--inkt);
  background: var(--papier);
}

.site-kop {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--rand);
}
.site-kop a {
  color: var(--inkt);
  text-decoration: none;
  font-weight: 700;
}

main {
  max-width: 44rem;
  margin: 0 auto;
  padding: 1rem 1rem 4rem;
}

h1 { font-size: 1.75rem; line-height: 1.2; margin: 0.75rem 0 0.25rem; }
h2 { font-size: 1.25rem; margin: 2rem 0 0.75rem; }

.beschrijving { color: #5a544c; margin: 0.25rem 0 0.5rem; }
.tijden { color: #5a544c; font-size: 0.95rem; margin: 0; }

.recept-foto {
  width: 100%;
  height: auto;
  border-radius: 0.75rem;
  margin-top: 1rem;
}

.waarschuwing {
  display: flex;
  gap: 0.5rem;
  background: var(--waarschuwing-achtergrond);
  border: 1px solid var(--waarschuwing-rand);
  border-radius: 0.5rem;
  padding: 0.6rem 0.8rem;
  margin: 0.75rem 0;
  font-weight: 600;
}

.personen-kiezer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0 0.5rem;
}
.personen-kiezer button {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.4rem;
  border: 1px solid var(--rand);
  border-radius: 50%;
  background: var(--kaart);
  color: var(--inkt);
  cursor: pointer;
}
.personen-kiezer output {
  min-width: 1.5rem;
  text-align: center;
  font-weight: 700;
  font-size: 1.25rem;
}

.ingredienten {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
}
.ingredienten li { border-bottom: 1px solid var(--rand); }
.ingredienten label {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  padding: 0.45rem 0;
  cursor: pointer;
}
.ingredienten input { transform: translateY(2px) scale(1.2); }
.ingredienten label:has(input:checked) { opacity: 0.45; text-decoration: line-through; }
.notitie { color: #5a544c; }

.stappen {
  padding-left: 1.5rem;
  margin: 0;
}
.stappen > li { margin: 1.25rem 0; }
.stappen > li::marker { font-weight: 700; color: var(--accent); }
.stap p { margin: 0; }
.stap-tijd { color: #5a544c; font-size: 0.9rem; margin-top: 0.25rem !important; }
.ingredient-ref { font-weight: 600; }

.zoekbalk {
  width: 100%;
  font-size: 1.1rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--rand);
  border-radius: 0.75rem;
  margin: 1rem 0 0.75rem;
  background: var(--kaart);
  color: var(--inkt);
}

.tagfilters { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; }
.tag {
  border: 1px solid var(--rand);
  background: var(--kaart);
  color: var(--inkt);
  border-radius: 999px;
  padding: 0.25rem 0.8rem;
  font-size: 0.95rem;
  cursor: pointer;
}
.tag.actief {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.kaarten {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1rem;
}
.kaart {
  display: block;
  background: var(--kaart);
  border: 1px solid var(--rand);
  border-radius: 0.75rem;
  overflow: hidden;
  text-decoration: none;
  color: var(--inkt);
}
.kaart img, .kaart-placeholder {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #fff;
  background: linear-gradient(135deg, #c98a5b, var(--accent));
}
.kaart-tekst { padding: 0.75rem 1rem 1rem; }
.kaart-tekst h2 { font-size: 1.15rem; margin: 0 0 0.25rem; }
.kaart-tags { color: #5a544c; font-size: 0.9rem; margin: 0.25rem 0 0; }
```

- [ ] **Step 3: Schrijf de componenten**

`src/components/Waarschuwing.astro`:

```astro
---
const { tekst } = Astro.props as { tekst: string };
---
<p class="waarschuwing"><span aria-hidden="true">⚠️</span><span>{tekst}</span></p>
```

`src/components/PersonenKiezer.astro`:

```astro
---
const { basis } = Astro.props as { basis: number };
---
<div class="personen-kiezer">
  <span>Personen:</span>
  <button type="button" data-minder aria-label="Minder personen">−</button>
  <output data-personen>{basis}</output>
  <button type="button" data-meer aria-label="Meer personen">+</button>
</div>
```

`src/components/IngredientenLijst.astro`:

```astro
---
import { ingredientTekst } from '../lib/schalen';
import type { Ingredient } from '../lib/typen';

const { ingredienten } = Astro.props as { ingredienten: Ingredient[] };
---
<h2>Ingrediënten</h2>
<ul class="ingredienten">
  {ingredienten.map((ingredient) => (
    <li>
      <label>
        <input type="checkbox" />
        <span>
          <span
            data-ingredient
            data-hoeveelheid={ingredient.hoeveelheid}
            data-eenheid={ingredient.eenheid}
            data-schaling={ingredient.schaling}
            data-naam={ingredient.naam}
            data-meervoud={ingredient.meervoud}
          >{ingredientTekst(ingredient, 1)}</span>
          {ingredient.notitie && <span class="notitie">, {ingredient.notitie}</span>}
        </span>
      </label>
    </li>
  ))}
</ul>
```

`src/components/Stap.astro`:

```astro
---
import { ingredientTekst } from '../lib/schalen';
import { parseStaptekst } from '../lib/substitutie';
import { formatteerMinuten } from '../lib/tijden';
import type { Ingredient, Stap as StapType } from '../lib/typen';

const { stap, ingredienten } = Astro.props as { stap: StapType; ingredienten: Ingredient[] };
const perId = new Map(ingredienten.map((ingredient) => [ingredient.id, ingredient]));
const segmenten = parseStaptekst(stap.tekst);
const duur = stap.duur ?? 0;
const wachttijd = stap.wachttijd ?? 0;
---
<div class="stap">
  <p>
    {segmenten.map((segment) => {
      if (segment.type === 'tekst') return segment.waarde;
      const ingredient = perId.get(segment.id)!;
      return (
        <span
          class="ingredient-ref"
          data-ingredient
          data-hoeveelheid={ingredient.hoeveelheid}
          data-eenheid={ingredient.eenheid}
          data-schaling={ingredient.schaling}
          data-naam={ingredient.naam}
          data-meervoud={ingredient.meervoud}
        >{ingredientTekst(ingredient, 1)}</span>
      );
    })}
  </p>
  {(duur > 0 || wachttijd > 0) && (
    <p class="stap-tijd">
      {duur > 0 && `⏱ ${formatteerMinuten(duur)}`}
      {duur > 0 && wachttijd > 0 && ' · '}
      {wachttijd > 0 && `⏳ ${formatteerMinuten(wachttijd)} wachten`}
    </p>
  )}
</div>
```

- [ ] **Step 4: Schrijf `src/pages/recept/[slug].astro`**

```astro
---
import { Image } from 'astro:assets';
import IngredientenLijst from '../../components/IngredientenLijst.astro';
import PersonenKiezer from '../../components/PersonenKiezer.astro';
import Stap from '../../components/Stap.astro';
import Waarschuwing from '../../components/Waarschuwing.astro';
import Basis from '../../layouts/Basis.astro';
import { fotoVoor } from '../../lib/fotos';
import { laadRecepten } from '../../lib/laden';
import { formatteerMinuten, totaalTijd } from '../../lib/tijden';
import { plaatsWaarschuwingen, wachttijdSamenvatting } from '../../lib/waarschuwingen';
import type { ReceptMetSlug } from '../../lib/typen';

export function getStaticPaths() {
  return laadRecepten().map((recept) => ({ params: { slug: recept.slug }, props: { recept } }));
}

const { recept } = Astro.props as { recept: ReceptMetSlug };
const plaatsing = plaatsWaarschuwingen(recept.stappen);
const samenvatting = wachttijdSamenvatting(recept.stappen);
const tijd = totaalTijd(recept.stappen);
const foto = fotoVoor(recept.foto);
---
<Basis titel={recept.titel}>
  <article class="recept" data-slug={recept.slug} data-basis-personen={recept.personen}>
    {foto && <Image class="recept-foto" src={foto} alt={recept.titel} widths={[480, 960]} sizes="100vw" />}
    <h1>{recept.titel}</h1>
    <p class="beschrijving">{recept.beschrijving}</p>
    <p class="tijden">
      🍳 {formatteerMinuten(tijd.actief)} actief{tijd.wachten > 0 && ` · ⏳ ${formatteerMinuten(tijd.wachten)} wachten`}
    </p>
    {samenvatting && <Waarschuwing tekst={samenvatting} />}
    {plaatsing.vooraf.map((tekst) => <Waarschuwing tekst={tekst} />)}
    <PersonenKiezer basis={recept.personen} />
    <IngredientenLijst ingredienten={recept.ingredienten} />
    <h2>Bereiding</h2>
    <ol class="stappen">
      {recept.stappen.map((stap, i) => (
        <li>
          {plaatsing.perStap[i].map((tekst) => <Waarschuwing tekst={tekst} />)}
          <Stap stap={stap} ingredienten={recept.ingredienten} />
        </li>
      ))}
    </ol>
  </article>
</Basis>

<script>
  import { ingredientTekst } from '../../lib/schalen';
  import type { Ingredient, Schaling } from '../../lib/typen';

  const artikel = document.querySelector<HTMLElement>('article.recept')!;
  const basis = Number(artikel.dataset.basisPersonen);
  const sleutel = `personen:${artikel.dataset.slug}`;
  const uitvoer = artikel.querySelector<HTMLOutputElement>('[data-personen]')!;
  let personen = Number(localStorage.getItem(sleutel)) || basis;

  function werkBij() {
    uitvoer.textContent = String(personen);
    localStorage.setItem(sleutel, String(personen));
    const factor = personen / basis;
    for (const span of artikel.querySelectorAll<HTMLElement>('[data-ingredient]')) {
      const ingredient: Ingredient = {
        id: '',
        naam: span.dataset.naam!,
        meervoud: span.dataset.meervoud,
        hoeveelheid: span.dataset.hoeveelheid !== undefined ? Number(span.dataset.hoeveelheid) : undefined,
        eenheid: span.dataset.eenheid,
        schaling: span.dataset.schaling as Schaling,
      };
      span.textContent = ingredientTekst(ingredient, factor);
    }
  }

  artikel.querySelector('[data-minder]')!.addEventListener('click', () => {
    if (personen > 1) {
      personen -= 1;
      werkBij();
    }
  });
  artikel.querySelector('[data-meer]')!.addEventListener('click', () => {
    personen += 1;
    werkBij();
  });
  werkBij();
</script>
```

- [ ] **Step 5: Bouw en controleer de output**

Run: `npm run build && ls dist/recept && grep -o 'Zet nu de oven aan op 180°C — nodig over ±15 min.' dist/recept/lasagne/index.html && grep -o 'Tegen het einde van de wachttijd: zet de oven aan op 220°C.' dist/recept/focaccia/index.html && grep -o 'Breng eerst een pan water aan de kook.' dist/recept/pasta-pesto/index.html`
Expected: build slaagt; `dist/recept/` bevat `focaccia`, `lasagne`, `pasta-pesto`; alle drie de grep's vinden hun waarschuwingstekst.

- [ ] **Step 6: Handmatige controle in de browser**

Run: `npm run dev` en open `http://localhost:4321/recept/lasagne/`.
Controleer: personen van 4 → 6 maakt van "500 g rundergehakt" overal "750 g rundergehakt" en van "1 ui" "2 uien" (ook ín de stapteksten); herladen onthoudt de keuze; ingrediënten zijn afvinkbaar. Stop de dev-server daarna.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "Receptpagina: componenten, waarschuwingen, personen-schaling"
```

---

### Task 9: Overzichtspagina met zoeken en tagfilters

**Files:**
- Create: `src/components/ReceptKaart.astro`
- Modify: `src/pages/index.astro` (placeholder volledig vervangen)

**Interfaces:**
- Consumes: `laadRecepten` (Task 7), `totaalTijd`, `formatteerMinuten` (Task 4), `fotoVoor` (Task 8), `pad` (Task 8), `Basis.astro` (Task 8), CSS-klassen `.zoekbalk`, `.tagfilters`, `.tag`, `.kaarten`, `.kaart` (Task 8).
- Produces: kaarten dragen `data-zoek` (kleine letters: titel + tags + ingredientnamen) en `data-tags` (spatiegescheiden); het filterscript toont/verbergt op die attributen.

- [ ] **Step 1: Schrijf `src/components/ReceptKaart.astro`**

```astro
---
import { Image } from 'astro:assets';
import { fotoVoor } from '../lib/fotos';
import { pad } from '../lib/pad';
import { formatteerMinuten, totaalTijd } from '../lib/tijden';
import type { ReceptMetSlug } from '../lib/typen';

const { recept } = Astro.props as { recept: ReceptMetSlug };
const tijd = totaalTijd(recept.stappen);
const foto = fotoVoor(recept.foto);
const zoektekst = [recept.titel, ...recept.tags, ...recept.ingredienten.map((ingredient) => ingredient.naam)]
  .join(' ')
  .toLowerCase();
---
<a class="kaart" href={pad(`recept/${recept.slug}/`)} data-zoek={zoektekst} data-tags={recept.tags.join(' ')}>
  {foto ? (
    <Image src={foto} alt="" widths={[480]} sizes="(max-width: 40rem) 100vw, 20rem" />
  ) : (
    <div class="kaart-placeholder" aria-hidden="true">{recept.titel.slice(0, 1)}</div>
  )}
  <div class="kaart-tekst">
    <h2>{recept.titel}</h2>
    <p class="tijden">
      🍳 {formatteerMinuten(tijd.actief)}{tijd.wachten > 0 && ` · ⏳ ${formatteerMinuten(tijd.wachten)}`}
    </p>
    <p class="kaart-tags">{recept.tags.join(' · ')}</p>
  </div>
</a>
```

- [ ] **Step 2: Vervang `src/pages/index.astro`**

```astro
---
import ReceptKaart from '../components/ReceptKaart.astro';
import Basis from '../layouts/Basis.astro';
import { laadRecepten } from '../lib/laden';

const recepten = laadRecepten();
const alleTags = [...new Set(recepten.flatMap((recept) => recept.tags))].sort();
---
<Basis titel="Recepten">
  <h1>Recepten</h1>
  <input class="zoekbalk" type="search" id="zoek" placeholder="Zoek op naam, tag of ingrediënt…" />
  <div class="tagfilters" id="tagfilters">
    {alleTags.map((tag) => (
      <button type="button" class="tag" data-tag={tag}>{tag}</button>
    ))}
  </div>
  <div class="kaarten">
    {recepten.map((recept) => (
      <ReceptKaart recept={recept} />
    ))}
  </div>
  <p id="geen-resultaten" hidden>Geen recepten gevonden.</p>
</Basis>

<script>
  const zoekveld = document.querySelector<HTMLInputElement>('#zoek')!;
  const kaarten = [...document.querySelectorAll<HTMLElement>('.kaart')];
  const tagKnoppen = [...document.querySelectorAll<HTMLButtonElement>('#tagfilters .tag')];
  const geenResultaten = document.querySelector<HTMLElement>('#geen-resultaten')!;
  let actieveTag: string | null = null;

  function filter() {
    const term = zoekveld.value.trim().toLowerCase();
    let zichtbaar = 0;
    for (const kaart of kaarten) {
      const past =
        (term === '' || kaart.dataset.zoek!.includes(term)) &&
        (actieveTag === null || kaart.dataset.tags!.split(' ').includes(actieveTag));
      kaart.hidden = !past;
      if (past) zichtbaar += 1;
    }
    geenResultaten.hidden = zichtbaar > 0;
  }

  zoekveld.addEventListener('input', filter);
  for (const knop of tagKnoppen) {
    knop.addEventListener('click', () => {
      actieveTag = actieveTag === knop.dataset.tag ? null : knop.dataset.tag!;
      for (const andere of tagKnoppen) andere.classList.toggle('actief', andere.dataset.tag === actieveTag);
      filter();
    });
  }
</script>
```

- [ ] **Step 3: Bouw en controleer**

Run: `npm run build && grep -c 'class="kaart"' dist/index.html && grep -o 'data-tags="[^"]*oven[^"]*"' dist/index.html | head -2`
Expected: build slaagt; 3 kaarten; lasagne en focaccia dragen de tag `oven`.

- [ ] **Step 4: Handmatige controle in de browser**

Run: `npm run dev`, open `http://localhost:4321/`.
Controleer: zoeken op "gehakt" toont alleen de lasagne; tag "oven" aanklikken toont lasagne + focaccia; nogmaals klikken heft het filter op; "Geen recepten gevonden." verschijnt bij onzinterm. Stop de dev-server.

- [ ] **Step 5: Commit**

```bash
git add src/components/ReceptKaart.astro src/pages/index.astro
git commit -m "Overzichtspagina met zoeken en tagfilters"
```

---

### Task 10: GitHub Actions-deploy + README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: npm-scripts `valideer`, `test`, `build` (Tasks 1–7); `BASE_PATH`-env uit `astro.config.mjs` (Task 1).

- [ ] **Step 1: Schrijf `.github/workflows/deploy.yml`**

```yaml
name: Deploy naar GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  bouwen:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run valideer
      - run: npm test
      - run: npm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  publiceren:
    needs: bouwen
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Schrijf `README.md`**

````markdown
# Recepten

Persoonlijke receptencollectie: statische Astro-site op basis van gestandaardiseerde JSON-recepten.

## Recept toevoegen

1. Maak een JSON-bestand in `recepten/` volgens `schema/recept.schema.json` (de bestandsnaam wordt de URL-slug).
2. Optioneel: zet een foto met dezelfde basisnaam ernaast en verwijs ernaar via het `foto`-veld.
3. Controleer met `npm run valideer`.
4. Commit en push naar `main` — de site wordt automatisch gebouwd en gepubliceerd.

Kernregels van het schema:

- Stapteksten verwijzen naar ingrediënten met `{id}`; de hoeveelheid schaalt dan automatisch mee met het aantal personen.
- Geef per stap `duur` (actieve minuten) en `wachttijd` (passieve minuten) op; meldingen zoals "zet de oven aan" worden dááruit berekend via `vereist` (`apparaat` + `temperatuur`). Schrijf zulke aanwijzingen dus nooit zelf in de staptekst.
- `schaling` per ingrediënt: `lineair`, `stuks` (hele stuks) of `vast` (schaalt niet mee).

## Ontwikkelen

```bash
npm install
npm run dev        # dev-server
npm test           # unit tests
npm run valideer   # valideer alle recepten
npm run build      # productie-build in dist/
```

## Deployment

GitHub Actions bouwt en publiceert naar GitHub Pages bij elke push naar `main`
(zie `.github/workflows/deploy.yml`). Eenmalig instellen: repo → Settings →
Pages → Source: **GitHub Actions**.
````

- [ ] **Step 3: Controleer de volledige pijplijn lokaal**

Run: `npm run valideer && npm test && BASE_PATH=/recepten npm run build && grep -o 'href="/recepten/recept/lasagne/"' dist/index.html | head -1`
Expected: alles slaagt; links in de build dragen het `/recepten`-basispad.

- [ ] **Step 4: Commit**

```bash
git add .github/ README.md
git commit -m "GitHub Actions-deploy naar Pages en README"
```
