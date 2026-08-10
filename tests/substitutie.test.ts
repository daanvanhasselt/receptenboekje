import { expect, test } from 'vitest';
import { parseStaptekst } from '../src/lib/substitutie';

test('tekst zonder verwijzingen is één segment', () => {
  expect(parseStaptekst('Giet de pasta af.')).toEqual([{ type: 'tekst', waarde: 'Giet de pasta af.' }]);
});

test('lege tekst is één tekstsegment', () => {
  expect(parseStaptekst('')).toEqual([{ type: 'tekst', waarde: '' }]);
});

test('verwijzing middenin', () => {
  expect(parseStaptekst('Voeg {gehakt} toe.')).toEqual([
    { type: 'tekst', waarde: 'Voeg ' },
    { type: 'ingredient', id: 'gehakt' },
    { type: 'tekst', waarde: ' toe.' },
  ]);
});

test('meerdere verwijzingen, ook aan het eind', () => {
  expect(parseStaptekst('Meng {bloem} met {gist}')).toEqual([
    { type: 'tekst', waarde: 'Meng ' },
    { type: 'ingredient', id: 'bloem' },
    { type: 'tekst', waarde: ' met ' },
    { type: 'ingredient', id: 'gist' },
  ]);
});

test('accolades die geen geldig id vormen blijven tekst', () => {
  expect(parseStaptekst('vouw {NIET} dicht')).toEqual([{ type: 'tekst', waarde: 'vouw {NIET} dicht' }]);
});
