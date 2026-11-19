import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: 'ok'; service: 'ethical-dilemmas-api' } {
    return { status: 'ok', service: 'ethical-dilemmas-api' };
  }
}
