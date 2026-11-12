import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  bewaarLijst,
  isCategorie,
  isKleur,
  laadLijst,
  maakItems,
  perCategorie,
  samengevoegd,
  verwijderRij,
  zetCategorie,
  zetKleur,
} from '../src/lib/boodschappen';
import type { BoodschapItem, Boodschappenlijst } from '../src/lib/boodschappen';
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

describe('zetCategorie', () => {
  test('verandert alleen overig-items met dezelfde getrimde naam, zonder afvinkstatus te wijzigen', () => {
    const lijst = {
      items: [
        item({ naam: ' Appels ', hoeveelheid: 1 }),
        item({ naam: 'appels', hoeveelheid: 2 }),
        item({ naam: 'appels', categorie: 'diepvries' }),
        item({ naam: 'peren' }),
      ],
      afgevinkt: ['appels|'],
    };

    expect(zetCategorie(lijst, 'APPELS', 'groente-en-fruit')).toEqual({
      items: [
        item({ naam: ' Appels ', hoeveelheid: 1, categorie: 'groente-en-fruit' }),
        item({ naam: 'appels', hoeveelheid: 2, categorie: 'groente-en-fruit' }),
        item({ naam: 'appels', categorie: 'diepvries' }),
        item({ naam: 'peren' }),
      ],
      afgevinkt: ['appels|'],
    });
  });
});

describe('isCategorie', () => {
  test('accepteert alleen bekende categorieën', () => {
    expect(isCategorie('kaas')).toBe(true);
    expect(isCategorie('onbekend')).toBe(false);
    expect(isCategorie(3)).toBe(false);
    expect(isCategorie(undefined)).toBe(false);
  });
});

describe('verwijderRij', () => {
  test('verwijdert alle items achter een rij en de afvinkstatus', () => {
    const items = [
      item({ naam: 'melk', hoeveelheid: 1, eenheid: 'l' }),
      item({ naam: 'melk', hoeveelheid: 500, eenheid: 'ml' }),
      item({ naam: 'ui' }),
    ];
    const rijen = samengevoegd(items);
    const melkRij = rijen.find((rij) => rij.tekst === 'melk')!;
    const lijst = verwijderRij({ items, afgevinkt: [melkRij.sleutel] }, melkRij.sleutel);
    expect(lijst.items.map((overgebleven) => overgebleven.naam)).toEqual(['ui']);
    expect(lijst.afgevinkt).toEqual([]);
  });
  test('haalt ook de kleur van die rij weg en laat andere kleuren staan', () => {
    const lijst = verwijderRij(
      { items: [item({ naam: 'melk' }), item({ naam: 'ui' })], afgevinkt: [], kleuren: { 'melk|': 'geel', 'ui|': 'blauw' } },
      'melk|',
    );
    expect(lijst.kleuren).toEqual({ 'ui|': 'blauw' });
  });
});

describe('isKleur', () => {
  test('accepteert alleen de drie markeerkleuren', () => {
    expect(isKleur('geel')).toBe(true);
    expect(isKleur('roze')).toBe(true);
    expect(isKleur('blauw')).toBe(true);
    expect(isKleur('wit')).toBe(false);
    expect(isKleur('')).toBe(false);
    expect(isKleur(undefined)).toBe(false);
  });
});

describe('zetKleur', () => {
  test('geeft een rij een kleur en laat items en afvinkstatus ongemoeid', () => {
    const lijst: Boodschappenlijst = { items: [item({ naam: 'melk' })], afgevinkt: ['melk|'] };
    expect(zetKleur(lijst, 'melk|', 'geel')).toEqual({
      items: [item({ naam: 'melk' })],
      afgevinkt: ['melk|'],
      kleuren: { 'melk|': 'geel' },
    });
  });
  test('overschrijft een bestaande kleur en laat andere rijen met rust', () => {
    const lijst: Boodschappenlijst = { items: [], afgevinkt: [], kleuren: { 'melk|': 'geel', 'ui|': 'blauw' } };
    expect(zetKleur(lijst, 'melk|', 'roze').kleuren).toEqual({ 'melk|': 'roze', 'ui|': 'blauw' });
  });
  test('maakt een rij weer wit bij undefined', () => {
    const lijst: Boodschappenlijst = { items: [], afgevinkt: [], kleuren: { 'melk|': 'geel', 'ui|': 'blauw' } };
    expect(zetKleur(lijst, 'melk|', undefined).kleuren).toEqual({ 'ui|': 'blauw' });
  });
  test('muteert de oorspronkelijke lijst niet', () => {
    const lijst: Boodschappenlijst = { items: [], afgevinkt: [], kleuren: { 'melk|': 'geel' } };
    zetKleur(lijst, 'melk|', undefined);
    zetKleur(lijst, 'ui|', 'blauw');
    expect(lijst.kleuren).toEqual({ 'melk|': 'geel' });
  });
});

describe('laadLijst', () => {
  function nepOpslag(inhoud?: string) {
    const data = new Map<string, string>();
    if (inhoud !== undefined) data.set('boodschappen', inhoud);
    vi.stubGlobal('localStorage', {
      getItem: (sleutel: string) => data.get(sleutel) ?? null,
      setItem: (sleutel: string, waarde: string) => void data.set(sleutel, waarde),
    });
  }
  afterEach(() => vi.unstubAllGlobals());

  test('kleuren overleven bewaren en opnieuw laden', () => {
    nepOpslag();
    bewaarLijst({ items: [item({ naam: 'melk' })], afgevinkt: [], kleuren: { 'melk|': 'roze' } });
    expect(laadLijst()).toEqual({
      items: [item({ naam: 'melk' })],
      afgevinkt: [],
      kleuren: { 'melk|': 'roze' },
    });
  });
  test('gooit onbekende kleurwaarden weg', () => {
    nepOpslag(JSON.stringify({ items: [], afgevinkt: [], kleuren: { 'melk|': 'paars', 'ui|': 'blauw', 'kaas|': 3 } }));
    expect(laadLijst().kleuren).toEqual({ 'ui|': 'blauw' });
  });
  test('een oude opgeslagen lijst zonder kleuren laadt met lege kleuren', () => {
    nepOpslag(JSON.stringify({ items: [item({ naam: 'melk' })], afgevinkt: ['melk|'] }));
    expect(laadLijst()).toEqual({ items: [item({ naam: 'melk' })], afgevinkt: ['melk|'], kleuren: {} });
  });
  test('kleuren in een onverwachte vorm worden genegeerd', () => {
    nepOpslag(JSON.stringify({ items: [], afgevinkt: [], kleuren: ['geel'] }));
    expect(laadLijst().kleuren).toEqual({});
  });
  test('kapotte opslag geeft een lege lijst', () => {
    nepOpslag('{geen json');
    expect(laadLijst()).toEqual({ items: [], afgevinkt: [], kleuren: {} });
  });
});
