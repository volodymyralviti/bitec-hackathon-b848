import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import type { Socket } from 'socket.io-client';
import { scenarioFixture } from '../testing/scenarios.fixture';
import { ScenarioRepository } from '../core/scenarios/scenario-repository';
import { ClassroomComponent } from './classroom.component';
import { CLASSROOM_SOCKET, ClassroomSession } from './classroom-session.service';
import type { ClassroomView } from './classroom.model';

class FakeSocket {
  connected = false;
  callbacks = new Map<string, ((value?: unknown) => void)[]>();
  requests: { event: string; body: unknown; ack: (error: Error | null, value?: unknown) => void }[] = [];
  on(event: string, callback: (value?: unknown) => void) { this.callbacks.set(event, [...(this.callbacks.get(event) ?? []), callback]); return this; }
  fire(event: string, value?: unknown) { for (const callback of this.callbacks.get(event) ?? []) callback(value); }
  connect() { this.connected = true; this.fire('connect'); }
  disconnect() { this.connected = false; this.fire('disconnect'); }
  removeAllListeners() { this.callbacks.clear(); }
  timeout() { return this; }
  emit(event: string, body: unknown, ack: (error: Error | null, value?: unknown) => void) { this.requests.push({ event, body, ack }); }
  reply(data: unknown) { this.requests.at(-1)!.ack(null, { ok: true, data }); }
}
function view(): ClassroomView {
  const scenario = scenarioFixture(); const node = scenario.nodes.find(node => node.type === 'decision')!;
  if (node.type !== 'decision') throw new Error('fixture');
  return { pin: '123456', expiresAt: Date.now() + 60_000, phase: 'voting_open', round: 1, revision: 3, hostConnected: true, minimum: 3, decisionCount: 0,
    scenario: { id: scenario.id, version: scenario.version, title: scenario.title, basedOn: scenario.basedOn, sources: scenario.sources, contentReview: scenario.contentReview },
    node: { id: node.id, type: 'decision', title: node.title, narrative: node.narrative, valuesInTension: node.valuesInTension, choices: node.choices.map(choice => ({ id: choice.id, label: choice.label, explanation: choice.explanation })) }, aggregate: null,
    metrics: { transparency: 0, fairness: 0, trust: 0, effectiveness: 0 }, timeline: [], debrief: null };
}
describe('Anonymous participant UI', () => {
  let fixture: ComponentFixture<ClassroomComponent>; let socket: FakeSocket; let session: ClassroomSession;
  beforeEach(async () => {
    socket = new FakeSocket();
    await TestBed.configureTestingModule({ imports: [ClassroomComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: CLASSROOM_SOCKET, useValue: () => socket as unknown as Socket }, { provide: ScenarioRepository, useValue: { list: () => of([]) } }, { provide: ActivatedRoute, useValue: { snapshot: { data: {}, paramMap: new Map() } } }] }).compileComponents();
    fixture = TestBed.createComponent(ClassroomComponent); session = fixture.debugElement.injector.get(ClassroomSession); fixture.detectChanges();
  });
  function join() { fixture.componentInstance.pin.setValue('123456'); fixture.componentInstance.join(); socket.reply({ token: 't'.repeat(43), state: view(), hasVoted: false }); fixture.detectChanges(); }
  it('asks only PIN, joins anonymously and does not reveal live results', () => {
    expect(fixture.nativeElement.querySelectorAll('input').length).toBe(1);
    join(); expect(socket.requests[0].body).toEqual({ pin: '123456' });
    expect(fixture.nativeElement.querySelector('[data-classroom-results]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-classroom-choice]').length).toBe(2);
    expect(fixture.nativeElement.textContent).not.toContain('t'.repeat(43));
  });
  it('requires confirmation, prevents double-click and shows own wait state without aggregate', () => {
    join(); fixture.nativeElement.querySelector('[data-classroom-choice]').click(); fixture.detectChanges();
    expect(socket.requests.length).toBe(1);
    const button = fixture.nativeElement.querySelector('[data-classroom-action=vote]'); button.click(); button.click();
    expect(socket.requests.length).toBe(2); expect(socket.requests[1].event).toBe('vote:cast');
    socket.reply({ status: 'accepted' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-vote-recorded]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-classroom-results]')).toBeNull();
  });
  it('shows suppressed results only after close and disables votes while host is disconnected', () => {
    join(); const state = view(); state.hostConnected = false; state.revision++;
    socket.fire('room:state', state); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-classroom-choice]').disabled).toBeTrue();
    state.phase = 'voting_closed'; state.revision++; state.aggregate = { suppressed: true, minimum: 3 };
    socket.fire('room:state', { ...state }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-results-suppressed]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-aggregate-choice]')).toBeNull();
  });
  it('rejoins with the same in-memory token and restores accepted status after reconnect', () => {
    join(); socket.disconnect(); socket.connect();
    expect(socket.requests.at(-1)!.body).toEqual({ pin: '123456', token: 't'.repeat(43) });
    socket.reply({ state: view(), token: 't'.repeat(43), hasVoted: true }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-vote-recorded]')).not.toBeNull();
  });
  it('handles invalid PIN/network/expiry and clears credentials on leave', () => {
    fixture.componentInstance.pin.setValue('x'); fixture.componentInstance.join(); expect(socket.requests.length).toBe(0);
    fixture.componentInstance.pin.setValue('123456'); fixture.componentInstance.join();
    socket.requests.at(-1)!.ack(null, { ok: false, error: { code: 'ROOM_UNAVAILABLE', message: 'Кімната недоступна' } }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Кімната недоступна');
    join(); socket.fire('connect_error'); expect(session.connected()).toBeFalse();
    socket.fire('room:expired'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Час дії кімнати закінчився');
    session.leave(); expect(session.state()).toBeNull(); expect(session.role()).toBeNull();
  });
  it('ignores a late join acknowledgement after leaving the room', () => {
    fixture.componentInstance.pin.setValue('123456'); fixture.componentInstance.join();
    const request = socket.requests.at(-1)!; session.leave();
    request.ack(null, { ok: true, data: { token: 't'.repeat(43), state: view() } });
    expect(session.state()).toBeNull(); expect(session.connected()).toBeFalse();
  });
});
describe('Instructor UI', () => {
  it('creates a room with no author secret and exposes only PIN/join URL to the rendered view', async () => {
    const socket = new FakeSocket();
    await TestBed.configureTestingModule({ imports: [ClassroomComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: CLASSROOM_SOCKET, useValue: () => socket as unknown as Socket }, { provide: ScenarioRepository, useValue: { list: () => of([scenarioFixture()]) } }, { provide: ActivatedRoute, useValue: { snapshot: { data: { host: true }, paramMap: new Map() } } }] }).compileComponents();
    const fixture = TestBed.createComponent(ClassroomComponent); fixture.detectChanges(); fixture.componentInstance.create();
    const http = TestBed.inject(HttpTestingController); const request = http.expectOne('/api/classrooms');
    expect(request.request.body).toEqual({ scenarioId: 'urgent-supply' }); expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ pin: '123456', hostToken: 'h'.repeat(43), expiresAt: Date.now() + 60000 });
    socket.reply({ state: view() }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('h'.repeat(43));
    expect(fixture.nativeElement.querySelector('[data-join-url]').value).toContain('/classroom/join/123456');
    fixture.nativeElement.querySelector('[data-classroom-action=close]').click();
    expect(socket.requests.at(-1)!.body).toEqual({ pin: '123456', hostToken: 'h'.repeat(43), expectedRevision: 3, round: 1, action: 'close' });
    http.verify();
  });
});
