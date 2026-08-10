# Mintgroene app-restyle — implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De bestaande Astro-receptensite restylen naar het mintgroene app-ontwerp (Poppins, #43927D, afgeronde kaarten met foto-overlay, chips, stat-rij) zonder nieuwe features of nepdata.

**Architecture:** Eén herschreven `global.css` met kleurtokens plus lichte markup-aanpassingen in bestaande Astro-componenten. Eén nieuwe lib-functie `ingredientDelen` splitst hoeveelheid en naam zodat de ingrediëntenrij de hoeveelheid rechts kan uitlijnen; de bestaande schaal-logica verandert niet.

**Tech Stack:** Astro 5, TypeScript, Vitest, `@fontsource/poppins` (zelf-gehost).

## Global Constraints

- Alle naamgeving en teksten in het Nederlands (bestaande conventie).
- Geen nieuwe datavelden in receptenschema of JSON; geen nepdata (kcal, ratings, auteurs), geen nieuwe pagina's of navigatie.
- Fonts zelf-gehost via `@fontsource/poppins`; geen Google-CDN of andere externe hosts.
- Kleuren exact: accent `#43927d`, inkt `#454545`, achtergrond `#eef4f1`, chip `#e3efe9`; waarschuwing behoudt `#fdf3d8`/`#e0b950`.
- Bestaande functionaliteit blijft werken: zoeken, tagfilters, personen-schaling met localStorage, ingrediënten afvinken (doorstrepen), waarschuwingen, stap-tijden.
- Verificatie per taak: `npx vitest run` en `npm run build` slagen.

---

### Task 1: `ingredientDelen` in schalen.ts

**Files:**
- Modify: `src/lib/schalen.ts`
- Test: `tests/schalen.test.ts`

**Interfaces:**
- Consumes: bestaande `schaalHoeveelheid` en `formatteerHoeveelheid` (ongewijzigd).
- Produces: `ingredientDelen(ing: Ingredient, factor: number): { hoeveelheid?: string; naam: string }` — Task 4 gebruikt exact deze signatuur. `ingredientTekst` blijft bestaan met ongewijzigd gedrag.

- [ ] **Step 1: Schrijf falende tests**

Voeg toe aan `tests/schalen.test.ts` (er is al een `describe('ingredientTekst', …)`; zet dit blok ernaast, imports uitbreiden met `ingredientDelen`):

```ts
describe('ingredientDelen', () => {
  test('splitst hoeveelheid en naam, met meervoud en zonder "stuk"-eenheid', () => {
    expect(ingredientDelen(ei, 2)).toEqual({ hoeveelheid: '2', naam: 'eieren' });
  });
  test('metrische eenheid blijft bij de hoeveelheid', () => {
    expect(ingredientDelen(gehakt, 1.5)).toEqual({ hoeveelheid: '375 g', naam: 'rundergehakt' });
  });
  test('zonder hoeveelheid alleen naam', () => {
    expect(ingredientDelen(zout, 2)).toEqual({ naam: 'zout' });
  });
});
```

(De constanten `ei`, `gehakt`, `zout` staan al bovenin het testbestand.)

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npx vitest run tests/schalen.test.ts`
Expected: FAIL — `ingredientDelen` bestaat niet.

- [ ] **Step 3: Implementeer `ingredientDelen` en herschrijf `ingredientTekst` erbovenop**

Vervang in `src/lib/schalen.ts` de bestaande `ingredientTekst` door:

```ts
export function ingredientDelen(ing: Ingredient, factor: number): { hoeveelheid?: string; naam: string } {
  if (ing.hoeveelheid === undefined) return { naam: ing.naam };
  const waarde = schaalHoeveelheid(ing.hoeveelheid, ing.schaling, factor, ing.eenheid);
  const naam = waarde > 1 && ing.meervoud !== undefined ? ing.meervoud : ing.naam;
  const toonEenheid = ing.eenheid !== undefined && ing.eenheid !== 'stuk' ? ing.eenheid : undefined;
  return { hoeveelheid: formatteerHoeveelheid(waarde, toonEenheid), naam };
}

export function ingredientTekst(ing: Ingredient, factor: number): string {
  const delen = ingredientDelen(ing, factor);
  return delen.hoeveelheid === undefined ? delen.naam : `${delen.hoeveelheid} ${delen.naam}`;
}
```

- [ ] **Step 4: Draai alle tests, zie ze slagen**

Run: `npx vitest run`
Expected: PASS (ook de bestaande `ingredientTekst`-tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/schalen.ts tests/schalen.test.ts
git commit -m "ingredientDelen splitst hoeveelheid en naam"
```

---

### Task 2: Fundament — Poppins, tokens en volledige nieuwe global.css

**Files:**
- Modify: `package.json` (dependency), `src/layouts/Basis.astro`, `src/styles/global.css`

**Interfaces:**
- Produces: CSS-klassen die Task 3 en 4 in markup gebruiken: `.zoekveld`, `.zoekbalk`, `.tagfilters`, `.tag`, `.tag.actief`, `.kaarten`, `.kaart`, `.kaart-placeholder`, `.kaart-overlay`, `.kaart-tijd`, `.terug`, `.recept-foto`, `.statrij`, `.stat`, `.personen-kiezer`, `.ingredienten`, `.ingredient-naam`, `.ingredient-hoeveelheid`, `.notitie`, `.stappen`, `.stap`, `.stap-tijd`, `.ingredient-ref`, `.waarschuwing`, `.beschrijving`.
- Let op: na deze taak oogt de site tijdelijk deels ongestyled (oude markup + nieuwe CSS); Task 3 en 4 maken het af. Build en gedrag blijven wel werken.

- [ ] **Step 1: Installeer Poppins**

Run: `npm install @fontsource/poppins`

- [ ] **Step 2: Basis.astro — fonts importeren, site-balk weg**

Vervang de frontmatter-imports en verwijder de `<header class="site-kop">` uit `src/layouts/Basis.astro`:

```astro
---
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '../styles/global.css';
import { pad } from '../lib/pad';

const { titel } = Astro.props as { titel: string };
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
    <main>
      <slot />
    </main>
  </body>
</html>
```

(`pad` blijft nodig voor de favicon.)

- [ ] **Step 3: Vervang `src/styles/global.css` volledig door:**

```css
* { box-sizing: border-box; }

[hidden] { display: none !important; }

:root {
  --inkt: #454545;
  --inkt-zacht: #8f9c97;
  --papier: #eef4f1;
  --kaart: #ffffff;
  --accent: #43927d;
  --accent-donker: #35755f;
  --chip: #e3efe9;
  --radius: 1.25rem;
  --schaduw: 0 12px 32px rgba(69, 90, 82, 0.1);
  --waarschuwing-achtergrond: #fdf3d8;
  --waarschuwing-rand: #e0b950;
}

body {
  margin: 0;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--inkt);
  background: var(--papier);
}

main {
  max-width: 44rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 5rem;
}
main:has(.kaarten) { max-width: 70rem; }

h1 { font-size: 1.65rem; font-weight: 700; line-height: 1.25; margin: 0.5rem 0 1rem; }
h2 { font-size: 1.25rem; font-weight: 600; margin: 2rem 0 0.75rem; }

.beschrijving { color: var(--inkt-zacht); margin: 0.25rem 0 0.5rem; }

/* Zoekbalk */
.zoekveld { position: relative; display: block; margin: 0.25rem 0 1rem; }
.zoekveld svg {
  position: absolute;
  left: 1rem;
  top: 50%;
  translate: 0 -50%;
  color: var(--inkt-zacht);
  pointer-events: none;
}
.zoekbalk {
  width: 100%;
  font: inherit;
  font-size: 1rem;
  padding: 0.8rem 1rem 0.8rem 2.9rem;
  border: none;
  border-radius: 1rem;
  background: var(--kaart);
  color: var(--inkt);
  box-shadow: var(--schaduw);
}
.zoekbalk::placeholder { color: var(--inkt-zacht); }
.zoekbalk:focus { outline: 2px solid var(--accent); }

/* Chips (filters én recepttags) */
.tagfilters { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0 0 1.5rem; }
.tag {
  border: none;
  background: var(--chip);
  color: var(--accent);
  border-radius: 999px;
  padding: 0.45rem 1.1rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
}
button.tag { cursor: pointer; }
.tag.actief { background: var(--accent); color: #fff; }

/* Receptkaarten (overzicht) */
.kaarten {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1.25rem;
}
.kaart {
  position: relative;
  display: block;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--schaduw);
  background: var(--kaart);
  text-decoration: none;
}
.kaart img, .kaart-placeholder {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}
.kaart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: #fff;
  background: linear-gradient(135deg, #6db39e, var(--accent));
}
.kaart-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 2.5rem 1.1rem 0.9rem;
  background: linear-gradient(180deg, rgba(40, 40, 40, 0) 0%, rgba(40, 40, 40, 0.75) 100%);
}
.kaart-overlay h2 { margin: 0; font-size: 1.1rem; font-weight: 600; color: #fff; line-height: 1.35; }
.kaart-tijd {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(255, 255, 255, 0.92);
  color: var(--inkt);
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Receptpagina */
.terug {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 999px;
  background: var(--kaart);
  box-shadow: var(--schaduw);
  color: var(--inkt);
  text-decoration: none;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}
.recept-foto {
  width: 100%;
  height: auto;
  border-radius: var(--radius);
  box-shadow: var(--schaduw);
}

.statrij {
  display: flex;
  justify-content: space-around;
  gap: 0.5rem;
  background: var(--kaart);
  border-radius: var(--radius);
  box-shadow: var(--schaduw);
  padding: 0.9rem 0.5rem;
  margin: 1.25rem 0 1rem;
}
.stat { text-align: center; }
.stat strong { display: block; font-size: 1.05rem; font-weight: 600; }
.stat span { font-size: 0.8rem; color: var(--inkt-zacht); }

.waarschuwing {
  display: flex;
  gap: 0.5rem;
  background: var(--waarschuwing-achtergrond);
  border: 1px solid var(--waarschuwing-rand);
  border-radius: 1rem;
  padding: 0.6rem 0.9rem;
  margin: 0.75rem 0;
  font-weight: 500;
}

.personen-kiezer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 0 0.5rem;
}
.personen-kiezer button {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.3rem;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
}
.personen-kiezer button:hover { background: var(--accent-donker); }
.personen-kiezer output {
  min-width: 1.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 1.2rem;
}

/* Ingrediënten als witte kaart */
.ingredienten {
  list-style: none;
  padding: 0.5rem 1.25rem;
  margin: 0.75rem 0 0;
  background: var(--kaart);
  border-radius: var(--radius);
  box-shadow: var(--schaduw);
}
.ingredienten li { border-bottom: 1px solid var(--papier); }
.ingredienten li:last-child { border-bottom: none; }
.ingredienten label {
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.7rem 0;
  cursor: pointer;
}
.ingredienten input { accent-color: var(--accent); transform: translateY(2px) scale(1.25); }
.ingredient-naam { flex: 1; }
.ingredient-hoeveelheid { color: var(--inkt-zacht); font-size: 0.95rem; white-space: nowrap; }
.ingredienten label:has(input:checked) { opacity: 0.45; }
.ingredienten label:has(input:checked) .ingredient-naam { text-decoration: line-through; }
.notitie { color: var(--inkt-zacht); }

/* Stappen */
.stappen { padding-left: 1.5rem; margin: 0; }
.stappen > li { margin: 1.25rem 0; }
.stappen > li::marker { font-weight: 600; color: var(--accent); }
.stap p { margin: 0; }
.stap-tijd { color: var(--inkt-zacht); font-size: 0.9rem; margin-top: 0.25rem !important; }
.ingredient-ref { font-weight: 600; color: var(--accent-donker); }
```

- [ ] **Step 4: Verifieer**

Run: `npx vitest run && npm run build`
Expected: beide slagen.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/layouts/Basis.astro src/styles/global.css
git commit -m "Mintgroen fundament: Poppins, kleurtokens, nieuwe global.css"
```

---

### Task 3: Overzichtspagina — titel, zoekbalk met icoon, kaart-overlay

**Files:**
- Modify: `src/pages/index.astro`, `src/components/ReceptKaart.astro`

**Interfaces:**
- Consumes: CSS-klassen uit Task 2 (`.zoekveld`, `.kaart-overlay`, `.kaart-tijd`, `.kaart-placeholder`).
- Produces: kaart-markup blijft `<a class="kaart" data-zoek data-tags>` — het filterscript in `index.astro` en de selectors `#zoek`, `#tagfilters .tag`, `#geen-resultaten` blijven exact zoals ze zijn.

- [ ] **Step 1: index.astro — titel en zoekveld**

Vervang in `src/pages/index.astro` de `<h1>` en de zoekbalk (de rest, inclusief het `<script>`-blok, blijft ongewijzigd):

```astro
<Basis titel="Recepten">
  <h1>🍲 Recepten</h1>
  <label class="zoekveld">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <input class="zoekbalk" type="search" id="zoek" placeholder="Zoek op naam, tag of ingrediënt…" />
  </label>
  …
```

- [ ] **Step 2: ReceptKaart.astro — overlay-titel en tijd-chip**

Vervang de template van `src/components/ReceptKaart.astro` (frontmatter blijft gelijk, alleen `zoektekst`-berekening en imports blijven):

```astro
<a class="kaart" href={pad(`recept/${recept.slug}/`)} data-zoek={zoektekst} data-tags={recept.tags.join(' ')}>
  {foto ? (
    <Image src={foto} alt="" widths={[480]} sizes="(max-width: 40rem) 100vw, 20rem" />
  ) : (
    <div class="kaart-placeholder" aria-hidden="true">{recept.titel.slice(0, 1)}</div>
  )}
  <span class="kaart-tijd">
    🍳 {formatteerMinuten(tijd.actief)}{tijd.wachten > 0 && ` · ⏳ ${formatteerMinuten(tijd.wachten)}`}
  </span>
  <div class="kaart-overlay">
    <h2>{recept.titel}</h2>
  </div>
</a>
```

(De oude `.kaart-tekst`, `.tijden` en `.kaart-tags` verdwijnen dus van de kaart.)

- [ ] **Step 3: Verifieer**

Run: `npm run build`
Expected: slaagt. Controleer daarna in `npx astro preview` (of de dev-server) dat zoeken en tagfilters nog werken en kaarten de overlay tonen.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/components/ReceptKaart.astro
git commit -m "Overzicht in app-stijl: zoekicoon en kaart-overlay"
```

---

### Task 4: Receptpagina — terug-link, stat-rij, tag-chips, gesplitste ingrediëntenrij

**Files:**
- Modify: `src/pages/recept/[slug].astro`, `src/components/IngredientenLijst.astro`

**Interfaces:**
- Consumes: `ingredientDelen(ing, factor): { hoeveelheid?: string; naam: string }` uit Task 1; CSS-klassen uit Task 2 (`.terug`, `.statrij`, `.stat`, `.tagfilters`, `.tag`, `.ingredient-naam`, `.ingredient-hoeveelheid`).
- Produces: n.v.t. (laatste taak).

- [ ] **Step 1: IngredientenLijst.astro — hoeveelheid apart van naam**

Vervang `src/components/IngredientenLijst.astro` volledig door:

```astro
---
import { ingredientDelen } from '../lib/schalen';
import type { Ingredient } from '../lib/typen';

const { ingredienten } = Astro.props as { ingredienten: Ingredient[] };
---
<h2>Ingrediënten</h2>
<ul class="ingredienten">
  {ingredienten.map((ingredient) => {
    const delen = ingredientDelen(ingredient, 1);
    return (
      <li>
        <label
          data-ingredient-rij
          data-hoeveelheid={ingredient.hoeveelheid}
          data-eenheid={ingredient.eenheid}
          data-schaling={ingredient.schaling}
          data-naam={ingredient.naam}
          data-meervoud={ingredient.meervoud}
        >
          <input type="checkbox" />
          <span class="ingredient-naam">
            <span data-doel-naam>{delen.naam}</span>
            {ingredient.notitie && <span class="notitie">, {ingredient.notitie}</span>}
          </span>
          {delen.hoeveelheid !== undefined && (
            <span class="ingredient-hoeveelheid" data-doel-hoeveelheid>{delen.hoeveelheid}</span>
          )}
        </label>
      </li>
    );
  })}
</ul>
```

Let op: de lijstrijen hebben géén `data-ingredient` meer; dat attribuut blijft alleen op de ingredient-verwijzingen in stappen (`Stap.astro`, ongewijzigd).

- [ ] **Step 2: [slug].astro — terug-link, stat-rij en chips in de template**

Vervang de template (tussen `<Basis …>`-tags) door:

```astro
<Basis titel={recept.titel}>
  <article class="recept" data-slug={recept.slug} data-basis-personen={recept.personen}>
    <a class="terug" href={pad('')} aria-label="Terug naar overzicht">←</a>
    {foto && <Image class="recept-foto" src={foto} alt={recept.titel} widths={[480, 960]} sizes="100vw" />}
    <h1>{recept.titel}</h1>
    <p class="beschrijving">{recept.beschrijving}</p>
    <div class="statrij">
      <div class="stat"><strong>{formatteerMinuten(tijd.actief)}</strong><span>actief</span></div>
      {tijd.wachten > 0 && (
        <div class="stat"><strong>{formatteerMinuten(tijd.wachten)}</strong><span>wachten</span></div>
      )}
      <div class="stat"><strong data-personen>{recept.personen}</strong><span>personen</span></div>
      <div class="stat"><strong>{recept.ingredienten.length}</strong><span>ingrediënten</span></div>
    </div>
    {recept.tags.length > 0 && (
      <div class="tagfilters">
        {recept.tags.map((tag) => <span class="tag">{tag}</span>)}
      </div>
    )}
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
```

De frontmatter krijgt één extra import: `import { pad } from '../../lib/pad';`. De oude `<p class="tijden">` vervalt.

- [ ] **Step 3: [slug].astro — clientscript bijwerken**

Vervang het `<script>`-blok door (verschillen: `ingredientDelen`-import, `querySelectorAll('[data-personen]')` voor kiezer én stat-rij, aparte lus voor `[data-ingredient-rij]`):

```astro
<script>
  import { ingredientDelen, ingredientTekst } from '../../lib/schalen';
  import type { Ingredient, Schaling } from '../../lib/typen';

  const artikel = document.querySelector<HTMLElement>('article.recept')!;
  const basis = Number(artikel.dataset.basisPersonen);
  const sleutel = `personen:${artikel.dataset.slug}`;
  const uitvoeren = [...artikel.querySelectorAll<HTMLElement>('[data-personen]')];
  let personen = Number(localStorage.getItem(sleutel)) || basis;

  function ingredientVan(dataset: DOMStringMap): Ingredient {
    return {
      id: '',
      naam: dataset.naam!,
      meervoud: dataset.meervoud,
      hoeveelheid: dataset.hoeveelheid !== undefined ? Number(dataset.hoeveelheid) : undefined,
      eenheid: dataset.eenheid,
      schaling: dataset.schaling as Schaling,
    };
  }

  function werkBij() {
    for (const uitvoer of uitvoeren) uitvoer.textContent = String(personen);
    localStorage.setItem(sleutel, String(personen));
    const factor = personen / basis;
    for (const span of artikel.querySelectorAll<HTMLElement>('[data-ingredient]')) {
      span.textContent = ingredientTekst(ingredientVan(span.dataset), factor);
    }
    for (const rij of artikel.querySelectorAll<HTMLElement>('[data-ingredient-rij]')) {
      const delen = ingredientDelen(ingredientVan(rij.dataset), factor);
      rij.querySelector('[data-doel-naam]')!.textContent = delen.naam;
      const hoeveelheidDoel = rij.querySelector('[data-doel-hoeveelheid]');
      if (hoeveelheidDoel !== null && delen.hoeveelheid !== undefined) {
        hoeveelheidDoel.textContent = delen.hoeveelheid;
      }
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

- [ ] **Step 4: Verifieer**

Run: `npx vitest run && npm run build`
Expected: beide slagen. Controleer daarna in de preview/dev-server op een receptpagina: −/+ schaalt hoeveelheden in lijst én stappen, stat-rij-personen loopt mee, afvinken streept door, waarschuwingen staan op hun plek.

- [ ] **Step 5: Commit**

```bash
git add src/pages/recept/[slug].astro src/components/IngredientenLijst.astro
git commit -m "Receptpagina in app-stijl: stat-rij, chips en gesplitste ingrediëntenrij"
```
