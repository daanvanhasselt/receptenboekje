import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIE_LABELS, isCategorie } from './boodschappen';
import { CATEGORIEEN, type Categorie } from './typen';

const CATEGORIE_REGELS = CATEGORIEEN.map((categorie) => `${categorie} — ${CATEGORIE_LABELS[categorie]}`).join('\n');

export const SYSTEEMPROMPT = `Je krijgt één item van een Nederlandse boodschappenlijst. Kies de supermarktafdeling waar je dit koopt. Antwoord met precies één van deze categorieën (gebruik de slug):
${CATEGORIE_REGELS}

Richtlijnen: kaas hoort bij kaas, niet bij zuivel; diepvries alleen voor diepvriesproducten; blik en pot (bonen, passata, tomatenpuree) bij conserven-en-potten; azijn, ketjap, sojasaus, mayonaise bij olie-en-sauzen; verse kruiden bij groente-en-fruit, gedroogde kruiden en zout bij kruiden-en-specerijen; noedels, couscous, havermout bij pasta-rijst-en-granen; paneermeel en wraps bij brood-en-bakkerij; non-food (wc-papier, afwasmiddel), drank en alles wat niet past bij overig.`;

export function interpreteerAntwoord(tekst: string): Categorie | undefined {
  try {
    const antwoord: unknown = JSON.parse(tekst);
    if (antwoord === null || typeof antwoord !== 'object' || Array.isArray(antwoord)) return undefined;
    const categorie = (antwoord as { categorie?: unknown }).categorie;
    return isCategorie(categorie) ? categorie : undefined;
  } catch {
    return undefined;
  }
}

export async function herkenCategorie(naam: string, apiSleutel: string): Promise<Categorie | undefined> {
  try {
    const client = new Anthropic({ apiKey: apiSleutel, dangerouslyAllowBrowser: true });
    const antwoord = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2048,
      system: SYSTEEMPROMPT,
      messages: [{ role: 'user', content: naam }],
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { categorie: { type: 'string', enum: [...CATEGORIEEN] } },
            required: ['categorie'],
            additionalProperties: false,
          },
        },
      },
    });
    if (antwoord.stop_reason === 'refusal') return undefined;
    const tekstblok = antwoord.content.find((blok) => blok.type === 'text');
    return tekstblok === undefined ? undefined : interpreteerAntwoord(tekstblok.text);
  } catch (fout) {
    console.warn('Automatische categorisatie is niet gelukt.', fout);
    return undefined;
  }
}
