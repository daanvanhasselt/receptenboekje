import { describe, expect, test } from 'vitest';
import { interpreteerAntwoord } from '../src/lib/categorie-ai';

describe('interpreteerAntwoord', () => {
  test('geeft een bekende categorie uit geldig JSON terug', () => {
    expect(interpreteerAntwoord('{"categorie":"kaas"}')).toBe('kaas');
  });

  test('weigert onbekende categorieën en ongeldige JSON', () => {
    expect(interpreteerAntwoord('{"categorie":"snoep"}')).toBeUndefined();
    expect(interpreteerAntwoord('kaas')).toBeUndefined();
  });
});
