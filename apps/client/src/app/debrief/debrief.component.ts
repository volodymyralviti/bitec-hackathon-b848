import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import type { Scenario } from '@eds/scenario-schema';
import { ScenarioLoadError, ScenarioRepository } from '../core/scenarios/scenario-repository';
import { ScenarioStatusComponent } from '../shared/ui/scenario-status.component';
import { SourcesComponent } from '../shared/ui/sources.component';
import { DimensionsComponent, TimelineComponent } from '../shared/ui/consequences.component';
import { SoloSession } from '../solo/solo-session.service';
import { SOLO_NAVIGATION } from '../solo/solo-navigation';

@Component({
  selector: 'app-debrief',
  imports: [RouterLink, ScenarioStatusComponent, SourcesComponent, DimensionsComponent, TimelineComponent],
  templateUrl: './debrief.component.html'
})
export class DebriefComponent {
  readonly navigation = inject(SOLO_NAVIGATION);
  readonly session = inject(SoloSession);
  private readonly repository = inject(ScenarioRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly scenario = signal<Scenario | null>(null);
  readonly status = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  readonly report = computed(() => {
    const scenario = this.scenario();
    const state = this.session.state();
    return scenario && state?.scenarioId === scenario.id && state.scenarioVersion === scenario.version
      ? this.session.debrief() : null;
  });
  readonly sources = computed(() => this.scenario()?.sources.filter(source => this.report()?.sourceIds.includes(source.sourceId)) ?? []);
  readonly legalQuestions = computed(() => {
    const scenario = this.scenario();
    return (this.report()?.decisions ?? []).flatMap(record => {
      const node = scenario?.nodes.find(item => item.id === record.nodeId);
      const choice = node?.type === 'decision' ? node.choices.find(item => item.id === record.choiceId) : undefined;
      return choice?.legalQuestions ? [{ label: record.label, text: choice.legalQuestions }] : [];
    });
  });

  constructor() {
    this.route.paramMap.pipe(switchMap(params => {
      this.status.set('loading');
      this.scenario.set(null);
      return this.repository.getById(params.get('id') ?? '').pipe(catchError(error => {
        this.status.set(error instanceof ScenarioLoadError && error.kind === 'not-found' ? 'not-found' : 'error');
        return of(null);
      }));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(scenario => {
      if (scenario) { this.scenario.set(scenario); this.status.set('ready'); }
    });
  }

  restart(): void {
    const scenario = this.scenario();
    if (!scenario) return;
    this.session.start(scenario);
    void this.router.navigate([this.navigation.base, scenario.id, 'play']);
  }
}
