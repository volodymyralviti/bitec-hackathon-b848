import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SCENARIO_CONFIG } from '../src/scenarios/scenario-config';
import { CLASSROOM_CONFIG } from '../src/classroom/classroom.config';
import {
  ClassroomService,
  type ClassroomView,
} from '../src/classroom/classroom.service';

type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
type Credential = { pin: string; hostToken: string; expiresAt: number };
type Member = { token: string; state: ClassroomView; hasVoted: boolean };
describe('Anonymous classroom gateway/privacy EDS-024–028/033', () => {
  let app: INestApplication<Server>;
  let origin: string;
  let dataFile: string;
  const sockets: Socket[] = [];
  async function connect() {
    const socket = io(origin, {
      path: '/api/classroom-socket',
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });
    return socket;
  }
  function emit<T>(
    socket: Socket,
    event: string,
    body: unknown,
  ): Promise<Ack<T>> {
    return new Promise((resolve, reject) =>
      socket
        .timeout(2000)
        .emit(event, body, (error: Error | null, reply: Ack<T>) =>
          error ? reject(error) : resolve(reply),
        ),
    );
  }
  function data<T>(reply: Ack<T>): T {
    if (!reply.ok) throw new Error(reply.error.code);
    return reply.data;
  }
  async function create() {
    const result = await request(app.getHttpServer())
      .post('/api/classrooms')
      .send({ scenarioId: 'report-under-pressure' })
      .expect(201);
    return result.body as Credential;
  }
  async function host(room: Credential) {
    const socket = await connect();
    const result = data(
      await emit<{ state: ClassroomView }>(socket, 'host:join', roomOnly(room)),
    );
    return { socket, state: result.state };
  }
  const roomOnly = (room: Credential) => ({
    pin: room.pin,
    hostToken: room.hostToken,
  });
  async function command(
    socket: Socket,
    room: Credential,
    state: ClassroomView,
    action: string,
    choiceId?: string,
  ) {
    return data(
      await emit<{ state: ClassroomView }>(socket, 'host:command', {
        ...roomOnly(room),
        expectedRevision: state.revision,
        round: state.round,
        action,
        ...(choiceId ? { choiceId } : {}),
      }),
    ).state;
  }
  beforeAll(async () => {
    const directory = await mkdtemp(join(tmpdir(), 'eds-classroom-test-'));
    dataFile = join(directory, 'scenarios.json');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SCENARIO_CONFIG)
      .useValue({
        dataFile,
        contentDirectory: resolve(__dirname, '../../../content/scenarios'),
        authorKey: '',
        reviewerKey: '',
      })
      .overrideProvider(CLASSROOM_CONFIG)
      .useValue({
        ttlMs: 60_000,
        minimum: 3,
        maxParticipants: 4,
        maxRooms: 100,
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    origin = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  afterEach(() => {
    jest.restoreAllMocks();
    for (const socket of sockets.splice(0)) socket.disconnect();
  });
  afterAll(async () => app.close());
  it('runs three real independent clients over three rounds; only frozen aggregate is broadcast and votes never persist', async () => {
    const diskBefore = await readFile(dataFile, 'utf8');
    const log = jest.spyOn(console, 'log');
    const warn = jest.spyOn(console, 'warn');
    const error = jest.spyOn(console, 'error');
    const room = await create();
    const instructor = await host(room);
    let state = instructor.state;
    // White-box privacy assertion: closed ballots must actually be erased, not merely hidden.
    const volatileRooms = Reflect.get(
      app.get(ClassroomService),
      'rooms',
    ) as Map<
      string,
      { votes: Map<string, string>; members: Set<string>; hostToken: string }
    >;
    const clients = await Promise.all([connect(), connect(), connect()]);
    const broadcasts: ClassroomView[] = [];
    instructor.socket.on('room:state', (value) =>
      broadcasts.push(value as ClassroomView),
    );
    const members = await Promise.all(
      clients.map(async (socket) =>
        data(await emit<Member>(socket, 'room:join', { pin: room.pin })),
      ),
    );
    expect(new Set(members.map((member) => member.token)).size).toBe(3);
    state = await command(instructor.socket, room, state, 'advance');
    for (let round = 1; round <= 3; round++) {
      state = await command(instructor.socket, room, state, 'open');
      const countBefore = broadcasts.length;
      const [first, second] = state.node.choices;
      await Promise.all(
        clients.map((socket, index) =>
          emit(socket, 'vote:cast', {
            pin: room.pin,
            round,
            choiceId: index === 2 ? second.id : first.id,
          }),
        ),
      );
      const repeated = data(
        await emit<{ status: string }>(clients[0], 'vote:cast', {
          pin: room.pin,
          round,
          choiceId: first.id,
        }),
      );
      expect(repeated.status).toBe('already_recorded');
      expect(broadcasts.length).toBe(countBefore);
      expect(
        (
          await emit(clients[0], 'vote:cast', {
            pin: room.pin,
            round,
            choiceId: second.id,
          })
        ).ok,
      ).toBe(false);
      state = await command(instructor.socket, room, state, 'close');
      expect(volatileRooms.get(room.pin)?.votes.size).toBe(0);
      expect(state.aggregate).toEqual({
        suppressed: false,
        total: 3,
        choices: [
          { choiceId: first.id, count: 2, percent: 67 },
          { choiceId: second.id, count: 1, percent: 33 },
        ],
      });
      expect(
        (
          await emit(clients[0], 'vote:cast', {
            pin: room.pin,
            round,
            choiceId: first.id,
          })
        ).ok,
      ).toBe(false);
      state = await command(
        instructor.socket,
        room,
        state,
        'advance',
        first.id,
      );
    }
    expect(state.phase).toBe('ended');
    expect(volatileRooms.get(room.pin)?.members.size).toBe(0);
    expect(volatileRooms.get(room.pin)?.hostToken).toBe('');
    expect(state.debrief?.decisions).toHaveLength(3);
    expect(state.timeline.some((entry) => entry.kind === 'delayed')).toBe(true);
    const serialized = JSON.stringify(broadcasts);
    for (const secret of [
      room.hostToken,
      ...members.map((member) => member.token),
    ])
      expect(serialized).not.toContain(secret);
    for (const forbidden of [
      '"token"',
      '"hostToken"',
      '"members"',
      '"votes"',
      '"socketId"',
      '"ip"',
      '"userAgent"',
      '"email"',
      '"name"',
      '"pendingEffects"',
    ])
      expect(serialized).not.toContain(forbidden);
    for (const value of broadcasts.filter(
      (value) => value.phase === 'voting_open',
    ))
      expect(value.aggregate).toBeNull();
    expect(await readFile(dataFile, 'utf8')).toBe(diskBefore);
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get('/api/classrooms').expect(404);
    await request(app.getHttpServer())
      .get(`/api/classrooms/${room.pin}/votes`)
      .expect(404);
  });
  it.each([1, 2])(
    'suppresses precise results with %i votes even when 3+ tokens joined',
    async (count) => {
      const room = await create();
      const instructor = await host(room);
      let state = await command(
        instructor.socket,
        room,
        instructor.state,
        'advance',
      );
      const clients = await Promise.all([connect(), connect(), connect()]);
      for (const socket of clients)
        data(await emit(socket, 'room:join', { pin: room.pin }));
      state = await command(instructor.socket, room, state, 'open');
      for (const socket of clients.slice(0, count))
        data(
          await emit(socket, 'vote:cast', {
            pin: room.pin,
            round: state.round,
            choiceId: state.node.choices[0].id,
          }),
        );
      state = await command(instructor.socket, room, state, 'close');
      expect(state.aggregate).toEqual({ suppressed: true, minimum: 3 });
    },
  );
  it('rejects PIN-only/wrong host controls and strict DTOs containing identity fields', async () => {
    const room = await create();
    const socket = await connect();
    data(await emit(socket, 'room:join', { pin: room.pin }));
    expect(
      await emit(socket, 'host:join', {
        pin: room.pin,
        hostToken: 'x'.repeat(43),
      }),
    ).toMatchObject({ ok: false, error: { code: 'HOST_UNAUTHORIZED' } });
    expect(
      await emit(socket, 'host:command', {
        ...roomOnly(room),
        expectedRevision: 0,
        round: 0,
        action: 'end',
      }),
    ).toMatchObject({ ok: false, error: { code: 'HOST_UNAUTHORIZED' } });
    expect(
      await emit(socket, 'host:join', { pin: room.pin, hostToken: room.pin }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(
      await emit(socket, 'room:join', { pin: room.pin, name: 'not accepted' }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    await request(app.getHttpServer())
      .post('/api/classrooms')
      .send({ scenarioId: 'report-under-pressure', email: 'not accepted' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/classrooms')
      .send({ scenarioId: 'missing' })
      .expect(404);
  });
  it('reconnects with the same token, remembers own acceptance without revealing choice, and handles host disconnection', async () => {
    const room = await create();
    const instructor = await host(room);
    let state = await command(
      instructor.socket,
      room,
      instructor.state,
      'advance',
    );
    const participant = await connect();
    const member = data(
      await emit<Member>(participant, 'room:join', { pin: room.pin }),
    );
    state = await command(instructor.socket, room, state, 'open');
    data(
      await emit(participant, 'vote:cast', {
        pin: room.pin,
        round: state.round,
        choiceId: state.node.choices[0].id,
      }),
    );
    participant.disconnect();
    const reconnect = await connect();
    const resumed = data(
      await emit<Member>(reconnect, 'room:join', {
        pin: room.pin,
        token: member.token,
      }),
    );
    expect(resumed.hasVoted).toBe(true);
    expect(resumed.token).toBe(member.token);
    expect(resumed.state.aggregate).toBeNull();
    const disconnected = new Promise<ClassroomView>((resolve) =>
      reconnect.once('room:state', resolve),
    );
    instructor.socket.disconnect();
    state = await disconnected;
    expect(state.hostConnected).toBe(false);
    expect(
      await emit(reconnect, 'vote:cast', {
        pin: room.pin,
        round: state.round,
        choiceId: state.node.choices[0].id,
      }),
    ).toMatchObject({ ok: false, error: { code: 'HOST_DISCONNECTED' } });
    const returned = await host(room);
    expect(returned.state.hostConnected).toBe(true);
    state = await command(returned.socket, room, returned.state, 'close');
    expect(state.aggregate).toEqual({ suppressed: true, minimum: 3 });
  });
  it('serializes close/advance races and rejects stale votes and controls', async () => {
    const room = await create();
    const instructor = await host(room);
    let state = await command(
      instructor.socket,
      room,
      instructor.state,
      'advance',
    );
    state = await command(instructor.socket, room, state, 'open');
    const body = {
      ...roomOnly(room),
      expectedRevision: state.revision,
      round: state.round,
      action: 'close',
    };
    const replies = await Promise.all([
      emit(instructor.socket, 'host:command', body),
      emit(instructor.socket, 'host:command', body),
    ]);
    expect(replies.filter((reply) => reply.ok)).toHaveLength(1);
    expect(replies.filter((reply) => !reply.ok)).toMatchObject([
      { ok: false, error: { code: 'STALE_STATE' } },
    ]);
  });
  it('cleans expired rooms/tokens, rejects full/invalid/ended rooms and never logs vote credentials', async () => {
    const room = await create();
    const instructor = await host(room);
    const participant = await connect();
    const member = data(
      await emit<Member>(participant, 'room:join', { pin: room.pin }),
    );
    for (let index = 0; index < 3; index++)
      data(await emit(await connect(), 'room:join', { pin: room.pin }));
    expect(
      await emit(await connect(), 'room:join', { pin: room.pin }),
    ).toMatchObject({ ok: false, error: { code: 'ROOM_FULL' } });
    expect(await emit(participant, 'room:join', { pin: 'bad' })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
    const expired = new Promise<unknown>((resolve) =>
      participant.once('room:expired', resolve),
    );
    app.get(ClassroomService).sweep(room.expiresAt + 1);
    await expired;
    expect(
      await emit(participant, 'room:join', {
        pin: room.pin,
        token: member.token,
      }),
    ).toMatchObject({ ok: false, error: { code: 'ROOM_UNAVAILABLE' } });
    expect(
      await emit(participant, 'vote:cast', {
        pin: room.pin,
        round: 1,
        choiceId: 'first',
      }),
    ).toMatchObject({ ok: false });
    const other = await create();
    const next = await host(other);
    await command(next.socket, other, next.state, 'end');
    expect(
      await emit(participant, 'room:join', { pin: other.pin }),
    ).toMatchObject({ ok: false, error: { code: 'ROOM_ENDED' } });
    // Privacy logger check is scoped to actual voting handlers, not Nest startup route messages.
    const log = jest.spyOn(console, 'log');
    const warn = jest.spyOn(console, 'warn');
    const error = jest.spyOn(console, 'error');
    await emit(participant, 'vote:cast', {
      pin: room.pin,
      round: 1,
      choiceId: 'first',
    });
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
    expect(instructor.state.pin).toBe(room.pin);
  });
});
