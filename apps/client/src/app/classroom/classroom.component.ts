import { Component, DestroyRef, ElementRef, afterRenderEffect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScenarioRepository } from '../core/scenarios/scenario-repository';
import type { Scenario } from '@eds/scenario-schema';
import { ClassroomSession } from './classroom-session.service';
import { ClassroomViewComponent } from './classroom-view.component';

@Component({ selector: 'app-classroom', imports: [ReactiveFormsModule, RouterLink, DatePipe, ClassroomViewComponent], providers: [ClassroomSession], templateUrl: './classroom.component.html' })
export class ClassroomComponent {
  readonly session = inject(ClassroomSession);
  private readonly repository = inject(ScenarioRepository);
  private readonly destroyRef = inject(DestroyRef);
  readonly host = inject(ActivatedRoute).snapshot.data['host'] === true;
  readonly pin = new FormControl(inject(ActivatedRoute).snapshot.paramMap.get('pin') ?? '', { nonNullable: true });
  readonly scenarioId = new FormControl('', { nonNullable: true });
  readonly branch = new FormControl('', { nonNullable: true });
  readonly scenarios = signal<Scenario[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private lastNode = '';
  constructor() {
    if (this.host) this.loadCatalog();
    const element = inject<ElementRef<HTMLElement>>(ElementRef);
    afterRenderEffect(() => {
      const state = this.session.state(); const key = state ? `${state.node.id}:${state.phase}` : '';
      if (key && key !== this.lastNode) { this.lastNode = key; this.branch.reset(); element.nativeElement.querySelector<HTMLElement>('#classroom-node')?.focus(); }
    });
  }
  loadCatalog() { this.loading.set(true); this.error.set(''); this.repository.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: scenarios => { this.scenarios.set(scenarios); this.scenarioId.setValue(scenarios[0]?.id ?? ''); this.loading.set(false); }, error: () => { this.error.set('Не вдалося завантажити каталог. Перевірте сервер і повторіть.'); this.loading.set(false); } }); }
  create() {
    if (!this.scenarioId.value || this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.session.create(this.scenarioId.value).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: credential => { this.loading.set(false); this.session.host(credential); }, error: () => { this.loading.set(false); this.error.set('Не вдалося створити кімнату: сервер недоступний або досягнуто місткості.'); } });
  }
  join() { if (!/^\d{6}$/.test(this.pin.value)) { this.error.set('Введіть PIN із шести цифр.'); return; } this.error.set(''); this.session.join(this.pin.value); }
  joinUrl() { return `${location.origin}/classroom/join/${this.session.state()?.pin ?? ''}`; }
  end() { if (confirm('Завершити заняття й очистити тимчасові голоси та доступ?')) this.session.command('end'); }
}
