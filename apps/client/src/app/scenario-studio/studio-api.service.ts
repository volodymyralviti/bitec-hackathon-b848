import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Scenario } from '@eds/scenario-schema';

export interface StudioRecord { scenario: Scenario; revision: number; createdAt: string; updatedAt: string }
export interface StudioIssue { path: (string | number)[]; code: string; message: string; severity?: 'ERROR' | 'WARNING' | 'INFO' }

@Injectable({ providedIn: 'root' })
export class StudioApi {
  private readonly http = inject(HttpClient);
  readonly key = signal(''); // user-supplied runtime capability; never localStorage or build-time config
  readonly authorized = signal(false);
  private headers() { return { Authorization: `Bearer ${this.key()}` }; }
  list() { return this.http.get<StudioRecord[]>('/api/author/scenarios', { headers: this.headers() }); }
  create(scenario: Scenario) { return this.http.post<StudioRecord>('/api/author/scenarios', scenario, { headers: this.headers() }); }
  update(record: StudioRecord, scenario: Scenario) { return this.http.put<StudioRecord>(this.url(record), { expectedRevision: record.revision, scenario }, { headers: this.headers() }); }
  validate(scenario: unknown) { return this.http.post<{ success: boolean; errors: StudioIssue[]; warnings: StudioIssue[] }>('/api/author/scenarios/validate', scenario, { headers: this.headers() }); }
  fork(record: StudioRecord, version: string) { return this.http.post<StudioRecord>(this.url(record) + '/fork', { expectedRevision: record.revision, version }, { headers: this.headers() }); }
  demo(record: StudioRecord) { return this.http.post<StudioRecord>(this.url(record) + '/demo', { expectedRevision: record.revision, confirmDemoOnly: true }, { headers: this.headers() }); }
  private url(record: StudioRecord) { return `/api/author/scenarios/${encodeURIComponent(record.scenario.id)}/${encodeURIComponent(record.scenario.version)}`; }
}
