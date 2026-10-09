import { describe, expect, it } from 'vitest';
import { applyAttempt, buildLesson, createLearner, lessonStyles } from '@/core/engine';
import { aaravLearner } from '@/seed/personas';
import { attempt, NOW, pack } from '@/testkit';

const fresh = () => createLearner('p', pack, NOW);

describe('buildLesson', () => {
  it('lists the styles a concept really has text for', () => {
    expect(lessonStyles(pack, 'loop-bounds')).toEqual(['plain', 'worked-example', 'counterexample']);
    expect(lessonStyles(pack, 'lists')).toEqual(['plain', 'worked-example', 'analogy']);
  });

  it('two seeded personas see different styles on the same concept, each with a reason', () => {
    const a = buildLesson(pack, fresh(), 'loop-bounds')!;
    const b = buildLesson(pack, aaravLearner('a', pack, NOW), 'loop-bounds')!;
    expect(a.style).toBe('plain');
    expect(a.reason).toMatch(/no history/);
    expect(b.style).toBe('counterexample');
    expect(b.reason).toMatch(/helped you before/);
    expect(a.text).not.toBe(b.text);
    expect(b.text).toMatch(/range\(1, 3\)/);
  });

  it('a mistake that keeps coming back in this concept tries a new style', () => {
    let s = fresh();
    s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    const l = buildLesson(pack, s, 'loop-bounds')!;
    expect(l.style).not.toBe('plain'); // plain did not stop the mistake, so another style the topic really has is tried
    expect(lessonStyles(pack, 'loop-bounds')).toContain(l.style);
    expect(l.reason).toMatch(/came back 2 times/);
  });

  it('ignores mistakes from other concepts and falls back to plain when only plain exists', () => {
    let s = fresh();
    s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    expect(buildLesson(pack, s, 'lists')!.style).toBe('plain');
  });

  it('uses the concept summary when a concept has no explanation text, and returns undefined for unknown ids', () => {
    const bare = { ...pack, concepts: pack.concepts.map((c) => (c.id === 'lists' ? { ...c, explanations: {} } : c)) };
    const l = buildLesson(bare, fresh(), 'lists')!;
    expect(l.style).toBe('plain');
    expect(l.text).toBe(pack.concepts.find((c) => c.id === 'lists')!.summary);
    expect(buildLesson(pack, fresh(), 'nope')).toBeUndefined();
  });

  it('does not change the learner (pure)', () => {
    const s = aaravLearner('a', pack, NOW);
    const copy = structuredClone(s);
    buildLesson(pack, s, 'loop-bounds');
    expect(s).toEqual(copy);
  });
});
