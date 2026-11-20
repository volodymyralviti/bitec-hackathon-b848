import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, of, switchMap, throwError } from 'rxjs';
import type { Scenario } from '@eds/scenario-schema';
import { ScenarioLoadError, ScenarioRepository } from './scenario-repository';

@Injectable({ providedIn: 'root' })
export class ApiScenarioRepository extends ScenarioRepository {
  private readonly http = inject(HttpClient);
  override list(): Observable<Scenario[]> {
    return this.http.get<unknown>('/api/scenarios').pipe(switchMap(input => {
      if (!Array.isArray(input) || input.length > 1000) throw new ScenarioLoadError('invalid-content', 'Некоректний каталог API.');
      const items = input as { id?: unknown; version?: unknown }[];
      if (items.some(item => !item || typeof item.id !== 'string' || typeof item.version !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(item.id))) throw new ScenarioLoadError('invalid-content', 'Некоректний каталог API.');
      return items.length ? forkJoin(items.map(item => this.read(String(item.id), String(item.version)))) : of([]);
    }));
  }
  override getById(id: string): Observable<Scenario> { return this.read(id); }
  private read(id: string, version?: string): Observable<Scenario> {
    return this.http.get<unknown>(`/api/scenarios/${encodeURIComponent(id)}`, { params: version ? { version } : {} }).pipe(
      switchMap(input => from(import('@eds/scenario-schema')).pipe(map(api => {
        const result = api.validateScenario(input);
        if (!result.success || result.data.id !== id || (version !== undefined && result.data.version !== version) || !['demo', 'published'].includes(result.data.publicationStatus) || (result.data.publicationStatus === 'demo' && !result.data.contentReview.demoOnly)) throw new ScenarioLoadError('invalid-content', 'API повернув недоступний або невалідний сценарій.');
        return result.data;
      }))),
      catchError(error => error instanceof HttpErrorResponse && error.status === 404
        ? throwError(() => new ScenarioLoadError('not-found', 'Сценарій не знайдено.')) : throwError(() => error))
    );
  }
}
