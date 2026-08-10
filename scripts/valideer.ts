import { laadRecepten } from '../src/lib/laden';

try {
  const recepten = laadRecepten();
  console.log(`✓ ${recepten.length} recept(en) geldig`);
} catch (fout) {
  console.error((fout as Error).message);
  process.exit(1);
}
