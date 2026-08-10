import { join } from 'node:path';
import { expect, test } from 'vitest';
import { laadRecepten } from '../src/lib/laden';

test('laadt en valideert de echte receptenmap', () => {
  const recepten = laadRecepten();
  expect(recepten.length).toBeGreaterThanOrEqual(3);
  const slugs = recepten.map((r) => r.slug);
  expect(slugs).toContain('lasagne');
  const titels = recepten.map((r) => r.titel);
  expect(titels).toEqual([...titels].sort((a, b) => a.localeCompare(b, 'nl')));
});

test('kapotte map gooit een fout met bestand en omschrijving', () => {
  expect(() => laadRecepten(join(process.cwd(), 'tests', 'fixtures', 'kapot'))).toThrowError(
    /ongeldig\.json: stap 1: verwijzing \{kaas\} bestaat niet/
  );
});
