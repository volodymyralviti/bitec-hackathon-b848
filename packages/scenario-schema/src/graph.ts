import { issue, type ValidationIssue } from './diagnostics.js';
import { LIMITS, type Scenario, type ScenarioNode } from './schema.js';

export interface GraphValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** For structurally valid data; use validateScenario for untrusted input. */
export function validateScenarioGraph(scenario: Scenario): GraphValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const nodes = new Map<string, ScenarioNode>();
  const positions = new Map<string, number>();
  const edges = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  const delayedIds = new Set<string>();
  let delayedCount = 0;

  scenario.nodes.forEach((node, index) => {
    if (nodes.has(node.id)) {
      errors.push(issue('DUPLICATE_NODE_ID', ['nodes', index, 'id'], 'Ідентифікатор вузла повторюється.', node.id));
    } else {
      nodes.set(node.id, node);
      positions.set(node.id, index);
      edges.set(node.id, []);
      reverse.set(node.id, []);
    }
    if (node.type === 'decision') {
      if (node.choices.length < 2) {
        errors.push(issue('TOO_FEW_CHOICES', ['nodes', index, 'choices'], 'Рішення повинно мати щонайменше два варіанти.', node.id));
      }
      const choiceIds = new Set<string>();
      node.choices.forEach((choice, choiceIndex) => {
        const path = ['nodes', index, 'choices', choiceIndex];
        if (choiceIds.has(choice.id)) {
          errors.push(issue('DUPLICATE_CHOICE_ID', [...path, 'id'], 'Ідентифікатор варіанта повторюється в межах рішення.', node.id));
        }
        choiceIds.add(choice.id);
        choice.schedule?.forEach((event, eventIndex) => {
          delayedCount++;
          if (delayedIds.has(event.id)) {
            errors.push(issue('DUPLICATE_DELAYED_ID', [...path, 'schedule', eventIndex, 'id'], 'Ідентифікатор відкладеного наслідку повинен бути унікальним у сценарії.', node.id));
          }
          delayedIds.add(event.id);
        });
      });
    }
  });

  // Diagnose each bad reference, but do not manufacture edges to absent nodes.
  scenario.nodes.forEach((node, index) => {
    const targets = node.type === 'decision'
      ? node.choices.map((choice, i) => ({ id: choice.nextNodeId, path: ['nodes', index, 'choices', i, 'nextNodeId'] }))
      : node.type === 'narrative' ? [{ id: node.nextNodeId, path: ['nodes', index, 'nextNodeId'] }] : [];
    for (const target of targets) {
      if (!nodes.has(target.id)) {
        errors.push(issue('TARGET_NOT_FOUND', target.path, 'Цільовий вузол не існує.', node.id));
      } else if (positions.get(node.id) === index && !edges.get(node.id)!.includes(target.id)) {
        edges.get(node.id)!.push(target.id);
        reverse.get(target.id)!.push(node.id);
      }
    }
  });

  const walk = (starts: string[], adjacency: Map<string, string[]>, blocked?: string): Set<string> => {
    const seen = new Set<string>();
    const stack = [...starts];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === blocked || seen.has(id) || !nodes.has(id)) continue;
      seen.add(id);
      stack.push(...adjacency.get(id)!);
    }
    return seen;
  };

  if (!nodes.has(scenario.startNodeId)) {
    errors.push(issue('ENTRY_NOT_FOUND', ['startNodeId'], 'Початковий вузол не існує.'));
  }
  const reachable = walk([scenario.startNodeId], edges);
  const endings = [...nodes.values()].filter(node => node.type === 'ending').map(node => node.id);
  const canEnd = walk(endings, reverse);
  for (const [id, index] of positions) {
    if (!reachable.has(id)) {
      errors.push(issue('UNREACHABLE_NODE', ['nodes', index], 'Вузол недосяжний від початку сценарію.', id));
    } else if (!canEnd.has(id)) {
      errors.push(issue('DEAD_END', ['nodes', index], 'З цього вузла немає маршруту до завершення.', id));
    }
  }
  if (!endings.some(id => reachable.has(id))) {
    errors.push(issue('NO_REACHABLE_ENDING', ['nodes'], 'Немає доступного завершення сценарію.'));
  }

  // Kahn + dynamic programming: O(V + E), independent of the number of paths.
  const indegree = new Map([...nodes.keys()].map(id => [id, reverse.get(id)!.length]));
  const order = [...nodes.keys()].filter(id => indegree.get(id) === 0);
  for (let index = 0; index < order.length; index++) {
    for (const target of edges.get(order[index]!)!) {
      const count = indegree.get(target)! - 1;
      indegree.set(target, count);
      if (count === 0) order.push(target);
    }
  }
  const acyclic = order.length === nodes.size;
  if (!acyclic) errors.push(issue('CYCLE', ['nodes'], 'Граф містить цикл; DSL v1 дозволяє лише ациклічні маршрути.'));

  const distance = new Map<string, number>();
  if (nodes.has(scenario.startNodeId)) distance.set(scenario.startNodeId, nodes.get(scenario.startNodeId)!.type === 'decision' ? 1 : 0);
  for (const id of order) {
    const current = distance.get(id);
    if (current === undefined) continue;
    for (const target of edges.get(id)!) {
      const candidate = current + (nodes.get(target)!.type === 'decision' ? 1 : 0);
      distance.set(target, Math.min(distance.get(target) ?? Infinity, candidate));
    }
  }
  for (const ending of endings) {
    const count = distance.get(ending);
    if (count !== undefined && count < 3) {
      errors.push(issue('TOO_SHORT_PATH', ['nodes', positions.get(ending)!], `До завершення є маршрут лише з ${count} рішеннями; потрібно щонайменше три.`, ending));
    }
  }

  const minRemaining = new Map<string, number>();
  const maxRemaining = new Map<string, number>();
  if (acyclic) {
    for (let i = order.length - 1; i >= 0; i--) {
      const id = order[i]!;
      const node = nodes.get(id)!;
      if (node.type === 'ending') {
        minRemaining.set(id, 0);
        maxRemaining.set(id, 0);
      } else {
        const validTargets = edges.get(id)!.filter(target => minRemaining.has(target));
        if (validTargets.length) {
          const weight = node.type === 'decision' ? 1 : 0;
          minRemaining.set(id, weight + Math.min(...validTargets.map(target => minRemaining.get(target)!)));
          maxRemaining.set(id, weight + Math.max(...validTargets.map(target => maxRemaining.get(target)!)));
        }
      }
    }
  }

  const reachCache = new Map<string, Set<string>>();
  const avoidCache = new Map<string, Set<string>>();
  const reachableFrom = (id: string): Set<string> => {
    if (!reachCache.has(id)) reachCache.set(id, walk([id], edges));
    return reachCache.get(id)!;
  };
  if (delayedCount > LIMITS.delayedEffects) {
    errors.push(issue('INPUT_LIMIT', ['nodes'], 'Забагато відкладених наслідків; перевірку їхньої досяжності пропущено.'));
    return { errors, warnings };
  }
  scenario.nodes.forEach((node, index) => {
    if (node.type !== 'decision') return;
    node.choices.forEach((choice, choiceIndex) => {
      choice.schedule?.forEach((event, eventIndex) => {
        const path = ['nodes', index, 'choices', choiceIndex, 'schedule', eventIndex, 'trigger'];
        if (event.trigger.type === 'on_enter_node') {
          const target = event.trigger.nodeId;
          if (!nodes.has(target)) {
            errors.push(issue('DELAYED_TARGET_NOT_FOUND', [...path, 'nodeId'], 'Вузол тригера не існує.', node.id));
          } else if (!reachableFrom(choice.nextNodeId).has(target)) {
            errors.push(issue('DELAYED_TRIGGER_UNREACHABLE', path, 'Тригер недосяжний після цього конкретного вибору.', node.id));
          } else {
            if (!avoidCache.has(target)) avoidCache.set(target, walk(endings, reverse, target));
            if (avoidCache.get(target)!.has(choice.nextNodeId)) {
              warnings.push(issue('DELAYED_MAY_NOT_FIRE', path, 'Деякі маршрути завершуються без цього тригера; наслідок буде відкинуто.', node.id));
            }
          }
        } else if (acyclic && maxRemaining.has(choice.nextNodeId)) {
          const count = event.trigger.count;
          if (maxRemaining.get(choice.nextNodeId)! < count) {
            errors.push(issue('DELAYED_TRIGGER_UNREACHABLE', path, 'Жоден маршрут після вибору не містить потрібної кількості наступних рішень.', node.id));
          } else if (minRemaining.get(choice.nextNodeId)! < count) {
            warnings.push(issue('DELAYED_MAY_NOT_FIRE', path, 'Коротші маршрути завершаться до тригера; наслідок буде відкинуто.', node.id));
          }
        }
      });
    });
  });
  return { errors, warnings };
}
