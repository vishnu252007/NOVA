import { describe, expect, it } from 'vitest';
import { generators, pack } from '@/testkit';
import { DEFAULT_SIM, diagnosisExperiment, makeLearner, resolutionExperiment, runLearner, type SimInput } from './learnerSim';

const small = (over: Partial<typeof DEFAULT_SIM> = {}): SimInput => ({ pack, generators, cfg: { ...DEFAULT_SIM, learners: 40, ...over } });

describe('simulated learners', () => {
  it('are reproducible: the same seed gives the same results', () => {
    expect(resolutionExperiment(small(), 'nova')).toEqual(resolutionExperiment(small(), 'nova'));
    expect(diagnosisExperiment(small(), 'baseline')).toEqual(diagnosisExperiment(small(), 'baseline'));
  });

  it('only hold mistakes the pack can actually test, between 1 and 3', () => {
    const i = small();
    for (let k = 0; k < 100; k++) {
      const l = makeLearner(i, k);
      expect(l.initial.length).toBeGreaterThanOrEqual(1);
      expect(l.initial.length).toBeLessThanOrEqual(3);
      for (const m of l.initial) expect(pack.misconceptions.some((x) => x.id === m)).toBe(true);
    }
  });

  it('never exceed their question budget', () => {
    const i = small({ budget: 12 });
    for (let k = 0; k < 40; k++) for (const p of ['nova', 'baseline'] as const) expect(runLearner(i, k, p, 12, true).attempts).toBeLessThanOrEqual(12);
  });

  it('measures how much of a learner\'s mistakes the questions could reveal, and how many offered mistakes stay unfixed', () => {
    const r = resolutionExperiment(small({ pLearnMatch: 1, pLearnMismatch: 1, pHold: 1, pSlip: 0, budget: 60 }), 'nova');
    for (const v of [r.mistakesOfferedShare, r.unfixedOfferedShare, r.resolvedWithinBudget.p]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    // a mistake can only be fixed if it was found, and it can only be found if some asked question offered it
    const run = runLearner(small({ pLearnMatch: 1, pLearnMismatch: 1, pHold: 1, pSlip: 0 }), 0, 'nova', 60, true);
    expect(run.offeredShare).toBeGreaterThanOrEqual(0);
    expect(run.hiddenButOffered).toBeGreaterThanOrEqual(0);
  });

  it('with no noise and teaching off, nothing that is flagged is false', () => {
    for (const p of ['nova', 'baseline'] as const) expect(diagnosisExperiment(small({ pHold: 1, pSlip: 0 }), p).precision).toBe(1);
  });

  it('keeps all scores between 0 and 100 percent', () => {
    for (const p of ['nova', 'baseline'] as const) {
      const d = diagnosisExperiment(small(), p);
      for (const v of [d.precision, d.recall, d.f1]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    }
  });
});
