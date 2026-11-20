export const CLASSROOM_CONFIG = Symbol('CLASSROOM_CONFIG');
export interface ClassroomConfig {
  ttlMs: number;
  minimum: number;
  maxParticipants: number;
  maxRooms: number;
}
export function classroomConfig(): ClassroomConfig {
  function integer(
    name: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const value =
      process.env[name] === undefined ? fallback : Number(process.env[name]);
    if (!Number.isInteger(value) || value < min || value > max)
      throw new Error(`Invalid ${name}`);
    return value;
  }
  return {
    ttlMs: integer('CLASSROOM_TTL_MINUTES', 30, 1, 60) * 60_000,
    minimum: integer('CLASSROOM_MIN_PARTICIPANTS', 3, 3, 100),
    maxParticipants: integer('CLASSROOM_MAX_PARTICIPANTS', 100, 3, 500),
    maxRooms: integer('CLASSROOM_MAX_ROOMS', 100, 1, 1000),
  };
}
