import { DestroyRef, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, type Socket } from 'socket.io-client';
import type { ClassroomIssue, ClassroomView, Reply, RoomCredential } from './classroom.model';

export const CLASSROOM_SOCKET = new InjectionToken<() => Socket>('Classroom socket factory', {
  providedIn: 'root', factory: () => () => io({ path: '/api/classroom-socket', transports: ['websocket'], autoConnect: false, reconnection: true, reconnectionDelay: 700, reconnectionDelayMax: 4000 })
});

@Injectable()
export class ClassroomSession {
  private readonly http = inject(HttpClient);
  private readonly factory = inject(CLASSROOM_SOCKET);
  private socket?: Socket;
  private requestSequence = 0;
  private credential: { pin: string; hostToken?: string; token?: string } | null = null;
  readonly state = signal<ClassroomView | null>(null);
  readonly connected = signal(false);
  readonly busy = signal(false);
  readonly issue = signal<ClassroomIssue | null>(null);
  readonly role = signal<'host' | 'participant' | null>(null);
  readonly selected = signal<string | null>(null);
  readonly votedRound = signal<number | null>(null);
  readonly message = signal('');
  constructor() { inject(DestroyRef).onDestroy(() => this.leave()); }
  create(scenarioId: string) { return this.http.post<RoomCredential>('/api/classrooms', { scenarioId }); }
  host(value: RoomCredential) { this.leave(); this.credential = value; this.role.set('host'); this.connect(); }
  join(pin: string) { this.leave(); this.credential = { pin }; this.role.set('participant'); this.connect(); }
  private connect() {
    this.busy.set(true); this.issue.set(null);
    const socket = this.factory(); this.socket = socket;
    socket.on('connect', () => {
      this.connected.set(false);
      const credentials = this.credential; if (!credentials) return;
      const event = this.role() === 'host' ? 'host:join' : 'room:join';
      const body = this.role() === 'host' ? { pin: credentials.pin, hostToken: credentials.hostToken } : { pin: credentials.pin, ...(credentials.token ? { token: credentials.token } : {}) };
      this.send<{ state: ClassroomView; token?: string; hasVoted?: boolean }>(event, body, result => {
        if (result.token && this.credential) this.credential.token = result.token;
        this.accept(result.state);
        if (result.hasVoted) this.votedRound.set(result.state.round);
        this.connected.set(true); this.message.set('Зв’язок із кімнатою відновлено.');
      });
    });
    socket.on('room:state', (state: ClassroomView) => this.accept(state));
    socket.on('room:expired', () => {
      this.issue.set({ code: 'ROOM_UNAVAILABLE', message: 'Час дії кімнати закінчився. Тимчасовий доступ очищено.' });
      this.credential = null; this.connected.set(false); this.busy.set(false); socket.disconnect();
    });
    socket.on('disconnect', () => { this.connected.set(false); this.busy.set(false); this.message.set('Немає зв’язку. Голосування й керування призупинено; пробуємо відновити підключення.'); });
    socket.on('connect_error', () => { this.connected.set(false); this.busy.set(false); this.issue.set({ code: 'NETWORK', message: 'Не вдається підключитися. Перевірте мережу та доступність сервера.' }); });
    socket.connect();
  }
  private accept(value: ClassroomView) {
    if (value.pin !== this.credential?.pin || (this.state() && value.revision < this.state()!.revision)) return;
    const old = this.state(); this.state.set(value);
    if (!old || old.round !== value.round || old.node.id !== value.node.id) { this.selected.set(null); this.votedRound.set(null); }
    if (value.phase === 'ended') { this.credential = null; this.busy.set(false); this.message.set('Заняття завершено. Індивідуальних звітів немає.'); }
  }
  choose(id: string) {
    const state = this.state();
    if (!this.connected() || this.busy() || state?.phase !== 'voting_open' || !state.hostConnected || this.votedRound() === state.round || !state.node.choices.some(choice => choice.id === id)) return;
    this.selected.set(id); this.issue.set(null);
  }
  confirm() {
    const state = this.state(); const choice = this.selected();
    if (this.busy() || !this.connected() || !state || !choice || state.phase !== 'voting_open' || !state.hostConnected || this.votedRound() === state.round) return;
    this.send<{ status: string }>('vote:cast', { pin: state.pin, round: state.round, choiceId: choice }, () => { this.votedRound.set(state.round); this.message.set('Голос прийнято. Очікуйте закриття раунду. Повтор не збільшує підрахунок.'); });
  }
  command(action: 'open' | 'close' | 'advance' | 'end', choiceId?: string) {
    const state = this.state(); if (!state || !this.credential?.hostToken || this.busy() || !this.connected()) return;
    this.send<{ state: ClassroomView }>('host:command', { pin: state.pin, hostToken: this.credential.hostToken, expectedRevision: state.revision, round: state.round, action, ...(choiceId ? { choiceId } : {}) }, result => this.accept(result.state));
  }
  private send<T>(event: string, body: unknown, success: (data: T) => void) {
    if (!this.socket?.connected) { this.busy.set(false); return; }
    this.busy.set(true); this.issue.set(null);
    const socket = this.socket; const sequence = ++this.requestSequence;
    socket.timeout(6000).emit(event, body, (error: Error | null, reply?: Reply<T>) => {
      if (this.socket !== socket || sequence !== this.requestSequence) return;
      this.busy.set(false);
      if (error || !reply) { this.issue.set({ code: 'NETWORK', message: 'Немає підтвердження сервера. Дочекайтеся зв’язку; повтор того самого голосу безпечний.' }); return; }
      if (!reply.ok) {
        this.issue.set(reply.error);
        if (event === 'room:join' || event === 'host:join') { this.connected.set(false); this.socket?.disconnect(); }
        return;
      }
      success(reply.data);
    });
  }
  leave() {
    this.requestSequence++;
    this.socket?.removeAllListeners(); this.socket?.disconnect(); this.socket = undefined; this.credential = null;
    this.state.set(null); this.role.set(null); this.connected.set(false); this.busy.set(false); this.selected.set(null); this.votedRound.set(null); this.issue.set(null); this.message.set('');
  }
}
