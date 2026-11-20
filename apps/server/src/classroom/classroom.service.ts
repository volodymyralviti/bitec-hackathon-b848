import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import {
  advanceNarrative,
  getCurrentNode,
  getDebrief,
  makeDecision,
  startScenario,
  type SimulationState,
} from '@eds/scenario-engine';
import type { Scenario } from '@eds/scenario-schema';
import type { z } from 'zod';
import { ScenarioService } from '../scenarios/scenario.service';
import { CLASSROOM_CONFIG, type ClassroomConfig } from './classroom.config';
import { ClassroomError, type HostCommand } from './classroom.dto';

type Phase = 'created' | 'voting_open' | 'voting_closed' | 'advanced' | 'ended';
type Aggregate =
  | { suppressed: true; minimum: number }
  | {
      suppressed: false;
      total: number;
      choices: { choiceId: string; count: number; percent: number }[];
    };
interface Room {
  pin: string;
  hostToken: string;
  expiresAt: number;
  scenario: Scenario;
  state: SimulationState;
  phase: Phase;
  round: number;
  revision: number;
  members: Set<string>;
  votes: Map<string, string>;
  hosts: Set<string>;
  aggregate: Aggregate | null;
}
function fail(code: string, message: string): never {
  throw new ClassroomError(code, message);
}
const token = () => randomBytes(32).toString('base64url');
function secretEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

@Injectable()
export class ClassroomService implements OnModuleInit, OnModuleDestroy {
  private readonly rooms = new Map<string, Room>();
  private timer?: ReturnType<typeof setInterval>;
  onExpired: (pin: string) => void = () => undefined;
  constructor(
    private readonly scenarios: ScenarioService,
    @Inject(CLASSROOM_CONFIG) private readonly config: ClassroomConfig,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => this.sweep(), 1000);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
    this.rooms.clear();
  }
  sweep(now = Date.now()) {
    for (const [pin, room] of this.rooms)
      if (room.expiresAt <= now) {
        this.erase(room);
        this.rooms.delete(pin);
        this.onExpired(pin);
      }
  }
  create(id: string, version?: string) {
    this.sweep();
    if (this.rooms.size >= this.config.maxRooms)
      fail(
        'ROOM_LIMIT',
        'Наразі немає місця для нової кімнати. Спробуйте пізніше.',
      );
    const scenario = freeze(this.scenarios.publicGet(id, version));
    let pin: string;
    do {
      pin = String(randomInt(0, 1_000_000)).padStart(6, '0');
    } while (this.rooms.has(pin));
    const room: Room = {
      pin,
      hostToken: token(),
      expiresAt: Date.now() + this.config.ttlMs,
      scenario,
      state: startScenario(scenario),
      phase: 'created',
      round: 0,
      revision: 0,
      members: new Set(),
      votes: new Map(),
      hosts: new Set(),
      aggregate: null,
    };
    this.rooms.set(pin, room);
    return { pin, hostToken: room.hostToken, expiresAt: room.expiresAt };
  }
  private room(pin: string): Room {
    this.sweep();
    const room = this.rooms.get(pin);
    return (
      room ??
      fail(
        'ROOM_UNAVAILABLE',
        'Кімната недоступна: перевірте PIN; час її дії міг закінчитися.',
      )
    );
  }
  private active(pin: string): Room {
    const room = this.room(pin);
    if (room.phase === 'ended') fail('ROOM_ENDED', 'Заняття завершено.');
    return room;
  }
  private host(pin: string, capability: string): Room {
    const room = this.active(pin);
    if (!secretEqual(capability, room.hostToken))
      fail(
        'HOST_UNAUTHORIZED',
        'Потрібен окремий ключ ведучого. PIN не надає керування.',
      );
    return room;
  }
  join(pin: string, existing?: string) {
    const room = this.active(pin);
    if (existing) {
      if (!room.members.has(existing))
        fail(
          'TOKEN_INVALID',
          'Тимчасовий доступ втрачений. Приєднайтеся до кімнати знову.',
        );
      return {
        token: existing,
        state: this.view(room),
        hasVoted: room.phase === 'voting_open' && room.votes.has(existing),
      };
    }
    if (room.members.size >= this.config.maxParticipants)
      fail('ROOM_FULL', 'Досягнуто місткості кімнати.');
    const credential = token();
    room.members.add(credential);
    return { token: credential, state: this.view(room), hasVoted: false };
  }
  attachHost(pin: string, capability: string, socketId: string) {
    const room = this.host(pin, capability);
    const changed = !room.hosts.size;
    room.hosts.add(socketId);
    if (changed) room.revision++;
    return this.view(room);
  }
  detachHost(pin: string, socketId: string) {
    const room = this.rooms.get(pin);
    if (
      !room ||
      room.phase === 'ended' ||
      !room.hosts.delete(socketId) ||
      room.hosts.size
    )
      return null;
    room.revision++;
    return this.view(room);
  }
  vote(pin: string, credential: string, round: number, choiceId: string) {
    const room = this.active(pin);
    if (!room.members.has(credential))
      fail('TOKEN_INVALID', 'Потрібне повторне приєднання до кімнати.');
    if (!room.hosts.size)
      fail(
        'HOST_DISCONNECTED',
        'Ведучий втратив зв’язок. Дочекайтеся його повернення.',
      );
    if (room.phase !== 'voting_open' || round !== room.round)
      fail(
        'ROUND_CLOSED',
        'Цей раунд уже закритий або змінився. Голос не враховано.',
      );
    const node = getCurrentNode(room.scenario, room.state);
    if (
      node.type !== 'decision' ||
      !node.choices.some((choice) => choice.id === choiceId)
    )
      fail('CHOICE_INVALID', 'Варіант не належить поточному рішенню.');
    const previous = room.votes.get(credential);
    if (previous) {
      if (previous !== choiceId)
        fail(
          'VOTE_ALREADY_RECORDED',
          'Перший підтверджений голос остаточний для цього раунду.',
        );
      return { status: 'already_recorded' as const };
    }
    room.votes.set(credential, choiceId);
    // No broadcast, progressive count, participant timestamp or choice echo.
    return { status: 'accepted' as const };
  }
  command(body: z.infer<typeof HostCommand>) {
    const room = this.host(body.pin, body.hostToken);
    if (room.revision !== body.expectedRevision || room.round !== body.round)
      fail(
        'STALE_STATE',
        'Стан кімнати змінився. Перевірте поточний етап і повторіть дію.',
      );
    const node = getCurrentNode(room.scenario, room.state);
    switch (body.action) {
      case 'open':
        if (
          !['created', 'advanced'].includes(room.phase) ||
          node.type !== 'decision'
        )
          fail('INVALID_TRANSITION', 'Спочатку перейдіть до нового рішення.');
        room.round++;
        room.phase = 'voting_open';
        room.aggregate = null;
        break;
      case 'close': {
        if (room.phase !== 'voting_open' || node.type !== 'decision')
          fail('INVALID_TRANSITION', 'Немає відкритого голосування.');
        const total = room.votes.size;
        room.aggregate =
          total < this.config.minimum
            ? { suppressed: true, minimum: this.config.minimum }
            : {
                suppressed: false,
                total,
                choices: node.choices.map((choice) => {
                  const count = [...room.votes.values()].filter(
                    (id) => id === choice.id,
                  ).length;
                  return {
                    choiceId: choice.id,
                    count,
                    percent: Math.round((count / total) * 100),
                  };
                }),
              };
        room.votes.clear();
        room.phase = 'voting_closed';
        break;
      }
      case 'advance':
        if (
          node.type === 'narrative' &&
          ['created', 'advanced'].includes(room.phase) &&
          !body.choiceId
        )
          room.state = advanceNarrative(room.scenario, room.state);
        else if (
          node.type === 'decision' &&
          room.phase === 'voting_closed' &&
          body.choiceId &&
          node.choices.some((choice) => choice.id === body.choiceId)
        )
          room.state = makeDecision(room.scenario, room.state, body.choiceId);
        else
          fail(
            'INVALID_TRANSITION',
            'Закрийте голосування та явно оберіть гілку; narrative переходить без вибору.',
          );
        room.phase = room.state.status === 'completed' ? 'ended' : 'advanced';
        room.aggregate = null;
        room.votes.clear();
        if (room.phase === 'ended') this.erase(room);
        break;
      case 'end':
        room.phase = 'ended';
        room.aggregate = null;
        this.erase(room);
        break;
    }
    room.revision++;
    return this.view(room);
  }
  private erase(room: Room) {
    room.members.clear();
    room.votes.clear();
    room.hosts.clear();
    room.hostToken = '';
  }
  private view(room: Room) {
    const node = getCurrentNode(room.scenario, room.state);
    return {
      pin: room.pin,
      expiresAt: room.expiresAt,
      phase: room.phase,
      round: room.round,
      revision: room.revision,
      hostConnected: room.hosts.size > 0,
      minimum: this.config.minimum,
      scenario: {
        id: room.scenario.id,
        version: room.scenario.version,
        title: room.scenario.title,
        basedOn: room.scenario.basedOn,
        contentReview: room.scenario.contentReview,
        sources: room.scenario.sources,
      },
      node: {
        id: node.id,
        type: node.type,
        title: node.title,
        narrative: node.narrative,
        ...(node.context ? { context: node.context } : {}),
        valuesInTension: node.type === 'decision' ? node.valuesInTension : [],
        choices:
          node.type === 'decision'
            ? node.choices.map((choice) => ({
                id: choice.id,
                label: choice.label,
                explanation: choice.explanation,
              }))
            : [],
      },
      aggregate: room.aggregate,
      metrics: room.state.metrics,
      decisionCount: room.state.decisionCount,
      timeline: room.state.timeline,
      debrief:
        room.state.status === 'completed'
          ? getDebrief(room.scenario, room.state)
          : null,
    };
  }
}
export type ClassroomView = ReturnType<ClassroomService['attachHost']>;
