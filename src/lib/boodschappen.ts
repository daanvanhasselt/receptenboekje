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
  categorie: Categorie;
}

export interface Boodschappenlijst {
  items: BoodschapItem[];
  afgevinkt: string[];
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

const INVOER_EENHEDEN = new Set(['g', 'kg', 'ml', 'l', 'el', 'tl']);

export function parseInvoer(tekst: string): { naam: string; hoeveelheid?: number; eenheid?: string } | undefined {
  const delen = tekst.trim().split(/\s+/).filter((deel) => deel !== '');
  if (delen.length === 0) return undefined;
  const getal = Number(delen[0].replace(',', '.'));
  if (Number.isNaN(getal) || getal <= 0 || delen.length === 1) {
    return { naam: delen.join(' ') };
  }
  const eenheid = delen[1].toLowerCase();
  if (delen.length >= 3 && INVOER_EENHEDEN.has(eenheid)) {
    return { naam: delen.slice(2).join(' '), hoeveelheid: getal, eenheid };
  }
  return { naam: delen.slice(1).join(' '), hoeveelheid: getal };
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
    items: lijst.items.filter((item) => sleutelVan(item) !== sleutel),
    afgevinkt: lijst.afgevinkt.filter((afgevinkteSleutel) => afgevinkteSleutel !== sleutel),
  };
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
    categorie: stapel.categorie,
  };
}

export function perCategorie(rijen: BoodschapRij[]): { categorie: Categorie; rijen: BoodschapRij[] }[] {
  return CATEGORIEEN.map((categorie) => ({
    categorie,
    rijen: rijen.filter((rij) => rij.categorie === categorie),
  })).filter((groep) => groep.rijen.length > 0);
}

const OPSLAG_SLEUTEL = 'boodschappen';

export function laadLijst(): Boodschappenlijst {
  try {
    const data = JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL) ?? '');
    return { items: data.items ?? [], afgevinkt: data.afgevinkt ?? [] };
  } catch {
    return { items: [], afgevinkt: [] };
  }
}

export function bewaarLijst(lijst: Boodschappenlijst): void {
  localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(lijst));
}
