# Ontwerp: mintgroene app-restyle

Datum: 2026-08-10
Status: goedgekeurd

## Doel

De site visueel laten aansluiten bij een referentieontwerp (mobiele recepten-app in
mint/groen, Poppins, afgeronde kaarten). **Alleen een restyle**: geen nieuwe data,
geen nieuwe pagina's, geen nepgegevens (geen kcal, ratings, auteurs, bottom-nav of
"Start cooking"). Alle bestaande functionaliteit (zoeken, tagfilters,
personen-schaling, ingrediënten-afvinken, waarschuwingen) blijft werken.

Responsief webgedrag: mobiel oogt als de referentie; op desktop een bredere
kaartengrid en een comfortabele leeskolom — géén telefoonsimulatie.

Buiten scope, mogelijk later: Tailwind of een componentframework.

## 1. Fundament (tokens + typografie)

- Kleurtokens in `global.css`:
  - accent `#43927D`
  - inkt `#454545`
  - achtergrond mint `#eef4f1`
  - kaart wit `#ffffff`
  - chip lichtgroen `#e3efe9` met groene tekst
  - waarschuwing houdt geel accent, maar in kaartvorm
- Poppins zelf-gehost via `@fontsource/poppins` (gewichten 400/500/600/700),
  geïmporteerd in de basislayout. Geen Google-CDN.
- Vormtaal: kaarten ~20px afgerond, chips volledig rond, zachte brede schaduwen
  in plaats van randen.

## 2. Overzichtspagina

- Geen aparte site-balk; "🍲 Recepten" als vette paginatitel in de hoofdkolom.
  (Op de receptpagina blijft een kleine terug-link naar het overzicht nodig.)
- Zoekbalk: witte afgeronde balk met vergrootglas-icoon (inline SVG of emoji),
  placeholdertekst blijft.
- Tagfilters: chip-rij; inactief = lichtgroen chip, actief = gevuld groen met
  witte tekst. Bestaand filtergedrag ongewijzigd.
- Receptkaart: foto full-bleed; onderaan donkere gradient met de titel in wit
  eroverheen; wit tijd-chipje ("🍳 15 min", plus wachttijd indien aanwezig)
  rechtsboven op de foto. Tags verdwijnen van de kaart (staan al als filters
  bovenaan). Placeholder zonder foto blijft werken, in groene gradient, met
  titel-overlay zoals bij foto's.

## 3. Receptpagina

- Foto als grote afgeronde kaart bovenaan, titel eronder vetgedrukt,
  beschrijving eronder.
- Witte stat-rij (kaart) met echte data: actieve tijd · wachttijd · personen ·
  aantal ingrediënten. Wachttijd-vak alleen tonen als er wachttijd is.
  Het personen-vak toont de actuele (geschaalde) waarde.
- Recepttags als groene chips onder de stat-rij.
- Personen-kiezer: groene ronde −/+-knoppen in referentiestijl.
- Ingrediënten: witte kaart; per ingrediënt een rij met naam links en
  hoeveelheid rechts in grijs; checkbox links blijft werken
  (doorstrepen bij aangevinkt). Let op: hoeveelheid staat nu in één tekststring
  (`ingredientTekst`); voor rechts-uitlijnen wordt hoeveelheid+eenheid apart
  gerenderd van de naam, met behoud van de bestaande schaal-logica en
  data-attributen.
- Stappen: groene stapnummers, tijdsaanduidingen in grijs; waarschuwingen als
  gele kaartjes.

## Aanpak

CSS-herschrijving van `global.css` plus lichte markup-aanpassingen in
`ReceptKaart.astro`, `IngredientenLijst.astro`, `PersonenKiezer.astro`,
`Basis.astro`, `index.astro` en `[slug].astro` (stat-rij + chips).
Bestaande tests (alleen lib-functies) blijven ongemoeid; de schaal-logica in
`schalen.ts` verandert niet, alleen waar de tekst in de markup landt.
