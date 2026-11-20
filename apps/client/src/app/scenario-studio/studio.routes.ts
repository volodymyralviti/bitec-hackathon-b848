import { Routes } from '@angular/router';
import { ScenarioRepository } from '../core/scenarios/scenario-repository';
import { SoloSession } from '../solo/solo-session.service';
import { SOLO_NAVIGATION } from '../solo/solo-navigation';
import { StudioPreviewRepository } from './studio-workspace.service';

export const STUDIO_PREVIEW_ROUTES: Routes = [{
  path: ':id',
  providers: [SoloSession, { provide: ScenarioRepository, useClass: StudioPreviewRepository }, {
    provide: SOLO_NAVIGATION, useValue: { base: '/studio/preview', back: '/studio', backLabel: 'До Studio', privatePreview: true }
  }],
  children: [
    { path: 'play', loadComponent: () => import('../solo/solo-player.component').then(module => module.SoloPlayerComponent) },
    { path: 'debrief', loadComponent: () => import('../debrief/debrief.component').then(module => module.DebriefComponent) }
  ]
}];
