export function bronWeergave(bron: string): { tekst: string; url?: string } {
  if (bron.startsWith('http://') || bron.startsWith('https://')) {
    try {
      const hostname = new URL(bron).hostname.replace(/^www\./, '');
      if (hostname !== '') return { tekst: hostname, url: bron };
    } catch {
      // geen geldige URL: toon als platte tekst
    }
  }
  return { tekst: bron };
}
