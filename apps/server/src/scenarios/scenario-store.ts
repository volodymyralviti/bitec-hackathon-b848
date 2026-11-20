import {
  ConflictException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateScenario, type Scenario } from '@eds/scenario-schema';
import { SCENARIO_CONFIG, type ScenarioConfig } from './scenario-config';

export interface ScenarioRecord {
  scenario: Scenario;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
// Canonical JSON copies also stay in the current realm (important for strict schema validation).
function jsonCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(BigInt);
  const right = b.split('.').map(BigInt);
  for (let index = 0; index < 3; index++) {
    if (left[index] > right[index]) return 1;
    if (left[index] < right[index]) return -1;
  }
  return 0;
}

@Injectable()
export class ScenarioStore implements OnModuleInit {
  private records: ScenarioRecord[] = [];
  private curated: ScenarioRecord[] = [];
  private queue: Promise<void> = Promise.resolve();
  constructor(
    @Inject(SCENARIO_CONFIG) private readonly config: ScenarioConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    // Deployment-owned allowlist, refreshed even when an older author store exists.
    // This read-only demo projection never updates stored drafts or review evidence.
    this.curated = await this.seed();
    let text: string;
    try {
      text = await readFile(this.config.dataFile, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      this.records = jsonCopy(this.curated);
      await this.persist(this.records);
      return;
    }
    const document = JSON.parse(text) as {
      formatVersion?: unknown;
      records?: unknown;
    };
    if (document.formatVersion !== 1 || !Array.isArray(document.records))
      throw new Error('Unsupported scenario store format');
    const keys = new Set<string>();
    this.records = document.records.map((input: unknown) => {
      const record = input as ScenarioRecord;
      const checked = validateScenario(record?.scenario);
      if (
        !checked.success ||
        !Number.isSafeInteger(record.revision) ||
        record.revision < 1 ||
        typeof record.createdAt !== 'string' ||
        typeof record.updatedAt !== 'string'
      )
        throw new Error('Invalid stored scenario');
      const key = `${checked.data.id}@${checked.data.version}`;
      if (keys.has(key)) throw new Error('Duplicate stored scenario version');
      keys.add(key);
      return { ...record, scenario: checked.data };
    });
  }

  list(): ScenarioRecord[] {
    return jsonCopy(this.records);
  }

  demoCatalog(): ScenarioRecord[] {
    return jsonCopy(this.curated);
  }

  change<T>(operation: (records: ScenarioRecord[]) => T): Promise<T> {
    const result = this.queue.then(async () => {
      const next = jsonCopy(this.records);
      const output = operation(next);
      if (next.length > 1000)
        throw new ConflictException('Досягнуто межу demo-сховища.');
      await this.persist(next);
      this.records = next;
      return jsonCopy(output);
    });
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async persist(records: ScenarioRecord[]): Promise<void> {
    const text = JSON.stringify({ formatVersion: 1, records });
    if (Buffer.byteLength(text) > 50_000_000)
      throw new ConflictException('Досягнуто межу demo-сховища.');
    await mkdir(dirname(this.config.dataFile), { recursive: true });
    const temporary = `${this.config.dataFile}.${randomUUID()}.tmp`;
    await writeFile(temporary, text + '\n', {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    await rename(temporary, this.config.dataFile);
  }

  private async seed(): Promise<ScenarioRecord[]> {
    const manifest = JSON.parse(
      await readFile(join(this.config.contentDirectory, 'index.json'), 'utf8'),
    ) as unknown;
    if (
      !Array.isArray(manifest) ||
      manifest.length > 128 ||
      manifest.some(
        (file) =>
          typeof file !== 'string' ||
          !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.json$/.test(file) ||
          file === 'index.json',
      )
    )
      throw new Error('Invalid public seed manifest');
    const now = new Date().toISOString();
    const records: ScenarioRecord[] = [];
    for (const file of manifest as string[]) {
      const result = validateScenario(
        JSON.parse(
          await readFile(join(this.config.contentDirectory, file), 'utf8'),
        ) as unknown,
      );
      if (!result.success || !result.data.contentReview.demoOnly)
        throw new Error(
          'Only explicitly demo-only seed scenarios are accepted',
        );
      const scenario = { ...result.data, publicationStatus: 'demo' as const };
      if (
        records.some(
          (record) =>
            record.scenario.id === scenario.id &&
            record.scenario.version === scenario.version,
        )
      )
        throw new Error('Duplicate seed');
      records.push({ scenario, revision: 1, createdAt: now, updatedAt: now });
    }
    return records;
  }
}
