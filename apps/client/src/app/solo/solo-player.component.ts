import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { ScenarioLoadError, ScenarioRepository } from '../core/scenarios/scenario-repository';
import { ScenarioStatusComponent } from '../shared/ui/scenario-status.component';
import { SourcesComponent } from '../shared/ui/sources.component';
import { DimensionsComponent, TimelineComponent } from '../shared/ui/consequences.component';
import { SoloSession } from './solo-session.service';
import { SOLO_NAVIGATION } from './solo-navigation';

@Component({
  selector: 'app-solo-player',
  imports: [RouterLink, ScenarioStatusComponent, SourcesComponent, DimensionsComponent, TimelineComponent],
  templateUrl: './solo-player.component.html'
})
export class SoloPlayerComponent {
  readonly navigation = inject(SOLO_NAVIGATION);
  readonly session = inject(SoloSession);
  private readonly repository = inject(ScenarioRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly status = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  readonly selected = computed(() => this.session.options().find(choice => choice.id === this.session.selectedChoiceId()));
  readonly recentDecision = computed(() => this.session.state()?.decisionHistory.at(-1));
  readonly feedbackEvents = computed(() => (this.session.feedback() ?? []).filter(entry => entry.kind !== 'decision'));
  readonly timeline = computed(() => (this.session.state()?.timeline ?? []).filter(entry => entry.kind !== 'decision'));
  readonly restarting = signal(false);
  readonly sources = computed(() => {
    const node = this.session.node();
    const ids = new Set([...(node?.sourceIds ?? []), ...(this.selected()?.sourceIds ?? [])]);
    return this.session.scenario()?.sources.filter(source => ids.has(source.sourceId)) ?? [];
  });

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef);
    afterRenderEffect(() => {
      this.status(); this.session.state()?.currentNodeId; this.session.feedback();
      const root = element.nativeElement;
      const heading = root.querySelector<HTMLElement>('#feedback-heading') ?? root.querySelector<HTMLElement>('#node-heading') ?? root.querySelector<HTMLElement>('h1');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
    });
    this.route.paramMap.pipe(
      switchMap(params => {
        this.status.set('loading');
        this.restarting.set(false);
        return this.repository.getById(params.get('id') ?? '').pipe(catchError(error => {
          this.status.set(error instanceof ScenarioLoadError && error.kind === 'not-found' ? 'not-found' : 'error');
          return of(null);
        }));
      }), takeUntilDestroyed(this.destroyRef)
    ).subscribe(scenario => {
      if (!scenario) return;
      try {
        // An edited private draft can keep the same id/version. Preview must start its new snapshot.
        if (this.navigation.privatePreview) this.session.start(scenario);
        else this.session.ensure(scenario);
        this.status.set('ready');
      }
      catch { this.status.set('error'); }
    });
  }

  restart(): void { this.session.restart(); this.restarting.set(false); }
}
