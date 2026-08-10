export type Segment = { type: 'tekst'; waarde: string } | { type: 'ingredient'; id: string };

const VERWIJZING = /\{([a-z0-9-]+)\}/g;

export function parseStaptekst(tekst: string): Segment[] {
  const segmenten: Segment[] = [];
  let vorige = 0;
  for (const match of tekst.matchAll(VERWIJZING)) {
    if (match.index > vorige) segmenten.push({ type: 'tekst', waarde: tekst.slice(vorige, match.index) });
    segmenten.push({ type: 'ingredient', id: match[1] });
    vorige = match.index + match[0].length;
  }
  if (vorige < tekst.length) segmenten.push({ type: 'tekst', waarde: tekst.slice(vorige) });
  if (segmenten.length === 0) segmenten.push({ type: 'tekst', waarde: '' });
  return segmenten;
}
