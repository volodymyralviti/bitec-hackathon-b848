import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, from, map, of, switchMap, throwError } from 'rxjs';
import type { Scenario } from '@eds/scenario-schema';

// The API adapter in Stage 06 can replace this token without changing feature views.
export abstract class ScenarioRepository {
  abstract list(): Observable<Scenario[]>;
  abstract getById(id: string): Observable<Scenario>;
}

export class ScenarioLoadError extends Error {
  constructor(readonly kind: 'not-found' | 'invalid-content', message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class StaticScenarioRepository extends ScenarioRepository {
  private readonly http = inject(HttpClient);

  override list(): Observable<Scenario[]> {
    return this.http.get<unknown>('/scenarios/index.json').pipe(
      map(manifest => {
        if (!Array.isArray(manifest) || manifest.length > 128 ||
            manifest.some(file => typeof file !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.json$/.test(file) || file === 'index.json') ||
            new Set(manifest).size !== manifest.length) {
          throw new ScenarioLoadError('invalid-content', 'Некоректний перелік сценаріїв.');
        }
        return manifest as string[];
      }),
      switchMap(files => files.length ? forkJoin(files.map(file => this.readFile(file))) : of([])),
      map(scenarios => {
        if (new Set(scenarios.map(scenario => scenario.id)).size !== scenarios.length) {
          throw new ScenarioLoadError('invalid-content', 'Ідентифікатори сценаріїв повторюються.');
        }
        return scenarios;
      })
    );
  }

  override getById(id: string): Observable<Scenario> {
    // Resolve through the explicit manifest. A URL never gives access to an unlisted draft.
    return this.list().pipe(switchMap(scenarios => {
      const scenario = scenarios.find(item => item.id === id);
      return scenario ? of(scenario) : throwError(() => new ScenarioLoadError('not-found', 'Сценарій не знайдено.'));
    }));
  }

  private readFile(file: string): Observable<Scenario> {
    return this.http.get<unknown>(`/scenarios/${file}`).pipe(
      switchMap(input => from(import('@eds/scenario-schema')).pipe(map(({ validateScenario }) => {
        const result = validateScenario(input);
        if (!result.success || (!result.data.contentReview.demoOnly && result.data.publicationStatus !== 'published')) {
          throw new ScenarioLoadError('invalid-content', 'Сценарій не пройшов перевірку або недоступний для навчального перегляду.');
        }
        // Keep provenance intact. Validation is not source verification.
        return result.data;
      })))
    );
  }
}
