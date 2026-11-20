import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  validateScenario,
  validateScenarioJson,
  ContentReviewSchema,
  type Scenario,
  type ValidationResult,
} from '@eds/scenario-schema';
import {
  compareVersions,
  ScenarioStore,
  type ScenarioRecord,
} from './scenario-store';
import { z } from 'zod';

const legalAssessmentsSchema = z
  .array(
    z.strictObject({
      nodeId: z.string().min(1).max(80),
      choiceId: z.string().min(1).max(80),
      legalStatus: z.enum(['allowed', 'restricted', 'uncertain']),
    }),
  )
  .max(8192);

function reviewedNodes(scenario: Scenario, input: unknown): Scenario['nodes'] {
  if (input === undefined) return scenario.nodes;
  const parsed = legalAssessmentsSchema.safeParse(input);
  if (!parsed.success)
    invalid(
      'INVALID_LEGAL_ASSESSMENT',
      ['legalAssessments'],
      'Потрібні точні nodeId, choiceId та правовий статус.',
    );
  const assessments = new Map<string, 'allowed' | 'restricted' | 'uncertain'>();
  for (const item of parsed.data) {
    const node = scenario.nodes.find((node) => node.id === item.nodeId);
    const key = `${item.nodeId}/${item.choiceId}`;
    if (
      node?.type !== 'decision' ||
      !node.choices.some((choice) => choice.id === item.choiceId) ||
      assessments.has(key)
    ) {
      invalid(
        'INVALID_LEGAL_ASSESSMENT',
        ['legalAssessments'],
        'Оцінка має посилатися на унікальний існуючий choice.',
      );
    }
    assessments.set(key, item.legalStatus);
  }
  return scenario.nodes.map((node) =>
    node.type === 'decision'
      ? {
          ...node,
          choices: node.choices.map((choice) => {
            const legalStatus = assessments.get(`${node.id}/${choice.id}`);
            return legalStatus ? { ...choice, legalStatus } : choice;
          }),
        }
      : node,
  );
}

function invalid(
  code: string,
  path: (string | number)[],
  message: string,
): never {
  throw new UnprocessableEntityException({
    errors: [{ path, code, message }],
    warnings: [],
  });
}
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Очікується JSON-об’єкт.');
  return input as Record<string, unknown>;
}
function revision(input: unknown): number {
  if (!Number.isSafeInteger(input) || Number(input) < 1)
    throw new BadRequestException('Потрібен expectedRevision.');
  return Number(input);
}
function checked(input: unknown): Scenario {
  const result = validateScenario(input);
  if (!result.success)
    throw new UnprocessableEntityException({
      errors: result.errors,
      warnings: result.warnings,
    });
  return result.data;
}
function authorDraft(input: unknown): Scenario {
  const scenario = checked(input);
  if (
    scenario.publicationStatus !== 'draft' ||
    !['draft', 'in_review'].includes(scenario.contentReview.status)
  )
    invalid(
      'AUTHOR_REVIEW_FORBIDDEN',
      ['contentReview'],
      'Автор може зберігати лише чернетку або запит на review.',
    );
  if (
    scenario.sources.some(
      (source) => source.verificationStatus === 'expert_checked',
    )
  )
    invalid(
      'AUTHOR_REVIEW_FORBIDDEN',
      ['sources'],
      'Експертну перевірку джерела фіксує лише рецензент.',
    );
  return scenario;
}
function find(
  records: ScenarioRecord[],
  id: string,
  version: string,
): ScenarioRecord {
  const record = records.find(
    (item) => item.scenario.id === id && item.scenario.version === version,
  );
  if (!record) throw new NotFoundException('Версію сценарію не знайдено.');
  return record;
}
function checkRevision(record: ScenarioRecord, expected: number): void {
  if (record.revision !== expected)
    throw new ConflictException(
      'Версію вже змінено. Перезавантажте її перед збереженням.',
    );
}
function touch(record: ScenarioRecord, scenario: Scenario): ScenarioRecord {
  record.scenario = scenario;
  record.revision++;
  record.updatedAt = new Date().toISOString();
  return record;
}
function publicScenario(scenario: Scenario): boolean {
  return (
    scenario.publicationStatus === 'published' ||
    (scenario.publicationStatus === 'demo' && scenario.contentReview.demoOnly)
  );
}

@Injectable()
export class ScenarioService {
  constructor(private readonly store: ScenarioStore) {}

  catalog() {
    const latest = new Map<string, Scenario>();
    for (const record of this.store.list()) {
      const scenario = record.scenario;
      if (
        publicScenario(scenario) &&
        (!latest.has(scenario.id) ||
          compareVersions(scenario.version, latest.get(scenario.id)!.version) >
            0)
      )
        latest.set(scenario.id, scenario);
    }
    return [...latest.values()].map((scenario) => ({
      id: scenario.id,
      version: scenario.version,
      title: scenario.title,
      summary: scenario.summary,
      language: scenario.language,
      publicationStatus: scenario.publicationStatus,
      contentReview: scenario.contentReview,
    }));
  }

  publicGet(id: string, version?: string): Scenario {
    const records = this.store
      .list()
      .filter(
        (record) =>
          record.scenario.id === id &&
          publicScenario(record.scenario) &&
          (!version || record.scenario.version === version),
      );
    records.sort((a, b) =>
      compareVersions(b.scenario.version, a.scenario.version),
    );
    if (!records.length) throw new NotFoundException('Сценарій не знайдено.');
    return records[0].scenario;
  }

  list() {
    return this.store.list();
  }
  get(id: string, version: string) {
    return find(this.store.list(), id, version);
  }
  validate(input: unknown): ValidationResult {
    return typeof input === 'string'
      ? validateScenarioJson(input)
      : validateScenario(input);
  }

  create(input: unknown): Promise<ScenarioRecord> {
    const scenario = authorDraft(input);
    return this.store.change((records) => {
      if (
        records.some(
          (record) =>
            record.scenario.id === scenario.id &&
            compareVersions(scenario.version, record.scenario.version) <= 0,
        )
      )
        throw new ConflictException(
          'Потрібна нова, більша версія цього сценарію.',
        );
      const now = new Date().toISOString();
      const record = { scenario, revision: 1, createdAt: now, updatedAt: now };
      records.push(record);
      return record;
    });
  }

  update(id: string, version: string, input: unknown): Promise<ScenarioRecord> {
    const body = object(input);
    const expected = revision(body.expectedRevision);
    const scenario = authorDraft(body.scenario);
    if (scenario.id !== id || scenario.version !== version)
      invalid(
        'IDENTITY_MISMATCH',
        ['id'],
        'ID та версія мають відповідати адресі.',
      );
    return this.store.change((records) => {
      const record = find(records, id, version);
      checkRevision(record, expected);
      if (
        record.scenario.publicationStatus !== 'draft' ||
        ['expert_approved', 'changes_requested'].includes(
          record.scenario.contentReview.status,
        )
      )
        throw new ConflictException(
          'Цю версію зафіксовано. Створіть наступну чернетку.',
        );
      return touch(record, scenario);
    });
  }

  fork(id: string, version: string, input: unknown): Promise<ScenarioRecord> {
    const body = object(input);
    const expected = revision(body.expectedRevision);
    if (typeof body.version !== 'string')
      throw new BadRequestException('Потрібна нова версія.');
    return this.store.change((records) => {
      const record = find(records, id, version);
      checkRevision(record, expected);
      const source = record.scenario;
      const scenario = checked({
        ...source,
        version: body.version,
        publicationStatus: 'draft',
        contentReview: {
          status: 'draft',
          demoOnly: true,
          aiAssisted: source.contentReview.aiAssisted,
        },
        sources: source.sources.map((item) => ({
          ...item,
          verificationStatus: 'unverified',
          verifiedAt: null,
        })),
        nodes: source.nodes.map((node) =>
          node.type === 'decision'
            ? {
                ...node,
                choices: node.choices.map((choice) => ({
                  ...choice,
                  ...(choice.legalStatus === 'allowed' ||
                  choice.legalStatus === 'restricted'
                    ? { legalStatus: 'uncertain' }
                    : {}),
                })),
              }
            : node,
        ),
      });
      if (
        records.some(
          (item) =>
            item.scenario.id === id &&
            compareVersions(scenario.version, item.scenario.version) <= 0,
        )
      )
        throw new ConflictException('Потрібна нова, більша версія.');
      const now = new Date().toISOString();
      const next = { scenario, revision: 1, createdAt: now, updatedAt: now };
      records.push(next);
      return next;
    });
  }

  demo(id: string, version: string, input: unknown): Promise<ScenarioRecord> {
    const body = object(input);
    const expected = revision(body.expectedRevision);
    if (body.confirmDemoOnly !== true)
      throw new BadRequestException(
        'Потрібне явне підтвердження demo-only показу.',
      );
    return this.store.change((records) => {
      const record = find(records, id, version);
      checkRevision(record, expected);
      if (
        record.scenario.publicationStatus !== 'draft' ||
        !record.scenario.contentReview.demoOnly ||
        !['draft', 'in_review'].includes(record.scenario.contentReview.status)
      )
        throw new ConflictException(
          'Лише неперевірена demo-only чернетка може стати демо.',
        );
      return touch(
        record,
        checked({ ...record.scenario, publicationStatus: 'demo' }),
      );
    });
  }

  review(id: string, version: string, input: unknown): Promise<ScenarioRecord> {
    const body = object(input);
    const expected = revision(body.expectedRevision);
    if (body.humanAttestation !== true)
      throw new ForbiddenException(
        'Потрібне підтвердження фактичного людського review.',
      );
    const parsed = ContentReviewSchema.safeParse({
      status: body.decision,
      demoOnly: body.demoOnly,
      aiAssisted: body.aiAssisted,
      reviewedAt: body.reviewedAt,
      reviewerRole: body.reviewerRole,
      evidenceRef: body.evidenceRef,
    });
    if (
      !parsed.success ||
      !['expert_approved', 'changes_requested'].includes(parsed.data.status)
    )
      invalid(
        'REVIEW_INCOMPLETE',
        ['contentReview'],
        'Потрібні рішення, дата, роль та фактичний evidenceRef.',
      );
    return this.store.change((records) => {
      const record = find(records, id, version);
      checkRevision(record, expected);
      if (
        record.scenario.publicationStatus !== 'draft' ||
        record.scenario.contentReview.status !== 'in_review'
      )
        throw new ConflictException(
          'Спочатку потрібна актуальна приватна версія in_review.',
        );
      if (parsed.data.aiAssisted !== record.scenario.contentReview.aiAssisted)
        invalid(
          'PROVENANCE_MISMATCH',
          ['contentReview', 'aiAssisted'],
          'Review не змінює AI provenance.',
        );
      return touch(
        record,
        checked({
          ...record.scenario,
          contentReview: parsed.data,
          sources: body.sources ?? record.scenario.sources,
          nodes: reviewedNodes(record.scenario, body.legalAssessments),
        }),
      );
    });
  }

  publish(
    id: string,
    version: string,
    input: unknown,
  ): Promise<ScenarioRecord> {
    const body = object(input);
    const expected = revision(body.expectedRevision);
    if (body.confirmPublication !== true)
      throw new BadRequestException('Потрібне явне підтвердження публікації.');
    return this.store.change((records) => {
      const record = find(records, id, version);
      checkRevision(record, expected);
      if (
        record.scenario.publicationStatus !== 'draft' ||
        record.scenario.contentReview.status !== 'expert_approved'
      )
        throw new ConflictException(
          'Потрібна зафіксована експертна перевірка.',
        );
      return touch(
        record,
        checked({ ...record.scenario, publicationStatus: 'published' }),
      );
    });
  }
}
