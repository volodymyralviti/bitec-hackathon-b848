import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'scenarios' },
  { path: 'scenarios', title: 'Сценарії · Точка рішення', loadComponent: () => import('./catalog/catalog.component').then(module => module.CatalogComponent) },
  { path: 'scenarios/:id/play', title: 'Навчальна ситуація · Точка рішення', loadComponent: () => import('./solo/scenario-preview.component').then(module => module.ScenarioPreviewComponent) },
  { path: 'scenarios/:id/debrief', title: 'Навчальна ситуація · Точка рішення', loadComponent: () => import('./solo/scenario-preview.component').then(module => module.ScenarioPreviewComponent) },
  { path: '**', redirectTo: 'scenarios' }
];
