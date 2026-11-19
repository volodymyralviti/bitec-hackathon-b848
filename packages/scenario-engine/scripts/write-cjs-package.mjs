import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../dist/cjs/', import.meta.url));
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{"type":"commonjs"}\n');
