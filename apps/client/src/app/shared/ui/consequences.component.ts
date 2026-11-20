import { Component, input } from '@angular/core';
import type { Metrics, TimelineEntry } from '@eds/scenario-engine';
import type { Metric } from '@eds/scenario-schema';

export const METRIC_LABELS: Record<Metric, string> = {
  transparency: 'Прозорість', fairness: 'Справедливість', trust: 'Довіра', effectiveness: 'Дієвість'
};

@Component({
  selector: 'app-dimensions',
  template: `
    <section class="dimensions" aria-label="Чотири виміри наслідків">
      @for (metric of keys; track metric) {
        <div><span>{{ labels[metric] }}</span><strong>{{ values()[metric] > 0 ? '+' : '' }}{{ values()[metric] }}</strong></div>
      }
    </section>
    <p class="small muted">Умовні зміни від початкового нуля. Це модель наслідків, не оцінка людини. Спільного морального балу немає.</p>
  `
})
export class DimensionsComponent {
  readonly values = input.required<Metrics>();
  readonly labels = METRIC_LABELS;
  readonly keys: Metric[] = ['transparency', 'fairness', 'trust', 'effectiveness'];
}

@Component({
  selector: 'app-timeline',
  template: `
    <ol class="timeline">
      @for (entry of entries(); track $index) {
        <li [class.delayed-event]="entry.kind === 'delayed'" [attr.data-event-id]="entry.eventId ?? null">
          <p class="event-label">{{ kindLabel(entry.kind) }} · рішення {{ entry.decisionNumber }}</p>
          @if (entry.kind === 'delayed' && entry.plannedAtDecision) {
            <p class="small muted">Пов’язано з вибором на рішенні {{ entry.plannedAtDecision }}</p>
          }
          <p>{{ entry.text }}</p>
          @for (effect of entry.effects ?? []; track $index) {
            <p class="effect-line"><strong>{{ labels[effect.metric] }} {{ effect.delta > 0 ? '+' : '' }}{{ effect.delta }}</strong>
              @if (effect.explanation !== entry.text) { <span> — {{ effect.explanation }}</span> }
            </p>
          }
        </li>
      }
    </ol>
  `
})
export class TimelineComponent {
  readonly entries = input.required<TimelineEntry[]>();
  readonly labels = METRIC_LABELS;
  kindLabel(kind: TimelineEntry['kind']): string {
    return { decision: 'Пояснення вибору', immediate: 'Негайний наслідок', delayed: 'Відкладений наслідок настав' }[kind];
  }
}
