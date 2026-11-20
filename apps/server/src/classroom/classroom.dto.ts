import { z } from 'zod';

const pin = z.string().regex(/^\d{6}$/);
const capability = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/);
export const CreateRoom = z
  .object({
    scenarioId: id,
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/)
      .max(50)
      .optional(),
  })
  .strict();
export const JoinRoom = z
  .object({ pin, token: capability.optional() })
  .strict();
export const JoinHost = z.object({ pin, hostToken: capability }).strict();
export const CastVote = z
  .object({ pin, round: z.number().int().min(1).max(1000), choiceId: id })
  .strict();
const command = {
  pin,
  hostToken: capability,
  expectedRevision: z.number().int().min(0),
  round: z.number().int().min(0).max(1000),
};
export const HostCommand = z.discriminatedUnion('action', [
  z.object({ ...command, action: z.literal('open') }).strict(),
  z.object({ ...command, action: z.literal('close') }).strict(),
  z
    .object({
      ...command,
      action: z.literal('advance'),
      choiceId: id.optional(),
    })
    .strict(),
  z.object({ ...command, action: z.literal('end') }).strict(),
]);
export class ClassroomError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function parseDto<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ClassroomError(
      'INVALID_INPUT',
      'Некоректний запит: дозволені лише визначені поля, без персональних відомостей.',
    );
  return result.data;
}
