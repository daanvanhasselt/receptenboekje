import { expect, test } from 'vitest';
import { cumulatieveTijd, formatteerMinuten, totaalTijd } from '../src/lib/tijden';
import type { Stap } from '../src/lib/typen';

const stappen: Stap[] = [
  { tekst: 'a', duur: 5 },
  { tekst: 'b', duur: 2, wachttijd: 60 },
  { tekst: 'c' },
  { tekst: 'd', duur: 8 },
];

test('totaalTijd telt duur en wachttijd apart op', () => {
  expect(totaalTijd(stappen)).toEqual({ actief: 15, wachten: 60 });
});

test('cumulatieveTijd geeft tijd vóór elke stap', () => {
  expect(cumulatieveTijd(stappen)).toEqual([0, 5, 67, 67, 75]);
});

test('formatteerMinuten', () => {
  expect(formatteerMinuten(45)).toBe('45 min.');
  expect(formatteerMinuten(60)).toBe('1 uur');
  expect(formatteerMinuten(75)).toBe('1 uur 15 min.');
});
