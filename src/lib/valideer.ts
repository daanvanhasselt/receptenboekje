import Ajv from 'ajv';
import receptSchema from '../../schema/recept.schema.json';
import { APPARATEN } from './apparaten';
import { parseStaptekst } from './substitutie';
import type { Recept } from './typen';

const ajv = new Ajv({ allErrors: true });
const schemaControle = ajv.compile(receptSchema);

export interface ValidatieFout {
  bestand: string;
  fout: string;
}

export function valideerRecept(
  bestand: string,
  data: unknown,
  fotoBestaat: (naam: string) => boolean = () => true
): ValidatieFout[] {
  const fouten: ValidatieFout[] = [];

  if (!schemaControle(data)) {
    for (const fout of schemaControle.errors ?? []) {
      fouten.push({ bestand, fout: `${fout.instancePath || '(root)'} ${fout.message}` });
    }
    return fouten;
  }

  const recept = data as unknown as Recept;
  const ids = new Set<string>();
  for (const ingredient of recept.ingredienten) {
    if (ids.has(ingredient.id)) fouten.push({ bestand, fout: `dubbel ingrediënt-id "${ingredient.id}"` });
    ids.add(ingredient.id);
    if (ingredient.schaling !== 'vast' && (ingredient.hoeveelheid === undefined || ingredient.eenheid === undefined)) {
      fouten.push({
        bestand,
        fout: `ingrediënt "${ingredient.id}": schaling "${ingredient.schaling}" vereist hoeveelheid en eenheid`,
      });
    }
  }

  recept.stappen.forEach((stap, i) => {
    for (const segment of parseStaptekst(stap.tekst)) {
      if (segment.type === 'ingredient' && !ids.has(segment.id)) {
        fouten.push({ bestand, fout: `stap ${i + 1}: verwijzing {${segment.id}} bestaat niet als ingrediënt` });
      }
    }
    if (stap.vereist && !Object.hasOwn(APPARATEN, stap.vereist.apparaat)) {
      fouten.push({ bestand, fout: `stap ${i + 1}: onbekend apparaat "${stap.vereist.apparaat}"` });
    }
  });

  if (recept.foto !== undefined && !fotoBestaat(recept.foto)) {
    fouten.push({ bestand, fout: `foto "${recept.foto}" niet gevonden` });
  }

  return fouten;
}
