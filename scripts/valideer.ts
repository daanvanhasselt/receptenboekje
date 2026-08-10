import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { valideerRecept, type ValidatieFout } from '../src/lib/valideer';

const map = join(process.cwd(), 'recepten');
const bestanden = existsSync(map) ? readdirSync(map).filter((b) => b.endsWith('.json')).sort() : [];
const fouten: ValidatieFout[] = [];

for (const bestand of bestanden) {
  try {
    const data = JSON.parse(readFileSync(join(map, bestand), 'utf8'));
    fouten.push(...valideerRecept(bestand, data, (naam) => existsSync(join(map, naam))));
  } catch (fout) {
    fouten.push({ bestand, fout: `geen geldige JSON: ${(fout as Error).message}` });
  }
}

if (fouten.length > 0) {
  for (const { bestand, fout } of fouten) console.error(`✗ ${bestand}: ${fout}`);
  process.exit(1);
}
console.log(`✓ ${bestanden.length} recept(en) geldig`);
