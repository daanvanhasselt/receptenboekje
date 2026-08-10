export type Schaling = 'lineair' | 'stuks' | 'vast';

export interface Ingredient {
  id: string;
  naam: string;
  meervoud?: string;
  hoeveelheid?: number;
  eenheid?: string;
  schaling: Schaling;
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
