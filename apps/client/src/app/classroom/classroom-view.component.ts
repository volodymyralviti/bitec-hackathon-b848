import { Component, input } from '@angular/core';
import { DimensionsComponent, TimelineComponent } from '../shared/ui/consequences.component';
import { SourcesComponent } from '../shared/ui/sources.component';
import type { ClassroomView } from './classroom.model';

@Component({
  selector: 'app-classroom-view', imports: [DimensionsComponent, TimelineComponent, SourcesComponent],
  template: `
    <p class="eyebrow">Спільна навчальна гілка · раунд {{ state().round }}</p>
    <h2 id="classroom-node" tabindex="-1">{{ state().node.title }}</h2>
    <div class="badges">
      @if (state().scenario.contentReview.demoOnly) { <span class="badge badge-demo">Демонстраційний матеріал</span> }
      @if (state().scenario.contentReview.status !== 'expert_approved') { <span class="badge">Без експертного схвалення</span> }
      @if (state().scenario.contentReview.aiAssisted) { <span class="badge">Створено за участю ШІ</span> }
    </div>
    <p class="story-text">{{ state().node.narrative }}</p>
    @if (state().node.context) { <p class="learning-note">{{ state().node.context }}</p> }
    <ul class="value-list">@for (value of state().node.valuesInTension; track $index) { <li>{{ value }}</li> }</ul>
    @if (state().aggregate; as aggregate) {
      <section class="state-panel" data-classroom-results aria-labelledby="aggregate-heading">
        <h2 id="aggregate-heading">Після закриття голосування</h2>
        @if (aggregate.suppressed) {
          <p data-results-suppressed>Розподіл приховано: для показу потрібно щонайменше {{ aggregate.minimum }} поданих голосів. Точна кількість не розкривається.</p>
        } @else {
          <p>Усього голосів: {{ aggregate.total }}</p>
          <ul>@for (item of aggregate.choices; track item.choiceId) { <li data-aggregate-choice>{{ label(item.choiceId) }} — {{ item.count }} ({{ item.percent }}%)</li> }</ul>
        }
        <p class="small muted">Це підстава для обговорення. Ведучий явно обирає спільну гілку; більшість не є етичним чи правовим схваленням.</p>
      </section>
    }
    @if (state().decisionCount) {
      <details class="reading-details"><summary>Наслідки спільної гілки</summary>
        <app-dimensions [values]="state().metrics" /><app-timeline [entries]="state().timeline" />
      </details>
    }
    @if (state().debrief; as report) {
      <section class="state-panel" data-classroom-debrief><h2>Спільний розбір: {{ report.endingTitle }}</h2>
        <p>{{ report.explanation.summary }}</p><h3>Короткострокові наслідки</h3><p>{{ report.explanation.shortTerm }}</p>
        <h3>Довгострокові наслідки</h3><p>{{ report.explanation.longTerm }}</p>
        <h3>Питання для обговорення</h3><ul>@for (question of report.reflectionQuestions; track $index) { <li>{{ question }}</li> }</ul>
        <p>{{ report.limitations }}</p><p>Маршрут обрано ведучим для групи. Індивідуального звіту або оцінки особистості немає.</p>
      </section>
    }
    <details class="reading-details"><summary>Атрибуція, джерела та їхні обмеження</summary>
      @for (item of state().scenario.basedOn; track $index) { <p>{{ item }}</p> }
      <app-sources [sources]="state().scenario.sources" />
    </details>
  `
})
export class ClassroomViewComponent {
  readonly state = input.required<ClassroomView>();
  label(id: string) { return this.state().node.choices.find(choice => choice.id === id)?.label ?? id; }
}
