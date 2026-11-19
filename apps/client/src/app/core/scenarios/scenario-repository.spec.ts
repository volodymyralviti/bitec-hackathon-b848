import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StaticScenarioRepository, ScenarioLoadError } from './scenario-repository';
import { scenarioFixture } from '../../testing/scenarios.fixture';
import { firstValueFrom } from 'rxjs';

describe('StaticScenarioRepository', () => {
  let repository: StaticScenarioRepository;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    repository = TestBed.inject(StaticScenarioRepository);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads both complete CIDS files through the manifest and validates them', async () => {
    const result = firstValueFrom(repository.list());
    http.expectOne('/scenarios/index.json').flush(['urgent-supply.json', 'truth-under-pressure.json']);
    http.expectOne('/scenarios/urgent-supply.json').flush(scenarioFixture());
    http.expectOne('/scenarios/truth-under-pressure.json').flush(scenarioFixture('truth-under-pressure'));
    expect((await result).map(scenario => scenario.id)).toEqual(['urgent-supply', 'truth-under-pressure']);
  });

  it('handles an empty catalog', () => {
    let count = -1;
    repository.list().subscribe(scenarios => count = scenarios.length);
    http.expectOne('/scenarios/index.json').flush([]);
    expect(count).toBe(0);
  });

  it('rejects unsafe paths without issuing a second request', () => {
    let error: unknown;
    repository.list().subscribe({ error: value => error = value });
    http.expectOne('/scenarios/index.json').flush(['../private.json']);
    expect(error instanceof ScenarioLoadError).toBeTrue();
    http.expectNone('/private.json');
  });

  it('reports a missing scenario using only the explicit catalog', async () => {
    const result = firstValueFrom(repository.getById('missing')).catch((error: ScenarioLoadError) => error.kind);
    http.expectOne('/scenarios/index.json').flush(['urgent-supply.json']);
    http.expectOne('/scenarios/urgent-supply.json').flush(scenarioFixture());
    expect(await result).toBe('not-found');
    http.expectNone('/scenarios/missing.json');
  });

  it('rejects invalid scenario JSON', async () => {
    const result = firstValueFrom(repository.list()).catch((error: ScenarioLoadError) => error.kind);
    http.expectOne('/scenarios/index.json').flush(['urgent-supply.json']);
    http.expectOne('/scenarios/urgent-supply.json').flush({ schemaVersion: 'wrong' });
    expect(await result).toBe('invalid-content');
  });

  it('rejects a private draft even if mistakenly listed in the manifest', async () => {
    const draft = scenarioFixture();
    draft.contentReview.demoOnly = false;
    const result = firstValueFrom(repository.list()).catch((error: ScenarioLoadError) => error.kind);
    http.expectOne('/scenarios/index.json').flush(['urgent-supply.json']);
    http.expectOne('/scenarios/urgent-supply.json').flush(draft);
    expect(await result).toBe('invalid-content');
  });

  it('propagates a transport/API error for the feature error view', () => {
    let failed = false;
    repository.list().subscribe({ error: () => failed = true });
    http.expectOne('/scenarios/index.json').flush(null, { status: 503, statusText: 'Unavailable' });
    expect(failed).toBeTrue();
  });
});
