import { Component, input } from '@angular/core';
import type { SourceReference } from '@eds/scenario-schema';

@Component({
  selector: 'app-sources',
  template: `
    <section aria-label="Нормативна база та джерела" class="sources">
      <h2>Нормативна база та джерела</h2>
      <p class="muted">Методика, авторська інтерпретація та правові норми мають різний статус. Наявність посилання не підтверджує його застосовності.</p>
      <p class="small">Формат URL, звірка першоджерела та експертна перевірка застосовності — три окремі рівні. Автоматична валідація не відкриває URL і не підтверджує доступність документа.</p>
      @for (source of sources(); track source.sourceId) {
        <details class="source-card reading-details" [attr.data-source-id]="source.sourceId">
          <summary>{{ source.title }} · {{ verificationLabel(source.verificationStatus) }}</summary>
          <p><span class="badge">{{ typeLabel(source.sourceType) }}</span>
            <span class="badge" [class.badge-demo]="source.verificationStatus === 'unverified'">{{ verificationLabel(source.verificationStatus) }}</span></p>
          @if (source.sourceType === 'normative' && source.verificationStatus !== 'expert_checked') { <p class="learning-note">Правову застосовність цього джерела ще не підтверджено.</p> }
          @if (source.sourceType === 'methodology') { <p>Методична рекомендація, а не правова норма.</p> }
          @if (source.documentType === 'judgment') { <p>Правова позиція суду потребує окремої перевірки застосовності до цієї ситуації.</p> }
          @if (source.issuer) { <p>{{ source.issuer }}</p> }
          @if (source.documentNumber) { <p>Номер документа: {{ source.documentNumber }}</p> }
          @if (source.relevance) { <p><strong>Релевантність:</strong> {{ source.relevance }}</p> } @else { <p>Релевантність окремо не пояснена.</p> }
          @if (source.applicabilityQuestions) { <p><strong>Питання застосовності:</strong> {{ source.applicabilityQuestions }}</p> }
          @if (source.court) { <p>Суд: {{ source.court }} · Справа: {{ source.caseNumber ?? 'Не вказано' }}</p> }
          @if (source.legalPosition) { <p>{{ source.legalPosition }}</p> }
          @if (source.pinpoint) { <p><strong>Точний локатор:</strong> {{ source.pinpoint }}</p> }
          @if (source.url) {
            <a [href]="source.url" target="_blank" rel="noopener noreferrer">Відкрити джерело (нова вкладка)</a>
          }
          @if (source.fileCitation) { <p class="citation">{{ source.fileCitation }}</p> }
          <dl class="source-metadata">
            <div><dt>Редакція</dt><dd>{{ source.revision ?? 'Не встановлена' }}</dd></div>
            <div><dt>Версія станом на</dt><dd>{{ source.versionAsOf ?? 'Не встановлена' }}</dd></div>
            <div><dt>Дата перевірки</dt><dd>{{ source.verifiedAt ?? 'Не перевірено' }}</dd></div>
            @if (source.documentDate) { <div><dt>Дата документа</dt><dd>{{ source.documentDate }}</dd></div> }
          </dl>
          @if (source.verificationEvidence) { <p><strong>Запис звірки:</strong> {{ source.verificationEvidence }}</p> }
        </details>
      }
    </section>
  `
})
export class SourcesComponent {
  readonly sources = input.required<SourceReference[]>();

  typeLabel(type: SourceReference['sourceType']): string {
    return { methodology: 'Методика', normative: 'Нормативне джерело', editorial: 'Авторська інтерпретація' }[type];
  }

  verificationLabel(status: SourceReference['verificationStatus']): string {
    return { unverified: 'Не перевірено', team_checked: 'Позначено перевірку командою', expert_checked: 'Позначено експертну перевірку' }[status];
  }
}
