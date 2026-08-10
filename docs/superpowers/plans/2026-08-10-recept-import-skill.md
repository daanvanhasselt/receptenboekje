# Recept-import-skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een project-skill `/recept-import` die een recept (URL, afbeelding of tekst) omzet naar gevalideerde, gecommitte recept-JSON, plus een optioneel `bron`-veld in schema en site en twee hulpscripts (slug, foto).

**Architecture:** De conversie zelf is LLM-werk en staat als protocol in `.claude/skills/recept-import/SKILL.md`. Deterministische onderdelen zijn code: `maakSlug`/`bronWeergave` als pure, geteste functies in `src/lib/`, dunne CLI-wrappers in `scripts/`, en de bestaande validator als poort.

**Tech Stack:** Bestaande stack (Astro 5, TypeScript strict, Vitest, tsx, Ajv, sharp — allemaal al geïnstalleerd; geen nieuwe dependencies).

**Spec:** `docs/superpowers/specs/2026-08-10-recept-import-skill-design.md`

## Global Constraints

- Alle code, identifiers, teksten en commitboodschappen in het Nederlands.
- Geen nieuwe npm-dependencies; `sharp` en `tsx` zijn er al.
- Bestaande recepten blijven ongewijzigd geldig (`bron` is optioneel).
- Tests: `npm test` (Vitest, `tests/*.test.ts`); validatie: `npm run valideer`; na elke taak moeten beide groen zijn.
- Commits per taak, Nederlandse commitboodschap.

---

### Task 1: `bron`-veld in schema, types, validatie en receptpagina

**Files:**
- Modify: `schema/recept.schema.json` (properties-blok), `src/lib/typen.ts` (interface `Recept`), `src/pages/recept/[slug].astro` (na de `</ol>` van de stappen), `recepten/lasagne.json` (bron-demo), `tests/valideer.test.ts`
- Create: `src/lib/bron.ts`
- Test: `tests/bron.test.ts`

**Interfaces:**
- Consumes: bestaande `valideerRecept(bestand, data, fotoBestaat?)` uit `src/lib/valideer.ts`.
- Produces: `bronWeergave(bron: string): { tekst: string; url?: string }` in `src/lib/bron.ts` — voor een `http(s)`-URL is `tekst` de hostname (zonder `www.`) en `url` de volledige URL; anders is `tekst` de invoer en `url` afwezig. Verder: `bron?: string` op `Recept`.

- [ ] **Step 1: Schrijf de failing tests**

Voeg toe aan `tests/valideer.test.ts` (onder de bestaande tests; `geldig` bestaat daar al):

```ts
test('bron is toegestaan als optioneel veld', () => {
  expect(valideerRecept('test.json', { ...geldig, bron: 'https://voorbeeld.nl/lasagne' })).toEqual([]);
});

test('lege bron is ongeldig', () => {
  expect(valideerRecept('test.json', { ...geldig, bron: '' }).length).toBeGreaterThan(0);
});
```

Nieuw bestand `tests/bron.test.ts`:

```ts
import { expect, test } from 'vitest';
import { bronWeergave } from '../src/lib/bron';

test('URL wordt hostname zonder www, met url erbij', () => {
  expect(bronWeergave('https://www.smulweb.nl/recepten/lasagne')).toEqual({
    tekst: 'smulweb.nl',
    url: 'https://www.smulweb.nl/recepten/lasagne',
  });
});

test('vrije tekst blijft platte tekst zonder url', () => {
  expect(bronWeergave('Bijbel van de Italiaanse keuken, p. 212')).toEqual({
    tekst: 'Bijbel van de Italiaanse keuken, p. 212',
  });
});

test('kapotte http-waarde valt terug op platte tekst', () => {
  expect(bronWeergave('http://')).toEqual({ tekst: 'http://' });
});
```

- [ ] **Step 2: Run de tests, verwacht falen**

Run: `npx vitest run tests/bron.test.ts tests/valideer.test.ts`
Expected: FAIL — `../src/lib/bron` bestaat niet; 'bron is toegestaan' faalt op `additionalProperties: false` in het schema.

- [ ] **Step 3: Implementeer schema, type en `bron.ts`**

In `schema/recept.schema.json`, binnen het bovenste `properties`-blok, na `"foto"`:

```json
    "bron": { "type": "string", "minLength": 1 },
```

In `src/lib/typen.ts`, in `interface Recept` na `foto?: string;`:

```ts
  bron?: string;
```

Nieuw bestand `src/lib/bron.ts`:

```ts
export function bronWeergave(bron: string): { tekst: string; url?: string } {
  if (bron.startsWith('http://') || bron.startsWith('https://')) {
    try {
      const hostname = new URL(bron).hostname.replace(/^www\./, '');
      if (hostname !== '') return { tekst: hostname, url: bron };
    } catch {
      // geen geldige URL: toon als platte tekst
    }
  }
  return { tekst: bron };
}
```

- [ ] **Step 4: Run de tests, verwacht groen**

Run: `npx vitest run tests/bron.test.ts tests/valideer.test.ts`
Expected: PASS, alle tests.

- [ ] **Step 5: Render de bron op de receptpagina en demonstreer in lasagne.json**

In `src/pages/recept/[slug].astro`: voeg bovenin het frontmatter-blok toe:

```ts
import { bronWeergave } from '../../lib/bron';
```

en na de bestaande regel `const foto = fotoVoor(recept.foto);`:

```ts
const bron = recept.bron !== undefined ? bronWeergave(recept.bron) : undefined;
```

In de template, direct ná de sluitende `</ol>` van de stappen (binnen `</article>`):

```astro
    {bron && (
      <p class="bron">
        Bron: {bron.url ? <a href={bron.url}>{bron.tekst}</a> : bron.tekst}
      </p>
    )}
```

In `src/styles/global.css`, onderaan:

```css
.bron {
  color: #5a544c;
  font-size: 0.9rem;
  margin-top: 2rem;
}
.bron a { color: inherit; }
```

In `recepten/lasagne.json`: voeg na de regel met `"foto"` — die er niet is, dus na `"tags": [...],` — toe:

```json
  "bron": "Klassiek familierecept",
```

- [ ] **Step 6: Bouw en controleer de output**

Run: `npm run valideer && npm test && npm run build && grep -o 'Bron: Klassiek familierecept' dist/recept/lasagne/index.html`
Expected: alles groen; de grep vindt de bronregel.

- [ ] **Step 7: Commit**

```bash
git add schema/ src/ recepten/lasagne.json tests/
git commit -m "Optioneel bron-veld in schema en op de receptpagina"
```

---

### Task 2: `maakSlug` + CLI `scripts/slug.ts`

**Files:**
- Create: `src/lib/slug.ts`, `scripts/slug.ts`
- Test: `tests/slug.test.ts`

**Interfaces:**
- Produces: `maakSlug(titel: string): string` in `src/lib/slug.ts`; CLI `npx tsx scripts/slug.ts "<titel>"` drukt de slug af op stdout. Task 4 (SKILL.md) verwijst naar dit CLI-commando.

- [ ] **Step 1: Schrijf de failing tests**

`tests/slug.test.ts`:

```ts
import { expect, test } from 'vitest';
import { maakSlug } from '../src/lib/slug';

test('kleine letters en streepjes', () => {
  expect(maakSlug('Pasta met pesto')).toBe('pasta-met-pesto');
});

test('diakrieten worden gestript', () => {
  expect(maakSlug('Boeuf bourguignon à la crème')).toBe('boeuf-bourguignon-a-la-creme');
});

test('interpunctie wordt één streepje, randen schoon', () => {
  expect(maakSlug("  Kip & rijst (extra pittig!)  ")).toBe('kip-rijst-extra-pittig');
});

test('cijfers blijven staan', () => {
  expect(maakSlug('5-minuten noodles')).toBe('5-minuten-noodles');
});
```

- [ ] **Step 2: Run de tests, verwacht falen**

Run: `npx vitest run tests/slug.test.ts`
Expected: FAIL — module bestaat niet.

- [ ] **Step 3: Implementeer `src/lib/slug.ts` en `scripts/slug.ts`**

`src/lib/slug.ts`:

```ts
export function maakSlug(titel: string): string {
  return titel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

`scripts/slug.ts`:

```ts
import { maakSlug } from '../src/lib/slug';

const titel = process.argv[2];
if (titel === undefined || titel.trim() === '') {
  console.error('Gebruik: npx tsx scripts/slug.ts "<titel>"');
  process.exit(1);
}
console.log(maakSlug(titel));
```

- [ ] **Step 4: Run tests en CLI, verwacht groen**

Run: `npx vitest run tests/slug.test.ts && npx tsx scripts/slug.ts "Boeuf bourguignon à la crème"`
Expected: tests PASS; CLI drukt `boeuf-bourguignon-a-la-creme` af.

- [ ] **Step 5: Commit**

```bash
git add src/lib/slug.ts scripts/slug.ts tests/slug.test.ts
git commit -m "Slug-generator met CLI voor de import-skill"
```

---

### Task 3: `scripts/foto-import.ts`

**Files:**
- Create: `scripts/foto-import.ts`

**Interfaces:**
- Consumes: `sharp` (bestaande dependency).
- Produces: CLI `npx tsx scripts/foto-import.ts <url-of-pad> <slug>` → schrijft `recepten/<slug>.jpg` (max. 1600 px breed, JPEG kwaliteit 82) en drukt het geschreven pad af. Exitcode 1 met duidelijke foutmelding bij onbereikbare URL of onbruikbaar bestand. Task 4 (SKILL.md) verwijst naar dit commando.

- [ ] **Step 1: Implementeer `scripts/foto-import.ts`**

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const [bron, slug] = [process.argv[2], process.argv[3]];
if (bron === undefined || slug === undefined || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Gebruik: npx tsx scripts/foto-import.ts <url-of-pad> <slug>');
  process.exit(1);
}

async function haalBytes(): Promise<Buffer> {
  if (bron.startsWith('http://') || bron.startsWith('https://')) {
    const antwoord = await fetch(bron);
    if (!antwoord.ok) throw new Error(`download mislukt: HTTP ${antwoord.status} voor ${bron}`);
    return Buffer.from(await antwoord.arrayBuffer());
  }
  return readFileSync(bron);
}

try {
  const bytes = await haalBytes();
  const jpeg = await sharp(bytes)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  const doel = join(process.cwd(), 'recepten', `${slug}.jpg`);
  writeFileSync(doel, jpeg);
  console.log(doel);
} catch (fout) {
  console.error(`Foto-import mislukt: ${(fout as Error).message}`);
  process.exit(1);
}
```

Let op: `.rotate()` zonder argument past EXIF-oriëntatie toe (telefoonfoto's van kookboekpagina's).

- [ ] **Step 2: Verifieer met een gegenereerde testafbeelding**

Run:

```bash
node -e "require('sharp')({create:{width:2400,height:1600,channels:3,background:{r:180,g:90,b:45}}}).png().toFile('/tmp/testfoto.png').then(()=>console.log('ok'))" \
&& npx tsx scripts/foto-import.ts /tmp/testfoto.png testfoto \
&& node -e "require('sharp')('recepten/testfoto.jpg').metadata().then(m=>console.log(m.format, m.width))"
```

Expected: eerst `ok`, dan het pad naar `recepten/testfoto.jpg`, dan `jpeg 1600` (verkleind van 2400 naar 1600 breed).

- [ ] **Step 3: Verifieer de foutpaden**

Run: `npx tsx scripts/foto-import.ts /bestaat/niet.jpg testfoto; echo "exit=$?"` en `npx tsx scripts/foto-import.ts https://voorbeeld.invalid/x.jpg testfoto; echo "exit=$?"`
Expected: beide keren een duidelijke Nederlandse foutmelding en `exit=1`.

- [ ] **Step 4: Ruim de testartefacten op en commit**

```bash
rm recepten/testfoto.jpg /tmp/testfoto.png
git add scripts/foto-import.ts
git commit -m "Foto-importscript: download, verklein en schrijf receptfoto"
```

---

### Task 4: de skill `.claude/skills/recept-import/SKILL.md`

**Files:**
- Create: `.claude/skills/recept-import/SKILL.md`

**Interfaces:**
- Consumes: `npx tsx scripts/slug.ts "<titel>"` (Task 2), `npx tsx scripts/foto-import.ts <url-of-pad> <slug>` (Task 3), `npm run valideer`, `npm test`, `schema/recept.schema.json` met `bron`-veld (Task 1).

- [ ] **Step 1: Schrijf `.claude/skills/recept-import/SKILL.md`**

````markdown
---
name: recept-import
description: Zet een recept (URL, afbeelding of geplakte tekst) om naar het gestandaardiseerde recept-JSON-formaat in recepten/, inclusief foto, validatie en commit. Gebruik bij "importeer dit recept", "voeg dit recept toe", een geplakte recepttekst, een recept-URL of een foto van een kookboekpagina.
---

# Recept importeren

Zet de gegeven invoer om naar één nieuw bestand in `recepten/` volgens `schema/recept.schema.json`: gevalideerd, gecommit, met rapport. Push niet — dat beslist de gebruiker.

## Werkwijze

1. **Invoer binnenhalen.**
   - URL → haal de pagina op met WebFetch en vraag om de volledige recepttekst: titel, aantal personen, ingrediënten met hoeveelheden, alle stappen met tijden, en de URL van de receptfoto.
   - Afbeeldingspad → Read (vision) en lees het recept af.
   - Geplakte tekst → direct gebruiken.
   - Anderstalige bron → vertaal alles naar het Nederlands.
2. **Bestaande stijl peilen.** Bekijk de tags die al in gebruik zijn: `grep -h '"tags"' recepten/*.json`. Hergebruik bestaande tags waar passend; introduceer geen synoniem naast een bestaande tag (geen "vegetarisch" naast "vega").
3. **Slug en bestandscheck.** `npx tsx scripts/slug.ts "<titel>"` → het recept wordt `recepten/<slug>.json`. Bestaat dat bestand al, meld het dan en stop.
4. **JSON opbouwen** volgens de regels hieronder.
5. **Foto.** Heeft de bron een receptfoto (foto-URL uit de pagina, of de invoer wás een foto van het gerecht — een kookboekpagina vol tekst is géén receptfoto): `npx tsx scripts/foto-import.ts <url-of-pad> <slug>` en zet `"foto": "<slug>.jpg"` in de JSON. Geen foto of mislukt → veld weglaten en dit in het rapport melden.
6. **Poort.** `npm run valideer && npm test` — beide moeten groen. Fouten eerst fixen; de foutmeldingen noemen bestand en veld.
7. **Commit.** `git add recepten/ && git commit -m "Recept toegevoegd: <titel>"`.
8. **Rapport.** Meld: samenvatting (titel, personen, tags, totaaltijd), álle aannames en schattingen (met stapnummer), en wat er niet te vinden was (foto, tijden, personen).

Stel de gebruiker alléén een vraag als het aantal personen nergens uit af te leiden is. Al het andere: beste aanname doen en rapporteren.

## Regels voor de JSON

**Basis.** `titel` zoals de bron (Nederlands); `beschrijving` is één zin die je zelf formuleert — feitelijk, geen marketingtekst uit de bron; `personen` uit de bron; `bron` = de URL, of vrije tekst zoals "Kookboek X, p. 34"; bij geplakte tekst zonder herkomst: veld weglaten.

**Ingrediënten.** Kebab-case `id`'s, uniek binnen het recept.
- Telbare stuks (ui, ei, teen knoflook, citroen, paprika) → `"eenheid": "stuk"`, `"schaling": "stuks"`, én `meervoud` ("uien", "eieren", "tenen knoflook").
- Smaakmakers en bakvet zonder echte maat ("naar smaak", "snufje", "scheutje om te bakken") → `"schaling": "vast"` zonder hoeveelheid, met `notitie`.
- Al het andere → `"schaling": "lineair"` met `hoeveelheid` + `eenheid` uit: `g`, `ml`, `kg`, `l`, `el`, `tl`, `stuk`. Reken afwijkende maten om (kopje ≈ 250 ml, eetlepel = el).

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
    { "id": "spaghetti", "naam": "spaghetti", "hoeveelheid": 200, "eenheid": "g", "schaling": "lineair" },
    { "id": "knoflook", "naam": "teen knoflook", "meervoud": "tenen knoflook", "hoeveelheid": 4, "eenheid": "stuk", "schaling": "stuks" },
    { "id": "peper", "naam": "rode peper", "meervoud": "rode pepers", "hoeveelheid": 1, "eenheid": "stuk", "schaling": "stuks" },
    { "id": "olijfolie", "naam": "olijfolie", "hoeveelheid": 60, "eenheid": "ml", "schaling": "lineair" },
    { "id": "peterselie", "naam": "verse peterselie", "schaling": "vast", "notitie": "handje, fijngehakt" },
    { "id": "zout", "naam": "zout", "schaling": "vast", "notitie": "voor het kookwater" }
  ],
  "stappen": [
    { "tekst": "Kook {spaghetti} al dente in ruim water met {zout}.", "duur": 10, "vereist": { "apparaat": "pan-water" } },
    { "tekst": "Snijd {knoflook} en {peper} fijn en fruit ze zachtjes in {olijfolie}.", "duur": 6 },
    { "tekst": "Meng de spaghetti met een scheutje kookvocht door de olie en bestrooi met {peterselie}.", "duur": 2 }
  ]
}
```

Let op wat er met de bronstappen gebeurde: "breng een pan water aan de kook" is metadata geworden (`vereist` op de kookstap), de hoeveelheden zijn `{id}`-verwijzingen, en de tijden zijn geschat (rapporteer: "duur stap 1–3 geschat").
````

- [ ] **Step 2: Controleer dat de repo-toestand klopt met de skill**

Run: `npx tsx scripts/slug.ts "Spaghetti aglio e olio" && grep -c 'pan-water' .claude/skills/recept-import/SKILL.md && npm run valideer && npm test 2>&1 | tail -3`
Expected: `spaghetti-aglio-e-olio`; grep ≥ 1; validatie en tests groen.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/recept-import/SKILL.md
git commit -m "Project-skill recept-import"
```
