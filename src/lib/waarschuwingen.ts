import { APPARATEN, type Apparaat } from './apparaten';
import { cumulatieveTijd, formatteerMinuten, totaalTijd } from './tijden';
import type { Stap } from './typen';

export interface WaarschuwingsPlaatsing {
  vooraf: string[];
  perStap: string[][];
}

function vul(sjabloon: string, wanneer: '' | 'nu ' | 'eerst ', temperatuur?: number): string {
  return sjabloon.replace('{wanneer}', wanneer).replace('{temperatuur}', String(temperatuur ?? ''));
}

export function plaatsWaarschuwingen(
  stappen: Stap[],
  apparaten: Record<string, Apparaat> = APPARATEN
): WaarschuwingsPlaatsing {
  const cum = cumulatieveTijd(stappen);
  const vooraf: string[] = [];
  const perStap: string[][] = stappen.map(() => []);
  const status: Record<string, number | 'aan'> = {};

  stappen.forEach((stap, i) => {
    if (!stap.vereist) return;
    const apparaat = apparaten[stap.vereist.apparaat];
    const gewenst = stap.vereist.temperatuur ?? 'aan';
    const huidig = status[stap.vereist.apparaat];
    if (huidig === gewenst) return;
    const alAan = huidig !== undefined;
    status[stap.vereist.apparaat] = gewenst;
    const sjabloon = alAan && apparaat.wijzigen !== undefined ? apparaat.wijzigen : apparaat.aanzetten;

    let k = -1;
    for (let kandidaat = i; kandidaat >= 0; kandidaat--) {
      if (cum[i] - cum[kandidaat] >= apparaat.opwarmtijd) {
        k = kandidaat;
        break;
      }
    }

    if (k === -1) {
      vooraf.push(`${vul(sjabloon, 'eerst ', stap.vereist.temperatuur)}.`);
    } else if ((stappen[k].wachttijd ?? 0) >= apparaat.opwarmtijd && cum[i] - cum[k + 1] < apparaat.opwarmtijd) {
      const ingevuld = vul(sjabloon, '', stap.vereist.temperatuur);
      perStap[k].push(`Tegen het einde van de wachttijd: ${ingevuld.charAt(0).toLowerCase()}${ingevuld.slice(1)}.`);
    } else {
      perStap[k].push(`${vul(sjabloon, 'nu ', stap.vereist.temperatuur)} — nodig over ±${cum[i] - cum[k]} min.`);
    }
  });

  return { vooraf, perStap };
}

export function wachttijdSamenvatting(stappen: Stap[]): string | null {
  if (!stappen.some((stap) => (stap.wachttijd ?? 0) >= 30)) return null;
  const { actief, wachten } = totaalTijd(stappen);
  return `Reken naast ±${formatteerMinuten(actief)} actief koken op ±${formatteerMinuten(wachten)} wachttijd.`;
}
