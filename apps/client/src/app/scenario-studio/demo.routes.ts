import { Routes } from '@angular/router';
import { ScenarioRepository } from '../core/scenarios/scenario-repository';
import { SoloSession } from '../solo/solo-session.service';
import { SOLO_NAVIGATION } from '../solo/solo-navigation';
import { StudioPreviewRepository, StudioWorkspace } from './studio-workspace.service';
import { DEMO_STUDIO } from './studio-mode';
import { studioExitGuard } from './studio-exit.guard';

export const DEMO_STUDIO_ROUTES: Routes = [{
  path: '', providers: [StudioWorkspace, { provide: DEMO_STUDIO, useValue: true }],
  children: [
    { path: '', pathMatch: 'full', canDeactivate: [studioExitGuard], loadComponent: () => import('./studio.component').then(module => module.StudioComponent) },
    { path: 'preview/:id', providers: [SoloSession, { provide: ScenarioRepository, useClass: StudioPreviewRepository }, {
      provide: SOLO_NAVIGATION, useValue: { base: '/studio/demo/preview', back: '/studio/demo', backLabel: 'Повернутися до майстерні', privatePreview: true, demo: true }
    }], children: [
      { path: 'play', loadComponent: () => import('../solo/solo-player.component').then(module => module.SoloPlayerComponent) },
      { path: 'debrief', loadComponent: () => import('../debrief/debrief.component').then(module => module.DebriefComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'play' },
    ] },
    { path: '**', redirectTo: '' },
  ]
}];
