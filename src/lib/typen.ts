export type Schaling = 'lineair' | 'stuks' | 'vast';

export const CATEGORIEEN = [
  'groente-en-fruit',
  'brood-en-bakkerij',
  'vlees-en-vis',
  'pasta-rijst-en-granen',
  'conserven-en-potten',
  'olie-en-sauzen',
  'kruiden-en-specerijen',
  'zuivel-en-eieren',
  'kaas',
  'diepvries',
  'overig',
] as const;

export type Categorie = (typeof CATEGORIEEN)[number];

export interface Ingredient {
  id: string;
  naam: string;
  meervoud?: string;
  hoeveelheid?: number;
  eenheid?: string;
  schaling: Schaling;
  categorie?: Categorie;
  notitie?: string;
}

export interface Vereist {
  apparaat: string;
  temperatuur?: number;
}

export interface Stap {
  tekst: string;
  duur?: number;
  wachttijd?: number;
  vereist?: Vereist;
}

export interface Recept {
  titel: string;
  beschrijving: string;
  personen: number;
  tags: string[];
  foto?: string;
  bron?: string;
  ingredienten: Ingredient[];
  stappen: Stap[];
}

export interface ReceptMetSlug extends Recept {
  slug: string;
}
