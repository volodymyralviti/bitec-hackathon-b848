import { classroomConfig } from './classroom.config';
describe('Classroom bounds', () => {
  const original = { ...process.env };
  beforeEach(() => {
    for (const key of Object.keys(process.env))
      if (key.startsWith('CLASSROOM_')) delete process.env[key];
  });
  afterEach(() => {
    process.env = { ...original };
  });
  it('defaults to a short fixed TTL and threshold of three', () => {
    expect(classroomConfig()).toMatchObject({ ttlMs: 1_800_000, minimum: 3 });
  });
  it('refuses a privacy threshold below three or an unbounded TTL', () => {
    process.env.CLASSROOM_MIN_PARTICIPANTS = '2';
    expect(() => classroomConfig()).toThrow();
    delete process.env.CLASSROOM_MIN_PARTICIPANTS;
    process.env.CLASSROOM_TTL_MINUTES = '0';
    expect(() => classroomConfig()).toThrow();
  });
});
