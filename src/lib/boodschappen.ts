import { formatteerHoeveelheid, schaalHoeveelheid } from './schalen';
import { CATEGORIEEN, type Categorie, type Ingredient } from './typen';

export const CATEGORIE_LABELS: Record<Categorie, string> = {
  'groente-en-fruit': 'Groente & fruit',
  'brood-en-bakkerij': 'Brood & bakkerij',
  'vlees-en-vis': 'Vlees & vis',
  'pasta-rijst-en-granen': 'Pasta, rijst & granen',
  'conserven-en-potten': 'Conserven & potten',
  'olie-en-sauzen': 'Olie & sauzen',
  'kruiden-en-specerijen': 'Kruiden & specerijen',
  'zuivel-en-eieren': 'Zuivel & eieren',
  kaas: 'Kaas',
  diepvries: 'Diepvries',
  overig: 'Overig',
};

export interface BoodschapItem {
  naam: string;
  meervoud?: string;
  hoeveelheid?: number;
  eenheid?: string;
  categorie: Categorie;
}

export interface BoodschapRij {
  sleutel: string;
  tekst: string;
  hoeveelheid?: string;
  /** Het totaal als getal, in `eenheid`; ontbreekt als de rij geen hoeveelheid heeft. */
  aantal?: number;
  eenheid?: string;
  categorie: Categorie;
}

export interface RijWijziging {
  /** Nieuwe naam. Leeg, weggelaten of gelijk aan de getoonde tekst: de naam blijft zoals hij is. */
  naam?: string;
  /** Nieuw totaal in de eenheid van de rij; `null` haalt de hoeveelheid weg; weggelaten: ongewijzigd. */
  hoeveelheid?: number | null;
}

export const KLEUREN = ['geel', 'roze', 'blauw'] as const;

export type Kleur = (typeof KLEUREN)[number];

export const KLEUR_LABELS: Record<Kleur, string> = {
  geel: 'Geel',
  roze: 'Roze',
  blauw: 'Blauw',
};

export interface Boodschappenlijst {
  items: BoodschapItem[];
  afgevinkt: string[];
  /** Markeerkleur per rij-sleutel; een rij zonder kleur is wit. */
  kleuren?: Record<string, Kleur>;
}

const NAAR_BASIS: Record<string, { eenheid: string; factor: number }> = {
  kg: { eenheid: 'g', factor: 1000 },
  l: { eenheid: 'ml', factor: 1000 },
};

export function maakItems(ingredienten: Ingredient[], factor: number): BoodschapItem[] {
  return ingredienten.map((ingredient) => ({
    naam: ingredient.naam,
    meervoud: ingredient.meervoud,
    hoeveelheid:
      ingredient.hoeveelheid !== undefined
        ? schaalHoeveelheid(ingredient.hoeveelheid, ingredient.schaling, factor, ingredient.eenheid)
        : undefined,
    eenheid: ingredient.eenheid,
    categorie: ingredient.categorie ?? 'overig',
  }));
}

function naarBasis(item: BoodschapItem): { hoeveelheid?: number; eenheid?: string } {
  if (item.hoeveelheid === undefined || item.eenheid === undefined) {
    return { hoeveelheid: item.hoeveelheid, eenheid: item.eenheid };
  }
  const omrekening = NAAR_BASIS[item.eenheid];
  if (omrekening === undefined) return { hoeveelheid: item.hoeveelheid, eenheid: item.eenheid };
  return { hoeveelheid: item.hoeveelheid * omrekening.factor, eenheid: omrekening.eenheid };
}

function sleutelVan(item: BoodschapItem): string {
  const { eenheid } = naarBasis(item);
  return `${item.naam.toLowerCase()}|${item.hoeveelheid === undefined ? '' : (eenheid ?? '')}`;
}

export function verwijderRij(lijst: Boodschappenlijst, sleutel: string): Boodschappenlijst {
  return {
    ...zetKleur(lijst, sleutel, undefined),
    items: lijst.items.filter((item) => sleutelVan(item) !== sleutel),
    afgevinkt: lijst.afgevinkt.filter((afgevinkteSleutel) => afgevinkteSleutel !== sleutel),
  };
}

/**
 * Past de naam en/of het totaal van één rij aan. Een nieuw totaal vervangt alle items achter de rij
 * door één item; afvinkstatus en kleur verhuizen mee als de rij daardoor een andere sleutel krijgt.
 */
export function wijzigRij(
  lijst: Boodschappenlijst,
  sleutel: string,
  wijziging: RijWijziging,
): { lijst: Boodschappenlijst; sleutel: string } {
  const betrokken = lijst.items.filter((item) => sleutelVan(item) === sleutel);
  if (betrokken.length === 0) return { lijst, sleutel };
  const [rij] = samengevoegd(betrokken);
  const naam = wijziging.naam?.trim();
  const hernoemd = naam !== undefined && naam !== '' && naam !== rij.tekst;
  if (!hernoemd && wijziging.hoeveelheid === undefined) return { lijst, sleutel };

  const hernoem = (item: BoodschapItem): BoodschapItem => {
    if (!hernoemd) return item;
    const { meervoud: _meervoud, ...rest } = item;
    return { ...rest, naam };
  };
  const metTotaal = (item: BoodschapItem): BoodschapItem => {
    const { hoeveelheid: _hoeveelheid, eenheid: _eenheid, ...rest } = item;
    return wijziging.hoeveelheid == null ? rest : { ...rest, hoeveelheid: wijziging.hoeveelheid, eenheid: rij.eenheid };
  };

  // Alleen hernoemen: elk item blijft op zijn plek. Een nieuw totaal: het eerste item draagt het, de rest vervalt.
  let eerste: BoodschapItem | undefined;
  const items = lijst.items.flatMap((item) => {
    if (sleutelVan(item) !== sleutel) return [item];
    if (wijziging.hoeveelheid !== undefined && eerste !== undefined) return [];
    const vervanger = hernoem(wijziging.hoeveelheid === undefined ? item : metTotaal(item));
    eerste ??= vervanger;
    return [vervanger];
  });

  const nieuweSleutel = eerste === undefined ? sleutel : sleutelVan(eerste);
  if (nieuweSleutel === sleutel) return { lijst: { ...lijst, items }, sleutel };

  // De rij verhuist naar een andere sleutel. Bestond die al, dan vloeien de rijen samen:
  // afgevinkt blijft het alleen als beide het waren, en de kleur van de bewerkte rij gaat voor.
  const doelBestond = lijst.items.some((item) => sleutelVan(item) === nieuweSleutel);
  const blijftAfgevinkt =
    lijst.afgevinkt.includes(sleutel) && (!doelBestond || lijst.afgevinkt.includes(nieuweSleutel));
  const afgevinkt = lijst.afgevinkt.filter((afgevinkteSleutel) => afgevinkteSleutel !== sleutel && afgevinkteSleutel !== nieuweSleutel);
  if (blijftAfgevinkt) afgevinkt.push(nieuweSleutel);
  const kleur = lijst.kleuren?.[sleutel] ?? lijst.kleuren?.[nieuweSleutel];
  const verhuisd = zetKleur(zetKleur({ ...lijst, items, afgevinkt }, sleutel, undefined), nieuweSleutel, kleur);
  return { lijst: verhuisd, sleutel: nieuweSleutel };
}

/** Leest een ingetypte hoeveelheid: een getal, `null` voor een leeg veld, `undefined` als het geen geldig getal is. */
export function leesHoeveelheid(tekst: string): number | null | undefined {
  const schoon = tekst.trim();
  if (schoon === '') return null;
  if (!/^\d+([.,]\d+)?$/.test(schoon)) return undefined;
  const getal = Number(schoon.replace(',', '.'));
  return getal > 0 ? getal : undefined;
}

/** Schrijft een hoeveelheid zoals je hem intypt: met een komma en hooguit twee decimalen. */
export function hoeveelheidAlsTekst(getal: number): string {
  return String(Math.round(getal * 100) / 100).replace('.', ',');
}

export function isKleur(waarde: unknown): waarde is Kleur {
  return typeof waarde === 'string' && KLEUREN.includes(waarde as Kleur);
}

export function zetKleur(lijst: Boodschappenlijst, sleutel: string, kleur: Kleur | undefined): Boodschappenlijst {
  const { [sleutel]: _vorige, ...overige } = lijst.kleuren ?? {};
  return { ...lijst, kleuren: kleur === undefined ? overige : { ...overige, [sleutel]: kleur } };
}

export function samengevoegd(items: BoodschapItem[]): BoodschapRij[] {
  const stapels = new Map<string, BoodschapItem>();
  for (const item of items) {
    const sleutel = sleutelVan(item);
    const basis = naarBasis(item);
    const bestaand = stapels.get(sleutel);
    if (bestaand === undefined) {
      stapels.set(sleutel, { ...item, hoeveelheid: basis.hoeveelheid, eenheid: basis.eenheid });
    } else if (bestaand.hoeveelheid !== undefined && basis.hoeveelheid !== undefined) {
      bestaand.hoeveelheid += basis.hoeveelheid;
    }
  }
  return [...stapels.entries()].map(([sleutel, stapel]) => maakRij(sleutel, stapel));
}

function maakRij(sleutel: string, stapel: BoodschapItem): BoodschapRij {
  let { hoeveelheid, eenheid } = stapel;
  if (hoeveelheid !== undefined && eenheid === 'g' && hoeveelheid >= 1000) {
    hoeveelheid /= 1000;
    eenheid = 'kg';
  }
  if (hoeveelheid !== undefined && eenheid === 'ml' && hoeveelheid >= 1000) {
    hoeveelheid /= 1000;
    eenheid = 'l';
  }
  const tekst = hoeveelheid !== undefined && hoeveelheid > 1 && stapel.meervoud !== undefined ? stapel.meervoud : stapel.naam;
  const toonEenheid = eenheid !== undefined && eenheid !== 'stuk' ? eenheid : undefined;
  return {
    sleutel,
    tekst,
    hoeveelheid: hoeveelheid !== undefined ? formatteerHoeveelheid(hoeveelheid, toonEenheid) : undefined,
    aantal: hoeveelheid,
    eenheid: hoeveelheid !== undefined ? eenheid : undefined,
    categorie: stapel.categorie,
  };
}

export function perCategorie(rijen: BoodschapRij[]): { categorie: Categorie; rijen: BoodschapRij[] }[] {
  return CATEGORIEEN.map((categorie) => ({
    categorie,
    rijen: rijen.filter((rij) => rij.categorie === categorie),
  })).filter((groep) => groep.rijen.length > 0);
}

export function isCategorie(waarde: unknown): waarde is Categorie {
  return typeof waarde === 'string' && CATEGORIEEN.includes(waarde as Categorie);
}

export function zetCategorie(lijst: Boodschappenlijst, naam: string, categorie: Categorie): Boodschappenlijst {
  const gezochteNaam = naam.trim().toLowerCase();
  return {
    ...lijst,
    items: lijst.items.map((item) =>
      item.categorie === 'overig' && item.naam.trim().toLowerCase() === gezochteNaam
        ? { ...item, categorie }
        : item,
    ),
  };
}

const OPSLAG_SLEUTEL = 'boodschappen';
const CATEGORIE_CACHE_SLEUTEL = 'boodschappen-categorieen';

export function laadLijst(): Boodschappenlijst {
  try {
    const data = JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL) ?? '');
    return { items: data.items ?? [], afgevinkt: data.afgevinkt ?? [], kleuren: geldigeKleuren(data.kleuren) };
  } catch {
    return { items: [], afgevinkt: [], kleuren: {} };
  }
}

function geldigeKleuren(data: unknown): Record<string, Kleur> {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return {};
  return Object.fromEntries(Object.entries(data).filter(([, kleur]) => isKleur(kleur))) as Record<string, Kleur>;
}

export function bewaarLijst(lijst: Boodschappenlijst): void {
  localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(lijst));
}

export function laadCategorieCache(): Record<string, Categorie> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(CATEGORIE_CACHE_SLEUTEL) ?? '');
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(
      Object.entries(data).filter(([, categorie]) => isCategorie(categorie)),
    ) as Record<string, Categorie>;
  } catch {
    return {};
  }
}

export function bewaarCategorie(naam: string, categorie: Categorie): void {
  try {
    const cache = laadCategorieCache();
    cache[naam.trim().toLowerCase()] = categorie;
    localStorage.setItem(CATEGORIE_CACHE_SLEUTEL, JSON.stringify(cache));
  } catch {
    // Lokale opslag is niet altijd beschikbaar, bijvoorbeeld in privémodus.
  }
}

export function categorieUitCache(naam: string): Categorie | undefined {
  return laadCategorieCache()[naam.trim().toLowerCase()];
}
