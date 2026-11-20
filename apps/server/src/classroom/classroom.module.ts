import { Module } from '@nestjs/common';
import { ScenarioModule } from '../scenarios/scenario.module';
import { CLASSROOM_CONFIG, classroomConfig } from './classroom.config';
import { ClassroomService } from './classroom.service';
import { ClassroomGateway } from './classroom.gateway';
import { ClassroomController } from './classroom.controller';

@Module({
  imports: [ScenarioModule],
  controllers: [ClassroomController],
  providers: [
    { provide: CLASSROOM_CONFIG, useFactory: classroomConfig },
    ClassroomService,
    ClassroomGateway,
  ],
})
export class ClassroomModule {}
