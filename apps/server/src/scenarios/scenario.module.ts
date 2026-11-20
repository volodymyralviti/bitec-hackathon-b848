import { Module } from '@nestjs/common';
import { SCENARIO_CONFIG, scenarioConfig } from './scenario-config';
import { ScenarioStore } from './scenario-store';
import { ScenarioService } from './scenario.service';
import { AuthorGuard, ReviewerGuard } from './access.guard';
import {
  PublicScenarioController,
  AuthorScenarioController,
  ReviewerScenarioController,
} from './scenario.controller';

@Module({
  exports: [ScenarioService],
  controllers: [
    PublicScenarioController,
    AuthorScenarioController,
    ReviewerScenarioController,
  ],
  providers: [
    { provide: SCENARIO_CONFIG, useFactory: scenarioConfig },
    ScenarioStore,
    ScenarioService,
    AuthorGuard,
    ReviewerGuard,
  ],
})
export class ScenarioModule {}
