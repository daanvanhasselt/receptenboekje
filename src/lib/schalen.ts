import type { Ingredient, Schaling } from './typen';

const BREUKEN: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };
const METRISCH = new Set(['g', 'ml', 'kg', 'l']);

function rondOp(waarde: number, stap: number): number {
  return Number((Math.max(1, Math.round(waarde / stap)) * stap).toFixed(4));
}

function afrondstap(waarde: number, eenheid?: string): number {
  if (eenheid === 'g' || eenheid === 'ml') {
    if (waarde < 10) return 0.5;
    if (waarde < 100) return 5;
    return 25;
  }
  if (eenheid === 'kg' || eenheid === 'l') return 0.05;
  return 0.25;
}

export function schaalHoeveelheid(basis: number, schaling: Schaling, factor: number, eenheid?: string): number {
  if (schaling === 'vast' || factor === 1) return basis;
  if (schaling === 'stuks') return Math.max(1, Math.ceil(basis * factor - 1e-9));
  const geschaald = basis * factor;
  return rondOp(geschaald, afrondstap(geschaald, eenheid));
}

export function formatteerHoeveelheid(waarde: number, eenheid?: string): string {
  let getal: string;
  if (eenheid !== undefined && METRISCH.has(eenheid)) {
    getal = String(waarde).replace('.', ',');
  } else {
    const heel = Math.floor(waarde + 1e-9);
    const rest = Number((waarde - heel).toFixed(2));
    const breuk = BREUKEN[String(rest)];
    if (breuk !== undefined) getal = heel > 0 ? `${heel}${breuk}` : breuk;
    else getal = String(waarde).replace('.', ',');
  }
  return eenheid === undefined ? getal : `${getal} ${eenheid}`;
}

export function ingredientTekst(ing: Ingredient, factor: number): string {
  if (ing.hoeveelheid === undefined) return ing.naam;
  const waarde = schaalHoeveelheid(ing.hoeveelheid, ing.schaling, factor, ing.eenheid);
  const naam = waarde > 1 && ing.meervoud !== undefined ? ing.meervoud : ing.naam;
  const toonEenheid = ing.eenheid !== undefined && ing.eenheid !== 'stuk' ? ing.eenheid : undefined;
  return `${formatteerHoeveelheid(waarde, toonEenheid)} ${naam}`;
}
