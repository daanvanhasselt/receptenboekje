import { expect, test } from 'vitest';
import { bronWeergave } from '../src/lib/bron';

test('URL wordt hostname zonder www, met url erbij', () => {
  expect(bronWeergave('https://www.smulweb.nl/recepten/lasagne')).toEqual({
    tekst: 'smulweb.nl',
    url: 'https://www.smulweb.nl/recepten/lasagne',
  });
});

test('vrije tekst blijft platte tekst zonder url', () => {
  expect(bronWeergave('Bijbel van de Italiaanse keuken, p. 212')).toEqual({
    tekst: 'Bijbel van de Italiaanse keuken, p. 212',
  });
});

test('kapotte http-waarde valt terug op platte tekst', () => {
  expect(bronWeergave('http://')).toEqual({ tekst: 'http://' });
});
