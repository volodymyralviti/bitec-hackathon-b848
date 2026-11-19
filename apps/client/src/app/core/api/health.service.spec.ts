import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(HealthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the relative health URL and returns the typed response', async () => {
    const response = { status: 'ok', service: 'ethical-dilemmas-api' } as const;
    const result = firstValueFrom(service.getHealth());
    http.expectOne({ method: 'GET', url: '/api/health' }).flush(response);
    expect(await result).toEqual(response);
  });

  it('propagates an unsuccessful HTTP response', async () => {
    const result = firstValueFrom(service.getHealth());
    const assertion = expectAsync(result).toBeRejectedWith(jasmine.objectContaining({ status: 503 }));
    http.expectOne('/api/health').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await assertion;
  });

  it('propagates a network failure', async () => {
    const result = firstValueFrom(service.getHealth());
    const assertion = expectAsync(result).toBeRejectedWith(jasmine.objectContaining({ status: 0 }));
    http.expectOne('/api/health').error(new ProgressEvent('error'));
    await assertion;
  });
});
