import { validateScenario, type Choice, type Debrief, type Effect, type Metric, type Scenario, type ScenarioNode } from '@eds/scenario-schema';

export type RunStatus = 'active' | 'completed';
export interface Metrics { transparency: number; fairness: number; trust: number; effectiveness: number }
export interface DecisionRecord { nodeId: string; choiceId: string; label: string; explanation: string; decisionNumber: number }
export interface PendingEffect { id: string; trigger: { type: 'after_decisions'; dueDecision: number } | { type: 'on_enter_node'; nodeId: string }; effects: Effect[]; consequenceText: string; ownerNodeId: string; choiceId: string; plannedAtDecision: number; sequence: number }
export interface TimelineEntry { kind: 'decision' | 'immediate' | 'delayed'; nodeId: string; choiceId?: string; eventId?: string; ownerNodeId?: string; plannedAtDecision?: number; text: string; effects?: Effect[]; decisionNumber: number }
export interface SimulationState { scenarioId: string; scenarioVersion: string; currentNodeId: string; status: RunStatus; metrics: Metrics; decisionHistory: DecisionRecord[]; decisionCount: number; visitedNodeIds: string[]; pendingEffects: PendingEffect[]; unrealizedEffects: PendingEffect[]; appliedDelayedEffectIds: string[]; timeline: TimelineEntry[] }
export interface ScenarioDebrief { scenarioId: string; scenarioVersion: string; endingNodeId: string; endingTitle: string; explanation: Debrief; decisions: DecisionRecord[]; appliedEffects: TimelineEntry[]; finalMetrics: Metrics; reflectionQuestions: string[]; valuesInTension: string[]; sourceIds: string[]; limitations: string; unrealizedEffects: PendingEffect[] }

export class ScenarioEngineError extends Error { constructor(message: string, readonly code: string) { super(message); this.name = new.target.name; } }
export class InvalidScenarioError extends ScenarioEngineError { constructor(message: string) { super(message, 'INVALID_SCENARIO'); } }
export class InvalidStateError extends ScenarioEngineError { constructor(message: string) { super(message, 'INVALID_STATE'); } }
export class UnknownChoiceError extends ScenarioEngineError { constructor(id: string) { super(`Unknown choice: ${id}`, 'UNKNOWN_CHOICE'); } }
export class ChoiceFromDifferentNodeError extends ScenarioEngineError { constructor(id: string) { super(`Choice does not belong to current decision node: ${id}`, 'CHOICE_FROM_DIFFERENT_NODE'); } }
export class NarrativeDecisionError extends ScenarioEngineError { constructor() { super('Cannot make a decision on a narrative node', 'NARRATIVE_DECISION'); } }
export class CompletedScenarioError extends ScenarioEngineError { constructor() { super('Scenario is already completed', 'SCENARIO_COMPLETED'); } }
export class ScenarioVersionMismatchError extends ScenarioEngineError { constructor() { super('Scenario and state versions do not match', 'SCENARIO_VERSION_MISMATCH'); } }

const metrics = (): Metrics => ({ transparency: 0, fairness: 0, trust: 0, effectiveness: 0 });
const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const nodeMap = (scenario: Scenario) => new Map(scenario.nodes.map(node => [node.id, node]));
const validatePair = (scenario: Scenario, state: SimulationState): void => {
  // Full structural + graph validation happens once in startScenario. Callers must
  // reuse the same validated, immutable scenario for the lifetime of a run.
  if (!scenario || typeof scenario !== 'object' || typeof scenario.id !== 'string' || typeof scenario.version !== 'string' || !Array.isArray(scenario.nodes)) throw new InvalidScenarioError('Scenario is not a valid engine input');
  if (!state || typeof state !== 'object' || state.scenarioId !== scenario.id || typeof state.scenarioVersion !== 'string' || typeof state.currentNodeId !== 'string' || !['active', 'completed'].includes(state.status) || !Number.isSafeInteger(state.decisionCount) || state.decisionCount < 0 || !Array.isArray(state.visitedNodeIds) || !Array.isArray(state.pendingEffects) || !Array.isArray(state.unrealizedEffects) || !Array.isArray(state.appliedDelayedEffectIds) || !Array.isArray(state.timeline) || !Array.isArray(state.decisionHistory) || state.decisionHistory.length !== state.decisionCount || !state.metrics || !['transparency', 'fairness', 'trust', 'effectiveness'].every(k => Number.isSafeInteger(state.metrics[k as keyof Metrics])) || !state.visitedNodeIds.every(id => typeof id === 'string') || !state.visitedNodeIds.includes(state.currentNodeId) || !state.appliedDelayedEffectIds.every(id => typeof id === 'string') || new Set(state.appliedDelayedEffectIds).size !== state.appliedDelayedEffectIds.length) throw new InvalidStateError('State does not match the engine state shape');
  try {
    if (JSON.stringify(state) === undefined) throw new Error('State is not JSON data');
  } catch {
    throw new InvalidStateError('State must be JSON serializable');
  }
  const appliedIds = new Set(state.appliedDelayedEffectIds);
  const pendingIds = state.pendingEffects.map(event => event?.id);
  const unrealizedIds = state.unrealizedEffects.map(event => event?.id);
  const nodes = nodeMap(scenario);
  const validEffects = (effects: unknown): boolean => Array.isArray(effects) && effects.length > 0 && effects.every(effect => effect && ['transparency', 'fairness', 'trust', 'effectiveness'].includes(effect.metric) && Number.isSafeInteger(effect.delta) && effect.delta >= -10 && effect.delta <= 10 && typeof effect.explanation === 'string');
  const authoredEvents = new Map<string, { nodeId: string; choiceId: string; event: NonNullable<Choice['schedule']>[number] }>();
  for (const node of scenario.nodes) if (node.type === 'decision') for (const choice of node.choices) for (const event of choice.schedule ?? []) authoredEvents.set(event.id, { nodeId: node.id, choiceId: choice.id, event });
  const authoredMatch = (event: PendingEffect): boolean => {
    const source = authoredEvents.get(event.id);
    const decision = state.decisionHistory[event.plannedAtDecision - 1];
    if (!source || !decision || source.nodeId !== event.ownerNodeId || source.choiceId !== event.choiceId || decision.nodeId !== event.ownerNodeId || decision.choiceId !== event.choiceId || event.consequenceText !== source.event.consequenceText || JSON.stringify(event.effects) !== JSON.stringify(source.event.effects)) return false;
    return source.event.trigger.type === 'after_decisions'
      ? event.trigger.type === 'after_decisions' && event.trigger.dueDecision === event.plannedAtDecision + source.event.trigger.count
      : event.trigger.type === 'on_enter_node' && event.trigger.nodeId === source.event.trigger.nodeId;
  };
  const validPending = (event: PendingEffect): boolean => !!event && typeof event.id === 'string' && event.id.length > 0 && typeof event.ownerNodeId === 'string' && typeof event.choiceId === 'string' && typeof event.consequenceText === 'string' && Number.isSafeInteger(event.sequence) && event.sequence >= 0 && Number.isSafeInteger(event.plannedAtDecision) && event.plannedAtDecision > 0 && event.plannedAtDecision <= state.decisionCount && validEffects(event.effects) && !!event.trigger && (event.trigger.type === 'after_decisions' ? Number.isSafeInteger(event.trigger.dueDecision) && event.trigger.dueDecision > event.plannedAtDecision : event.trigger.type === 'on_enter_node' && typeof event.trigger.nodeId === 'string' && nodes.has(event.trigger.nodeId)) && authoredMatch(event);
  const delayedTimeline = state.timeline.filter(entry => entry?.kind === 'delayed');
  const validDelayedTimeline = delayedTimeline.every(entry => {
    const source = entry.eventId ? authoredEvents.get(entry.eventId) : undefined;
    const decision = entry.plannedAtDecision ? state.decisionHistory[entry.plannedAtDecision - 1] : undefined;
    return !!source && !!decision && entry.ownerNodeId === source.nodeId && entry.choiceId === source.choiceId && decision.nodeId === source.nodeId && decision.choiceId === source.choiceId && entry.text === source.event.consequenceText && JSON.stringify(entry.effects) === JSON.stringify(source.event.effects) && Number.isSafeInteger(entry.decisionNumber) && entry.decisionNumber >= entry.plannedAtDecision!;
  });
  const timelineIds = delayedTimeline.map(entry => entry.eventId);
  if (!state.pendingEffects.every(validPending) || !state.unrealizedEffects.every(validPending) || !validDelayedTimeline || new Set(pendingIds).size !== pendingIds.length || new Set(unrealizedIds).size !== unrealizedIds.length || pendingIds.some(id => appliedIds.has(id)) || unrealizedIds.some(id => appliedIds.has(id) || pendingIds.includes(id)) || new Set(timelineIds).size !== timelineIds.length || timelineIds.length !== appliedIds.size || timelineIds.some(id => typeof id !== 'string' || !appliedIds.has(id))) throw new InvalidStateError('Pending, applied and unrealized event IDs or payloads are inconsistent');
  if (state.scenarioVersion !== scenario.version) throw new ScenarioVersionMismatchError();
  const current = nodes.get(state.currentNodeId);
  if (!current) throw new InvalidStateError('Current node is absent from scenario');
  if ((state.status === 'completed') !== (current.type === 'ending') || (state.status === 'completed' && state.pendingEffects.length > 0)) throw new InvalidStateError('Status does not match the current node or pending queue');
  if (state.status === 'active' && state.unrealizedEffects.length > 0) throw new InvalidStateError('Active state cannot have unrealized ending effects');
};
const addEffects = (current: Metrics, effects: Effect[]): Metrics => {
  const next = { ...current };
  for (const effect of effects) next[effect.metric as Metric] += effect.delta;
  return next;
};
const sortedDue = (pending: PendingEffect[], predicate: (effect: PendingEffect) => boolean) => pending.filter(predicate).sort((a, b) => a.sequence - b.sequence || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export function startScenario(scenario: Scenario): SimulationState {
  const result = validateScenario(scenario);
  if (!result.success) throw new InvalidScenarioError(result.errors.map(error => error.code).join(', '));
  return { scenarioId: scenario.id, scenarioVersion: scenario.version, currentNodeId: scenario.startNodeId, status: 'active', metrics: metrics(), decisionHistory: [], decisionCount: 0, visitedNodeIds: [scenario.startNodeId], pendingEffects: [], unrealizedEffects: [], appliedDelayedEffectIds: [], timeline: [] };
}
export function getCurrentNode(scenario: Scenario, state: SimulationState): ScenarioNode {
  validatePair(scenario, state);
  return cloneJson(nodeMap(scenario).get(state.currentNodeId)!);
}
export function getAvailableOptions(scenario: Scenario, state: SimulationState): Choice[] {
  const node = getCurrentNode(scenario, state);
  return state.status === 'active' && node.type === 'decision' ? cloneJson(node.choices) : [];
}
export function makeDecision(scenario: Scenario, state: SimulationState, choiceId: string): SimulationState {
  validatePair(scenario, state);
  if (state.status === 'completed') throw new CompletedScenarioError();
  const node = nodeMap(scenario).get(state.currentNodeId)!;
  if (node.type === 'narrative') throw new NarrativeDecisionError();
  if (node.type !== 'decision') throw new CompletedScenarioError();
  const choice = node.choices.find(item => item.id === choiceId);
  if (!choice) {
    const elsewhere = scenario.nodes.some(candidate => candidate.type === 'decision' && candidate.choices.some(item => item.id === choiceId));
    if (elsewhere) throw new ChoiceFromDifferentNodeError(choiceId);
    throw new UnknownChoiceError(choiceId);
  }
  const decisionNumber = state.decisionCount + 1;
  const base = cloneJson(state);
  let next: SimulationState = { ...base, metrics: addEffects(base.metrics, choice.immediateEffects), decisionCount: decisionNumber, currentNodeId: node.id, decisionHistory: [...base.decisionHistory, { nodeId: node.id, choiceId, label: choice.label, explanation: choice.explanation, decisionNumber }], timeline: [...base.timeline, ...choice.immediateEffects.map(effect => ({ kind: 'immediate' as const, nodeId: node.id, choiceId, text: effect.explanation, effects: [effect], decisionNumber })), { kind: 'decision', nodeId: node.id, choiceId, text: choice.explanation, decisionNumber }] };
  const pending = [...base.pendingEffects];
  let sequence = pending.reduce((max, item) => Math.max(max, item.sequence), -1) + 1;
  for (const event of choice.schedule ?? []) pending.push({ id: event.id, trigger: event.trigger.type === 'after_decisions' ? { type: 'after_decisions', dueDecision: decisionNumber + event.trigger.count } : { type: 'on_enter_node', nodeId: event.trigger.nodeId }, effects: event.effects.map(effect => ({ ...effect })), consequenceText: event.consequenceText, ownerNodeId: node.id, choiceId: choice.id, plannedAtDecision: decisionNumber, sequence: sequence++ });
  next = { ...next, pendingEffects: pending };
  // Counter phase runs before arrival; scheduling decision is excluded by dueDecision=decisionNumber+count.
  const counterDue = sortedDue(next.pendingEffects, event => event.trigger.type === 'after_decisions' && event.trigger.dueDecision <= decisionNumber);
  next = applyDue(next, counterDue);
  next = applyNodeEntry(scenario, next, choice.nextNodeId);
  return next;
}
function applyDue(state: SimulationState, due: PendingEffect[]): SimulationState {
  if (!due.length) return state;
  const ids = new Set(due.map(event => event.id));
  let result = state;
  for (const event of due) {
    if (result.appliedDelayedEffectIds.includes(event.id)) continue;
    result = { ...result, metrics: addEffects(result.metrics, event.effects), appliedDelayedEffectIds: [...result.appliedDelayedEffectIds, event.id], timeline: [...result.timeline, { kind: 'delayed', nodeId: result.currentNodeId, choiceId: event.choiceId, eventId: event.id, ownerNodeId: event.ownerNodeId, plannedAtDecision: event.plannedAtDecision, text: event.consequenceText, effects: event.effects.map(effect => ({ ...effect })), decisionNumber: result.decisionCount }] };
  }
  return { ...result, pendingEffects: result.pendingEffects.filter(event => !ids.has(event.id)) };
}
function applyNodeEntry(scenario: Scenario, state: SimulationState, nodeId: string): SimulationState {
  let next = { ...state, currentNodeId: nodeId, visitedNodeIds: [...state.visitedNodeIds, nodeId] };
  const due = sortedDue(next.pendingEffects, event => event.trigger.type === 'on_enter_node' && event.trigger.nodeId === nodeId);
  next = applyDue(next, due);
  const node = nodeMap(scenario).get(nodeId)!;
  if (node.type === 'ending') next = { ...next, status: 'completed', unrealizedEffects: next.pendingEffects.map(event => ({ ...event })), pendingEffects: [] };
  return next;
}
export function advanceNarrative(scenario: Scenario, state: SimulationState): SimulationState {
  validatePair(scenario, state);
  if (state.status === 'completed') throw new CompletedScenarioError();
  const node = nodeMap(scenario).get(state.currentNodeId)!;
  if (node.type !== 'narrative') throw new InvalidStateError('Current node is not narrative');
  return applyNodeEntry(scenario, cloneJson(state), node.nextNodeId);
}
export function getDebrief(scenario: Scenario, state: SimulationState): ScenarioDebrief {
  const node = getCurrentNode(scenario, state);
  if (state.status !== 'completed' || node.type !== 'ending') throw new InvalidStateError('Debrief is available only after completion');
  const selectedSourceIds = state.decisionHistory.flatMap(record => {
    const decision = nodeMap(scenario).get(record.nodeId);
    return decision?.type === 'decision' ? decision.choices.find(choice => choice.id === record.choiceId)?.sourceIds ?? [] : [];
  });
  const visitedSourceIds = state.visitedNodeIds.flatMap(id => nodeMap(scenario).get(id)?.sourceIds ?? []);
  return cloneJson({ scenarioId: scenario.id, scenarioVersion: scenario.version, endingNodeId: node.id, endingTitle: node.title, explanation: node.debrief, decisions: state.decisionHistory, appliedEffects: state.timeline.filter(item => item.kind === 'immediate' || item.kind === 'delayed'), finalMetrics: state.metrics, reflectionQuestions: node.debrief.reflectionQuestions, valuesInTension: node.debrief.valuesInTension, sourceIds: [...new Set([...visitedSourceIds, ...selectedSourceIds, ...node.debrief.sourceIds])], limitations: node.debrief.limitations, unrealizedEffects: state.unrealizedEffects });
}
