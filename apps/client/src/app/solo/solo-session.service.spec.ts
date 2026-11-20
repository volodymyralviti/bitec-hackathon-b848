import { TestBed } from '@angular/core/testing';
import { SoloSession } from './solo-session.service';
import { scenarioFixture } from '../testing/scenarios.fixture';

describe('SoloSession using the real public engine', () => {
  let session: SoloSession;
  beforeEach(() => { TestBed.configureTestingModule({}); session = TestBed.inject(SoloSession); });

  for (const id of ['urgent-supply', 'truth-under-pressure'] as const) {
    it(`${id}: narrative, three decisions, applied events and completed debrief`, () => {
      session.start(scenarioFixture(id));
      expect(session.node()?.type).toBe('narrative');
      expect(session.state()?.decisionCount).toBe(0);
      session.advance();
      expect(session.node()?.type).toBe('decision');
      for (let number = 1; number <= 3; number++) {
        session.select(session.options()[0].id);
        session.confirm();
        expect(session.state()?.decisionCount).toBe(number);
        expect(session.feedback()?.some(entry => entry.kind === 'immediate')).toBeTrue();
        const snapshot = session.state();
        session.confirm();
        expect(session.state()).toBe(snapshot);
        session.continue();
      }
      expect(session.state()?.status).toBe('completed');
      expect(session.debrief()?.decisions.length).toBe(3);
      expect(session.debrief()?.appliedEffects.some(entry => entry.kind === 'delayed')).toBeTrue();
      expect(session.state()?.pendingEffects.length).toBe(0);
      expect(session.debrief()?.finalMetrics).toEqual(session.state()!.metrics);
      expect(session.debrief()?.sourceIds).toContain('cids-case');
    });
  }

  it('does not apply a pending counter early, rejects stale/invalid selection and restarts', () => {
    session.start(scenarioFixture());
    session.advance();
    session.select('common-brief');
    expect(session.state()?.decisionCount).toBe(0);
    session.confirm();
    expect(session.state()?.metrics).toEqual({ transparency: 1, fairness: 1, trust: 0, effectiveness: 2 });
    expect(session.state()?.appliedDelayedEffectIds).not.toContain('supply-brief-rework');
    expect(session.state()?.pendingEffects.length).toBe(1);
    session.continue();
    session.select('recommend-minimum'); // belongs to another decision
    session.confirm();
    expect(session.state()?.decisionCount).toBe(1);
    session.select('shared-questions'); session.confirm();
    expect(session.feedback()?.some(entry => entry.eventId === 'supply-common-record')).toBeTrue();
    expect(session.state()?.appliedDelayedEffectIds).not.toContain('supply-brief-rework');
    session.continue(); session.select('recommend-minimum'); session.confirm();
    expect(session.state()?.metrics).toEqual({ transparency: 3, fairness: 2, trust: 0, effectiveness: 1 });
    expect(session.state()?.appliedDelayedEffectIds).toContain('supply-brief-rework');
    session.restart();
    expect(session.node()?.type).toBe('narrative');
    expect(session.state()?.decisionCount).toBe(0);
    expect(session.feedback()).toBeNull();
    expect(session.debrief()).toBeNull();
    expect(session.state()?.metrics).toEqual({ transparency: 0, fairness: 0, trust: 0, effectiveness: 0 });
  });

  it('keeps the run on return and replaces it when another scenario is selected', () => {
    session.ensure(scenarioFixture()); session.advance();
    const previous = session.state();
    session.ensure(scenarioFixture());
    expect(session.state()).toBe(previous);
    session.ensure(scenarioFixture('truth-under-pressure'));
    expect(session.state()?.scenarioId).toBe('truth-under-pressure');
    expect(session.state()?.decisionCount).toBe(0);
  });
});
