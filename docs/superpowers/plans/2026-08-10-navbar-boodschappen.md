# Navbar + boodschappenlijst — implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Navigatiebalk (Recepten / Boodschappen, op mobiel als native tabbalk onderaan) plus een werkende boodschappenlijst: geschaalde ingrediënten toevoegen vanaf een recept, samengevoegd en per supermarktcategorie getoond, afvinkbaar, in localStorage.

**Architecture:** Nieuwe pure lib `src/lib/boodschappen.ts` (samenvoegen, categoriseren, opslag) getest met Vitest; nieuw optioneel ingrediëntveld `categorie` in schema en typen; navbar in `Basis.astro`; nieuwe pagina `src/pages/boodschappen.astro` die client-side uit localStorage rendert; groene toevoegknop op de receptpagina.

**Tech Stack:** Astro 5, TypeScript, Vitest, Ajv (bestaande schemavalidatie).

## Global Constraints

- Alle naamgeving en teksten in het Nederlands.
- Categorielijst exact en in deze (loop)volgorde: `groente-en-fruit`, `brood-en-bakkerij`, `vlees-en-vis`, `pasta-rijst-en-granen`, `conserven-en-potten`, `olie-en-sauzen`, `kruiden-en-specerijen`, `zuivel-en-eieren`, `kaas`, `diepvries`, `overig`.
- localStorage-sleutel: `boodschappen`; vorm `{ "items": BoodschapItem[], "afgevinkt": string[] }`.
- Kleuren/vormen via bestaande tokens (`--accent`, `--chip`, `--radius`, `--schaduw` enz.); geen nieuwe kleuren.
- Verificatie per taak: `npx vitest run`, `npm run build` en (waar data wijzigt) `npm run valideer` slagen.

---

### Task 1: Categorie-typen, schema en samenvoeg-lib

**Files:**
- Modify: `src/lib/typen.ts`, `schema/recept.schema.json`
- Create: `src/lib/boodschappen.ts`
- Test: `tests/boodschappen.test.ts`

**Interfaces:**
- Produces (gebruikt door Task 3 en 4):
  - `CATEGORIEEN: readonly Categorie[]` en `CATEGORIE_LABELS: Record<Categorie, string>` uit `typen.ts`/`boodschappen.ts` zoals hieronder.
  - `Ingredient` krijgt optioneel veld `categorie?: Categorie`.
  - Uit `boodschappen.ts`: `BoodschapItem`, `BoodschapRij`, `maakItems(ingredienten: Ingredient[], factor: number): BoodschapItem[]`, `samengevoegd(items: BoodschapItem[]): BoodschapRij[]`, `perCategorie(rijen: BoodschapRij[]): { categorie: Categorie; rijen: BoodschapRij[] }[]`, `laadLijst(): Boodschappenlijst`, `bewaarLijst(lijst: Boodschappenlijst): void`.

- [ ] **Step 1: Typen uitbreiden**

In `src/lib/typen.ts`, boven `Ingredient`:

```ts
export const CATEGORIEEN = [
  'groente-en-fruit',
  'brood-en-bakkerij',
  'vlees-en-vis',
  'pasta-rijst-en-granen',
  'conserven-en-potten',
  'olie-en-sauzen',
  'kruiden-en-specerijen',
  'zuivel-en-eieren',
  'kaas',
  'diepvries',
  'overig',
] as const;

export type Categorie = (typeof CATEGORIEEN)[number];
```

En in `Ingredient` (na `schaling`): `categorie?: Categorie;`

- [ ] **Step 2: Schema uitbreiden**

In `schema/recept.schema.json`, in `definitions.ingredient.properties` (na `"schaling"`):

```json
"categorie": { "enum": ["groente-en-fruit", "brood-en-bakkerij", "vlees-en-vis", "pasta-rijst-en-granen", "conserven-en-potten", "olie-en-sauzen", "kruiden-en-specerijen", "zuivel-en-eieren", "kaas", "diepvries", "overig"] },
```

- [ ] **Step 3: Schrijf falende tests**

Nieuw bestand `tests/boodschappen.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { maakItems, perCategorie, samengevoegd } from '../src/lib/boodschappen';
import type { BoodschapItem } from '../src/lib/boodschappen';
import type { Ingredient } from '../src/lib/typen';

function item(deel: Partial<BoodschapItem> & { naam: string }): BoodschapItem {
  return { categorie: 'overig', ...deel };
}

describe('maakItems', () => {
  const ingredienten: Ingredient[] = [
    { id: 'gehakt', naam: 'rundergehakt', hoeveelheid: 250, eenheid: 'g', schaling: 'lineair', categorie: 'vlees-en-vis' },
    { id: 'zout', naam: 'zout', schaling: 'vast' },
  ];
  test('schaalt hoeveelheden en neemt categorie over', () => {
    expect(maakItems(ingredienten, 2)).toEqual([
      { naam: 'rundergehakt', meervoud: undefined, hoeveelheid: 500, eenheid: 'g', categorie: 'vlees-en-vis' },
      { naam: 'zout', meervoud: undefined, hoeveelheid: undefined, eenheid: undefined, categorie: 'overig' },
    ]);
  });
});

describe('samengevoegd', () => {
  test('telt gelijke naam en eenheid op', () => {
    const rijen = samengevoegd([
      item({ naam: 'spaghetti', hoeveelheid: 200, eenheid: 'g', categorie: 'pasta-rijst-en-granen' }),
      item({ naam: 'spaghetti', hoeveelheid: 300, eenheid: 'g', categorie: 'pasta-rijst-en-granen' }),
    ]);
    expect(rijen).toHaveLength(1);
    expect(rijen[0].hoeveelheid).toBe('500 g');
  });
  test('rekent kg naar g om vóór het optellen en toont ≥1000 g weer als kg', () => {
    const rijen = samengevoegd([
      item({ naam: 'aardappelen', hoeveelheid: 0.5, eenheid: 'kg' }),
      item({ naam: 'aardappelen', hoeveelheid: 750, eenheid: 'g' }),
    ]);
    expect(rijen).toHaveLength(1);
    expect(rijen[0].hoeveelheid).toBe('1,25 kg');
  });
  test('onverenigbare eenheden blijven aparte regels', () => {
    const rijen = samengevoegd([
      item({ naam: 'olijfolie', hoeveelheid: 2, eenheid: 'el' }),
      item({ naam: 'olijfolie', hoeveelheid: 100, eenheid: 'ml' }),
    ]);
    expect(rijen).toHaveLength(2);
  });
  test('regels zonder hoeveelheid voegen samen op naam', () => {
    const rijen = samengevoegd([item({ naam: 'zout' }), item({ naam: 'zout' })]);
    expect(rijen).toHaveLength(1);
    expect(rijen[0].hoeveelheid).toBeUndefined();
    expect(rijen[0].tekst).toBe('zout');
  });
  test('meervoud bij totaal boven één, eenheid stuk verdwijnt', () => {
    const rijen = samengevoegd([
      item({ naam: 'ui', meervoud: 'uien', hoeveelheid: 1, eenheid: 'stuk' }),
      item({ naam: 'ui', meervoud: 'uien', hoeveelheid: 1, eenheid: 'stuk' }),
    ]);
    expect(rijen[0].tekst).toBe('uien');
    expect(rijen[0].hoeveelheid).toBe('2');
  });
});

describe('perCategorie', () => {
  test('groepeert in vaste loopvolgorde en slaat lege categorieën over', () => {
    const rijen = samengevoegd([
      item({ naam: 'zout', categorie: 'kruiden-en-specerijen' }),
      item({ naam: 'courgette', hoeveelheid: 3, eenheid: 'stuk', categorie: 'groente-en-fruit' }),
    ]);
    const groepen = perCategorie(rijen);
    expect(groepen.map((groep) => groep.categorie)).toEqual(['groente-en-fruit', 'kruiden-en-specerijen']);
  });
});
```

- [ ] **Step 4: Draai de tests en zie ze falen**

Run: `npx vitest run tests/boodschappen.test.ts`
Expected: FAIL — module `boodschappen` bestaat niet.

- [ ] **Step 5: Implementeer `src/lib/boodschappen.ts`**

```ts
import { formatteerHoeveelheid, schaalHoeveelheid } from './schalen';
import { CATEGORIEEN, type Categorie, type Ingredient } from './typen';

export const CATEGORIE_LABELS: Record<Categorie, string> = {
  'groente-en-fruit': 'Groente & fruit',
  'brood-en-bakkerij': 'Brood & bakkerij',
  'vlees-en-vis': 'Vlees & vis',
  'pasta-rijst-en-granen': 'Pasta, rijst & granen',
  'conserven-en-potten': 'Conserven & potten',
  'olie-en-sauzen': 'Olie & sauzen',
  'kruiden-en-specerijen': 'Kruiden & specerijen',
  'zuivel-en-eieren': 'Zuivel & eieren',
  kaas: 'Kaas',
  diepvries: 'Diepvries',
  overig: 'Overig',
};

export interface BoodschapItem {
  naam: string;
  meervoud?: string;
  hoeveelheid?: number;
  eenheid?: string;
  categorie: Categorie;
}

export interface BoodschapRij {
  sleutel: string;
  tekst: string;
  hoeveelheid?: string;
  categorie: Categorie;
}

export interface Boodschappenlijst {
  items: BoodschapItem[];
  afgevinkt: string[];
}

const NAAR_BASIS: Record<string, { eenheid: string; factor: number }> = {
  kg: { eenheid: 'g', factor: 1000 },
  l: { eenheid: 'ml', factor: 1000 },
};

export function maakItems(ingredienten: Ingredient[], factor: number): BoodschapItem[] {
  return ingredienten.map((ingredient) => ({
    naam: ingredient.naam,
    meervoud: ingredient.meervoud,
    hoeveelheid:
      ingredient.hoeveelheid !== undefined
        ? schaalHoeveelheid(ingredient.hoeveelheid, ingredient.schaling, factor, ingredient.eenheid)
        : undefined,
    eenheid: ingredient.eenheid,
    categorie: ingredient.categorie ?? 'overig',
  }));
}

function naarBasis(item: BoodschapItem): { hoeveelheid?: number; eenheid?: string } {
  if (item.hoeveelheid === undefined || item.eenheid === undefined) {
    return { hoeveelheid: item.hoeveelheid, eenheid: item.eenheid };
  }
  const omrekening = NAAR_BASIS[item.eenheid];
  if (omrekening === undefined) return { hoeveelheid: item.hoeveelheid, eenheid: item.eenheid };
  return { hoeveelheid: item.hoeveelheid * omrekening.factor, eenheid: omrekening.eenheid };
}

function sleutelVan(item: BoodschapItem): string {
  const { eenheid } = naarBasis(item);
  return `${item.naam.toLowerCase()}|${item.hoeveelheid === undefined ? '' : (eenheid ?? '')}`;
}

export function samengevoegd(items: BoodschapItem[]): BoodschapRij[] {
  const stapels = new Map<string, BoodschapItem>();
  for (const item of items) {
    const sleutel = sleutelVan(item);
    const basis = naarBasis(item);
    const bestaand = stapels.get(sleutel);
    if (bestaand === undefined) {
      stapels.set(sleutel, { ...item, hoeveelheid: basis.hoeveelheid, eenheid: basis.eenheid });
    } else if (bestaand.hoeveelheid !== undefined && basis.hoeveelheid !== undefined) {
      bestaand.hoeveelheid += basis.hoeveelheid;
    }
  }
  return [...stapels.entries()].map(([sleutel, stapel]) => maakRij(sleutel, stapel));
}

function maakRij(sleutel: string, stapel: BoodschapItem): BoodschapRij {
  let { hoeveelheid, eenheid } = stapel;
  if (hoeveelheid !== undefined && eenheid === 'g' && hoeveelheid >= 1000) {
    hoeveelheid /= 1000;
    eenheid = 'kg';
  }
  if (hoeveelheid !== undefined && eenheid === 'ml' && hoeveelheid >= 1000) {
    hoeveelheid /= 1000;
    eenheid = 'l';
  }
  const tekst = hoeveelheid !== undefined && hoeveelheid > 1 && stapel.meervoud !== undefined ? stapel.meervoud : stapel.naam;
  const toonEenheid = eenheid !== undefined && eenheid !== 'stuk' ? eenheid : undefined;
  return {
    sleutel,
    tekst,
    hoeveelheid: hoeveelheid !== undefined ? formatteerHoeveelheid(hoeveelheid, toonEenheid) : undefined,
    categorie: stapel.categorie,
  };
}

export function perCategorie(rijen: BoodschapRij[]): { categorie: Categorie; rijen: BoodschapRij[] }[] {
  return CATEGORIEEN.map((categorie) => ({
    categorie,
    rijen: rijen.filter((rij) => rij.categorie === categorie),
  })).filter((groep) => groep.rijen.length > 0);
}

const OPSLAG_SLEUTEL = 'boodschappen';

export function laadLijst(): Boodschappenlijst {
  try {
    const data = JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL) ?? '');
    return { items: data.items ?? [], afgevinkt: data.afgevinkt ?? [] };
  } catch {
    return { items: [], afgevinkt: [] };
  }
}

export function bewaarLijst(lijst: Boodschappenlijst): void {
  localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(lijst));
}
```

- [ ] **Step 6: Draai alle tests en de build**

Run: `npx vitest run && npm run build`
Expected: PASS (nieuwe én bestaande tests) en geslaagde build.

- [ ] **Step 7: Commit**

```bash
git add src/lib/typen.ts src/lib/boodschappen.ts schema/recept.schema.json tests/boodschappen.test.ts
git commit -m "Categorie-typen en samenvoeg-lib voor boodschappen"
```

---

### Task 2: Navbar en alle nieuwe CSS

**Files:**
- Modify: `src/layouts/Basis.astro`, `src/styles/global.css`, `src/pages/index.astro` (alleen `<Basis>`-regel), `src/pages/recept/[slug].astro` (alleen `<Basis>`-regel)

**Interfaces:**
- Consumes: niets uit Task 1 (alleen CSS/markup).
- Produces: `Basis.astro`-prop `actief?: 'recepten' | 'boodschappen'`; CSS-klassen `.navbalk`, `.boodschappen-knop`, `.wis-knop`, `.leeg` die Task 3 en 4 gebruiken. De navbalk linkt naar `pad('')` en `pad('boodschappen/')` — die laatste pagina bestaat pas na Task 3; dat is acceptabel binnen deze branch-volgorde.

- [ ] **Step 1: Basis.astro — navbalk met actieve tab**

Vervang `src/layouts/Basis.astro` volledig door:

```astro
---
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '../styles/global.css';
import { pad } from '../lib/pad';

const { titel, actief } = Astro.props as { titel: string; actief?: 'recepten' | 'boodschappen' };
---
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href={pad('favicon.svg')} />
    <title>{titel}</title>
  </head>
  <body>
    <nav class="navbalk">
      <a href={pad('')} class:list={[{ actief: actief === 'recepten' }]}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M4 11h16a8 8 0 0 1-16 0Z" />
          <path d="M9 8V6m3 2V5m3 3V6" />
        </svg>
        Recepten
      </a>
      <a href={pad('boodschappen/')} class:list={[{ actief: actief === 'boodschappen' }]}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 8h12l-1.2 12H7.2L6 8Z" />
          <path d="M9 10V7a3 3 0 0 1 6 0v3" />
        </svg>
        Boodschappen
      </a>
    </nav>
    <main>
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 2: Actieve tab doorgeven op bestaande pagina's**

- `src/pages/index.astro`: `<Basis titel="Recepten">` → `<Basis titel="Recepten" actief="recepten">`
- `src/pages/recept/[slug].astro`: `<Basis titel={recept.titel}>` → `<Basis titel={recept.titel} actief="recepten">`

- [ ] **Step 3: CSS toevoegen**

Onderaan `src/styles/global.css`:

```css
/* Navigatiebalk */
.navbalk {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 10;
  display: flex;
  background: var(--kaart);
  border-radius: var(--radius) var(--radius) 0 0;
  box-shadow: 0 -6px 24px rgba(69, 90, 82, 0.12);
  padding: 0.5rem 0 calc(0.45rem + env(safe-area-inset-bottom));
}
.navbalk a {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  text-decoration: none;
  color: var(--inkt-zacht);
  font-size: 0.75rem;
  font-weight: 500;
}
.navbalk a.actief { color: var(--accent); }
.navbalk svg { width: 1.5rem; height: 1.5rem; }

main { padding-bottom: 7rem; }

@media (min-width: 40rem) {
  .navbalk {
    position: static;
    width: fit-content;
    margin: 1.25rem auto 0;
    gap: 1rem;
    border-radius: 999px;
    box-shadow: var(--schaduw);
    padding: 0.5rem 1.25rem;
  }
  .navbalk a { flex-direction: row; gap: 0.5rem; font-size: 0.95rem; padding: 0.35rem 0.9rem; }
  .navbalk svg { width: 1.25rem; height: 1.25rem; }
  main { padding-bottom: 5rem; }
}

/* Boodschappen */
.boodschappen-knop {
  display: block;
  width: 100%;
  margin-top: 1rem;
  padding: 0.9rem;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.boodschappen-knop:hover { background: var(--accent-donker); }

.wis-knop {
  margin-top: 1.75rem;
  padding: 0.7rem 1.4rem;
  border: none;
  border-radius: 999px;
  background: var(--chip);
  color: var(--accent);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
}

.leeg { color: var(--inkt-zacht); }
.leeg a { color: var(--accent); }
```

Let op: de bestaande `main { … }`-regel bovenin heeft `padding: 1.5rem 1.25rem 5rem;` — de nieuwe `main { padding-bottom: 7rem; }` staat er ná en overschrijft alleen de onderkant (mobiel); de media query zet hem op desktop terug naar 5rem.

- [ ] **Step 4: Verifieer**

Run: `npx vitest run && npm run build`
Expected: beide slagen. In de preview: tabbalk onderaan op smal scherm (Recepten actief op de index en op receptpagina's), pilvormige balk bovenaan op breed scherm.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Basis.astro src/styles/global.css src/pages/index.astro "src/pages/recept/[slug].astro"
git commit -m "Navbalk: native tabbalk op mobiel, pilbalk op desktop"
```

---

### Task 3: Boodschappenpagina

**Files:**
- Create: `src/pages/boodschappen.astro`

**Interfaces:**
- Consumes: uit Task 1 `laadLijst`, `bewaarLijst`, `samengevoegd`, `perCategorie`, `CATEGORIE_LABELS`; uit Task 2 de klassen `.wis-knop`, `.leeg` en de Basis-prop `actief`.
- Produces: pagina op `pad('boodschappen/')` waar de navbalk al naartoe linkt.

- [ ] **Step 1: Maak `src/pages/boodschappen.astro`**

```astro
---
import Basis from '../layouts/Basis.astro';
import { pad } from '../lib/pad';
---
<Basis titel="Boodschappen" actief="boodschappen">
  <h1>🛒 Boodschappen</h1>
  <p class="leeg" id="leeg" hidden>
    Nog niets op de lijst. Open een <a href={pad('')}>recept</a> en druk op "Zet op boodschappenlijst".
  </p>
  <div id="lijst"></div>
  <button type="button" class="wis-knop" id="wis" hidden>Wis lijst</button>
</Basis>

<script>
  import { bewaarLijst, laadLijst, perCategorie, samengevoegd, CATEGORIE_LABELS } from '../lib/boodschappen';

  const lijstElement = document.querySelector<HTMLElement>('#lijst')!;
  const leegElement = document.querySelector<HTMLElement>('#leeg')!;
  const wisKnop = document.querySelector<HTMLButtonElement>('#wis')!;

  function toon() {
    const lijst = laadLijst();
    const groepen = perCategorie(samengevoegd(lijst.items));
    lijstElement.textContent = '';
    leegElement.hidden = groepen.length > 0;
    wisKnop.hidden = groepen.length === 0;

    for (const groep of groepen) {
      const kop = document.createElement('h2');
      kop.textContent = CATEGORIE_LABELS[groep.categorie];
      lijstElement.append(kop);

      const ul = document.createElement('ul');
      ul.className = 'ingredienten';
      for (const rij of groep.rijen) {
        const li = document.createElement('li');
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = lijst.afgevinkt.includes(rij.sleutel);
        checkbox.addEventListener('change', () => {
          const actueel = laadLijst();
          actueel.afgevinkt = checkbox.checked
            ? [...new Set([...actueel.afgevinkt, rij.sleutel])]
            : actueel.afgevinkt.filter((sleutel) => sleutel !== rij.sleutel);
          bewaarLijst(actueel);
        });
        const naam = document.createElement('span');
        naam.className = 'ingredient-naam';
        naam.textContent = rij.tekst;
        label.append(checkbox, naam);
        if (rij.hoeveelheid !== undefined) {
          const hoeveelheid = document.createElement('span');
          hoeveelheid.className = 'ingredient-hoeveelheid';
          hoeveelheid.textContent = rij.hoeveelheid;
          label.append(hoeveelheid);
        }
        li.append(label);
        ul.append(li);
      }
      lijstElement.append(ul);
    }
  }

  wisKnop.addEventListener('click', () => {
    bewaarLijst({ items: [], afgevinkt: [] });
    toon();
  });

  toon();
</script>
```

- [ ] **Step 2: Verifieer**

Run: `npm run build`
Expected: slaagt (nu 5 pagina's). In de preview: lege staat zichtbaar op `/boodschappen/`; navbalk toont Boodschappen als actief.

- [ ] **Step 3: Commit**

```bash
git add src/pages/boodschappen.astro
git commit -m "Boodschappenpagina: samengevoegde lijst per categorie"
```

---

### Task 4: Toevoegknop op de receptpagina + categorieën in data en importskill

**Files:**
- Modify: `src/pages/recept/[slug].astro`, `src/components/IngredientenLijst.astro`, `recepten/courgette-lasagne.json`, `recepten/pasta-met-zalm-boursin-spinazie-en-cherrytomaten.json`, `recepten/spaghetti-bolognese.json`, `.claude/skills/recept-import/SKILL.md`

**Interfaces:**
- Consumes: uit Task 1 `maakItems`, `laadLijst`, `bewaarLijst` en het veld `categorie` op `Ingredient`; uit Task 2 de klasse `.boodschappen-knop`.
- Produces: n.v.t. (laatste taak).

- [ ] **Step 1: `data-categorie` op de ingrediëntrij**

In `src/components/IngredientenLijst.astro`, voeg aan het `<label>`-element één attribuut toe (na `data-meervoud`):

```astro
data-categorie={ingredient.categorie}
```

- [ ] **Step 2: Knop in de receptpagina-template**

In `src/pages/recept/[slug].astro`, direct ná `<IngredientenLijst ingredienten={recept.ingredienten} />`:

```astro
<button type="button" class="boodschappen-knop" data-boodschappen>Zet op boodschappenlijst</button>
```

- [ ] **Step 3: Clientscript — toevoegen aan de lijst**

In het `<script>`-blok van `[slug].astro`:

1. Breid de import uit: `import { bewaarLijst, laadLijst, maakItems } from '../../lib/boodschappen';` en voeg `Categorie` toe aan de typen-import.
2. In `ingredientVan`, na de `schaling`-regel: `categorie: dataset.categorie as Categorie | undefined,`
3. Onder de bestaande `[data-meer]`-handler, vóór `werkBij();`:

```ts
const boodschappenKnop = artikel.querySelector<HTMLButtonElement>('[data-boodschappen]')!;
boodschappenKnop.addEventListener('click', () => {
  const factor = personen / basis;
  const ingredienten = [...artikel.querySelectorAll<HTMLElement>('[data-ingredient-rij]')].map((rij) =>
    ingredientVan(rij.dataset)
  );
  const lijst = laadLijst();
  lijst.items.push(...maakItems(ingredienten, factor));
  bewaarLijst(lijst);
  boodschappenKnop.textContent = 'Toegevoegd ✓';
  setTimeout(() => {
    boodschappenKnop.textContent = 'Zet op boodschappenlijst';
  }, 2000);
});
```

- [ ] **Step 4: Categorieën in de drie recepten**

Voeg aan elk ingrediënt `"categorie"` toe (na `"schaling"`, vóór een eventuele `"notitie"`):

`recepten/courgette-lasagne.json`: courgette → `groente-en-fruit`, olijfolie → `olie-en-sauzen`, ricotta → `zuivel-en-eieren`, spinazie → `groente-en-fruit`, basilicum → `groente-en-fruit`, italiaanse-kruiden → `kruiden-en-specerijen`, zout-peper → `kruiden-en-specerijen`, passata → `conserven-en-potten`, mozzarella → `kaas`.

`recepten/pasta-met-zalm-boursin-spinazie-en-cherrytomaten.json`: zalm → `vlees-en-vis`, boursin → `kaas`, cherrytomaten → `groente-en-fruit`, spinazie → `groente-en-fruit`, olijfolie → `olie-en-sauzen`, peper-chili → `kruiden-en-specerijen`, spaghetti → `pasta-rijst-en-granen`, kaas → `kaas`.

`recepten/spaghetti-bolognese.json`: olijfolie → `olie-en-sauzen`, boter → `zuivel-en-eieren`, ui → `groente-en-fruit`, winterpeen → `groente-en-fruit`, bleekselderij → `groente-en-fruit`, pancetta → `vlees-en-vis`, gehakt → `vlees-en-vis`, knoflook → `groente-en-fruit`, tomatenpuree → `conserven-en-potten`, wijn → `overig`, tomaten → `conserven-en-potten`, melk → `zuivel-en-eieren`, laurier → `kruiden-en-specerijen`, kruiden → `kruiden-en-specerijen`, spaghetti → `pasta-rijst-en-granen`, parmezaan → `kaas`.

Staan er inmiddels méér JSON-bestanden in `recepten/` (er wordt parallel geïmporteerd — controleer met `ls recepten/*.json`), geef dan ook die ingrediënten een `categorie` volgens de skillregel uit Step 5 (het schap waar je het product pakt; twijfel → `overig`).

- [ ] **Step 5: Importskill bijwerken**

In `.claude/skills/recept-import/SKILL.md`, sectie "Regels voor de JSON" onder **Ingrediënten**, voeg een bullet toe na de "Al het andere"-bullet:

```markdown
- Elk ingrediënt krijgt een `categorie` (supermarktschap) uit: `groente-en-fruit`, `brood-en-bakkerij`, `vlees-en-vis`, `pasta-rijst-en-granen`, `conserven-en-potten`, `olie-en-sauzen`, `kruiden-en-specerijen`, `zuivel-en-eieren`, `kaas`, `diepvries`, `overig`. Kies het schap waar je het product pakt (passata → `conserven-en-potten`, boter → `zuivel-en-eieren`, verse basilicum → `groente-en-fruit`); twijfel → `overig`.
```

Werk óók het JSON-voorbeeld onderin de skill bij: geef elk ingrediënt daar een passende `categorie` (spaghetti → `pasta-rijst-en-granen`, knoflook → `groente-en-fruit`, rode peper → `groente-en-fruit`, olijfolie → `olie-en-sauzen`, peterselie → `groente-en-fruit`, zout → `kruiden-en-specerijen`).

- [ ] **Step 6: Verifieer**

Run: `npm run valideer && npx vitest run && npm run build`
Expected: alle drie groen.

- [ ] **Step 7: Commit**

```bash
git add "src/pages/recept/[slug].astro" src/components/IngredientenLijst.astro recepten/*.json .claude/skills/recept-import/SKILL.md
git commit -m "Boodschappenknop op recept en categorieën in data en importskill"
```
