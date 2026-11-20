import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FormArray, FormGroup } from '@angular/forms';
import { validateScenario, type Scenario } from '@eds/scenario-schema';
import blank from '../../assets/studio-blank.json';
import { StudioComponent } from './studio.component';
import { StudioApi } from './studio-api.service';
import { StudioWorkspace } from './studio-workspace.service';
import { buildControl, serializeControl, freshItem } from './form-model';
import { scenarioFixture } from '../testing/scenarios.fixture';
import { routes } from '../app.routes';
import { SoloSession } from '../solo/solo-session.service';

describe('Studio form model', () => {
  it('roundtrips the actual JSON with optional/null metadata unchanged', () => {
    for (const scenario of [scenarioFixture(), scenarioFixture('truth-under-pressure'), blank]) expect(serializeControl(buildControl(scenario))).toEqual(scenario);
  });
  it('adds choices through forms and blocks missing target/short routes', () => {
    const form = buildControl(blank) as FormGroup;
    const choices = form.get('nodes.1.choices') as FormArray;
    choices.push(buildControl(freshItem('choices')));
    expect(validateScenario(serializeControl(form)).success).toBeFalse();
    choices.at(2).get('nextNodeId')!.setValue('decision-2');
    expect(validateScenario(serializeControl(form)).success).toBeTrue();
    choices.at(2).get('nextNodeId')!.setValue('ending-a');
    const result = validateScenario(serializeControl(form));
    expect(result.errors.some(error => error.code === 'TOO_SHORT_PATH')).toBeTrue();
  });
});

describe('Protected Studio UI', () => {
  let fixture: ComponentFixture<StudioComponent>;
  let http: HttpTestingController;
  let api: StudioApi;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StudioComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)] }).compileComponents();
    http = TestBed.inject(HttpTestingController); api = TestBed.inject(StudioApi);
    fixture = TestBed.createComponent(StudioComponent); fixture.detectChanges();
  });
  afterEach(() => http.verify());
  function login() {
    fixture.componentInstance.keyControl.setValue('test-only-author-runtime-capability');
    fixture.componentInstance.login();
    const request = http.expectOne('/api/author/scenarios');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-only-author-runtime-capability');
    request.flush([]); fixture.detectChanges();
  }
  function newDraft() {
    fixture.componentInstance.newDraft();
    http.expectOne('/assets/studio-blank.json').flush(blank); fixture.detectChanges();
  }
  it('does not request protected data before a runtime capability is entered', () => {
    expect(fixture.nativeElement.textContent).toContain('Захищений доступ автора');
    http.expectNone('/api/author/scenarios');
    expect(fixture.nativeElement.querySelector('[data-action="save-draft"]')).toBeNull();
  });
  it('handles rejected/disabled credentials without persisting the key', () => {
    fixture.componentInstance.keyControl.setValue('wrong'); fixture.componentInstance.login();
    http.expectOne('/api/author/scenarios').flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ключ недійсний');
    expect(api.key()).toBe(''); expect(api.authorized()).toBeFalse();
  });
  it('creates and saves a new three-decision draft via form controls without publishing', () => {
    login(); newDraft();
    const form = TestBed.inject(StudioWorkspace).form()!;
    form.get('id')!.setValue('authored-via-form'); form.get('title')!.setValue('Авторська тестова дилема');
    (fixture.nativeElement.querySelector('[data-action="save-draft"]') as HTMLButtonElement).click();
    const request = http.expectOne('/api/author/scenarios');
    const scenario = request.request.body as Scenario;
    expect(scenario.id).toBe('authored-via-form');
    expect(scenario.nodes.filter(node => node.type === 'decision').length).toBe(3);
    expect(scenario.publicationStatus).toBe('draft');
    expect(scenario.contentReview.status).toBe('draft');
    expect(validateScenario(scenario).success).toBeTrue();
    request.flush({ scenario, revision: 1, createdAt: 'test', updatedAt: 'test' });
    http.expectOne('/api/author/scenarios').flush([]);
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Публічний каталог не змінено');
  });
  it('blocks a broken graph from save and preview and displays structured locations', () => {
    login(); newDraft();
    TestBed.inject(StudioWorkspace).form()!.get('startNodeId')!.setValue('missing');
    fixture.componentInstance.save(); fixture.componentInstance.preview(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ENTRY_NOT_FOUND');
    expect(fixture.nativeElement.textContent).toContain('startNodeId');
    http.expectNone('/api/author/scenarios');
    expect(TestBed.inject(StudioWorkspace).preview()).toBeNull();
  });
  it('imports/exports through the same form and keeps the previous draft on malformed JSON', () => {
    login(); newDraft(); const component = fixture.componentInstance;
    component.importControl.setValue(JSON.stringify(scenarioFixture())); component.importJson();
    expect(component.validate().success).toBeTrue();
    expect(component.value()).toEqual(scenarioFixture());
    const old = component.value(); component.importControl.setValue('{'); component.importJson();
    expect(component.value()).toEqual(old);
    const download = spyOn(HTMLAnchorElement.prototype, 'click');
    component.exportJson(); expect(download).toHaveBeenCalled();
    component.logout(); expect(api.key()).toBe(''); expect(TestBed.inject(StudioWorkspace).form()).toBeNull();
  });
  it('preserves local edits on a stale revision response and prevents repeated save clicks', () => {
    login(); newDraft(); const component = fixture.componentInstance;
    component.save(); component.save();
    const request = http.expectOne('/api/author/scenarios');
    request.flush({}, { status: 409, statusText: 'Conflict' });
    expect(component.value()).toEqual(blank);
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Конфлікт ревізії');
  });
});

describe('Private Studio preview isolation', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)] }).compileComponents();
  });
  it('uses the identical participant player and debrief without public requests or main run mutation', async () => {
    const publicSession = TestBed.inject(SoloSession); publicSession.start(scenarioFixture());
    const publicSnapshot = publicSession.state();
    const api = TestBed.inject(StudioApi); api.key.set('test-only-memory'); api.authorized.set(true);
    const workspace = TestBed.inject(StudioWorkspace);
    const scenario = structuredClone(blank) as Scenario;
    workspace.load(scenario); workspace.preview.set(scenario);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/studio/preview/new-scenario/play');
    const click = (selector: string) => { harness.routeNativeElement!.querySelector<HTMLButtonElement>(selector)!.click(); harness.detectChanges(); };
    expect(harness.routeNativeElement!.textContent).toContain('Приватний preview');
    click('[data-action="advance"]');
    for (let number = 0; number < 3; number++) { click('[data-choice-id]'); click('[data-action="confirm"]'); click('[data-action="feedback-next"]'); }
    await harness.navigateByUrl('/studio/preview/new-scenario/debrief');
    expect(harness.routeNativeElement!.querySelectorAll('.decision-history li').length).toBe(3);
    expect(publicSession.state()).toBe(publicSnapshot);
    await harness.navigateByUrl('/studio');
    TestBed.inject(HttpTestingController).expectOne('/api/author/scenarios').flush([]);
    const edited = structuredClone(scenario);
    edited.nodes[0].narrative = 'Оновлений локальний вступ тієї самої приватної версії.';
    workspace.load(edited); workspace.preview.set(edited);
    await harness.navigateByUrl('/studio/preview/new-scenario/play');
    expect(harness.routeNativeElement!.textContent).toContain(edited.nodes[0].narrative);
    expect(harness.routeNativeElement!.querySelector('[data-action="advance"]')).not.toBeNull();
    expect(publicSession.state()).toBe(publicSnapshot);
    TestBed.inject(HttpTestingController).expectNone('/api/scenarios/new-scenario');
    TestBed.inject(HttpTestingController).verify();
  });
  it('fails private preview safely after reload/loss of local draft', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/studio/preview/private-draft/play');
    expect(harness.routeNativeElement!.textContent).toContain('Сценарій не знайдено');
    expect(TestBed.inject(SoloSession).state()).toBeNull();
    TestBed.inject(HttpTestingController).verify();
  });
});
