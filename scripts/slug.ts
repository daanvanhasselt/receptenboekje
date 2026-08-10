import { maakSlug } from '../src/lib/slug';

const titel = process.argv[2];
if (titel === undefined || titel.trim() === '') {
  console.error('Gebruik: npx tsx scripts/slug.ts "<titel>"');
  process.exit(1);
}
console.log(maakSlug(titel));
