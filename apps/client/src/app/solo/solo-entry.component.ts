import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SoloSession } from './solo-session.service';

@Component({
  imports: [RouterLink],
  template: `
    <section class="state-panel" role="status">
      <h1>{{ debrief ? 'Немає завершеного проходження' : 'Оберіть навчальну ситуацію' }}</h1>
      <p>Відкрийте сценарій із каталогу. Прогрес зберігається лише в пам’яті цієї вкладки.</p>
      <a routerLink="/scenarios" class="button">Відкрити каталог</a>
    </section>
  `
})
export class SoloEntryComponent {
  readonly debrief = inject(ActivatedRoute).snapshot.data['mode'] === 'debrief';
  constructor() {
    const session = inject(SoloSession);
    const state = session.state();
    if (state && (!this.debrief || state.status === 'completed')) {
      void inject(Router).navigate(['/scenarios', state.scenarioId, this.debrief ? 'debrief' : 'play'], { replaceUrl: true });
    }
  }
}
