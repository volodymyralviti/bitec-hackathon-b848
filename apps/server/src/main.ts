import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3000;
  if (process.env.HOST) await app.listen(port, process.env.HOST);
  else await app.listen(port);
}
bootstrap().catch((error: unknown) => {
  console.error('Failed to start API', error);
  process.exitCode = 1;
});
