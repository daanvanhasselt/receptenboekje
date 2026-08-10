# Ontwerp: recept-import via headless Chrome

*Datum: 2026-08-10 — status: goedgekeurd*

## Doel

Receptensites blokkeren WebFetch en curl vaak met een 403 (botbescherming). De `/recept-import`-skill gebruikt daarom voortaan **altijd meteen headless Chrome** (lokaal geïnstalleerde Chrome via `playwright-core`) om een recept-URL en de bijbehorende foto op te halen. De ad-hoc-aanpak die bij de courgette-lasagne-import nodig was, wordt gestandaardiseerd als repo-scripts.

## Onderdelen

1. **`playwright-core` als devDependency** — klein pakket zonder browser-download; gebruikt de lokaal geïnstalleerde Chrome (`channel: 'chrome'`).
2. **Nieuw script `scripts/haal-pagina.ts <url>`** — opent de URL in headless Chrome met een normale browser-user-agent en `nl-NL`-locale, wacht kort op nageladen content, en drukt JSON af met: `titel` (paginatitel), `jsonld` (alle JSON-LD-blokken — receptensites zetten daar vrijwel altijd het complete gestructureerde recept in, inclusief foto-URL's) en `zichtbareTekst` (zichtbare tekst van het receptgedeelte, als vangnet). Foutpad: duidelijke Nederlandse melding + exit 1 (geen Chrome, timeout, onbereikbare pagina).
3. **`scripts/foto-import.ts` krijgt een optioneel derde argument**: `<url-of-pad> <slug> [paginaUrl]`. Directe download blijft de eerste poging; faalt die én is er een `paginaUrl` meegegeven, dan wordt de foto opgehaald vía de browsercontext van die pagina (fetch vanuit de geladen pagina zelf, zodat botbescherming passeert). Bestaand gedrag zonder derde argument blijft ongewijzigd.
4. **SKILL.md-update** — stap 1: URL → `npx tsx scripts/haal-pagina.ts <url>`, lees het recept bij voorkeur uit de JSON-LD (geen WebFetch meer); stap 5: geef bij een foto-URL ook de pagina-URL mee als fallback.

## Testen

Netwerk-/browserafhankelijke scripts; geen unit tests. Verificatie: beide scripts draaien tegen `https://miljuschka.nl/courgette-lasagne-recept/` (bekend 403-geval voor curl/WebFetch) en de bestaande suite blijft groen.

## Buiten scope

Andere invoertypen (afbeelding, tekst) veranderen niet; geen browser-download in CI (de scripts zijn alleen voor lokaal importgebruik en raken de build niet).
