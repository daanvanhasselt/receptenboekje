# Ontwerp: kookmodus + zoom-fix

Datum: 2026-08-12

## Doel

Twee verbeteringen voor gebruik op de iPad tijdens het koken:

1. **Geen per-ongeluk-zoom** bij snel tikken op knoppen (zoals de personen-stepper).
2. **Kookmodus**: een fullscreen weergave die één bereidingsstap tegelijk toont, met wake lock zodat de iPad niet in slaap valt.

## Zoom-fix

`touch-action: manipulation` op interactieve elementen via de globale stylesheet. Dit schakelt de dubbeltik-zoom uit die iOS activeert bij snelle opeenvolgende taps, terwijl pinch-zoom (toegankelijkheid) blijft werken. Geen viewport-wijziging.

## Kookmodus

### Vorm

Een fullscreen overlay (`position: fixed; inset: 0`) op de bestaande receptpagina (`src/pages/recept/[slug].astro`). Geen aparte route en geen Fullscreen API: als standalone webapp op de iPad is er geen browserbalk, en een overlay is betrouwbaarder dan `requestFullscreen` op iPadOS. De overlay wordt server-side gerenderd (Astro) met alle stappen erin; JavaScript toont er één tegelijk.

### Openen en sluiten

- Knop "Start kookmodus" op de receptpagina, boven de kop "Bereiding".
- Sluitkruis rechtsboven in de overlay.
- Bij de laatste stap verandert "Volgende" in "Klaar ✓", die de overlay sluit.
- Personen stel je in vóór het starten; de overlay toont de dan geldende schaling. Geen stepper in de overlay.

### Inhoud per stap

Van boven naar beneden:

1. **Voortgang**: "Stap 3 van 6" plus bolletjes.
2. **Waarschuwingen** die bij deze stap horen (bestaande `plaatsWaarschuwingen`-logica).
3. **Staptekst**, groot en leesbaar, met ingrediënt-hoeveelheden geschaald naar het gekozen aantal personen (dezelfde `data-ingredient`-spans als op de receptpagina, zodat de bestaande `werkBij()`-schaling automatisch meewerkt).
4. **Tijdsindicatie**: ⏱ actief / ⏳ wachten (bestaande `formatteerMinuten`).
5. **Ingrediënten van deze stap**: klein lijstje met geschaalde hoeveelheden, afgeleid uit de `{id}`-referenties in de staptekst (`parseStaptekst`).

### Navigatie

- Grote knoppen "Vorige" / "Volgende" onderaan (makkelijk raken met natte handen).
- Horizontaal swipen (touchstart/touchend, drempel ~50px horizontaal, verticaal dominant = negeren).
- "Vorige" is uitgeschakeld op stap 1.

### Wake lock

- Bij openen: `navigator.wakeLock.request('screen')` (iPadOS ≥ 16.4).
- Bij sluiten: `release()`.
- Bij `visibilitychange` naar zichtbaar terwijl de kookmodus open is: opnieuw aanvragen (iOS laat de lock los bij het wegswitchen).
- API niet beschikbaar of aanvraag faalt: stil negeren; de kookmodus werkt gewoon zonder.

## Componenten

- `src/components/KookModus.astro` — nieuw: de overlay-markup (alle stappen, voortgang, navigatie) plus het bijbehorende client-side script en de styling.
- `src/pages/recept/[slug].astro` — knop toevoegen en `KookModus` opnemen.
- `src/lib/substitutie.ts` — bestaande `parseStaptekst` hergebruiken om de ingrediënt-id's per stap te bepalen (nieuwe pure helper `ingredientIdsUitStap` als die nog niet bestaat).
- `src/styles/global.css` — `touch-action: manipulation` en de kookmodus-styling (of styling in de component; volg de bestaande stijl van het project, dat nu alles in global.css heeft).

## Testen

- Unit-test voor de pure helper die ingrediënt-id's per stap bepaalt (vitest, zoals bestaande tests in `tests/`).
- Overlay-gedrag (navigatie, wake lock, swipe) handmatig verifiëren via de dev-server; wake lock vereist een echt apparaat.

## Buiten scope

- Timers/alarmen per stap.
- Onthouden van de actieve stap na sluiten.
- Personen aanpassen binnen de kookmodus.
