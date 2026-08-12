import { expect, test } from 'vitest';
import { ingredientIdsUitStap, parseStaptekst } from '../src/lib/substitutie';

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

test('ingredientIdsUitStap geeft unieke ids in volgorde van voorkomen', () => {
  expect(ingredientIdsUitStap('Meng {bloem} met {gist} en nog wat {bloem}')).toEqual(['bloem', 'gist']);
});

test('ingredientIdsUitStap zonder verwijzingen geeft lege lijst', () => {
  expect(ingredientIdsUitStap('Giet de pasta af.')).toEqual([]);
});
