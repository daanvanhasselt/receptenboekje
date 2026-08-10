import { describe, expect, test } from 'vitest';
import { maakItems, perCategorie, samengevoegd } from '../src/lib/boodschappen';
import type { BoodschapItem } from '../src/lib/boodschappen';
import type { Ingredient } from '../src/lib/typen';

function item(deel: Partial<BoodschapItem> & { naam: string }): BoodschapItem {
  return { categorie: 'overig', ...deel };
}

describe('maakItems', () => {
  const ingredienten: Ingredient[] = [
    { id: 'gehakt', naam: 'rundergehakt', hoeveelheid: 250, eenheid: 'g', schaling: 'lineair', categorie: 'vlees-en-vis' },
    { id: 'zout', naam: 'zout', schaling: 'vast' },
  ];
  test('schaalt hoeveelheden en neemt categorie over', () => {
    expect(maakItems(ingredienten, 2)).toEqual([
      { naam: 'rundergehakt', meervoud: undefined, hoeveelheid: 500, eenheid: 'g', categorie: 'vlees-en-vis' },
      { naam: 'zout', meervoud: undefined, hoeveelheid: undefined, eenheid: undefined, categorie: 'overig' },
    ]);
  });
});

describe('samengevoegd', () => {
  test('telt gelijke naam en eenheid op', () => {
    const rijen = samengevoegd([
      item({ naam: 'spaghetti', hoeveelheid: 200, eenheid: 'g', categorie: 'pasta-rijst-en-granen' }),
      item({ naam: 'spaghetti', hoeveelheid: 300, eenheid: 'g', categorie: 'pasta-rijst-en-granen' }),
    ]);
    expect(rijen).toHaveLength(1);
    expect(rijen[0].hoeveelheid).toBe('500 g');
  });
  test('rekent kg naar g om vóór het optellen en toont ≥1000 g weer als kg', () => {
    const rijen = samengevoegd([
      item({ naam: 'aardappelen', hoeveelheid: 0.5, eenheid: 'kg' }),
      item({ naam: 'aardappelen', hoeveelheid: 750, eenheid: 'g' }),
    ]);
    expect(rijen).toHaveLength(1);
    expect(rijen[0].hoeveelheid).toBe('1,25 kg');
  });
  test('onverenigbare eenheden blijven aparte regels', () => {
    const rijen = samengevoegd([
      item({ naam: 'olijfolie', hoeveelheid: 2, eenheid: 'el' }),
      item({ naam: 'olijfolie', hoeveelheid: 100, eenheid: 'ml' }),
    ]);
    expect(rijen).toHaveLength(2);
  });
  test('regels zonder hoeveelheid voegen samen op naam', () => {
    const rijen = samengevoegd([item({ naam: 'zout' }), item({ naam: 'zout' })]);
    expect(rijen).toHaveLength(1);
    expect(rijen[0].hoeveelheid).toBeUndefined();
    expect(rijen[0].tekst).toBe('zout');
  });
  test('meervoud bij totaal boven één, eenheid stuk verdwijnt', () => {
    const rijen = samengevoegd([
      item({ naam: 'ui', meervoud: 'uien', hoeveelheid: 1, eenheid: 'stuk' }),
      item({ naam: 'ui', meervoud: 'uien', hoeveelheid: 1, eenheid: 'stuk' }),
    ]);
    expect(rijen[0].tekst).toBe('uien');
    expect(rijen[0].hoeveelheid).toBe('2');
  });
});

describe('perCategorie', () => {
  test('groepeert in vaste loopvolgorde en slaat lege categorieën over', () => {
    const rijen = samengevoegd([
      item({ naam: 'zout', categorie: 'kruiden-en-specerijen' }),
      item({ naam: 'courgette', hoeveelheid: 3, eenheid: 'stuk', categorie: 'groente-en-fruit' }),
    ]);
    const groepen = perCategorie(rijen);
    expect(groepen.map((groep) => groep.categorie)).toEqual(['groente-en-fruit', 'kruiden-en-specerijen']);
  });
});
