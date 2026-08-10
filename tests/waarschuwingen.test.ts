import { expect, test } from 'vitest';
import { plaatsWaarschuwingen } from '../src/lib/waarschuwingen';
import type { Stap } from '../src/lib/typen';

function stap(duur: number, extra: Partial<Stap> = {}): Stap {
  return { tekst: 'x', duur, ...extra };
}

test('oven-waarschuwing op de laatste stap met genoeg voortijd', () => {
  // cum = [0, 5, 13, 28, 36, 43]; oven (15 min) nodig bij stap 5 → cum[5]-cum[k] >= 15 → k=3 (43-28=15)
  const stappen = [stap(5), stap(8), stap(15), stap(8), stap(7), stap(5, { vereist: { apparaat: 'oven', temperatuur: 180 } })];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.vooraf).toEqual([]);
  expect(p.perStap[3]).toEqual(['Zet nu de oven aan op 180°C — nodig over ±15 min.']);
});

test('onvoldoende voortijd → vooraf met "eerst"', () => {
  const stappen = [stap(5), stap(12, { vereist: { apparaat: 'pan-water' } })];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.vooraf).toEqual(['Breng eerst een pan water aan de kook.']);
  expect(p.perStap.flat()).toEqual([]);
});

test('temperatuurwissel gebruikt wijzigen-template op het juiste moment', () => {
  const stappen = [
    stap(20, { vereist: { apparaat: 'oven', temperatuur: 180 } }),
    stap(20),
    stap(5, { vereist: { apparaat: 'oven', temperatuur: 220 } }),
  ];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.perStap[1]).toEqual(['Zet nu de oven op 220°C — nodig over ±20 min.']);
});

test('zelfde apparaat en temperatuur nogmaals → geen tweede melding', () => {
  const stappen = [
    stap(20, { vereist: { apparaat: 'oven', temperatuur: 180 } }),
    stap(20, { vereist: { apparaat: 'oven', temperatuur: 180 } }),
  ];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.vooraf.length + p.perStap.flat().length).toBe(1);
});

test('lange wachttijd → melding "tegen het einde van de wachttijd"', () => {
  // cum = [0, 12, 74, 82, 84]; oven nodig bij stap 3; k=1 (82-12=70 >= 15), stap 1 heeft wachttijd 60 >= 15 en cum[3]-cum[2]=8 < 15
  const stappen = [stap(12), stap(2, { wachttijd: 60 }), stap(8), stap(2, { vereist: { apparaat: 'oven', temperatuur: 220 } })];
  const p = plaatsWaarschuwingen(stappen);
  expect(p.perStap[1]).toEqual(['Tegen het einde van de wachttijd: zet de oven aan op 220°C.']);
});
