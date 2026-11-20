import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { SCENARIO_CONFIG, type ScenarioConfig } from './scenario-config';

function check(context: ExecutionContext, expected: string): boolean {
  context
    .switchToHttp()
    .getResponse<Response>()
    .setHeader('Cache-Control', 'no-store');
  if (!expected)
    throw new ServiceUnavailableException('Цю роль не налаштовано на сервері.');
  const header = context.switchToHttp().getRequest<Request>()
    .headers.authorization;
  const actual =
    typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7)
      : '';
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right))
    throw new UnauthorizedException('Потрібен чинний ключ доступу.');
  return true;
}
@Injectable()
export class AuthorGuard implements CanActivate {
  constructor(
    @Inject(SCENARIO_CONFIG) private readonly config: ScenarioConfig,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    return check(context, this.config.authorKey);
  }
}
@Injectable()
export class ReviewerGuard implements CanActivate {
  constructor(
    @Inject(SCENARIO_CONFIG) private readonly config: ScenarioConfig,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    return check(context, this.config.reviewerKey);
  }
}
