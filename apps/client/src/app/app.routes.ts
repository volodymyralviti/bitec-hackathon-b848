import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'scenarios' },
  { path: 'scenarios', title: 'Сценарії · Точка рішення', loadComponent: () => import('./catalog/catalog.component').then(module => module.CatalogComponent) },
  { path: 'studio/preview', title: 'Приватний preview · Studio', loadChildren: () => import('./scenario-studio/studio.routes').then(module => module.STUDIO_PREVIEW_ROUTES) },
  { path: 'studio', title: 'Майстерня сценаріїв · Точка рішення', loadComponent: () => import('./scenario-studio/studio.component').then(module => module.StudioComponent) },
  { path: 'scenarios/:id/play', title: 'Проходження · Точка рішення', loadComponent: () => import('./solo/solo-player.component').then(module => module.SoloPlayerComponent) },
  { path: 'scenarios/:id/debrief', title: 'Розбір рішень · Точка рішення', loadComponent: () => import('./debrief/debrief.component').then(module => module.DebriefComponent) },
  { path: 'scenarios/:id/preview', title: 'Вступ і джерела · Точка рішення', loadComponent: () => import('./solo/scenario-preview.component').then(module => module.ScenarioPreviewComponent) },
  { path: 'play', loadComponent: () => import('./solo/solo-entry.component').then(module => module.SoloEntryComponent) },
  { path: 'debrief', data: { mode: 'debrief' }, loadComponent: () => import('./solo/solo-entry.component').then(module => module.SoloEntryComponent) },
  { path: '**', redirectTo: 'scenarios' }
];
