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
  readonly presentation: Record<string, { summary: string; conflict: string }> = {
    'report-under-pressure': { summary: 'Навчальний звіт потрібен сьогодні, але позначки ще не звірені. Як уточнити факти, не залишивши групу без результату?', conflict: 'Правдивість · лояльність · відповідальність' },
    'fair-selection': { summary: 'Місць у програмі мало. Серед кандидатів — ваш брат і людина з нерівними можливостями підготовки. Як зберегти довіру до відбору?', conflict: 'Неупередженість · справедливість · тиск строків' },
    'quiet-after-formation': { summary: 'Ви помічаєте принизливе ставлення. Людина потребує підтримки, але боїться розголосу. Як допомогти й залишити місце належній перевірці?', conflict: 'Гідність · довіра · процесуальна справедливість' }
  };
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
