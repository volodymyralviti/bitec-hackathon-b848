import { z } from 'zod';

export const SCHEMA_VERSION = '1' as const;
export const LIMITS = Object.freeze({ nodes: 512, choicesPerNode: 16, sources: 128, delayedEffects: 1024, jsonCharacters: 1_000_000 } as const);

const id = z.string().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const text = z.string().min(1).max(6000).regex(/\S/);
const shortText = z.string().min(1).max(300).regex(/\S/);
const sourceIds = z.array(id).max(LIMITS.sources);
const values = z.array(shortText).min(2).max(12);

export const MetricSchema = z.enum(['transparency', 'fairness', 'trust', 'effectiveness']);
export const EffectSchema = z.strictObject({
  metric: MetricSchema,
  delta: z.number().int().min(-10).max(10),
  explanation: text,
});
export const DelayedTriggerSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('on_enter_node'), nodeId: id }),
  z.strictObject({ type: z.literal('after_decisions'), count: z.number().int().min(1).max(LIMITS.nodes) }),
]);
export const DelayedEffectSchema = z.strictObject({
  id,
  trigger: DelayedTriggerSchema,
  effects: z.array(EffectSchema).min(1).max(16),
  consequenceText: text,
});
export const ChoiceSchema = z.strictObject({
  id,
  label: shortText,
  explanation: text,
  nextNodeId: id,
  immediateEffects: z.array(EffectSchema).min(1).max(16),
  schedule: z.array(DelayedEffectSchema).max(16).optional(),
  legalStatus: z.enum(['allowed', 'restricted', 'uncertain']).optional(),
  legalQuestions: text.optional(),
  sourceIds,
});
export const DebriefSchema = z.strictObject({
  summary: text,
  shortTerm: text,
  longTerm: text,
  perspectives: z.array(text).min(1).max(12),
  trustAndReputation: text,
  valuesInTension: values,
  reflectionQuestions: z.array(text).min(1).max(12),
  sourceIds: sourceIds.min(1),
  limitations: text,
});
const nodeFields = { id, title: shortText, narrative: text, context: text.optional(), sourceIds };
export const NarrativeNodeSchema = z.strictObject({ ...nodeFields, type: z.literal('narrative'), nextNodeId: id });
export const DecisionNodeSchema = z.strictObject({
  ...nodeFields,
  type: z.literal('decision'),
  valuesInTension: values,
  // The lower bound is semantic, so other graph diagnostics remain available.
  choices: z.array(ChoiceSchema).max(LIMITS.choicesPerNode),
});
export const EndingNodeSchema = z.strictObject({ ...nodeFields, type: z.literal('ending'), debrief: DebriefSchema });
export const NodeSchema = z.discriminatedUnion('type', [NarrativeNodeSchema, DecisionNodeSchema, EndingNodeSchema]);

export const SourceReferenceSchema = z.strictObject({
  sourceId: id,
  title: shortText,
  sourceType: z.enum(['methodology', 'normative', 'editorial']),
  documentType: z.enum(['law', 'code', 'statute', 'order', 'procedure', 'ethics', 'methodology', 'judgment', 'other']).optional(),
  documentNumber: shortText.optional(),
  relevance: text.optional(),
  applicabilityQuestions: text.optional(),
  verificationEvidence: text.optional(),
  expertReviewRequired: z.boolean().optional(),
  court: shortText.optional(),
  caseNumber: shortText.optional(),
  legalPosition: text.optional(),
  issuer: shortText.optional(),
  url: z.url({ protocol: /^https?$/ }).max(2048).optional(),
  fileCitation: text.optional(),
  documentDate: z.iso.date().optional(),
  // Required nullable fields distinguish unknown facts from omitted metadata.
  versionAsOf: z.iso.date().nullable(),
  revision: shortText.nullable(),
  pinpoint: shortText.optional(),
  verificationStatus: z.enum(['unverified', 'team_checked', 'expert_checked']),
  verifiedAt: z.iso.date().nullable(),
});
export const ContentReviewSchema = z.strictObject({
  status: z.enum(['draft', 'in_review', 'expert_approved', 'changes_requested']),
  demoOnly: z.boolean(),
  aiAssisted: z.boolean(),
  reviewedAt: z.iso.datetime().optional(),
  reviewerRole: shortText.optional(),
  evidenceRef: text.optional(),
});
export const ScenarioSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id,
  version: z.string().max(32).regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/),
  contentCreatedAt: z.iso.date().optional(),
  language: z.literal('uk'),
  title: shortText,
  summary: text,
  basedOn: z.array(shortText).max(12),
  publicationStatus: z.enum(['draft', 'demo', 'published']),
  contentReview: ContentReviewSchema,
  startNodeId: id,
  sources: z.array(SourceReferenceSchema).min(1).max(LIMITS.sources),
  nodes: z.array(NodeSchema).min(1).max(LIMITS.nodes),
});

export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioNode = z.infer<typeof NodeSchema>;
export type DecisionNode = z.infer<typeof DecisionNodeSchema>;
export type NarrativeNode = z.infer<typeof NarrativeNodeSchema>;
export type EndingNode = z.infer<typeof EndingNodeSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type DelayedTrigger = z.infer<typeof DelayedTriggerSchema>;
export type DelayedEffect = z.infer<typeof DelayedEffectSchema>;
export type Debrief = z.infer<typeof DebriefSchema>;
export type SourceReference = z.infer<typeof SourceReferenceSchema>;
export type ContentReview = z.infer<typeof ContentReviewSchema>;
