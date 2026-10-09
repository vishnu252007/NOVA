import { describe, expect, it } from 'vitest';
import {
  applyAttempt, buildConceptMap, conceptStatus, createLearner, isTestable, nextDiagnosticQuestion, planToday, prerequisiteMet,
} from '@/core/engine';
import type { AttemptEvent, ContentPack } from '@/core/types';
import { attempt, generators, NOW, pack } from '@/testkit';

const fresh = () => createLearner('p1', pack, NOW);

/** A copy of the pack where "variables" has NO questions, so it cannot be measured (and must not block anyone). */
function packWithoutVariablesQuestions(): ContentPack {
  return { ...structuredClone(pack), questions: pack.questions.filter((q) => q.concept !== 'variables') };
}

describe('lock rule: a topic that cannot be measured must not block others', () => {
  const unmeasured = packWithoutVariablesQuestions();
  const freshUnmeasured = () => createLearner('p2', unmeasured, NOW);

  it('knows which topics can be measured', () => {
    expect(isTestable(pack, 'variables')).toBe(true); // the real pack now has Variables questions
    expect(isTestable(unmeasured, 'variables')).toBe(false);
    expect(isTestable(unmeasured, 'loops')).toBe(true);
  });

  it('a new learner can open Lists and Loops when Variables cannot be measured', () => {
    expect(conceptStatus(freshUnmeasured(), unmeasured, 'lists')).toBe('new');
    expect(conceptStatus(freshUnmeasured(), unmeasured, 'loops')).toBe('new');
    expect(conceptStatus(freshUnmeasured(), unmeasured, 'loop-bounds')).toBe('locked'); // Loops and Lists are measurable and still at 0
  });

  it('when Variables has questions (the real pack), the normal lock rule applies', () => {
    expect(conceptStatus(fresh(), pack, 'lists')).toBe('locked');
    expect(conceptStatus(fresh(), pack, 'loops')).toBe('locked');
    const answered = applyAttempt(fresh(), attempt({ concept: 'variables', correct: true }), pack);
    answered.concepts.variables!.mastery = 0.5;
    expect(conceptStatus(answered, pack, 'lists')).toBe('new');
  });

  it('the concept map agrees with the lock rule (arrow is "met", no "To unlock" note)', () => {
    const map = buildConceptMap(unmeasured, freshUnmeasured());
    expect(map.edges.find((e) => e.from === 'variables' && e.to === 'lists')!.met).toBe(true);
    expect(map.nodes.find((n) => n.id === 'lists')!.unlockBy).toEqual([]);
    expect(prerequisiteMet(freshUnmeasured(), unmeasured, 'variables')).toBe(true);
  });

  it('a perfect quick check leaves no answered topic locked', () => {
    let s = fresh();
    const events: AttemptEvent[] = [];
    for (let i = 0; i < 20; i++) {
      const q = nextDiagnosticQuestion({ pack, generators, events, seed: 7 });
      if (!q) break;
      const o = q.options.find((x) => x.correct)!;
      const ev = attempt({ at: NOW + i, questionId: q.id, specId: q.specId, concept: q.concept, chosenOptionId: o.id, correct: true });
      events.push(ev);
      s = applyAttempt(s, ev, pack);
    }
    const asked = [...new Set(events.map((e) => e.concept))];
    expect(asked.length).toBeGreaterThanOrEqual(3);
    for (const c of asked) expect(conceptStatus(s, pack, c)).not.toBe('locked');
  });
});

describe('planner: one fix step per topic', () => {
  it('merges several mistakes in the same topic and leads with the most repeated one', () => {
    let s = fresh();
    for (let i = 0; i < 3; i++) s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    s = applyAttempt(s, attempt({ misconception: 'off-by-one-end' }), pack);
    for (let i = 0; i < 2; i++) s = applyAttempt(s, attempt({ concept: 'lists', misconception: 'len-is-last-index' }), pack);

    const fixes = planToday(s, pack, NOW).steps.filter((x) => x.kind === 'fix-misconception');
    expect(fixes.map((f) => f.concept)).toEqual(['loop-bounds', 'lists']); // never the same topic twice
    expect(fixes[0]).toMatchObject({ misconception: 'off-by-one-start' });
    expect(fixes[0]!.reason).toMatch(/2 different mistakes in Loop bounds/);
    expect(fixes[0]!.reason).toMatch(/most repeated is "Off-by-one \(loop start\)" \(3 times\)/);
  });

  it('a single mistake keeps the simple wording', () => {
    const s = applyAttempt(fresh(), attempt({ misconception: 'off-by-one-start' }), pack);
    const fix = planToday(s, pack, NOW).steps[0]!;
    expect(fix.reason).toBe('You have made the mistake "Off-by-one (loop start)" 1 time. A short probe will check if it is fixed.');
  });
});
