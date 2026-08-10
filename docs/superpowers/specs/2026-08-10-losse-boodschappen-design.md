# Ontwerp: losse items op de boodschappenlijst

Datum: 2026-08-10
Status: goedgekeurd

## Doel

Items aan de boodschappenlijst kunnen toevoegen die niet uit een recept komen
("melk", "wc-papier", "2 kg appels").

## Invoer

Bovenaan de boodschappenpagina (onder de titel) een invoerrij:

- **Tekstveld** met placeholder "Voeg toe… (bijv. 2 kg appels)"; Enter of de
  groene knop voegt toe, het veld leegt en houdt focus.
- **Categorie-dropdown** ernaast met de elf categorieën (loopvolgorde),
  standaard "Overig".

## Parsen

Nieuwe pure functie `parseInvoer(tekst)` in `src/lib/boodschappen.ts`
(test-driven): een voorloopgetal met optionele bekende eenheid
(`g`, `kg`, `ml`, `l`, `el`, `tl`, hoofdletterongevoelig; komma of punt als
decimaalteken) wordt afgesplitst:

- `"2 kg appels"` → hoeveelheid 2 kg, naam "appels"
- `"3 appels"` → hoeveelheid 3, naam "appels"
- `"melk"` → alleen naam
- lege invoer → niets toevoegen

Het resultaat wordt met de gekozen categorie een gewone `BoodschapItem` in de
bestaande opslag — losse items voegen dus automatisch samen met
receptingrediënten (250 g kaas erbij typen telt op bij kaas uit een recept).

## Rijen verwijderen

Elke samengevoegde rij krijgt rechts een subtiele ×-knop die de
onderliggende items verwijdert en de afvinkstatus opruimt (nieuwe pure
functie `verwijderRij(lijst, sleutel)`). Zelfde gedrag voor recept- en losse
rijen; "Wis lijst" blijft. Zonder dit blijft een typfout staan tot je alles
wist.

## Ongewijzigd

Receptpagina's, opslagformaat (`boodschappen`-sleutel), receptdata en de
navbar. Geen synoniemherkenning of woordenlijst.
