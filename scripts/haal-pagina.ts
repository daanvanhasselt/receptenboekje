import { chromium } from 'playwright-core';

const url = process.argv[2];
if (url === undefined || !/^https?:\/\//.test(url)) {
  console.error('Gebruik: npx tsx scripts/haal-pagina.ts <url>');
  process.exit(1);
}

try {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    locale: 'nl-NL',
  });
  const pagina = await context.newPage();
  await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await pagina.waitForTimeout(3000);
  const data = await pagina.evaluate(() => {
    const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => script.textContent ?? ''
    );
    const container = document.querySelector('.wprm-recipe-container, [class*="recipe"], article, main');
    return {
      titel: document.title,
      jsonld,
      zichtbareTekst: ((container ?? document.body) as HTMLElement).innerText.slice(0, 12000),
    };
  });
  console.log(JSON.stringify(data, null, 1));
  await browser.close();
} catch (fout) {
  console.error(`Pagina ophalen mislukt: ${(fout as Error).message}`);
  process.exit(1);
}
