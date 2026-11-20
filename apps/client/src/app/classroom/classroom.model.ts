import type { Scenario, SourceReference } from '@eds/scenario-schema';
import type { Metrics, TimelineEntry, ScenarioDebrief } from '@eds/scenario-engine';

export interface ClassroomView {
  pin: string; expiresAt: number; phase: 'created' | 'voting_open' | 'voting_closed' | 'advanced' | 'ended';
  round: number; revision: number; hostConnected: boolean; minimum: number; decisionCount: number;
  scenario: Pick<Scenario, 'id' | 'version' | 'title' | 'basedOn' | 'contentReview'> & { sources: SourceReference[] };
  node: { id: string; type: 'narrative' | 'decision' | 'ending'; title: string; narrative: string; context?: string; valuesInTension: string[]; choices: { id: string; label: string; explanation: string }[] };
  aggregate: null | { suppressed: true; minimum: number } | { suppressed: false; total: number; choices: { choiceId: string; count: number; percent: number }[] };
  metrics: Metrics; timeline: TimelineEntry[]; debrief: ScenarioDebrief | null;
}
export interface RoomCredential { pin: string; hostToken: string; expiresAt: number }
export interface ClassroomIssue { code: string; message: string }
export type Reply<T> = { ok: true; data: T } | { ok: false; error: ClassroomIssue };
