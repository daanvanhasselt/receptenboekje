import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const [bron, slug] = [process.argv[2], process.argv[3]];
if (bron === undefined || slug === undefined || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Gebruik: npx tsx scripts/foto-import.ts <url-of-pad> <slug>');
  process.exit(1);
}

async function haalBytes(): Promise<Buffer> {
  if (bron.startsWith('http://') || bron.startsWith('https://')) {
    const antwoord = await fetch(bron);
    if (!antwoord.ok) throw new Error(`download mislukt: HTTP ${antwoord.status} voor ${bron}`);
    return Buffer.from(await antwoord.arrayBuffer());
  }
  return readFileSync(bron);
}

try {
  const bytes = await haalBytes();
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
