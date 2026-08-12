# Kookmodus + zoom-fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fullscreen kookmodus (één stap per scherm, wake lock) op de receptpagina, plus uitschakelen van de dubbeltik-zoom bij snelle taps.

**Architecture:** De kookmodus is een server-side gerenderde overlay (`KookModus.astro`) binnen het bestaande `<article class="recept">`, zodat de bestaande `werkBij()`-schaling de ingrediënt-hoeveelheden in de overlay automatisch bijwerkt. Een client-side script toont één stap tegelijk en beheert de wake lock. De zoom-fix is één CSS-regel (`touch-action: manipulation`).

**Tech Stack:** Astro 5 (statisch), TypeScript, vitest. Styling in `src/styles/global.css` (projectconventie: alle CSS daar, geen component-styles).

**Spec:** `docs/superpowers/specs/2026-08-12-kookmodus-design.md`

## Global Constraints

- Alle UI-tekst en identifiers in het Nederlands (projectconventie: `werkBij`, `toon`, `sluit`, …).
- Alle styling in `src/styles/global.css`, met de bestaande CSS-variabelen (`--accent`, `--kaart`, `--papier`, `--chip`, `--radius`, `--schaduw`, `--inkt`, `--inkt-zacht`).
- Tests draaien met `npm test` (vitest), build met `npm run build`. Beide moeten na elke taak slagen.
- Geen nieuwe dependencies.

---

### Task 1: Zoom-fix (touch-action)

**Files:**
- Modify: `src/styles/global.css:19-26` (de bestaande `body`-regel)

**Interfaces:**
- Consumes: n.v.t.
- Produces: n.v.t. (pure CSS)

- [ ] **Step 1: Voeg `touch-action: manipulation` toe aan de body-regel**

In `src/styles/global.css`, wijzig de bestaande `body`-regel naar:

```css
body {
  margin: 0;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--inkt);
  background: var(--papier);
  touch-action: manipulation;
}
```

Toelichting: `touch-action` wordt effectief bepaald door de doorsnede over de ancestor-keten, dus `manipulation` op `body` schakelt dubbeltik-zoom overal uit terwijl pannen en pinch-zoom blijven werken. Geen viewport-wijziging.

- [ ] **Step 2: Verifieer dat de build slaagt**

Run: `npm run build`
Expected: build slaagt zonder fouten.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "Dubbeltik-zoom uit via touch-action: manipulation"
```

---

### Task 2: Helper `ingredientIdsUitStap`

**Files:**
- Modify: `src/lib/substitutie.ts`
- Test: `tests/substitutie.test.ts`

**Interfaces:**
- Consumes: `parseStaptekst(tekst: string): Segment[]` uit hetzelfde bestand.
- Produces: `ingredientIdsUitStap(tekst: string): string[]` — unieke ingrediënt-id's uit een staptekst, in volgorde van eerste voorkomen. Task 3 gebruikt deze om het ingrediëntenlijstje per stap te renderen.

- [ ] **Step 1: Schrijf de falende tests**

Voeg toe aan `tests/substitutie.test.ts` (importeer `ingredientIdsUitStap` naast `parseStaptekst`):

```ts
test('ingredientIdsUitStap geeft unieke ids in volgorde van voorkomen', () => {
  expect(ingredientIdsUitStap('Meng {bloem} met {gist} en nog wat {bloem}')).toEqual(['bloem', 'gist']);
});

test('ingredientIdsUitStap zonder verwijzingen geeft lege lijst', () => {
  expect(ingredientIdsUitStap('Giet de pasta af.')).toEqual([]);
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `npm test`
Expected: FAIL — `ingredientIdsUitStap` bestaat niet.

- [ ] **Step 3: Implementeer de helper**

Voeg toe aan `src/lib/substitutie.ts`:

```ts
export function ingredientIdsUitStap(tekst: string): string[] {
  const ids: string[] = [];
  for (const segment of parseStaptekst(tekst)) {
    if (segment.type === 'ingredient' && !ids.includes(segment.id)) ids.push(segment.id);
  }
  return ids;
}
```

- [ ] **Step 4: Draai de tests en zie ze slagen**

Run: `npm test`
Expected: PASS (alle tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/substitutie.ts tests/substitutie.test.ts
git commit -m "ingredientIdsUitStap: unieke ingredient-ids per stap"
```

---

### Task 3: KookModus-component met wake lock

**Files:**
- Create: `src/components/KookModus.astro`
- Modify: `src/pages/recept/[slug].astro` (component opnemen + boodschappen-selector scopen)
- Modify: `src/styles/global.css` (kookmodus-styling)

**Interfaces:**
- Consumes: `ingredientIdsUitStap(tekst: string): string[]` (Task 2), `ingredientDelen(ing: Ingredient, factor: number): { hoeveelheid?: string; naam: string }` uit `src/lib/schalen.ts`, bestaande componenten `Stap.astro` en `Waarschuwing.astro`.
- Produces: `<KookModus stappen={Stap[]} ingredienten={Ingredient[]} waarschuwingenPerStap={string[][]} />` — rendert de startknop én de overlay.

**Belangrijk — twee valkuilen:**

1. De overlay MOET binnen `<article class="recept">` staan: het bestaande `werkBij()`-script in `[slug].astro` werkt alle `[data-ingredient]`-spans en `[data-ingredient-rij]`-rijen binnen het artikel bij wanneer het aantal personen wijzigt. Doordat de overlay dezelfde attributen gebruikt, schaalt de kookmodus automatisch mee.
2. De boodschappenknop verzamelt nu `artikel.querySelectorAll('[data-ingredient-rij]')`. De kookmodus voegt extra `[data-ingredient-rij]`-rijen toe (per stap, met duplicaten tussen stappen). Zonder aanpassing komen ingrediënten dan dubbel op de boodschappenlijst. Daarom wordt die selector gescoped naar `.ingredienten [data-ingredient-rij]` (Step 2).

- [ ] **Step 1: Maak `src/components/KookModus.astro`**

```astro
---
import Stap from './Stap.astro';
import Waarschuwing from './Waarschuwing.astro';
import { ingredientDelen } from '../lib/schalen';
import { ingredientIdsUitStap } from '../lib/substitutie';
import type { Ingredient, Stap as StapType } from '../lib/typen';

const { stappen, ingredienten, waarschuwingenPerStap } = Astro.props as {
  stappen: StapType[];
  ingredienten: Ingredient[];
  waarschuwingenPerStap: string[][];
};
const perId = new Map(ingredienten.map((ingredient) => [ingredient.id, ingredient]));
---
<button type="button" class="kookmodus-start" data-kookmodus-start>▶ Start kookmodus</button>
<div class="kookmodus" data-kookmodus hidden>
  <header class="km-kop">
    <div>
      <strong data-km-teller>Stap 1 van {stappen.length}</strong>
      <div class="km-bolletjes" aria-hidden="true">
        {stappen.map(() => <span class="km-bolletje"></span>)}
      </div>
    </div>
    <button type="button" class="km-sluit" data-km-sluit aria-label="Kookmodus sluiten">×</button>
  </header>
  <div class="km-inhoud" data-km-inhoud>
    {stappen.map((stap, i) => {
      const stapIngredienten = ingredientIdsUitStap(stap.tekst).map((id) => perId.get(id)!);
      return (
        <section class="km-stap" data-km-stap hidden={i !== 0}>
          {waarschuwingenPerStap[i].map((tekst) => <Waarschuwing tekst={tekst} />)}
          <Stap stap={stap} ingredienten={ingredienten} />
          {stapIngredienten.length > 0 && (
            <ul class="km-ingredienten">
              {stapIngredienten.map((ingredient) => {
                const delen = ingredientDelen(ingredient, 1);
                return (
                  <li
                    data-ingredient-rij
                    data-hoeveelheid={ingredient.hoeveelheid}
                    data-eenheid={ingredient.eenheid}
                    data-schaling={ingredient.schaling}
                    data-naam={ingredient.naam}
                    data-meervoud={ingredient.meervoud}
                  >
                    <span data-doel-naam>{delen.naam}</span>
                    {delen.hoeveelheid !== undefined && (
                      <span class="km-hoeveelheid" data-doel-hoeveelheid>{delen.hoeveelheid}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      );
    })}
  </div>
  <footer class="km-voet">
    <button type="button" data-km-vorige>← Vorige</button>
    <button type="button" data-km-volgende>Volgende →</button>
  </footer>
</div>

<script>
  const overlay = document.querySelector<HTMLElement>('[data-kookmodus]')!;
  const startKnop = document.querySelector<HTMLButtonElement>('[data-kookmodus-start]')!;
  const stappen = [...overlay.querySelectorAll<HTMLElement>('[data-km-stap]')];
  const bolletjes = [...overlay.querySelectorAll<HTMLElement>('.km-bolletje')];
  const teller = overlay.querySelector<HTMLElement>('[data-km-teller]')!;
  const inhoud = overlay.querySelector<HTMLElement>('[data-km-inhoud]')!;
  const vorigeKnop = overlay.querySelector<HTMLButtonElement>('[data-km-vorige]')!;
  const volgendeKnop = overlay.querySelector<HTMLButtonElement>('[data-km-volgende]')!;
  let actief = 0;
  let wakeLock: WakeLockSentinel | null = null;

  async function vraagWakeLock() {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLock = null;
    }
  }

  function toon(i: number) {
    actief = i;
    stappen.forEach((stap, j) => {
      stap.hidden = j !== i;
    });
    bolletjes.forEach((bol, j) => bol.classList.toggle('actief', j <= i));
    teller.textContent = `Stap ${i + 1} van ${stappen.length}`;
    vorigeKnop.disabled = i === 0;
    volgendeKnop.textContent = i === stappen.length - 1 ? 'Klaar ✓' : 'Volgende →';
    inhoud.scrollTop = 0;
  }

  function open() {
    overlay.hidden = false;
    document.body.classList.add('kookmodus-open');
    toon(0);
    void vraagWakeLock();
  }

  function sluit() {
    overlay.hidden = true;
    document.body.classList.remove('kookmodus-open');
    void wakeLock?.release();
    wakeLock = null;
  }

  startKnop.addEventListener('click', open);
  overlay.querySelector('[data-km-sluit]')!.addEventListener('click', sluit);
  vorigeKnop.addEventListener('click', () => {
    if (actief > 0) toon(actief - 1);
  });
  volgendeKnop.addEventListener('click', () => {
    if (actief === stappen.length - 1) sluit();
    else toon(actief + 1);
  });

  let beginX = 0;
  let beginY = 0;
  inhoud.addEventListener(
    'touchstart',
    (e) => {
      beginX = e.touches[0].clientX;
      beginY = e.touches[0].clientY;
    },
    { passive: true }
  );
  inhoud.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - beginX;
      const dy = e.changedTouches[0].clientY - beginY;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0 && actief < stappen.length - 1) toon(actief + 1);
      if (dx > 0 && actief > 0) toon(actief - 1);
    },
    { passive: true }
  );

  document.addEventListener('visibilitychange', () => {
    if (!overlay.hidden && document.visibilityState === 'visible') void vraagWakeLock();
  });
</script>
```

Toelichting:
- Wake lock: aanvragen bij openen, loslaten bij sluiten, opnieuw aanvragen als de pagina weer zichtbaar wordt terwijl de kookmodus open is (iOS laat de lock los bij wegswitchen). Faalt de aanvraag (oude iPadOS, geen https): stil negeren via de lege `catch`.
- `navigator.wakeLock?.request` met optional chaining: op browsers zonder de API is `wakeLock` `undefined` en gebeurt er niets.
- Swipe: alleen horizontaal-dominante bewegingen van ≥ 50px tellen; listeners zijn `passive` zodat scrollen soepel blijft.

- [ ] **Step 2: Neem de component op in `src/pages/recept/[slug].astro`**

Voeg de import toe:

```astro
import KookModus from '../../components/KookModus.astro';
```

Vervang de regel `<h2>Bereiding</h2>` door:

```astro
    <KookModus stappen={recept.stappen} ingredienten={recept.ingredienten} waarschuwingenPerStap={plaatsing.perStap} />
    <h2>Bereiding</h2>
```

(Binnen `<article>`, zodat `werkBij()` de overlay-elementen meepakt.)

Scope in het `<script>`-blok van dezelfde pagina de boodschappen-verzameling naar de ingrediëntenkaart — vervang in de click-handler van `boodschappenKnop`:

```ts
    const ingredienten = [...artikel.querySelectorAll<HTMLElement>('[data-ingredient-rij]')].map((rij) =>
```

door:

```ts
    const ingredienten = [...artikel.querySelectorAll<HTMLElement>('.ingredienten [data-ingredient-rij]')].map((rij) =>
```

(Anders belanden de per-stap-rijen uit de kookmodus dubbel op de boodschappenlijst.)

- [ ] **Step 3: Voeg de kookmodus-styling toe aan `src/styles/global.css`**

Voeg onderaan het bestand toe:

```css
/* Kookmodus */
.kookmodus-start {
  display: block;
  width: 100%;
  margin-top: 2rem;
  padding: 0.9rem;
  border: none;
  border-radius: 999px;
  background: var(--chip);
  color: var(--accent);
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.kookmodus-start:hover { background: var(--accent); color: #fff; }

body.kookmodus-open { overflow: hidden; }

.kookmodus {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  background: var(--papier);
  padding: calc(0.75rem + env(safe-area-inset-top)) 1.25rem calc(0.75rem + env(safe-area-inset-bottom));
}
.km-kop { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.km-bolletjes { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.35rem; }
.km-bolletje { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--chip); }
.km-bolletje.actief { background: var(--accent); }
.km-sluit {
  width: 2.6rem;
  height: 2.6rem;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: var(--kaart);
  box-shadow: var(--schaduw);
  color: var(--inkt);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}
.km-inhoud {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
}
.km-stap { margin: auto 0; }
.km-stap .stap p { font-size: 1.5rem; line-height: 1.55; }
.km-stap .stap-tijd { font-size: 1.05rem; margin-top: 0.75rem !important; }
.km-ingredienten {
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0.25rem 1.25rem;
  background: var(--kaart);
  border-radius: var(--radius);
  box-shadow: var(--schaduw);
}
.km-ingredienten li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--papier);
}
.km-ingredienten li:last-child { border-bottom: none; }
.km-hoeveelheid { color: var(--inkt-zacht); white-space: nowrap; }
.km-voet { display: flex; gap: 0.75rem; }
.km-voet button {
  flex: 1;
  padding: 1.1rem;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
}
[data-km-vorige] { background: var(--chip); color: var(--accent); }
[data-km-vorige]:disabled { opacity: 0.4; cursor: default; }
[data-km-volgende] { background: var(--accent); color: #fff; }
```

Toelichting: `.km-stap { margin: auto 0; }` centreert de stap verticaal als er ruimte over is, maar laat de container gewoon scrollen als een lange stap niet past (in tegenstelling tot `justify-content: center`, dat de bovenkant onbereikbaar afkapt). `z-index: 30` ligt boven de navbalk (10).

- [ ] **Step 4: Verifieer tests en build**

Run: `npm test && npm run build`
Expected: alle tests PASS, build slaagt.

- [ ] **Step 5: Controleer de gerenderde output**

Run: `grep -c "data-km-stap" dist/recept/shakshuka-met-witte-bonen-feta/index.html`
Expected: 6 (één per stap van dat recept).

Run: `grep -c "kookmodus-start" dist/recept/shakshuka-met-witte-bonen-feta/index.html`
Expected: ≥ 1.

- [ ] **Step 6: Commit**

```bash
git add src/components/KookModus.astro src/pages/recept/[slug].astro src/styles/global.css
git commit -m "Kookmodus: fullscreen stap-voor-stap met wake lock"
```

---

## Handmatige verificatie (na alle taken)

Via `npm run dev` op een recept:
1. Tik snel meermaals op +/− van de personenkiezer → geen zoom meer.
2. Start kookmodus → overlay vult het scherm, stap 1 zichtbaar, "Vorige" uitgeschakeld.
3. Volgende/Vorige en swipen werken; bolletjes en teller lopen mee; laatste stap toont "Klaar ✓" die sluit.
4. Personen wijzigen vóór het starten → hoeveelheden in kookmodus-staptekst én per-stap-lijstje zijn geschaald.
5. Boodschappenknop → elk ingrediënt maar één keer op de lijst.
6. Wake lock alleen op echt apparaat (iPadOS ≥ 16.4, https of localhost) te testen.
