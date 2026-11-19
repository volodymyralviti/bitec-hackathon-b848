import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { ScenarioRepository, StaticScenarioRepository } from './core/scenarios/scenario-repository';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHttpClient(), { provide: ScenarioRepository, useExisting: StaticScenarioRepository }]
};
