import { Injectable, signal } from '@angular/core';
import { type Scenario, validateScenario } from '@eds/scenario-schema';
import { of, throwError } from 'rxjs';
import { ScenarioRepository, ScenarioLoadError } from '../core/scenarios/scenario-repository';
import { EditorGroup, buildControl } from './form-model';
import type { StudioRecord } from './studio-api.service';
import { inject } from '@angular/core';
import { StudioApi } from './studio-api.service';
import { DEMO_STUDIO, validateDemoScenario } from './studio-mode';

@Injectable({ providedIn: 'root' })
export class StudioWorkspace {
  readonly form = signal<EditorGroup | null>(null);
  readonly record = signal<StudioRecord | null>(null);
  readonly preview = signal<Scenario | null>(null);
  load(scenario: Scenario, record: StudioRecord | null = null) {
    this.form.set(buildControl(scenario) as EditorGroup);
    this.record.set(record);
    if (scenario.publicationStatus !== 'draft' || ['expert_approved', 'changes_requested'].includes(scenario.contentReview.status)) this.form()!.disable();
  }
  clear() { this.form.set(null); this.record.set(null); this.preview.set(null); }
}

@Injectable()
export class StudioPreviewRepository extends ScenarioRepository {
  private readonly workspace = inject(StudioWorkspace);
  private readonly api = inject(StudioApi);
  private readonly demo = inject(DEMO_STUDIO);
  override list() { return of([]); }
  override getById(id: string) {
    const scenario = this.workspace.preview();
    const result = this.demo ? validateDemoScenario(scenario) : validateScenario(scenario);
    return (this.demo || this.api.authorized()) && result.success && result.data.id === id
      ? of(result.data) : throwError(() => new ScenarioLoadError('not-found', 'Локальний preview відсутній або втрачений після reload.'));
  }
}
