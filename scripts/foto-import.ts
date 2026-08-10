import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const [bron, slug, paginaUrl] = [process.argv[2], process.argv[3], process.argv[4]];
if (bron === undefined || slug === undefined || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Gebruik: npx tsx scripts/foto-import.ts <url-of-pad> <slug> [paginaUrl]');
  process.exit(1);
}

async function haalDirect(): Promise<Buffer> {
  if (bron.startsWith('http://') || bron.startsWith('https://')) {
    const antwoord = await fetch(bron);
    if (!antwoord.ok) throw new Error(`download mislukt: HTTP ${antwoord.status} voor ${bron}`);
    return Buffer.from(await antwoord.arrayBuffer());
  }
  return readFileSync(bron);
}

async function haalViaBrowser(pagina: string): Promise<Buffer> {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const tabblad = await (
      await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      })
    ).newPage();
    await tabblad.goto(pagina, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const base64 = await tabblad.evaluate(async (fotoUrl) => {
      const antwoord = await fetch(fotoUrl);
      if (!antwoord.ok) throw new Error(`HTTP ${antwoord.status}`);
      const bytes = new Uint8Array(await antwoord.arrayBuffer());
      let binair = '';
      for (const byte of bytes) binair += String.fromCharCode(byte);
      return btoa(binair);
    }, bron);
    return Buffer.from(base64, 'base64');
  } finally {
    await browser.close();
  }
}

try {
  let bytes: Buffer;
  try {
    bytes = await haalDirect();
  } catch (fout) {
    if (paginaUrl === undefined) throw fout;
    console.error(`Directe download mislukt (${(fout as Error).message}); ik probeer het via de pagina.`);
    bytes = await haalViaBrowser(paginaUrl);
  }
  const jpeg = await sharp(bytes)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  const doel = join(process.cwd(), 'recepten', `${slug}.jpg`);
  writeFileSync(doel, jpeg);
  console.log(doel);
} catch (fout) {
  console.error(`Foto-import mislukt: ${(fout as Error).message}`);
  process.exit(1);
}
