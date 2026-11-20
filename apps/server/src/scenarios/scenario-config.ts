import { resolve } from 'node:path';

export const SCENARIO_CONFIG = Symbol('SCENARIO_CONFIG');
export interface ScenarioConfig {
  dataFile: string;
  contentDirectory: string;
  authorKey: string;
  reviewerKey: string;
}
export function scenarioConfig(): ScenarioConfig {
  if (process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is configured but no PostgreSQL adapter exists; refusing a silent filesystem fallback.',
    );
  }
  const authorKey = process.env.AUTHOR_KEY ?? '';
  const reviewerKey = process.env.REVIEWER_KEY ?? '';
  if (reviewerKey && (!authorKey || reviewerKey === authorKey)) {
    throw new Error('Author and reviewer capabilities must be separate.');
  }
  for (const key of [authorKey, reviewerKey]) {
    if (key && key.length < 32)
      throw new Error(
        'Configured capabilities must contain at least 32 characters.',
      );
  }
  return {
    dataFile: resolve(
      process.env.SCENARIO_DATA_FILE ??
        resolve(__dirname, '../../.data/scenarios.json'),
    ),
    contentDirectory: resolve(
      process.env.SCENARIO_CONTENT_DIR ??
        resolve(__dirname, '../../../../content/scenarios'),
    ),
    authorKey,
    reviewerKey,
  };
}
