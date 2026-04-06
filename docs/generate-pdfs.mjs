/**
 * Generate PDFs from HTML docs using Playwright.
 * Also stamps the version from package.json into HTML files.
 * Run: node docs/generate-pdfs.mjs
 * Source: public/docs/*.html → public/docs/*.pdf
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'public', 'docs');

const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const docs = [
  { html: 'aide-memoire-enfant.html', pdf: 'GeoMolo-aide-memoire.pdf' },
  { html: 'guide-enseignant.html', pdf: 'GeoMolo-guide-enseignant.pdf' },
  { html: 'fiche-descriptive.html', pdf: 'GeoMolo-fiche-descriptive.pdf' },
  { html: 'GeoMolo-note-parent.html', pdf: 'GeoMolo-note-parent.pdf' },
];

// Stamp version into all HTML files (including index.html)
const htmlFiles = fs.readdirSync(DOCS).filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
  const filePath = path.join(DOCS, file);
  const html = fs.readFileSync(filePath, 'utf8');
  const stamped = html.replace(
    /(<span class="doc-version">)[^<]*(<\/span>)/g,
    `$1v${version}$2`,
  );
  if (stamped !== html) {
    fs.writeFileSync(filePath, stamped);
    console.log(`Stamped v${version} → ${file}`);
  }
}

// Generate PDFs
const browser = await chromium.launch();

for (const doc of docs) {
  const page = await browser.newPage();
  await page.goto(`file://${path.join(DOCS, doc.html)}`, { waitUntil: 'networkidle' });
  await page.pdf({
    path: path.join(DOCS, doc.pdf),
    format: 'Letter',
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '15mm', right: '15mm' },
  });
  console.log(`OK: ${doc.pdf}`);
  await page.close();
}

await browser.close();
console.log(`\nDone! All docs stamped with v${version}.`);
