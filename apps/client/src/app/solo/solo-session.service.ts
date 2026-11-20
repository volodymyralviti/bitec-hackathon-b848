import { Injectable, computed, signal } from '@angular/core';
import type { Scenario } from '@eds/scenario-schema';
import {
  startScenario, getCurrentNode, getAvailableOptions, makeDecision, advanceNarrative, getDebrief,
  type SimulationState, type TimelineEntry
} from '@eds/scenario-engine';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

@Injectable({ providedIn: 'root' })
export class SoloSession {
  private readonly run = signal<{ scenario: Scenario; state: SimulationState } | null>(null);
  private readonly selected = signal<{ nodeId: string; choiceId: string } | null>(null);
  private readonly feedbackValue = signal<TimelineEntry[] | null>(null);
  private readonly errorValue = signal('');
  readonly scenario = computed(() => this.run()?.scenario ?? null);
  readonly state = computed(() => this.run()?.state ?? null);
  readonly node = computed(() => {
    const run = this.run();
    return run ? getCurrentNode(run.scenario, run.state) : null;
  });
  readonly options = computed(() => {
    const run = this.run();
    return run ? getAvailableOptions(run.scenario, run.state) : [];
  });
  readonly selectedChoiceId = computed(() => this.selected()?.choiceId ?? null);
  readonly feedback = this.feedbackValue.asReadonly();
  readonly error = this.errorValue.asReadonly();
  readonly debrief = computed(() => {
    const run = this.run();
    return run?.state.status === 'completed' ? getDebrief(run.scenario, run.state) : null;
  });

  ensure(scenario: Scenario): void {
    if (this.scenario()?.id !== scenario.id || this.scenario()?.version !== scenario.version) this.start(scenario);
  }

  start(scenario: Scenario): void {
    // The engine requires the validated scenario to remain unchanged for the run.
    const immutable = freeze(structuredClone(scenario));
    const state = startScenario(immutable);
    this.run.set({ scenario: immutable, state });
    this.selected.set(null);
    this.feedbackValue.set(null);
    this.errorValue.set('');
  }

  select(choiceId: string): void {
    const node = this.node();
    if (node?.type !== 'decision' || this.feedback() !== null || !this.options().some(option => option.id === choiceId)) return;
    this.selected.set({ nodeId: node.id, choiceId });
    this.errorValue.set('');
  }

  confirm(): void {
    const run = this.run();
    const selected = this.selected();
    // The feedback phase locks the transition before a second click can apply it.
    if (!run || !selected || this.feedback() !== null || selected.nodeId !== run.state.currentNodeId) return;
    try {
      this.apply(makeDecision(run.scenario, run.state, selected.choiceId));
    } catch {
      this.errorValue.set('Не вдалося підтвердити рішення. Спробуйте інший доступний варіант або почніть заново.');
    }
  }

  advance(expectedNodeId?: string): void {
    const run = this.run();
    if (!run || this.feedback() !== null || this.node()?.type !== 'narrative' || (expectedNodeId && run.state.currentNodeId !== expectedNodeId)) return;
    try {
      const next = advanceNarrative(run.scenario, run.state);
      const arrivals = next.timeline.slice(run.state.timeline.length);
      this.run.set({ scenario: run.scenario, state: next });
      this.selected.set(null);
      this.feedbackValue.set(arrivals.length ? arrivals : null);
      this.errorValue.set('');
    } catch {
      this.errorValue.set('Не вдалося перейти далі. Спробуйте почати сценарій заново.');
    }
  }

  continue(): void { this.feedbackValue.set(null); }
  restart(): void { const scenario = this.scenario(); if (scenario) this.start(scenario); }

  private apply(state: SimulationState): void {
    const run = this.run()!;
    this.feedbackValue.set(state.timeline.slice(run.state.timeline.length));
    this.selected.set(null);
    this.run.set({ scenario: run.scenario, state });
    this.errorValue.set('');
  }
}
