// Offline evidence capture, never a runtime URL checker or expert approval tool.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const directory = process.argv[2];
if (!directory) throw new Error('Usage: node content/qa/capture-legal-evidence.mjs <directory-with-downloaded-html-and-headers>');
const definitions = {
  internal: { url: 'https://data.rada.gov.ua/ogd/zak/perv/text/d33093.htm', canonical: 'https://zakon.rada.gov.ua/laws/show/548-14#Text', markers: [' 11. ', ' 16. ', ' 49. ', ' 50. '] },
  discipline: { url: 'https://data.rada.gov.ua/ogd/zak/perv/text/d32638.htm', canonical: 'https://zakon.rada.gov.ua/laws/show/551-14#Text', markers: [' 4. ', ' 110. ', ' 111. ', ' 112. '] },
  corruption: { url: 'https://data.rada.gov.ua/ogd/zak/perv/text/d433082.htm', canonical: 'https://zakon.rada.gov.ua/laws/show/1700-18#Text', markers: ['військові посадові особи', 'Стаття 28.'] },
  academic: { url: 'https://data.rada.gov.ua/ogd/zak/perv/text/d551694.htm', canonical: 'https://zakon.rada.gov.ua/rada/show/4742-20', markers: ['Стаття 8.', 'ПРИКІНЦЕВІ ТА ПЕРЕХІДНІ ПОЛОЖЕННЯ', 'статтю 42 викласти'] },
};
const decode = value => value.replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
  .replaceAll('&nbsp;', ' ').replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&apos;', "'");
const documents = Object.entries(definitions).map(([id, definition]) => {
  const bytes = fs.readFileSync(path.join(directory, id + '.html'));
  const headers = fs.readFileSync(path.join(directory, id + '.headers'), 'utf8');
  if (!/HTTP\/\S+ 200/.test(headers)) throw new Error(`${id}: not an HTTP 200 official text`);
  const text = decode(bytes.toString('utf8').replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const excerpts = definition.markers.map(marker => {
    const index = text.indexOf(marker);
    if (index < 0) throw new Error(`${id}: expected locator not found: ${marker}`);
    return { marker: marker.trim(), excerpt: text.slice(index, index + (id === 'corruption' ? 1600 : 1200)) };
  });
  return { id, url: definition.url, canonicalUrl: definition.canonical, httpStatus: 200,
    httpDate: headers.match(/^Date:\s*(.+)$/im)?.[1].trim(),
    lastModified: headers.match(/^Last-Modified:\s*(.+)$/im)?.[1].trim(),
    contentType: headers.match(/^Content-Type:\s*(.+)$/im)?.[1].trim(),
    sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
    textRead: true, legalRevisionVerified: false, versionAsOf: null,
    expertApplicabilityApproved: false, excerpts };
});
fs.writeFileSync(new URL('./legal-source-observations.json', import.meta.url), JSON.stringify({
  capturedAt: new Date().toISOString(), scenarioVersionDate: '2026-11-20',
  status: 'PARTIAL', warning: 'Official HTML read; HTTP Last-Modified is NOT a legal revision/effective date. No expert approval. No public catalog authorization.', documents,
}, null, 2) + '\n');
console.log('Captured official text evidence for 4 acts; legal revision verification remains incomplete.');
