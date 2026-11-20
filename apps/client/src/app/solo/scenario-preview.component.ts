import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import type { Scenario } from '@eds/scenario-schema';
import { ScenarioLoadError, ScenarioRepository } from '../core/scenarios/scenario-repository';
import { ScenarioStatusComponent } from '../shared/ui/scenario-status.component';
import { SourcesComponent } from '../shared/ui/sources.component';

// Read-only introduction and sources; transitions live exclusively in SoloSession.
@Component({
  selector: 'app-scenario-preview',
  imports: [RouterLink, ScenarioStatusComponent, SourcesComponent],
  template: `
    <a routerLink="/scenarios" class="back-link">← До каталогу</a>
    @if (scenario(); as current) {
      <header class="page-heading">
        <p class="eyebrow">Перед початком · версія {{ current.version }}</p>
        <h1>{{ current.title }}</h1>
        <app-scenario-status [scenario]="current" />
        <p class="lead">{{ current.summary }}</p>
      </header>
      @if (intro(); as opening) {
        <section class="reading-panel" aria-labelledby="intro-heading">
          <h2 id="intro-heading">{{ opening.title }}</h2>
          <p>{{ opening.narrative }}</p>
          @if (opening.context) { <aside class="learning-note">{{ opening.context }}</aside> }
        </section>
      }
      <section class="state-panel" role="status">
        <h2>Готові дослідити ситуацію?</h2>
        <p>Вступ і джерела доступні без прийняття рішень. У проходженні ви побачите наслідки лише обраного маршруту.</p>
        <a [routerLink]="['/scenarios', current.id, 'play']" class="button">Відкрити проходження</a>
        <a routerLink="/scenarios" class="button button-secondary">Повернутися до сценаріїв</a>
      </section>
      <app-sources [sources]="current.sources" />
    } @else if (status() === 'loading') {
      <p class="state-panel" role="status">Завантажуємо ситуацію…</p>
    } @else {
      <div class="state-panel" role="alert">
        <h1>{{ status() === 'not-found' ? 'Сценарій не знайдено' : 'Не вдалося завантажити сценарій' }}</h1>
        <p>Поверніться до каталогу та спробуйте ще раз.</p>
        <a routerLink="/scenarios" class="button">Відкрити каталог</a>
      </div>
    }
  `
})
export class ScenarioPreviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ScenarioRepository);
  private readonly destroyRef = inject(DestroyRef);
  readonly scenario = signal<Scenario | null>(null);
  readonly status = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  readonly intro = computed(() => {
    const scenario = this.scenario();
    const opening = scenario?.nodes.find(node => node.id === scenario.startNodeId);
    return opening?.type === 'narrative' ? opening : null;
  });

  constructor() {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.status.set('loading');
        this.scenario.set(null);
        return this.repository.getById(params.get('id') ?? '').pipe(catchError(error => {
          this.status.set(error instanceof ScenarioLoadError && error.kind === 'not-found' ? 'not-found' : 'error');
          return of(null);
        }));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(scenario => {
      this.scenario.set(scenario);
      if (scenario) this.status.set('ready');
    });
  }
}
