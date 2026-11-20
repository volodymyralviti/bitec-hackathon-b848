import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormArray } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Scenario } from '@eds/scenario-schema';
import blank from '../../assets/studio-blank.json';
import { routes } from '../app.routes';
import { StudioComponent } from './studio.component';
import { StudioWorkspace } from './studio-workspace.service';
import { StudioApi } from './studio-api.service';
import { DEMO_STUDIO, validateDemoScenario } from './studio-mode';
import { buildControl, freshItem } from './form-model';

describe('Public Demo Studio', () => {
  let fixture: ComponentFixture<StudioComponent>;
  let http: HttpTestingController;
  let component: StudioComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StudioComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes), { provide: DEMO_STUDIO, useValue: true }] }).compileComponents();
    // Even an already authenticated author must not cause private requests in demo.
    TestBed.inject(StudioApi).authorized.set(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudioComponent); component = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(() => http.verify());
  function draft() { component.newDraft(); http.expectOne('/assets/studio-blank.json').flush(blank); fixture.detectChanges(); }

  it('requires no key and never calls privileged API even through hidden actions', () => {
    expect(fixture.nativeElement.querySelector('[data-action="author-key"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Демонстраційна майстерня');
    draft(); component.login(); component.refresh(); component.validateOnServer(); component.save(); component.fork(); component.makeDemo(); component.logout();
    http.expectNone(request => request.url.startsWith('/api/'));
    expect(fixture.nativeElement.querySelector('[data-action="save-draft"]')).toBeNull();
    expect(component.api.authorized()).toBeTrue();
  });

  it('reuses full forms, source links, immediate/delayed events and lossless JSON metadata', () => {
    draft(); const form = component.workspace.form()!;
    const sources = form.get('sources') as FormArray;
    sources.push(buildControl(freshItem('sources')));
    const source = sources.at(1);
    for (const [key, value] of Object.entries({ sourceId: 'demo-source', sourceType: 'normative', documentType: 'other', pinpoint: 'Синтетичний пункт 1', revision: 'Тестова редакція', versionAsOf: '2025-01-01', relevance: 'Перевірка пояснення, не правова норма.', applicabilityQuestions: 'Застосовність не підтверджена.' })) source.get(key)!.setValue(value);
    (form.get('nodes.1.choices.0.sourceIds') as FormArray).push(buildControl('demo-source'));
    const result = component.validate(); expect(result.success).toBeTrue();
    const snapshot = component.value();
    component.importControl.setValue(JSON.stringify(snapshot)); component.importJson();
    expect(component.value()).toEqual(snapshot);
    expect(component.workspace.record()).toBeNull();
    expect(component.validate().success).toBeTrue();
  });

  it('keeps drafts editable after broken references, malformed, oversized or invalid imports', () => {
    draft(); const form = component.workspace.form()!;
    form.get('startNodeId')!.setValue('missing'); expect(component.validate().success).toBeFalse();
    form.get('startNodeId')!.setValue('intro'); expect(component.validate().success).toBeTrue();
    for (const text of ['{', JSON.stringify({ ...blank, extra: true }), 'x'.repeat(1_000_001), JSON.stringify({ ...blank, nodes: Array.from({ length: 2000 }, () => ({})) })]) {
      component.importControl.setValue(text); component.importJson(); expect(component.workspace.form()).toBe(form);
    }
    component.importControl.setValue(JSON.stringify(blank)); component.importJson(); expect(component.validate().success).toBeTrue();
  });

  it('reads actual numeric input events as numbers for deltas and delayed counters', () => {
    draft();
    for (const [path, value] of [['nodes.1.choices.0.immediateEffects.0.delta', '2'], ['nodes.1.choices.0.schedule.0.trigger.count', '1']]) {
      const input = fixture.nativeElement.querySelector(`[data-field-path="${path}"]`) as HTMLInputElement;
      input.value = value; input.dispatchEvent(new Event('input')); fixture.detectChanges();
      expect(component.workspace.form()!.get(path)!.value).toBe(Number(value));
    }
    expect(component.validate().success).toBeTrue();
  });

  it('rejects forged review, source checks and legal assessments without rewriting imported claims', () => {
    draft(); const previous = component.workspace.form();
    for (const edit of [
      (value: typeof blank) => { value.contentReview.status = 'expert_approved'; },
      (value: typeof blank) => { value.contentReview.demoOnly = false; },
      (value: typeof blank) => { value.sources[0].verificationStatus = 'team_checked'; },
    ]) {
      const input = structuredClone(blank); edit(input);
      component.importControl.setValue(JSON.stringify(input)); component.importJson();
      expect(component.errors().length).toBeGreaterThan(0); expect(component.workspace.form()).toBe(previous);
    }
    component.importControl.setValue(JSON.stringify({ ...blank, legalAssessments: [{ legalStatus: 'allowed' }] })); component.importJson();
    expect(component.workspace.form()).toBe(previous);
    expect(validateDemoScenario({ ...blank, publicationStatus: 'published' }, true).success).toBeFalse();
  });

  it('confirms reset and unsaved exit; permits SPA preview navigation', () => {
    draft(); component.workspace.form()!.markAsDirty();
    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    expect(component.canLeave('/scenarios')).toBeFalse();
    expect(component.canLeave('/studio/demo/preview/new-scenario/play')).toBeTrue();
    component.resetDemo(); expect(component.workspace.form()).not.toBeNull();
    confirm.and.returnValue(true); component.resetDemo(); expect(component.workspace.form()).toBeNull();
    expect(component.workspace.preview()).toBeNull();
  });
});

describe('Demo routes and isolated engine preview', () => {
  it('preserves the draft across preview/debrief/back while isolating the author workspace and escaping HTML', async () => {
    await TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)] }).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const author = TestBed.inject(StudioWorkspace); author.load(structuredClone(blank) as Scenario);
    const harness = await RouterTestingHarness.create();
    const demo = await harness.navigateByUrl('/studio/demo', StudioComponent);
    expect(demo.workspace).not.toBe(author);
    demo.newDraft(); http.expectOne('/assets/studio-blank.json').flush(blank);
    demo.workspace.form()!.get('nodes.0.narrative')!.setValue('<img src=x onerror="alert(1)">');
    const draft = demo.workspace.form();
    demo.preview(); await harness.fixture.whenStable(); harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('img')).toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('<img src=x');
    const click = (selector: string) => { harness.routeNativeElement!.querySelector<HTMLButtonElement>(selector)!.click(); harness.detectChanges(); };
    click('[data-action="advance"]');
    for (let step = 0; step < 3; step++) { click('[data-choice-id]'); click('[data-action="confirm"]'); click('[data-action="feedback-next"]'); }
    await harness.navigateByUrl('/studio/demo/preview/new-scenario/debrief');
    expect(harness.routeNativeElement!.querySelectorAll('.decision-history li').length).toBe(3);
    const back = await harness.navigateByUrl('/studio/demo', StudioComponent); expect(back.workspace.form()).toBe(draft);
    expect(author.form()).not.toBe(draft); http.expectNone(request => request.url.startsWith('/api/')); http.verify();
  });
  it('handles a direct preview without memory as missing, without fetching private data', async () => {
    await TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)] }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/studio/demo/preview/missing/play');
    expect(harness.routeNativeElement!.textContent).toContain('Сценарій не знайдено');
    TestBed.inject(HttpTestingController).expectNone(request => request.url.startsWith('/api/'));
    TestBed.inject(HttpTestingController).verify();
  });
});
