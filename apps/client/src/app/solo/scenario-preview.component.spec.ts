import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ScenarioPreviewComponent } from './scenario-preview.component';
import { ScenarioLoadError, ScenarioRepository } from '../core/scenarios/scenario-repository';
import { scenarioFixture } from '../testing/scenarios.fixture';

describe('Read-only scenario content preview', () => {
  let getById: jasmine.Spy;
  beforeEach(async () => {
    getById = jasmine.createSpy('getById').and.returnValue(of(scenarioFixture()));
    await TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: 'scenarios/:id/preview', component: ScenarioPreviewComponent }]),
      { provide: ScenarioRepository, useValue: { getById } }
    ] }).compileComponents();
  });

  it('shows context and unverified source revisions without revealing later choices/events', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/scenarios/urgent-supply/preview');
    const root = harness.routeNativeElement!;
    expect(root.textContent).toContain('сектору безпеки й оборони');
    expect(root.textContent).toContain('Не перевірено');
    expect(root.textContent).toContain('Редакція');
    expect(root.textContent).toContain('Готові дослідити ситуацію?');
    expect(root.textContent).not.toContain('Спершу погодити мінімальну потребу');
    expect(root.textContent).not.toContain('Після ще двох рішень');
  });

  it('handles a missing scenario and can navigate to another scenario afterward', async () => {
    getById.and.returnValue(throwError(() => new ScenarioLoadError('not-found', 'Missing')));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/scenarios/missing/preview');
    expect(harness.routeNativeElement!.textContent).toContain('Сценарій не знайдено');
    getById.and.returnValue(of(scenarioFixture('truth-under-pressure')));
    await harness.navigateByUrl('/scenarios/truth-under-pressure/preview');
    expect(harness.routeNativeElement!.textContent).toContain('Професійна правда під тиском');
  });

  it('handles a failed scenario request without an uncaught error', async () => {
    getById.and.returnValue(throwError(() => new Error('API failed')));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/scenarios/urgent-supply/preview');
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')?.textContent).toContain('Не вдалося завантажити');
  });

  it('does not reveal an ending on the read-only preview', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/scenarios/urgent-supply/preview');
    expect(harness.routeNativeElement!.textContent).toContain('Відкрити проходження');
    expect(harness.routeNativeElement!.textContent).not.toContain('Часткове відновлення з видимими межами');
  });
});
