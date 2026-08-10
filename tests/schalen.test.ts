import { describe, expect, test } from 'vitest';
import { formatteerHoeveelheid, ingredientTekst, schaalHoeveelheid } from '../src/lib/schalen';
import type { Ingredient } from '../src/lib/typen';

const gehakt: Ingredient = { id: 'gehakt', naam: 'rundergehakt', hoeveelheid: 250, eenheid: 'g', schaling: 'lineair' };
const ei: Ingredient = { id: 'ei', naam: 'ei', meervoud: 'eieren', hoeveelheid: 1, eenheid: 'stuk', schaling: 'stuks' };
const olie: Ingredient = { id: 'olie', naam: 'olijfolie', hoeveelheid: 2, eenheid: 'el', schaling: 'vast' };
const zout: Ingredient = { id: 'zout', naam: 'zout', schaling: 'vast', notitie: 'naar smaak' };

describe('schaalHoeveelheid', () => {
  test('lineair, nette afronding op 25 g', () => {
    expect(schaalHoeveelheid(250, 'lineair', 1.5, 'g')).toBe(375);
  });
  test('factor 1 verandert niets, ook geen afronding', () => {
    expect(schaalHoeveelheid(333, 'lineair', 1, 'g')).toBe(333);
  });
  test('kleine waarden ronden niet naar 0', () => {
    expect(schaalHoeveelheid(1, 'lineair', 0.25, 'g')).toBe(0.5);
  });
  test('liters op 0,05', () => {
    expect(schaalHoeveelheid(1, 'lineair', 1.25, 'l')).toBe(1.25);
  });
  test('stuks naar boven op hele stuks', () => {
    expect(schaalHoeveelheid(1, 'stuks', 1.5)).toBe(2);
    expect(schaalHoeveelheid(2, 'stuks', 2)).toBe(4);
  });
  test('vast schaalt niet', () => {
    expect(schaalHoeveelheid(2, 'vast', 3, 'el')).toBe(2);
  });
});

describe('formatteerHoeveelheid', () => {
  test('metrisch met komma', () => {
    expect(formatteerHoeveelheid(375, 'g')).toBe('375 g');
    expect(formatteerHoeveelheid(7.5, 'g')).toBe('7,5 g');
    expect(formatteerHoeveelheid(1.25, 'l')).toBe('1,25 l');
  });
  test('behoudt exacte basishoeveelheid met meer dan twee decimalen', () => {
    expect(formatteerHoeveelheid(1.125, 'l')).toBe('1,125 l');
  });
  test('behoudt exacte niet-metrische basishoeveelheid', () => {
    expect(formatteerHoeveelheid(1.249, 'el')).toBe('1,249 el');
  });
  test('rondt niet af bij breukdetectie van exacte basishoeveelheid', () => {
    expect(formatteerHoeveelheid(1.24995, 'el')).toBe('1,24995 el');
  });
  test('breuken voor lepels', () => {
    expect(formatteerHoeveelheid(0.75, 'tl')).toBe('¾ tl');
    expect(formatteerHoeveelheid(1.5, 'el')).toBe('1½ el');
  });
});

describe('ingredientTekst', () => {
  test('lineair geschaald', () => {
    expect(ingredientTekst(gehakt, 1.5)).toBe('375 g rundergehakt');
  });
  test('stuks met meervoud, eenheid stuk onzichtbaar', () => {
    expect(ingredientTekst(ei, 1)).toBe('1 ei');
    expect(ingredientTekst(ei, 1.5)).toBe('2 eieren');
  });
  test('vast met hoeveelheid blijft gelijk', () => {
    expect(ingredientTekst(olie, 3)).toBe('2 el olijfolie');
  });
  test('vast zonder hoeveelheid: alleen naam', () => {
    expect(ingredientTekst(zout, 2)).toBe('zout');
  });
});
