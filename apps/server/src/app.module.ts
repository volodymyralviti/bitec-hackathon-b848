import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { ScenarioModule } from './scenarios/scenario.module';
import { ClassroomModule } from './classroom/classroom.module';

@Module({
  imports: [HealthModule, ScenarioModule, ClassroomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
