import { expect, test } from 'vitest';
import { valideerRecept } from '../src/lib/valideer';

const geldig = {
  titel: 'Test',
  beschrijving: 'Testrecept',
  personen: 2,
  tags: ['test'],
  ingredienten: [
    { id: 'pasta', naam: 'penne', hoeveelheid: 200, eenheid: 'g', schaling: 'lineair' },
    { id: 'zout', naam: 'zout', schaling: 'vast' },
  ],
  stappen: [{ tekst: 'Kook {pasta} met {zout}.', duur: 10, vereist: { apparaat: 'pan-water' } }],
};

test('geldig recept levert geen fouten', () => {
  expect(valideerRecept('test.json', geldig)).toEqual([]);
});

test('schemafout: personen ontbreekt', () => {
  const { personen: _weg, ...zonder } = geldig;
  const fouten = valideerRecept('test.json', zonder);
  expect(fouten.length).toBeGreaterThan(0);
  expect(fouten[0]!.bestand).toBe('test.json');
});

test('verwijzing naar onbekend ingredient', () => {
  const kapot = { ...geldig, stappen: [{ tekst: 'Voeg {kaas} toe.' }] };
  expect(valideerRecept('test.json', kapot).map((f) => f.fout)).toEqual([
    'stap 1: verwijzing {kaas} bestaat niet als ingrediënt',
  ]);
});

test('dubbel ingredient-id', () => {
  const kapot = { ...geldig, ingredienten: [...geldig.ingredienten, { id: 'pasta', naam: 'nogmaals', hoeveelheid: 1, eenheid: 'g', schaling: 'lineair' }] };
  expect(valideerRecept('test.json', kapot).map((f) => f.fout)).toEqual(['dubbel ingrediënt-id "pasta"']);
});

test('niet-vast zonder hoeveelheid/eenheid', () => {
  const kapot = { ...geldig, ingredienten: [{ id: 'pasta', naam: 'penne', schaling: 'lineair' }], stappen: [{ tekst: 'Kook {pasta}.' }] };
  expect(valideerRecept('test.json', kapot).map((f) => f.fout)).toEqual([
    'ingrediënt "pasta": schaling "lineair" vereist hoeveelheid en eenheid',
  ]);
});

test('onbekend apparaat', () => {
  const kapot = { ...geldig, stappen: [{ tekst: 'Kook {pasta} met {zout}.', vereist: { apparaat: 'airfryer' } }] };
  expect(valideerRecept('test.json', kapot).map((f) => f.fout)).toEqual(['stap 1: onbekend apparaat "airfryer"']);
});

test('prototype-naam is geen geldig apparaat', () => {
  const kapot = { ...geldig, stappen: [{ tekst: 'Kook {pasta} met {zout}.', vereist: { apparaat: 'toString' } }] };
  expect(valideerRecept('test.json', kapot).map((f) => f.fout)).toEqual(['stap 1: onbekend apparaat "toString"']);
});

test('ontbrekende foto', () => {
  const met = { ...geldig, foto: 'test.jpg' };
  expect(valideerRecept('test.json', met, () => false).map((f) => f.fout)).toEqual(['foto "test.jpg" niet gevonden']);
});
