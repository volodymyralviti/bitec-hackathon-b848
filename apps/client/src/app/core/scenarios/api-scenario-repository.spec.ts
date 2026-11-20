import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ApiScenarioRepository } from './api-scenario-repository';
import { scenarioFixture } from '../../testing/scenarios.fixture';

describe('API ScenarioRepository', () => {
  let http: HttpTestingController;
  let repository: ApiScenarioRepository;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); http = TestBed.inject(HttpTestingController); repository = TestBed.inject(ApiScenarioRepository); });
  afterEach(() => http.verify());
  it('pins catalog reads to the returned public version and preserves review flags', async () => {
    const scenario = scenarioFixture(); scenario.publicationStatus = 'demo';
    const promise = firstValueFrom(repository.list());
    http.expectOne('/api/scenarios').flush([{ id: scenario.id, version: scenario.version }]);
    const request = http.expectOne('/api/scenarios/urgent-supply?version=1.0.0');
    expect(request.request.headers.has('Authorization')).toBeFalse(); request.flush(scenario);
    expect((await promise)[0].contentReview).toEqual(scenario.contentReview);
  });
  it('rejects raw drafts even if mistakenly returned by a public API', async () => {
    const promise = firstValueFrom(repository.getById('urgent-supply'));
    http.expectOne('/api/scenarios/urgent-supply').flush(scenarioFixture());
    await expectAsync(promise).toBeRejected();
  });
  it('maps 404 to the feature missing-scenario state', async () => {
    const promise = firstValueFrom(repository.getById('missing')).catch(error => error.kind as string);
    http.expectOne('/api/scenarios/missing').flush({}, { status: 404, statusText: 'Not Found' });
    expect(await promise).toBe('not-found');
  });
  it('rejects an API response with a different scenario identity', async () => {
    const scenario = scenarioFixture('truth-under-pressure'); scenario.publicationStatus = 'demo';
    const promise = firstValueFrom(repository.getById('urgent-supply'));
    http.expectOne('/api/scenarios/urgent-supply').flush(scenario);
    await expectAsync(promise).toBeRejected();
  });
});
