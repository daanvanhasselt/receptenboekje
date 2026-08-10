# Recept-import via headless Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De `/recept-import`-skill haalt recept-URL's en foto's voortaan altijd via headless Chrome op (playwright-core + lokale Chrome), zodat botbescherming (403) geen probleem meer is.

**Architecture:** Eén nieuw script `scripts/haal-pagina.ts` (pagina → JSON met JSON-LD + zichtbare tekst), een browser-fallback in `scripts/foto-import.ts`, en een SKILL.md-update die deze route voorschrijft.

**Tech Stack:** playwright-core (nieuw, devDependency; gebruikt lokaal geïnstalleerde Chrome), verder bestaande stack (tsx, sharp).

**Spec:** `docs/superpowers/specs/2026-08-10-recept-import-headless-chrome-design.md`

## Global Constraints

- Alle code, identifiers, teksten en commitboodschappen in het Nederlands.
- `playwright-core` is de enige nieuwe dependency (devDependency); géén `playwright` (dat downloadt browsers).
- Bestaand gedrag van `scripts/foto-import.ts` zonder derde argument blijft exact gelijk.
- Na elke taak: `npm test` groen (50 tests) en `npm run build` groen.

---

### Task 1: `playwright-core` + `scripts/haal-pagina.ts`

**Files:**
- Modify: `package.json` (devDependencies)
- Create: `scripts/haal-pagina.ts`

**Interfaces:**
- Produces: CLI `npx tsx scripts/haal-pagina.ts <url>` → JSON op stdout met `{ titel: string, jsonld: string[], zichtbareTekst: string }`; exit 1 + Nederlandse foutmelding bij ontbrekende/ongeldige URL of laadfout. Task 2 hergebruikt dezelfde user-agent-constante niet (elk script is zelfstandig); Task 3 verwijst naar dit commando.

- [ ] **Step 1: Installeer playwright-core**

Run: `npm install --save-dev playwright-core`
Expected: dependency toegevoegd; geen browser-download.

- [ ] **Step 2: Schrijf `scripts/haal-pagina.ts`**

```ts
import { chromium } from 'playwright-core';

const url = process.argv[2];
if (url === undefined || !/^https?:\/\//.test(url)) {
  console.error('Gebruik: npx tsx scripts/haal-pagina.ts <url>');
  process.exit(1);
}

try {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    locale: 'nl-NL',
  });
  const pagina = await context.newPage();
  await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await pagina.waitForTimeout(3000);
  const data = await pagina.evaluate(() => {
    const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => script.textContent ?? ''
    );
    const container = document.querySelector('.wprm-recipe-container, [class*="recipe"], article, main');
    return {
      titel: document.title,
      jsonld,
      zichtbareTekst: ((container ?? document.body) as HTMLElement).innerText.slice(0, 12000),
    };
  });
  console.log(JSON.stringify(data, null, 1));
  await browser.close();
} catch (fout) {
  console.error(`Pagina ophalen mislukt: ${(fout as Error).message}`);
  process.exit(1);
}
```

- [ ] **Step 3: Verifieer tegen de bekende 403-site en het foutpad**

Run: `npx tsx scripts/haal-pagina.ts "https://miljuschka.nl/courgette-lasagne-recept/" | head -c 300` en daarna `npx tsx scripts/haal-pagina.ts; echo "exit=$?"`
Expected: eerste commando drukt JSON af waarin `"titel"` met "Courgette lasagne" voorkomt; tweede geeft de gebruiksmelding en `exit=1`.

- [ ] **Step 4: Controleer dat de suite en build niet geraakt zijn**

Run: `npm test 2>&1 | grep 'Tests ' && npm run build 2>&1 | tail -1`
Expected: 50 tests groen; build compleet.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/haal-pagina.ts
git commit -m "Paginascript via headless Chrome voor recept-import"
```

---

### Task 2: browser-fallback in `scripts/foto-import.ts`

**Files:**
- Modify: `scripts/foto-import.ts`

**Interfaces:**
- Produces: CLI `npx tsx scripts/foto-import.ts <url-of-pad> <slug> [paginaUrl]`. Zonder derde argument: gedrag exact als nu. Mét: als de directe download faalt, wordt de foto opgehaald via `fetch` binnen de geladen `paginaUrl` in headless Chrome. Task 3 verwijst naar deze vorm.

- [ ] **Step 1: Pas het script aan**

Vervang de volledige inhoud van `scripts/foto-import.ts` door:

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const [bron, slug, paginaUrl] = [process.argv[2], process.argv[3], process.argv[4]];
if (bron === undefined || slug === undefined || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Gebruik: npx tsx scripts/foto-import.ts <url-of-pad> <slug> [paginaUrl]');
  process.exit(1);
}

async function haalDirect(): Promise<Buffer> {
  if (bron.startsWith('http://') || bron.startsWith('https://')) {
    const antwoord = await fetch(bron);
    if (!antwoord.ok) throw new Error(`download mislukt: HTTP ${antwoord.status} voor ${bron}`);
    return Buffer.from(await antwoord.arrayBuffer());
  }
  return readFileSync(bron);
}

async function haalViaBrowser(pagina: string): Promise<Buffer> {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const tabblad = await (
      await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      })
    ).newPage();
    await tabblad.goto(pagina, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const base64 = await tabblad.evaluate(async (fotoUrl) => {
      const antwoord = await fetch(fotoUrl);
      if (!antwoord.ok) throw new Error(`HTTP ${antwoord.status}`);
      const bytes = new Uint8Array(await antwoord.arrayBuffer());
      let binair = '';
      for (const byte of bytes) binair += String.fromCharCode(byte);
      return btoa(binair);
    }, bron);
    return Buffer.from(base64, 'base64');
  } finally {
    await browser.close();
  }
}

try {
  let bytes: Buffer;
  try {
    bytes = await haalDirect();
  } catch (fout) {
    if (paginaUrl === undefined) throw fout;
    console.error(`Directe download mislukt (${(fout as Error).message}); ik probeer het via de pagina.`);
    bytes = await haalViaBrowser(paginaUrl);
  }
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

- [ ] **Step 2: Verifieer fallback, bestaand gedrag en foutpad**

Run:

```bash
npx tsx scripts/foto-import.ts "https://miljuschka.nl/wp-content/uploads/2026/06/Courgette-rolletjes-lasagne-miljuschka.jpg" fototest "https://miljuschka.nl/courgette-lasagne-recept/" \
&& node -e "require('sharp')('recepten/fototest.jpg').metadata().then(m=>console.log(m.format, m.width))" \
&& rm recepten/fototest.jpg
npx tsx scripts/foto-import.ts /bestaat/niet.jpg fototest; echo "exit=$?"
```

Expected: eerste blok meldt eerst dat de directe download faalt (HTTP 403) en probeert het via de pagina, drukt daarna het doelpad af en `jpeg 1000`; opruimen slaagt. Tweede commando (zonder paginaUrl): Nederlandse foutmelding en `exit=1` — bestaand gedrag ongewijzigd.

- [ ] **Step 3: Commit**

```bash
git add scripts/foto-import.ts
git commit -m "Foto-import: browser-fallback via de receptpagina"
```

---

### Task 3: SKILL.md-update

**Files:**
- Modify: `.claude/skills/recept-import/SKILL.md`

**Interfaces:**
- Consumes: `npx tsx scripts/haal-pagina.ts <url>` (Task 1), `npx tsx scripts/foto-import.ts <url-of-pad> <slug> [paginaUrl]` (Task 2).

- [ ] **Step 1: Werk de werkwijze bij**

In `.claude/skills/recept-import/SKILL.md`, vervang onder "## Werkwijze" bij punt 1 de regel:

```
   - URL → haal de pagina op met WebFetch en vraag om de volledige recepttekst: titel, aantal personen, ingrediënten met hoeveelheden, alle stappen met tijden, en de URL van de receptfoto.
```

door:

```
   - URL → `npx tsx scripts/haal-pagina.ts <url>` (headless Chrome; receptensites blokkeren gewone fetches vaak met een 403). Lees het recept bij voorkeur uit het `Recipe`-object in de `jsonld`-blokken — daar staan titel, porties, ingrediënten, stappen, tijden én foto-URL's gestructureerd in; `zichtbareTekst` is het vangnet. Gebruik geen WebFetch of curl.
```

En vervang bij punt 5 de regel:

```
5. **Foto.** Heeft de bron een receptfoto (foto-URL uit de pagina, of de invoer wás een foto van het gerecht — een kookboekpagina vol tekst is géén receptfoto): `npx tsx scripts/foto-import.ts <url-of-pad> <slug>` en zet `"foto": "<slug>.jpg"` in de JSON. Geen foto of mislukt → veld weglaten en dit in het rapport melden.
```

door:

```
5. **Foto.** Heeft de bron een receptfoto (foto-URL uit de JSON-LD, of de invoer wás een foto van het gerecht — een kookboekpagina vol tekst is géén receptfoto): `npx tsx scripts/foto-import.ts <foto-url-of-pad> <slug> <pagina-url>` — de derde parameter laat het script bij een geblokkeerde download de foto via de browsercontext van de receptpagina ophalen. Zet `"foto": "<slug>.jpg"` in de JSON. Geen foto of mislukt → veld weglaten en dit in het rapport melden.
```

- [ ] **Step 2: Controleer de wijziging**

Run: `grep -c 'haal-pagina.ts' .claude/skills/recept-import/SKILL.md && grep -c 'WebFetch of curl' .claude/skills/recept-import/SKILL.md && ! grep -q 'op met WebFetch en vraag' .claude/skills/recept-import/SKILL.md && echo "oude regel weg"`
Expected: beide greps ≥ 1; "oude regel weg".

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/recept-import/SKILL.md
git commit -m "Skill recept-import: headless Chrome als vaste route"
```
