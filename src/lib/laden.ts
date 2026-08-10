import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { valideerRecept, type ValidatieFout } from './valideer';
import type { Recept, ReceptMetSlug } from './typen';

export function laadRecepten(map: string = join(process.cwd(), 'recepten')): ReceptMetSlug[] {
  const bestanden = readdirSync(map).filter((bestand) => bestand.endsWith('.json')).sort();
  const fouten: ValidatieFout[] = [];
  const recepten: ReceptMetSlug[] = [];

  for (const bestand of bestanden) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(map, bestand), 'utf8'));
    } catch (fout) {
      fouten.push({ bestand, fout: `geen geldige JSON: ${(fout as Error).message}` });
      continue;
    }
    const receptFouten = valideerRecept(bestand, data, (naam) => existsSync(join(map, naam)));
    if (receptFouten.length > 0) fouten.push(...receptFouten);
    else recepten.push({ ...(data as Recept), slug: bestand.replace(/\.json$/, '') });
  }

  if (fouten.length > 0) {
    throw new Error('Ongeldige recepten:\n' + fouten.map(({ bestand, fout }) => `  ${bestand}: ${fout}`).join('\n'));
  }

  return recepten.sort((a, b) => a.titel.localeCompare(b.titel, 'nl'));
}
