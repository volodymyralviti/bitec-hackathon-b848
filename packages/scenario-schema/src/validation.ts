import { issue, type ValidationIssue, type ValidationResult } from './diagnostics.js';
import { validateScenarioGraph } from './graph.js';
import { validateProvenance } from './provenance.js';
import { LIMITS, ScenarioSchema } from './schema.js';
import type { ZodIssue } from 'zod';

function structuralMessage(error: ZodIssue): string {
  switch (error.code) {
    case 'too_small': return `Замале значення: мінімум ${String(error.minimum)}.`;
    case 'too_big': return `Завелике значення: максимум ${String(error.maximum)}.`;
    case 'invalid_type': return `Відсутнє поле або неправильний тип; очікується ${error.expected}.`;
    case 'invalid_value': return `Дозволені значення: ${error.values.map(String).join(', ')}.`;
    case 'invalid_format': return 'Некоректний формат значення.';
    case 'unrecognized_keys': return `Невідомі поля: ${error.keys.join(', ')}.`;
    case 'invalid_union': return 'Очікується один із дозволених типів вузла або тригера.';
    default: return `Некоректне значення поля (${error.code}).`;
  }
}

// Only JSON trees are accepted. Do not invoke getters, toJSON, or executable values.
function checkInput(input: unknown): ValidationIssue | undefined {
  const pending: unknown[] = [input];
  const seen = new WeakSet<object>();
  let characters = 0;
  let values = 0;
  while (pending.length) {
    const value = pending.pop();
    if (++values > 100_000 || characters > LIMITS.jsonCharacters) return issue('INPUT_LIMIT', [], 'Перевищено допустимий розмір JSON.');
    if (typeof value === 'string') characters += value.length;
    else if (value !== null && typeof value === 'object') {
      if (seen.has(value)) return issue('INVALID_JSON', [], 'Очікується JSON-дерево без циклічних або спільних об’єктних посилань.');
      seen.add(value);
      if (Object.getOwnPropertySymbols(value).length) return issue('INVALID_JSON', [], 'Символьні ключі не належать JSON.');
      if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
        return issue('INVALID_JSON', [], 'Дозволені лише звичайні JSON-об’єкти.');
      }
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (Array.isArray(value) && key === 'length') continue;
        if (!('value' in descriptor)) return issue('INVALID_JSON', [], 'Виконувані властивості не дозволені.');
        characters += key.length;
        pending.push(descriptor.value);
      }
    } else if (value !== null && typeof value !== 'boolean' && !(typeof value === 'number' && Number.isFinite(value))) {
      return issue('INVALID_JSON', [], 'Вхід містить значення, яке не належить JSON.');
    }
  }
  if (characters > LIMITS.jsonCharacters) return issue('INPUT_LIMIT', [], 'Перевищено допустимий розмір JSON.');
  return undefined;
}

export function validateScenarioStructure(input: unknown): ValidationResult {
  const inputIssue = checkInput(input);
  if (inputIssue) return { success: false, errors: [inputIssue], warnings: [] };
  const parsed = ScenarioSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map(error => issue('INVALID_STRUCTURE', error.path.map(part => typeof part === 'number' ? part : String(part)), structuralMessage(error))),
      warnings: [],
    };
  }
  return { success: true, data: parsed.data, errors: [], warnings: [] };
}

export function validateScenario(input: unknown): ValidationResult {
  const structure = validateScenarioStructure(input);
  if (!structure.success) return structure;
  const graph = validateScenarioGraph(structure.data);
  const provenance = validateProvenance(structure.data);
  const errors = [...graph.errors, ...provenance.errors];
  const warnings = [...graph.warnings, ...provenance.warnings];
  return errors.length ? { success: false, errors, warnings } : { success: true, data: structure.data, errors: [], warnings };
}

export function validateScenarioJson(json: string): ValidationResult {
  if (json.length > LIMITS.jsonCharacters) return { success: false, errors: [issue('INPUT_LIMIT', [], 'Перевищено допустиму довжину JSON.')], warnings: [] };
  let input: unknown;
  try { input = JSON.parse(json); }
  catch { return { success: false, errors: [issue('INVALID_JSON', [], 'Невалідний синтаксис JSON.')], warnings: [] }; }
  return validateScenario(input);
}
