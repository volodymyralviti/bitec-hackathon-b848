import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { Scenario } from '@eds/scenario-schema';
import { ScenarioRepository } from '../core/scenarios/scenario-repository';
import { ScenarioStatusComponent } from '../shared/ui/scenario-status.component';

@Component({
  selector: 'app-catalog',
  imports: [RouterLink, ScenarioStatusComponent],
  templateUrl: './catalog.component.html'
})
export class CatalogComponent {
  private readonly repository = inject(ScenarioRepository);
  private readonly destroyRef = inject(DestroyRef);
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly scenarios = signal<Scenario[]>([]);
  private loading = false;

  constructor() { this.load(); }

  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.status.set('loading');
    this.repository.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: scenarios => { this.loading = false; this.scenarios.set(scenarios); this.status.set('ready'); },
      error: () => { this.loading = false; this.status.set('error'); }
    });
  }
}
