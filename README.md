# Recepten

Persoonlijke receptencollectie: statische Astro-site op basis van gestandaardiseerde JSON-recepten.

## Recept toevoegen

1. Maak een JSON-bestand in `recepten/` volgens `schema/recept.schema.json` (de bestandsnaam wordt de URL-slug).
2. Optioneel: zet een foto met dezelfde basisnaam ernaast en verwijs ernaar via het `foto`-veld.
3. Controleer met `npm run valideer`.
4. Commit en push naar `main` — de site wordt automatisch gebouwd en gepubliceerd.

Kernregels van het schema:

- Stapteksten verwijzen naar ingrediënten met `{id}`; de hoeveelheid schaalt dan automatisch mee met het aantal personen.
- Geef per stap `duur` (actieve minuten) en `wachttijd` (passieve minuten) op; meldingen zoals "zet de oven aan" worden dááruit berekend via `vereist` (`apparaat` + `temperatuur`). Schrijf zulke aanwijzingen dus nooit zelf in de staptekst.
- `schaling` per ingrediënt: `lineair`, `stuks` (hele stuks) of `vast` (schaalt niet mee).

## Ontwikkelen

```bash
npm install
npm run dev        # dev-server
npm test           # unit tests
npm run valideer   # valideer alle recepten
npm run build      # productie-build in dist/
```

## Deployment

GitHub Actions bouwt en publiceert naar GitHub Pages bij elke push naar `main`
(zie `.github/workflows/deploy.yml`). Eenmalig instellen: repo → Settings →
Pages → Source: **GitHub Actions**.
