import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { IncomingMessage } from 'node:http';
import { ClassroomService, type ClassroomView } from './classroom.service';
import {
  CastVote,
  ClassroomError,
  HostCommand,
  JoinHost,
  JoinRoom,
  parseDto,
} from './classroom.dto';

interface Binding {
  pin: string;
  role: 'host' | 'participant';
  token?: string;
}
@WebSocketGateway({
  path: '/api/classroom-socket',
  transports: ['websocket'],
  maxHttpBufferSize: 8192,
  allowRequest: (
    request: IncomingMessage,
    callback: (error: string | null, allowed: boolean) => void,
  ) => {
    const origin = request.headers.origin;
    let allowed = !origin;
    try {
      allowed ||=
        (!!origin && new URL(origin).host === request.headers.host) ||
        origin === process.env.CLASSROOM_ALLOWED_ORIGIN;
    } catch {
      /* invalid origin */
    }
    callback(null, allowed);
  },
})
export class ClassroomGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly bindings = new Map<string, Binding>();
  private readonly rates = new Map<string, { since: number; count: number }>();
  handleConnection(socket: Socket) {
    if (this.server.engine.clientsCount > 1000) socket.disconnect(true);
  }
  constructor(private readonly classroom: ClassroomService) {
    classroom.onExpired = (pin) => {
      this.server?.to(this.channel(pin)).emit('room:expired', {
        code: 'ROOM_UNAVAILABLE',
        message:
          'Час дії кімнати закінчився. Тимчасові голоси й доступ очищено.',
      });
      this.release(pin);
    };
  }
  handleDisconnect(socket: Socket) {
    const binding = this.bindings.get(socket.id);
    this.bindings.delete(socket.id);
    this.rates.delete(socket.id);
    if (binding?.role === 'host') {
      const state = this.classroom.detachHost(binding.pin, socket.id);
      if (state) this.broadcast(state);
    }
  }
  private channel(pin: string) {
    return 'classroom:' + pin;
  }
  private limit(socket: Socket) {
    if (this.server.engine.clientsCount > 1000)
      throw new ClassroomError(
        'SERVER_BUSY',
        'Сервер зайнятий. Спробуйте пізніше.',
      );
    let rate = this.rates.get(socket.id);
    if (!rate || Date.now() - rate.since > 10_000) {
      rate = { since: Date.now(), count: 0 };
      this.rates.set(socket.id, rate);
    }
    if (++rate.count > 60)
      throw new ClassroomError(
        'RATE_LIMIT',
        'Забагато запитів. Зачекайте кілька секунд.',
      );
  }
  private safely<T>(socket: Socket, action: () => T) {
    try {
      this.limit(socket);
      return { ok: true as const, data: action() };
    } catch (error) {
      return {
        ok: false as const,
        error:
          error instanceof ClassroomError
            ? { code: error.code, message: error.message }
            : {
                code: 'REQUEST_FAILED',
                message: 'Дію не виконано. Перевірте стан кімнати.',
              },
      };
    }
  }
  private bind(socket: Socket, binding: Binding) {
    const old = this.bindings.get(socket.id);
    if (
      old?.role === 'host' &&
      !(binding.role === 'host' && old.pin === binding.pin)
    ) {
      const state = this.classroom.detachHost(old.pin, socket.id);
      if (state) this.broadcast(state);
    }
    if (old && old.pin !== binding.pin)
      void socket.leave(this.channel(old.pin));
    this.bindings.set(socket.id, binding);
    void socket.join(this.channel(binding.pin));
  }
  private broadcast(state: ClassroomView) {
    this.server.to(this.channel(state.pin)).emit('room:state', state);
  }
  private release(pin: string) {
    for (const [socketId, binding] of this.bindings)
      if (binding.pin === pin) this.bindings.delete(socketId);
    this.server?.in(this.channel(pin)).socketsLeave(this.channel(pin));
  }
  @SubscribeMessage('room:join') join(
    @ConnectedSocket() socket: Socket,
    @MessageBody() input: unknown,
  ) {
    return this.safely(socket, () => {
      const dto = parseDto(JoinRoom, input);
      const result = this.classroom.join(dto.pin, dto.token);
      this.bind(socket, {
        pin: dto.pin,
        role: 'participant',
        token: result.token,
      });
      return result; // token travels ONLY to this joining participant's acknowledgement.
    });
  }
  @SubscribeMessage('host:join') host(
    @ConnectedSocket() socket: Socket,
    @MessageBody() input: unknown,
  ) {
    return this.safely(socket, () => {
      const dto = parseDto(JoinHost, input);
      const state = this.classroom.attachHost(
        dto.pin,
        dto.hostToken,
        socket.id,
      );
      this.bind(socket, { pin: dto.pin, role: 'host' });
      this.broadcast(state);
      return { state };
    });
  }
  @SubscribeMessage('vote:cast') vote(
    @ConnectedSocket() socket: Socket,
    @MessageBody() input: unknown,
  ) {
    return this.safely(socket, () => {
      const dto = parseDto(CastVote, input);
      const binding = this.bindings.get(socket.id);
      if (
        !binding ||
        binding.role !== 'participant' ||
        binding.pin !== dto.pin ||
        !binding.token
      )
        throw new ClassroomError(
          'JOIN_REQUIRED',
          'Спочатку приєднайтеся як учасник.',
        );
      return this.classroom.vote(
        dto.pin,
        binding.token,
        dto.round,
        dto.choiceId,
      );
    });
  }
  @SubscribeMessage('host:command') command(
    @ConnectedSocket() socket: Socket,
    @MessageBody() input: unknown,
  ) {
    return this.safely(socket, () => {
      const dto = parseDto(HostCommand, input);
      const binding = this.bindings.get(socket.id);
      if (!binding || binding.role !== 'host' || binding.pin !== dto.pin)
        throw new ClassroomError(
          'HOST_UNAUTHORIZED',
          'Керування доступне лише підключеному ведучому.',
        );
      const state = this.classroom.command(dto);
      this.broadcast(state);
      if (state.phase === 'ended') this.release(state.pin);
      return { state };
    });
  }
}
