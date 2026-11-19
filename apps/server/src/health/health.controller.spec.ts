import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns the public service status', () => {
    expect(new HealthController().getHealth()).toEqual({
      status: 'ok',
      service: 'ethical-dilemmas-api',
    });
  });
});
