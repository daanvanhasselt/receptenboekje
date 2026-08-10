# Losse boodschappen — implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Losse items (niet uit een recept) aan de boodschappenlijst kunnen toevoegen via een slim tekstveld met categorie-dropdown, plus een ×-knop per rij om items weer te verwijderen.

**Architecture:** Twee pure functies erbij in `src/lib/boodschappen.ts` (`parseInvoer`, `verwijderRij`), getest met Vitest; de boodschappenpagina krijgt een invoerrij en per rij een verwijderknop. Opslagformaat blijft ongewijzigd.

**Tech Stack:** Astro 5, TypeScript, Vitest.

## Global Constraints

- Alle naamgeving en teksten in het Nederlands.
- Bekende eenheden voor het parsen: `g`, `kg`, `ml`, `l`, `el`, `tl` (hoofdletterongevoelig).
- Opslagformaat (`boodschappen`-sleutel, `{ items, afgevinkt }`) blijft exact zoals het is.
- Stijl via bestaande tokens; de ×-knop gebruikt het teken `×` (U+00D7), géén emoji-gevoelig teken.
- Verificatie per taak: `npx vitest run` en `npm run build` slagen.

---

### Task 1: `parseInvoer` en `verwijderRij` in de lib

**Files:**
- Modify: `src/lib/boodschappen.ts`
- Test: `tests/boodschappen.test.ts`

**Interfaces:**
- Consumes: bestaande `BoodschapItem`, `Boodschappenlijst`, interne `sleutelVan`.
- Produces (gebruikt door Task 2):
  - `parseInvoer(tekst: string): { naam: string; hoeveelheid?: number; eenheid?: string } | undefined`
  - `verwijderRij(lijst: Boodschappenlijst, sleutel: string): Boodschappenlijst`

- [ ] **Step 1: Schrijf falende tests**

Voeg toe aan `tests/boodschappen.test.ts` (imports uitbreiden met `parseInvoer`, `verwijderRij`; het `item(…)`-hulpfunctie bestaat al):

```ts
describe('parseInvoer', () => {
  test('alleen naam', () => {
    expect(parseInvoer('melk')).toEqual({ naam: 'melk' });
  });
  test('getal met bekende eenheid', () => {
    expect(parseInvoer('2 kg appels')).toEqual({ naam: 'appels', hoeveelheid: 2, eenheid: 'kg' });
  });
  test('getal zonder eenheid', () => {
    expect(parseInvoer('3 appels')).toEqual({ naam: 'appels', hoeveelheid: 3 });
  });
  test('komma als decimaalteken en hoofdletter-eenheid', () => {
    expect(parseInvoer('1,5 L melk')).toEqual({ naam: 'melk', hoeveelheid: 1.5, eenheid: 'l' });
  });
  test('meerwoordige naam blijft heel', () => {
    expect(parseInvoer('250 g geraspte kaas')).toEqual({ naam: 'geraspte kaas', hoeveelheid: 250, eenheid: 'g' });
  });
  test('lege of witruimte-invoer levert niets op', () => {
    expect(parseInvoer('')).toBeUndefined();
    expect(parseInvoer('   ')).toBeUndefined();
  });
});

describe('verwijderRij', () => {
  test('verwijdert alle items achter een rij en de afvinkstatus', () => {
    const items = [
      item({ naam: 'melk', hoeveelheid: 1, eenheid: 'l' }),
      item({ naam: 'melk', hoeveelheid: 500, eenheid: 'ml' }),
      item({ naam: 'ui' }),
    ];
    const rijen = samengevoegd(items);
    const melkRij = rijen.find((rij) => rij.tekst === 'melk')!;
    const lijst = verwijderRij({ items, afgevinkt: [melkRij.sleutel] }, melkRij.sleutel);
    expect(lijst.items.map((overgebleven) => overgebleven.naam)).toEqual(['ui']);
    expect(lijst.afgevinkt).toEqual([]);
  });
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npx vitest run tests/boodschappen.test.ts`
Expected: FAIL — `parseInvoer` en `verwijderRij` bestaan niet.

- [ ] **Step 3: Implementeer beide functies**

In `src/lib/boodschappen.ts` (onder `maakItems`; gebruikt de bestaande interne `sleutelVan`):

```ts
const INVOER_EENHEDEN = new Set(['g', 'kg', 'ml', 'l', 'el', 'tl']);

export function parseInvoer(tekst: string): { naam: string; hoeveelheid?: number; eenheid?: string } | undefined {
  const delen = tekst.trim().split(/\s+/).filter((deel) => deel !== '');
  if (delen.length === 0) return undefined;
  const getal = Number(delen[0].replace(',', '.'));
  if (Number.isNaN(getal) || getal <= 0 || delen.length === 1) {
    return { naam: delen.join(' ') };
  }
  const eenheid = delen[1].toLowerCase();
  if (delen.length >= 3 && INVOER_EENHEDEN.has(eenheid)) {
    return { naam: delen.slice(2).join(' '), hoeveelheid: getal, eenheid };
  }
  return { naam: delen.slice(1).join(' '), hoeveelheid: getal };
}

export function verwijderRij(lijst: Boodschappenlijst, sleutel: string): Boodschappenlijst {
  return {
    items: lijst.items.filter((item) => sleutelVan(item) !== sleutel),
    afgevinkt: lijst.afgevinkt.filter((afgevinkteSleutel) => afgevinkteSleutel !== sleutel),
  };
}
```

Let op: `verwijderRij` vergelijkt met `sleutelVan(item)` — dat werkt voor rijen uit `samengevoegd` omdat de sleutel op de basiseenheid (kg→g, l→ml) berekend wordt, vóór en ná samenvoegen gelijk.

- [ ] **Step 4: Draai alle tests en de build**

Run: `npx vitest run && npm run build`
Expected: PASS en geslaagde build.

- [ ] **Step 5: Commit**

```bash
git add src/lib/boodschappen.ts tests/boodschappen.test.ts
git commit -m "parseInvoer en verwijderRij voor losse boodschappen"
```

---

### Task 2: Invoerrij en ×-knop op de boodschappenpagina

**Files:**
- Modify: `src/pages/boodschappen.astro`, `src/styles/global.css`

**Interfaces:**
- Consumes: `parseInvoer` en `verwijderRij` uit Task 1; bestaande `CATEGORIEEN`, `CATEGORIE_LABELS`, `laadLijst`, `bewaarLijst`; bestaande CSS-tokens.
- Produces: n.v.t. (laatste taak).

- [ ] **Step 1: Invoerrij in de template**

In `src/pages/boodschappen.astro`: breid de frontmatter uit met

```astro
import { CATEGORIE_LABELS } from '../lib/boodschappen';
import { CATEGORIEEN } from '../lib/typen';
```

en zet direct ná de `<h1>`:

```astro
<form class="toevoegen" id="toevoegen">
  <input type="text" id="invoer" placeholder="Voeg toe… (bijv. 2 kg appels)" autocomplete="off" />
  <select id="invoer-categorie" aria-label="Categorie">
    {CATEGORIEEN.map((categorie) => (
      <option value={categorie} selected={categorie === 'overig'}>{CATEGORIE_LABELS[categorie]}</option>
    ))}
  </select>
  <button type="submit" aria-label="Voeg toe">+</button>
</form>
```

- [ ] **Step 2: Clientscript — toevoegen en verwijderen**

In het `<script>`-blok van `boodschappen.astro`:

1. Breid de lib-import uit met `parseInvoer` en `verwijderRij`, en importeer het type `Categorie`:

```ts
import { bewaarLijst, laadLijst, parseInvoer, perCategorie, samengevoegd, verwijderRij, CATEGORIE_LABELS } from '../lib/boodschappen';
import type { Categorie } from '../lib/typen';
```

2. Na de bestaande elementselecties:

```ts
const formulier = document.querySelector<HTMLFormElement>('#toevoegen')!;
const invoer = document.querySelector<HTMLInputElement>('#invoer')!;
const invoerCategorie = document.querySelector<HTMLSelectElement>('#invoer-categorie')!;
```

3. In `toon()`, binnen de rijenlus, ná het hoeveelheid-blok (dus als laatste kind van `label`):

```ts
const verwijder = document.createElement('button');
verwijder.type = 'button';
verwijder.className = 'rij-verwijder';
verwijder.textContent = '×';
verwijder.setAttribute('aria-label', `Verwijder ${rij.tekst}`);
verwijder.addEventListener('click', (gebeurtenis) => {
  gebeurtenis.preventDefault();
  bewaarLijst(verwijderRij(laadLijst(), rij.sleutel));
  toon();
});
label.append(verwijder);
```

(De `preventDefault` voorkomt dat de klik binnen het `<label>` de checkbox toggelt.)

4. Naast de bestaande `wisKnop`-handler:

```ts
formulier.addEventListener('submit', (gebeurtenis) => {
  gebeurtenis.preventDefault();
  const geparsed = parseInvoer(invoer.value);
  if (geparsed === undefined) return;
  const lijst = laadLijst();
  lijst.items.push({ ...geparsed, categorie: invoerCategorie.value as Categorie });
  bewaarLijst(lijst);
  invoer.value = '';
  invoer.focus();
  toon();
});
```

- [ ] **Step 3: CSS toevoegen**

Onderaan `src/styles/global.css`:

```css
/* Losse boodschappen toevoegen */
.toevoegen { display: flex; gap: 0.5rem; margin: 0.25rem 0 1.25rem; }
.toevoegen input {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 1rem;
  padding: 0.7rem 1rem;
  border: none;
  border-radius: 1rem;
  background: var(--kaart);
  box-shadow: var(--schaduw);
  color: var(--inkt);
}
.toevoegen input::placeholder { color: var(--inkt-zacht); }
.toevoegen select {
  font: inherit;
  font-size: 0.85rem;
  max-width: 8.5rem;
  border: none;
  border-radius: 1rem;
  padding: 0 0.6rem;
  background: var(--kaart);
  box-shadow: var(--schaduw);
  color: var(--inkt);
}
.toevoegen button {
  width: 3rem;
  flex-shrink: 0;
  border: none;
  border-radius: 1rem;
  background: var(--accent);
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
}
.toevoegen button:hover { background: var(--accent-donker); }
.toevoegen input:focus, .toevoegen select:focus { outline: 2px solid var(--accent); }

.rij-verwijder {
  border: none;
  background: none;
  color: var(--inkt-zacht);
  font-size: 1.2rem;
  line-height: 1;
  padding: 0 0 0 0.5rem;
  cursor: pointer;
}
.rij-verwijder:hover { color: var(--accent-donker); }
```

- [ ] **Step 4: Verifieer**

Run: `npx vitest run && npm run build`
Expected: beide slagen. In de preview op `/boodschappen/`: "2 kg appels" toevoegen → verschijnt onder Overig (of gekozen categorie); nogmaals "1 kg appels" → één rij "3 kg"; × verwijdert de rij; Enter werkt; leeg veld doet niets.

- [ ] **Step 5: Commit**

```bash
git add src/pages/boodschappen.astro src/styles/global.css
git commit -m "Losse items toevoegen en rijen verwijderen op de boodschappenlijst"
```
