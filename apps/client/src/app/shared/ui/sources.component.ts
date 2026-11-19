import { Component, input } from '@angular/core';
import type { SourceReference } from '@eds/scenario-schema';

@Component({
  selector: 'app-sources',
  template: `
    <section aria-labelledby="source-heading" class="sources">
      <h2 id="source-heading">Джерела та межі перевірки</h2>
      <p class="muted">Методика, авторська інтерпретація та правові норми мають різний статус. Наявність посилання не підтверджує його застосовності.</p>
      @for (source of sources(); track source.sourceId) {
        <article class="source-card">
          <h3>{{ source.title }}</h3>
          <p><span class="badge">{{ typeLabel(source.sourceType) }}</span>
            <span class="badge" [class.badge-demo]="source.verificationStatus === 'unverified'">{{ verificationLabel(source.verificationStatus) }}</span></p>
          @if (source.issuer) { <p>{{ source.issuer }}</p> }
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
        </article>
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
