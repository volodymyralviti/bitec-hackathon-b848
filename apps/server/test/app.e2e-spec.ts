import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api (GET) preserves the starter response under the global prefix', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('/api/health (GET) returns the exact public health payload', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect({ status: 'ok', service: 'ethical-dilemmas-api' });
  });

  it('does not expose an unprefixed health route', () => {
    return request(app.getHttpServer()).get('/health').expect(404);
  });

  it('does not duplicate the API prefix', () => {
    return request(app.getHttpServer()).get('/api/api/health').expect(404);
  });
});
