import { describe, expect, it } from 'vitest';
import { applyAttempt, buildConceptMap, buildMistakeTimeline, createLearner } from '@/core/engine';
import { CONFIG } from '@/core/config';
import { aaravLearner } from '@/seed/personas';
import { attempt, NOW, pack } from '@/testkit';

const fresh = () => createLearner('p', pack, NOW);

describe('buildConceptMap', () => {
  it('puts prerequisites in earlier columns and keeps every concept', () => {
    const m = buildConceptMap(pack, fresh());
    const depth = Object.fromEntries(m.nodes.map((n) => [n.id, n.depth]));
    expect(depth).toEqual({ variables: 0, lists: 1, loops: 1, 'loop-bounds': 2, functions: 2, recursion: 3 });
    expect(m.nodes).toHaveLength(pack.concepts.length);
    expect(m.columns).toBe(4);
    // no two nodes share a (column, row) cell
    expect(new Set(m.nodes.map((n) => `${n.depth}:${n.row}`)).size).toBe(m.nodes.length);
    for (const e of m.edges) expect(depth[e.from]!).toBeLessThan(depth[e.to]!);
  });

  it('locked concepts say what unlocks them, and every concept says what it unlocks', () => {
    const m = buildConceptMap(pack, fresh());
    // Variables can be measured and is still at 0%, so it blocks Lists until the learner shows it.
    const lists = m.nodes.find((n) => n.id === 'lists')!;
    expect(lists.status).toBe('locked');
    expect(lists.unlockBy).toEqual([{ id: 'variables', title: 'Variables', mastery: 0, met: false }]);
    // Loop bounds needs Loops and Lists, which CAN be measured and are still at 0%.
    const bounds = m.nodes.find((n) => n.id === 'loop-bounds')!;
    expect(bounds.status).toBe('locked');
    expect(bounds.unlockBy).toEqual([
      { id: 'loops', title: 'Loops', mastery: 0, met: false },
      { id: 'lists', title: 'Lists', mastery: 0, met: false },
    ]);
    expect(m.lockBelow).toBe(CONFIG.mastery.lockBelow);
    expect(m.nodes.find((n) => n.id === 'variables')!.unlocks.map((u) => u.id)).toEqual(['lists', 'loops']);
    expect(m.nodes.find((n) => n.id === 'variables')!.status).toBe('new');
    expect(m.nodes.find((n) => n.id === 'recursion')!.unlocks).toEqual([]);
  });

  it('a concept unlocks once its prerequisites are strong enough, and the edge becomes "met"', () => {
    const s = applyAttempt(fresh(), attempt({ concept: 'variables', correct: true }), pack);
    const m = buildConceptMap(pack, s);
    const lists = m.nodes.find((n) => n.id === 'lists')!;
    expect(lists.status).toBe('new');
    expect(lists.unlockBy).toEqual([]);
    expect(m.edges.find((e) => e.from === 'variables' && e.to === 'lists')!.met).toBe(true);
    // loop-bounds still waits for loops and lists
    expect(m.nodes.find((n) => n.id === 'loop-bounds')!.unlockBy.map((x) => x.id)).toEqual(['loops', 'lists']);
  });

  it('is pure', () => {
    const s = aaravLearner('a', pack, NOW);
    const copy = structuredClone(s);
    buildConceptMap(pack, s);
    expect(s).toEqual(copy);
  });
});

describe('buildMistakeTimeline', () => {
  it('is empty for a learner with no mistakes', () => {
    expect(buildMistakeTimeline(pack, fresh())).toEqual([]);
  });

  it("tells Aarav's story in order: seen, probe missed, seen again, finally fixed", () => {
    const t = buildMistakeTimeline(pack, aaravLearner('a', pack, NOW));
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ id: 'off-by-one-start', status: 'active', concept: 'loop-bounds' });
    expect(t[0]!.entries.map((e) => e.kind)).toEqual([
      'seen', 'probe-missed', 'seen', 'probe-missed', 'seen', 'fixed', 'seen', 'fixed', 'seen',
    ]);
    const times = t[0]!.entries.map((e) => e.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('lists active mistakes before resolved ones', () => {
    let s = applyAttempt(fresh(), attempt({ misconception: 'index-vs-value' }), pack);
    s = applyAttempt(s, attempt({ misconception: 'off-by-one-start' }), pack);
    s = applyAttempt(s, attempt({ correct: true, isProbe: true, probeFor: 'index-vs-value' }), pack);
    const t = buildMistakeTimeline(pack, s);
    expect(t.map((x) => [x.id, x.status])).toEqual([['off-by-one-start', 'active'], ['index-vs-value', 'resolved']]);
  });
});
