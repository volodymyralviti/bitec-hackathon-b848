import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let http: HttpTestingController;
  const healthy = { status: 'ok', service: 'ethical-dilemmas-api' };

  const statusText = () => (fixture.nativeElement as HTMLElement)
    .querySelector('[role="status"]')?.textContent?.trim();
  const button = () => (fixture.nativeElement as HTMLElement).querySelector('button')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [...appConfig.providers, provideHttpClientTesting()]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows loading while one request is pending and disables rechecking', () => {
    expect(statusText()).toBe('Перевіряємо з’єднання із сервером…');
    expect(button().disabled).toBeTrue();
    http.expectOne('/api/health').flush(healthy);
  });

  it('shows success after receiving the health response', () => {
    http.expectOne('/api/health').flush(healthy);
    fixture.detectChanges();
    expect(statusText()).toBe('Сервер доступний');
    expect(button().disabled).toBeFalse();
  });

  it('shows a readable error for a failed HTTP response', () => {
    http.expectOne('/api/health').flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();
    expect(statusText()).toBe('Не вдалося з’єднатися із сервером');
  });

  it('shows a readable error when the API cannot be reached', () => {
    http.expectOne('/api/health').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(statusText()).toBe('Не вдалося з’єднатися із сервером');
  });

  it('can recheck after success and report that the API has become unavailable', () => {
    http.expectOne('/api/health').flush(healthy);
    fixture.detectChanges();
    button().click();
    fixture.detectChanges();
    expect(statusText()).toBe('Перевіряємо з’єднання із сервером…');
    http.expectOne('/api/health').flush(null, { status: 502, statusText: 'Bad Gateway' });
    fixture.detectChanges();
    expect(statusText()).toBe('Не вдалося з’єднатися із сервером');
  });

  it('cancels a pending request when the component is destroyed', () => {
    const request = http.expectOne('/api/health');
    fixture.destroy();
    expect(request.cancelled).toBeTrue();
  });
});
