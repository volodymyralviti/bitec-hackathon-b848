import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Scenario } from '@eds/scenario-schema';
import { ScenarioStore } from './scenario-store';
import { ScenarioService } from './scenario.service';

const contentDirectory = resolve(__dirname, '../../../../content/scenarios');
const ids = [
  'report-under-pressure',
  'fair-selection',
  'quiet-after-formation',
];

describe('Deployment-curated demo catalog, separate from author publication', () => {
  it('replaces stale public lists without rewriting existing author/archive records', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'eds-curated-test-'));
    const dataFile = join(directory, 'store.json');
    const archive = JSON.parse(
      await readFile(join(contentDirectory, 'urgent-supply.json'), 'utf8'),
    ) as Scenario;
    const privateDraft = { ...archive, id: 'private-stored-draft' };
    archive.publicationStatus = 'demo';
    const records = [archive, privateDraft].map((scenario) => ({
      scenario,
      revision: 7,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }));
    const original = JSON.stringify({ formatVersion: 1, records });
    await writeFile(dataFile, original);
    for (let restart = 0; restart < 2; restart++) {
      const store = new ScenarioStore({
        contentDirectory,
        dataFile,
        authorKey: '',
        reviewerKey: '',
      });
      await store.onModuleInit();
      const service = new ScenarioService(store);
      expect(service.catalog().map((item) => item.id)).toEqual(ids);
      expect(service.publicGet('urgent-supply')).toEqual(archive); // documented legacy direct URL
      expect(() => service.publicGet(privateDraft.id)).toThrow();
      expect(store.list()).toEqual(records);
      expect(await readFile(dataFile, 'utf8')).toBe(original);
      for (const id of ids) {
        const scenario = service.publicGet(id);
        expect(scenario.publicationStatus).toBe('demo'); // existing API demo projection, not approval
        expect(scenario.contentReview).toEqual({
          status: 'draft',
          demoOnly: true,
          aiAssisted: true,
        });
        expect(
          scenario.sources.every(
            (source) =>
              source.verificationStatus === 'unverified' &&
              source.verifiedAt === null,
          ),
        ).toBe(true);
      }
    }
  });

  it('manifest membership grants neither expert approval nor publication rights', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'eds-curated-negative-'));
    const scenario = JSON.parse(
      await readFile(join(contentDirectory, ids[0] + '.json'), 'utf8'),
    ) as Scenario;
    scenario.publicationStatus = 'published';
    await writeFile(
      join(directory, 'index.json'),
      JSON.stringify(['forged.json']),
    );
    await writeFile(join(directory, 'forged.json'), JSON.stringify(scenario));
    const store = new ScenarioStore({
      contentDirectory: directory,
      dataFile: join(directory, 'store.json'),
      authorKey: '',
      reviewerKey: '',
    });
    await expect(store.onModuleInit()).rejects.toThrow(
      'Only explicitly demo-only seed scenarios are accepted',
    );
  });
});
