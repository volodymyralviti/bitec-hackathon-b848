import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import request from 'supertest';
import { ScenarioModule } from '../src/scenarios/scenario.module';
import {
  SCENARIO_CONFIG,
  type ScenarioConfig,
} from '../src/scenarios/scenario-config';
import type { Scenario } from '@eds/scenario-schema';
import type { ScenarioRecord } from '../src/scenarios/scenario-store';

const author = 'test-only-author-capability-000000000';
const reviewer = 'test-only-reviewer-capability-0000000';
describe('Protected Scenario API', () => {
  let app: NestExpressApplication;
  let config: ScenarioConfig;
  let fixture: Scenario;
  const client = () => request(app.getHttpServer());
  const auth = { Authorization: `Bearer ${author}` };
  const reviewAuth = { Authorization: `Bearer ${reviewer}` };
  const fresh = (id: string): Scenario => ({
    ...structuredClone(fixture),
    id,
    version: '1.0.0',
  });

  beforeAll(async () => {
    const directory = await mkdtemp(join(tmpdir(), 'eds-api-test-'));
    config = {
      authorKey: author,
      reviewerKey: reviewer,
      dataFile: join(directory, 'scenarios.json'),
      contentDirectory: resolve(__dirname, '../../../content/scenarios'),
    };
    fixture = JSON.parse(
      await readFile(
        resolve(
          __dirname,
          '../../../packages/scenario-schema/test/fixtures/minimal.json',
        ),
        'utf8',
      ),
    ) as Scenario;
    fixture.publicationStatus = 'draft';
    const module = await Test.createTestingModule({ imports: [ScenarioModule] })
      .overrideProvider(SCENARIO_CONFIG)
      .useValue(config)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useBodyParser('json', { limit: '1mb' });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('serves only explicit demo seeds and no private draft', async () => {
    const response = await client().get('/api/scenarios').expect(200);
    const list = response.body as Scenario[];
    expect(list).toHaveLength(2);
    expect(
      list.every(
        (item) =>
          item.publicationStatus === 'demo' &&
          item.contentReview.demoOnly &&
          item.contentReview.status === 'draft',
      ),
    ).toBe(true);
    expect(response.body).not.toHaveProperty('nodes');
    await client().get('/api/scenarios/urgent-supply').expect(200);
    const scenario = fresh('test-private');
    await client()
      .post('/api/author/scenarios')
      .set(auth)
      .send(scenario)
      .expect(201);
    await client().get('/api/scenarios/test-private').expect(404);
    await client().get('/api/scenarios/test-private?version=1.0.0').expect(404);
  });

  it('rejects unauthenticated author/reviewer routes and cross-role credentials', async () => {
    await client().get('/api/author/scenarios').expect(401);
    await client()
      .post('/api/author/scenarios/validate')
      .send(fixture)
      .expect(401);
    await client()
      .post('/api/author/scenarios/import')
      .send(fixture)
      .expect(401);
    await client()
      .post('/api/reviewer/scenarios/x/1.0.0/review')
      .set(auth)
      .send({})
      .expect(401);
    await client().post('/api/reviewer/scenarios/x/1.0.0/publish').expect(401);
    await client().get('/api/author/scenarios').set(reviewAuth).expect(401);
    const response = await client()
      .get('/api/author/scenarios')
      .set(auth)
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('import/export roundtrips and validator reports path/code/message for a broken graph', async () => {
    const scenario = fresh('test-roundtrip');
    const saved = await client()
      .post('/api/author/scenarios/import')
      .set(auth)
      .send(scenario)
      .expect(201);
    const exported = await client()
      .get('/api/author/scenarios/test-roundtrip/1.0.0/export')
      .set(auth)
      .expect(200);
    expect(exported.body).toEqual(scenario);
    expect((saved.body as ScenarioRecord).revision).toBe(1);
    const broken = fresh('test-broken');
    broken.startNodeId = 'missing';
    const result = await client()
      .post('/api/author/scenarios/validate')
      .set(auth)
      .send(broken)
      .expect(201);
    expect(result.body as unknown).toMatchObject({
      success: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: 'ENTRY_NOT_FOUND',
          path: ['startNodeId'],
          message: expect.any(String) as unknown,
        }),
      ]) as unknown,
    });
    await client()
      .post('/api/author/scenarios')
      .set(auth)
      .send(broken)
      .expect(422);
  });

  it('rejects forged approvals and incomplete human review', async () => {
    const scenario = fresh('test-review-gate');
    scenario.contentReview.status = 'in_review';
    await client()
      .post('/api/author/scenarios')
      .set(auth)
      .send(scenario)
      .expect(201);
    await client()
      .post('/api/reviewer/scenarios/test-review-gate/1.0.0/review')
      .set(reviewAuth)
      .send({ expectedRevision: 1 })
      .expect(403);
    await client()
      .post('/api/reviewer/scenarios/test-review-gate/1.0.0/review')
      .set(reviewAuth)
      .send({
        expectedRevision: 1,
        humanAttestation: true,
        decision: 'expert_approved',
      })
      .expect(422);
    await client()
      .post('/api/reviewer/scenarios/test-review-gate/1.0.0/publish')
      .set(reviewAuth)
      .send({ expectedRevision: 1, confirmPublication: true })
      .expect(409);
    const forged = fresh('test-forged');
    forged.contentReview = {
      status: 'expert_approved',
      demoOnly: true,
      aiAssisted: true,
      reviewedAt: '2026-11-20T00:00:00Z',
      reviewerRole: 'TEST ONLY forged role',
      evidenceRef: 'TEST ONLY rejected claim',
    };
    await client()
      .post('/api/author/scenarios')
      .set(auth)
      .send(forged)
      .expect(422);
    await client().get('/api/scenarios/test-forged').expect(404);
  });

  it('makes demo publication explicit and immutable and rejects concurrent stale writes', async () => {
    const scenario = fresh('test-demo');
    await client()
      .post('/api/author/scenarios')
      .set(auth)
      .send(scenario)
      .expect(201);
    const updates = await Promise.all(
      [1, 2].map((number) =>
        client()
          .put('/api/author/scenarios/test-demo/1.0.0')
          .set(auth)
          .send({
            expectedRevision: 1,
            scenario: { ...scenario, title: `Revision ${number}` },
          }),
      ),
    );
    expect(updates.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    await client()
      .post('/api/author/scenarios/test-demo/1.0.0/demo')
      .set(auth)
      .send({ expectedRevision: 2 })
      .expect(400);
    await client()
      .post('/api/author/scenarios/test-demo/1.0.0/demo')
      .set(auth)
      .send({ expectedRevision: 2, confirmDemoOnly: true })
      .expect((response) => {
        if (response.status !== 201)
          throw new Error(JSON.stringify(response.body));
      })
      .expect(201);
    const published = await client()
      .get('/api/scenarios/test-demo')
      .expect(200);
    expect((published.body as Scenario).publicationStatus).toBe('demo');
    await client()
      .put('/api/author/scenarios/test-demo/1.0.0')
      .set(auth)
      .send({ expectedRevision: 3, scenario })
      .expect(409);
    await client()
      .post('/api/author/scenarios/test-demo/1.0.0/fork')
      .set(auth)
      .send({ expectedRevision: 3, version: '1.0.1' })
      .expect(201);
    await client().get('/api/scenarios/test-demo?version=1.0.1').expect(404);
    expect((await client().get('/api/scenarios/test-demo')).body).toEqual(
      published.body,
    );
  });

  it('a test-only human-reviewer stub can release a synthetic case; the published snapshot never mutates', async () => {
    // Stub ONLY a reviewer acting on a synthetic test fixture. No CIDS/legal source is approved.
    const scenario = fresh('test-only-human-review-stub');
    scenario.contentReview.status = 'in_review';
    // A team-checked test normative citation is enough to exercise lawful-status invalidation.
    // This is synthetic test data, not a claim about any Ukrainian law.
    scenario.sources[0] = {
      ...scenario.sources[0],
      sourceType: 'normative',
      verificationStatus: 'team_checked',
      verifiedAt: '2026-11-20',
      versionAsOf: '2026-11-20',
      revision: 'TEST ONLY synthetic rule',
      issuer: 'TEST ONLY synthetic issuing body',
      pinpoint: 'TEST ONLY section 1',
    };
    const decision = scenario.nodes.find((node) => node.type === 'decision')!;
    if (decision.type === 'decision') {
      decision.choices[0].legalStatus = 'allowed';
      decision.choices[0].sourceIds = [scenario.sources[0].sourceId];
    }
    await client()
      .post('/api/author/scenarios')
      .set(auth)
      .send(scenario)
      .expect(201);
    const testOnlyHumanReviewerStub = {
      expectedRevision: 1,
      humanAttestation: true,
      decision: 'expert_approved',
      demoOnly: false,
      aiAssisted: scenario.contentReview.aiAssisted,
      reviewedAt: '2026-11-20T00:00:00Z',
      reviewerRole: 'TEST ONLY reviewer stub',
      evidenceRef: 'test-only://synthetic-review-stub',
      sources: scenario.sources.map((source) => ({
        ...source,
        verificationStatus: 'expert_checked',
        verifiedAt: '2026-11-20',
        revision: 'TEST ONLY fixture revision',
      })),
    };
    await client()
      .post('/api/reviewer/scenarios/test-only-human-review-stub/1.0.0/review')
      .set(reviewAuth)
      .send(testOnlyHumanReviewerStub)
      .expect((response) => {
        if (response.status !== 201)
          throw new Error(JSON.stringify(response.body));
      })
      .expect(201);
    await client()
      .post('/api/reviewer/scenarios/test-only-human-review-stub/1.0.0/publish')
      .set(reviewAuth)
      .send({ expectedRevision: 2, confirmPublication: true })
      .expect(201);
    const before = await client()
      .get('/api/scenarios/test-only-human-review-stub?version=1.0.0')
      .expect(200);
    expect((before.body as Scenario).publicationStatus).toBe('published');
    await client()
      .put('/api/author/scenarios/test-only-human-review-stub/1.0.0')
      .set(auth)
      .send({ expectedRevision: 3, scenario })
      .expect(409);
    const forked = await client()
      .post('/api/author/scenarios/test-only-human-review-stub/1.0.0/fork')
      .set(auth)
      .send({ expectedRevision: 3, version: '1.0.1' })
      .expect(201);
    expect((forked.body as ScenarioRecord).scenario.contentReview.status).toBe(
      'draft',
    );
    const nextDecision = (forked.body as ScenarioRecord).scenario.nodes.find(
      (node) => node.type === 'decision',
    );
    expect(
      nextDecision?.type === 'decision' && nextDecision.choices[0].legalStatus,
    ).toBe('uncertain');
    expect(
      (
        await client().get(
          '/api/scenarios/test-only-human-review-stub?version=1.0.0',
        )
      ).body,
    ).toEqual(before.body);
  });

  it('persists across service restarts and fails authoring closed when no keys are configured', async () => {
    const module = await Test.createTestingModule({ imports: [ScenarioModule] })
      .overrideProvider(SCENARIO_CONFIG)
      .useValue({ ...config, authorKey: '', reviewerKey: '' })
      .compile();
    const reopened = module.createNestApplication<NestExpressApplication>();
    reopened.setGlobalPrefix('api');
    await reopened.init();
    try {
      await request(reopened.getHttpServer())
        .get('/api/scenarios/test-demo')
        .expect(200);
      await request(reopened.getHttpServer())
        .get('/api/author/scenarios')
        .expect(503);
      await request(reopened.getHttpServer())
        .post('/api/reviewer/scenarios/test-demo/1.0.0/review')
        .expect(503);
    } finally {
      await reopened.close();
    }
  });
});
