import { expect, test } from 'vitest';
import { maakSlug } from '../src/lib/slug';

test('kleine letters en streepjes', () => {
  expect(maakSlug('Pasta met pesto')).toBe('pasta-met-pesto');
});

test('diakrieten worden gestript', () => {
  expect(maakSlug('Boeuf bourguignon à la crème')).toBe('boeuf-bourguignon-a-la-creme');
});

test('interpunctie wordt één streepje, randen schoon', () => {
  expect(maakSlug("  Kip & rijst (extra pittig!)  ")).toBe('kip-rijst-extra-pittig');
});

test('cijfers blijven staan', () => {
  expect(maakSlug('5-minuten noodles')).toBe('5-minuten-noodles');
});
