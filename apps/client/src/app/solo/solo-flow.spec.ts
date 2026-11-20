import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { routes } from '../app.routes';
import { ScenarioLoadError, ScenarioRepository } from '../core/scenarios/scenario-repository';
import { scenarioFixture } from '../testing/scenarios.fixture';
import { SoloSession } from './solo-session.service';

describe('Solo routes with real scenario JSON and engine', () => {
  let getById: jasmine.Spy;
  beforeEach(async () => {
    getById = jasmine.createSpy('getById').and.callFake((id: string) => {
      if (id === 'urgent-supply' || id === 'truth-under-pressure') return of(scenarioFixture(id));
      return throwError(() => new ScenarioLoadError('not-found', 'Missing'));
    });
    await TestBed.configureTestingModule({ providers: [provideRouter(routes), {
      provide: ScenarioRepository, useValue: { getById, list: () => of([scenarioFixture(), scenarioFixture('truth-under-pressure')]) }
    }] }).compileComponents();
  });

  for (const id of ['urgent-supply', 'truth-under-pressure'] as const) {
    it(`${id}: confirms each decision once, reveals arrived events, ending and debrief`, async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(`/scenarios/${id}/play`);
      const click = (selector: string) => {
        const button = harness.routeNativeElement!.querySelector<HTMLButtonElement>(selector)!;
        expect(button).not.toBeNull(); button.click(); harness.detectChanges();
      };
      expect(harness.routeNativeElement!.textContent).toContain('Без експертного схвалення');
      click('[data-action="advance"]');
      expect(harness.routeNativeElement!.querySelector('[data-action="confirm"]')).toBeNull();
      for (let step = 1; step <= 3; step++) {
        click('[data-choice-id]');
        const confirm = harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-action="confirm"]')!;
        confirm.click(); confirm.click(); harness.detectChanges();
        expect(TestBed.inject(SoloSession).state()?.decisionCount).toBe(step);
        expect(harness.routeNativeElement!.textContent).toContain('Негайний наслідок');
        if (step < 3) expect(harness.routeNativeElement!.textContent).not.toContain(id === 'urgent-supply' ? 'Після ще двох рішень' : 'Після ще двох рішень надходить');
        const next = [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes(step === 3 ? 'Переглянути завершення' : 'Продовжити історію'))!;
        next.click(); harness.detectChanges();
      }
      expect(harness.routeNativeElement!.querySelectorAll('[data-choice-id]').length).toBe(0);
      await harness.navigateByUrl(`/scenarios/${id}/debrief`);
      const root = harness.routeNativeElement!;
      expect(root.querySelectorAll('.decision-history li').length).toBe(3);
      expect(root.textContent).toContain('Відкладений наслідок настав');
      expect(root.textContent).toContain('Фінальні виміри наслідків');
      expect(root.textContent).toContain('Не перевірено');
      expect(root.textContent).toContain('Межі інтерпретації');
      root.querySelector<HTMLButtonElement>('[data-action="restart"]')!.click();
      await harness.fixture.whenStable(); harness.detectChanges();
      expect(TestBed.inject(SoloSession).state()?.decisionCount).toBe(0);
      expect(harness.routeNativeElement!.textContent).toContain('До наступного етапу');
    });
  }

  it('shows selected choice sources and debrief route sources without exposing the other branch', async () => {
    const scenario = scenarioFixture();
    scenario.sources.push(...['selected-only', 'other-branch'].map(sourceId => ({ ...scenario.sources[0], sourceId, title: sourceId })));
    const first = scenario.nodes.find(node => node.type === 'decision')!;
    if (first.type !== 'decision') throw new Error('Fixture decision missing');
    first.choices[0].sourceIds.push('selected-only');
    first.choices[0].legalQuestions = 'Питання лише фактичного вибору';
    first.choices[1].sourceIds.push('other-branch');
    getById.and.returnValue(of(scenario));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/scenarios/urgent-supply/play');
    const click = (selector: string) => { harness.routeNativeElement!.querySelector<HTMLButtonElement>(selector)!.click(); harness.detectChanges(); };
    click('[data-action="advance"]');
    expect(harness.routeNativeElement!.querySelector('[data-source-id="selected-only"]')).toBeNull();
    for (let step = 0; step < 3; step++) {
      click('[data-choice-id]');
      if (step === 0) {
        expect(harness.routeNativeElement!.querySelector('[data-source-id="selected-only"]')).not.toBeNull();
        expect(harness.routeNativeElement!.querySelector('[data-source-id="other-branch"]')).toBeNull();
      }
      click('[data-action="confirm"]'); click('[data-action="feedback-next"]');
    }
    await harness.navigateByUrl('/scenarios/urgent-supply/debrief');
    expect(harness.routeNativeElement!.querySelector('[data-source-id="selected-only"]')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('[data-source-id="other-branch"]')).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('Питання лише фактичного вибору');
  });

  it('handles direct /play, /debrief and id debrief without inventing a run', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/play');
    expect(harness.routeNativeElement!.textContent).toContain('Оберіть навчальну ситуацію');
    await harness.navigateByUrl('/debrief');
    expect(harness.routeNativeElement!.textContent).toContain('Немає завершеного проходження');
    await harness.navigateByUrl('/scenarios/urgent-supply/debrief');
    expect(harness.routeNativeElement!.textContent).toContain('Немає завершеного проходження');
    expect(TestBed.inject(SoloSession).state()).toBeNull();
    await harness.navigateByUrl('/scenarios/urgent-supply/play');
    expect(TestBed.inject(SoloSession).node()?.type).toBe('narrative');
  });

  it('shows not-found and loading failures without losing another active run', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/scenarios/urgent-supply/play');
    const snapshot = TestBed.inject(SoloSession).state();
    await harness.navigateByUrl('/scenarios/missing/play');
    expect(harness.routeNativeElement!.textContent).toContain('Сценарій не знайдено');
    expect(TestBed.inject(SoloSession).state()).toBe(snapshot);
    getById.and.returnValue(throwError(() => new Error('Invalid JSON or API error')));
    await harness.navigateByUrl('/scenarios/truth-under-pressure/play');
    expect(harness.routeNativeElement!.textContent).toContain('Не вдалося завантажити сценарій');
  });

  it('shows an unrealized test-only event separately without changing final metrics', async () => {
    const scenario = scenarioFixture();
    const first = scenario.nodes.find(node => node.id === 'scope');
    if (first?.type !== 'decision') throw new Error('Missing fixture node');
    first.choices[0].schedule!.push({
      id: 'test-only-alternate-ending', trigger: { type: 'on_enter_node', nodeId: 'planned-pause' },
      consequenceText: 'Тестова подія лише іншого завершення.',
      effects: [{ metric: 'trust', delta: 9, explanation: 'Лише тестова альтернатива.' }]
    });
    const session = TestBed.inject(SoloSession);
    session.start(scenario); session.advance();
    for (let step = 0; step < 3; step++) { session.select(session.options()[0].id); session.confirm(); session.continue(); }
    getById.and.returnValue(of(scenario));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/scenarios/urgent-supply/debrief');
    const root = harness.routeNativeElement!;
    expect(root.textContent).toContain('Не настало: Тестова подія лише іншого завершення.');
    expect(root.querySelector('[data-event-id="test-only-alternate-ending"]')).toBeNull();
    expect(session.debrief()?.finalMetrics.trust).toBe(0);
    expect(session.debrief()?.unrealizedEffects.length).toBe(1);
  });
});
