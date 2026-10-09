import { describe, expect, it } from 'vitest';
import { applyAttempt, chooseDiagnosticTarget, createLearner, diagnosticConcepts, diagnosticLength, levelOf, nextDiagnosticQuestion, planToday, summarizeDiagnostic } from '@/core/engine';
import { CONFIG } from '@/core/config';
import type { AttemptEvent, ContentPack, Question, StaticQuestionSpec } from '@/core/types';
import { attempt, generators, NOW, pack } from '@/testkit';

type Mode = 'right' | 'wrong';

/** Plays the check against the real engine. `mode` decides, per question, whether the learner answers right or wrong. */
function play(p: ContentPack, mode: (q: Question, n: number) => Mode, confidence: AttemptEvent['confidence'] = 'sure') {
  const events: AttemptEvent[] = [];
  const asked: Question[] = [];
  for (let guard = 0; guard < 50; guard++) {
    const q = nextDiagnosticQuestion({ pack: p, generators, events, seed: 7 });
    if (!q) break;
    asked.push(q);
    const right = mode(q, events.length) === 'right';
    const o = q.options.find((x) => (right ? x.correct : !x.correct))!;
    events.push(attempt({ questionId: q.id, specId: q.specId, concept: q.concept, chosenOptionId: o.id, correct: !!o.correct, misconception: o.misconception, confidence }));
  }
  return { events, asked };
}

/** A pack with 3 questions (difficulty 1, 2, 3) in each of 3 concepts, so adaptivity has room to work. */
function richPack(): ContentPack {
  const mk = (concept: string, d: 1 | 2 | 3): StaticQuestionSpec => ({
    kind: 'static', id: `${concept}-d${d}`, concept, difficulty: d, prompt: `${concept} level ${d}`,
    options: [{ text: 'right', correct: true }, { text: 'wrong a', misconception: 'index-starts-at-one' }, { text: 'wrong b', misconception: 'len-is-last-index' }],
    hints: [], feedback: { 'index-starts-at-one': { plain: 'x' }, 'len-is-last-index': { plain: 'y' } },
  });
  const staticQs = ['lists', 'loops', 'loop-bounds'].flatMap((c) => ([1, 2, 3] as const).map((d) => mk(c, d)));
  return { ...pack, questions: staticQs };
}

describe('diagnostic: choosing questions', () => {
  it('only checks concepts that have questions, prerequisites first', () => {
    expect(diagnosticConcepts(pack)).toEqual(['variables', 'lists', 'loops', 'loop-bounds', 'functions', 'recursion']);
  });

  it('covers every concept once, in order, at the start difficulty', () => {
    const { asked } = play(richPack(), () => 'right');
    expect(asked.slice(0, 3).map((q) => q.concept)).toEqual(['lists', 'loops', 'loop-bounds']);
    expect(asked.slice(0, 3).every((q) => q.difficulty === CONFIG.diagnostic.startDifficulty)).toBe(true);
  });

  it('goes one level harder after a right answer, and one level easier (on the same mistake) after a wrong one', () => {
    const rp = richPack();
    const right = play(rp, () => 'right');
    expect(right.asked[3]!.concept).toBe('lists');
    expect(right.asked[3]!.difficulty).toBe(3);

    const wrong = play(rp, () => 'wrong');
    expect(wrong.asked[3]!.difficulty).toBe(1);
    const target = chooseDiagnosticTarget(rp, wrong.events.slice(0, 3));
    expect(target?.focus).toHaveLength(1); // keeps the mistake it just showed
    expect(target?.focus[0]).toBe(wrong.events[0]!.misconception);
  });

  it('asks about a concept it got wrong before a concept it got right', () => {
    const rp = richPack();
    const { asked } = play(rp, (q, n) => (n === 1 ? 'wrong' : 'right')); // the 2nd question (loops) is wrong
    expect(asked[3]!.concept).toBe('loops');
  });

  it('never asks the same question twice and never goes over the maximum', () => {
    const rp = richPack();
    for (const mode of [() => 'right', () => 'wrong', (_q: Question, n: number) => (n % 2 ? 'right' : 'wrong')] as ((q: Question, n: number) => Mode)[]) {
      const { asked } = play(rp, mode);
      expect(new Set(asked.map((q) => q.specId)).size).toBe(asked.length);
      expect(asked.length).toBeLessThanOrEqual(CONFIG.diagnostic.maxQuestions);
      expect(asked.length).toBeGreaterThanOrEqual(CONFIG.diagnostic.minQuestions);
    }
  });

  it('stops early (at the minimum) when every answer agrees, and keeps going when they do not', () => {
    const rp = richPack();
    expect(play(rp, () => 'right').asked.length).toBe(CONFIG.diagnostic.minQuestions);
    expect(play(rp, () => 'wrong').asked.length).toBe(CONFIG.diagnostic.minQuestions);
    // right, then wrong inside a concept = mixed signal = needs one more question there
    const mixed = play(rp, (q, n) => (n >= 3 && n < 5 ? (n === 3 ? 'right' : 'wrong') : 'right'));
    expect(mixed.asked.length).toBeGreaterThan(CONFIG.diagnostic.minQuestions);
  });

  it('works on the real pack: 6 to 8 questions, every topic, deterministic', () => {
    const a = play(pack, () => 'wrong');
    const b = play(pack, () => 'wrong');
    expect(diagnosticLength(pack)).toEqual({ min: 6, max: 8 });
    expect(a.asked.length).toBeGreaterThanOrEqual(6);
    expect(a.asked.length).toBeLessThanOrEqual(8);
    expect(new Set(a.asked.map((q) => q.concept)).size).toBe(6);
    expect(a.asked.map((q) => q.id)).toEqual(b.asked.map((q) => q.id));
  });

  it('returns null for a pack with no questions', () => {
    const empty = { ...pack, questions: [] };
    expect(diagnosticLength(empty)).toEqual({ min: 0, max: 0 });
    expect(nextDiagnosticQuestion({ pack: empty, generators, events: [], seed: 1 })).toBeNull();
  });

  it('is deterministic for the same input', () => {
    const i = { pack, generators, events: [], seed: 42 };
    expect(nextDiagnosticQuestion(i)).toEqual(nextDiagnosticQuestion(i));
  });
});

describe('diagnostic: results', () => {
  const finish = (mode: (q: Question, n: number) => Mode) => {
    const before = createLearner('p', pack, NOW);
    const { events } = play(pack, mode);
    const after = events.reduce((s, e) => applyAttempt(s, e, pack), before); // state changes only through applyAttempt
    return { before, after, events, sum: summarizeDiagnostic(events, pack, before, after, NOW) };
  };

  it('gives a new profile mastery for at least 3 concepts, and the plan changes', () => {
    const { before, after, sum } = finish(() => 'right');
    expect(Object.keys(before.concepts)).toHaveLength(0);
    expect(Object.values(after.concepts).filter((c) => c.attempts > 0).length).toBeGreaterThanOrEqual(3);
    expect(sum.concepts).toHaveLength(diagnosticConcepts(pack).length);
    expect(sum.planBefore.steps[0]!.kind).toBe('diagnostic');
    expect(sum.planAfter.steps.some((s) => s.kind === 'diagnostic')).toBe(false);
    expect(sum.planAfter).not.toEqual(sum.planBefore);
  });

  it('names the mistakes it found and puts fixing them first in the new plan', () => {
    const { sum, after, events } = finish(() => 'wrong');
    expect(sum.correct).toBe(0);
    expect(sum.sureWrong).toBe(events.length);
    expect(sum.mistakes.length).toBeGreaterThan(0);
    expect(sum.planAfter.steps[0]!.kind).toBe('fix-misconception');
    expect(planToday(after, pack, NOW).steps[0]).toEqual(sum.planAfter.steps[0]);
  });

  it('labels a concept by its mastery using the config thresholds', () => {
    expect(levelOf(CONFIG.mastery.solidFrom)).toBe('solid');
    expect(levelOf(CONFIG.mastery.shakyFrom)).toBe('building');
    expect(levelOf(CONFIG.mastery.shakyFrom - 0.01)).toBe('needs-work');
    const { sum } = finish(() => 'wrong');
    expect(sum.concepts.every((c) => c.level === 'needs-work')).toBe(true);
  });
});
