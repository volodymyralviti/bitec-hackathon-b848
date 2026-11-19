import { Component, input } from '@angular/core';
import type { Scenario } from '@eds/scenario-schema';

@Component({
  selector: 'app-scenario-status',
  template: `
    <div class="badges" aria-label="Статус матеріалу">
      @if (scenario().contentReview.demoOnly) {
        <span class="badge badge-demo">Демонстраційний матеріал</span>
      }
      @if (scenario().contentReview.status !== 'expert_approved') {
        <span class="badge">Без експертного схвалення</span>
      } @else {
        <span class="badge">Автором позначено експертне review</span>
      }
      @if (scenario().contentReview.aiAssisted) {
        <span class="badge">Створено за участю ШІ</span>
      }
    </div>
  `
})
export class ScenarioStatusComponent {
  readonly scenario = input.required<Scenario>();
}
