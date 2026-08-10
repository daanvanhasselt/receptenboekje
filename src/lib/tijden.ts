import type { Stap } from './typen';

export function totaalTijd(stappen: Stap[]): { actief: number; wachten: number } {
  let actief = 0;
  let wachten = 0;
  for (const stap of stappen) {
    actief += stap.duur ?? 0;
    wachten += stap.wachttijd ?? 0;
  }
  return { actief, wachten };
}

export function cumulatieveTijd(stappen: Stap[]): number[] {
  const cum = [0];
  for (const stap of stappen) {
    cum.push(cum[cum.length - 1] + (stap.duur ?? 0) + (stap.wachttijd ?? 0));
  }
  return cum;
}

export function formatteerMinuten(minuten: number): string {
  if (minuten < 60) return `${minuten} min.`;
  const uur = Math.floor(minuten / 60);
  const rest = minuten % 60;
  return rest === 0 ? `${uur} uur` : `${uur} uur ${rest} min.`;
}
