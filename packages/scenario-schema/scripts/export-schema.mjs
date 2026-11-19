import { mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { ScenarioSchema } from '../dist/esm/index.js';

mkdirSync(new URL('../dist/cjs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{"type":"commonjs"}\n');
writeFileSync(new URL('../dist/scenario.schema.json', import.meta.url), JSON.stringify(z.toJSONSchema(ScenarioSchema), null, 2) + '\n');
