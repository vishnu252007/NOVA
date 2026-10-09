import { describe, expect, it } from 'vitest';
import { PACKS } from '@/content';
import { validatePack } from '@/core/content/validate';
import { applyAttempt, buildIntervention, createLearner, diagnosticConcepts, matchConcepts, nextDiagnosticQuestion, planToday, selectQuestion } from '@/core/engine';
import type { AttemptEvent, ContentPack } from '@/core/types';
import { createDefaultGenerators } from '@/generators';

const gens = createDefaultGenerators();
const byId = (id: string): ContentPack => PACKS.find((p) => p.id === id)!;
const programming = byId('programming-basics');
const seasons = byId('seasons-basics');

describe('every content pack is complete (Phase B done means these hold)', () => {
  for (const pack of PACKS) {
    it(`${pack.id}: no validation errors and no warnings`, () => {
      const r = validatePack(pack, gens);
      expect(r.errors).toEqual([]);
      expect(r.warnings).toEqual([]);
    });
  }

  it('the validator warns about a mistake that no question can reveal', () => {
    const p = structuredClone(programming);
    p.misconceptions.push({ id: 'orphan-mistake', concept: 'loops', title: 'Orphan', description: 'x', explanations: { plain: 'x' } });
    expect(validatePack(p, gens).warnings.join()).toMatch(/orphan-mistake.*never offered/);
  });

  it('B1 and B2: all six programming topics are fully written, with 4 or more questions each', () => {
    expect(programming.concepts.map((c) => c.id)).toEqual(['variables', 'lists', 'loops', 'loop-bounds', 'functions', 'recursion']);
    for (const c of programming.concepts) {
      expect(programming.questions.filter((q) => q.concept === c.id).length, `${c.id} questions`).toBeGreaterThanOrEqual(4);
      expect(Object.keys(c.explanations).length, `${c.id} explanation styles`).toBeGreaterThanOrEqual(2);
      expect(c.explanations.plain, `${c.id} plain`).toBeTruthy();
      expect(c.teachBack.length, `${c.id} teach-back items`).toBeGreaterThanOrEqual(2);
      expect(c.keywords.length, `${c.id} keywords`).toBeGreaterThanOrEqual(5);
    }
  });

  it('B3: the four new generators are registered and used by the pack', () => {
    for (const id of ['accumulator.init', 'loops.while-condition', 'lists.index-vs-value', 'recursion.base-case']) {
      expect(gens.get(id), id).toBeTruthy();
      expect(programming.questions.some((q) => q.kind === 'generated' && q.generator === id), `${id} used`).toBe(true);
    }
  });

  it('B3: generators give different questions for different seeds (none is secretly a fixed question)', () => {
    for (const q of programming.questions.filter((x) => x.kind === 'generated')) {
      const codes = new Set(Array.from({ length: 30 }, (_, i) => gens.get((q as { generator: string }).generator)!.generate({ seed: i + 1, focus: [] }).code));
      expect(codes.size, `${q.id} variety`).toBeGreaterThanOrEqual(3); // recursion has 3 different functions; the others have many more
    }
  });

  it('B4: a second pack in a different subject, with at least 10 questions', () => {
    expect(seasons.subject).not.toBe(programming.subject);
    expect(seasons.questions.length).toBeGreaterThanOrEqual(10);
    for (const c of seasons.concepts) expect(seasons.questions.filter((q) => q.concept === c.id).length).toBeGreaterThanOrEqual(3);
  });

  it('every wrong answer in both packs shows a named mistake that has a short correction', () => {
    for (const pack of PACKS) for (const m of pack.misconceptions) expect(m.explanations.plain, `${pack.id}/${m.id}`).toBeTruthy();
  });
});

describe('B4: the same engine runs the second pack with no engine change', () => {
  const pack = seasons;
  const wrongOption = (q: { options: { correct?: boolean; misconception?: string; id: string }[] }) => q.options.find((o) => !o.correct)!;

  it('quick check, plan, targeted question, explanation and doubt routing all work on seasons', () => {
    let s = createLearner('s', pack, 0);
    const events: AttemptEvent[] = [];
    for (let i = 0; i < 12; i++) {
      const q = nextDiagnosticQuestion({ pack, generators: gens, events, seed: 5 });
      if (!q) break;
      const o = wrongOption(q);
      const ev: AttemptEvent = { type: 'attempt', at: i, questionId: q.id, specId: q.specId, concept: q.concept, chosenOptionId: o.id, correct: false, misconception: o.misconception, confidence: 'sure', timeMs: 5000, hintsUsed: 0, isProbe: false };
      events.push(ev);
      s = applyAttempt(s, ev, pack);
    }
    expect(new Set(events.map((e) => e.concept)).size).toBe(diagnosticConcepts(pack).length);
    expect(events.length).toBeGreaterThanOrEqual(6);

    const step = planToday(s, pack, 100).steps[0]!;
    expect(step.kind).toBe('fix-misconception');
    const q = selectQuestion({ pack, state: s, generators: gens, concept: step.concept, seed: 3, focus: [step.misconception!] })!;
    expect(q.options.some((o) => o.misconception === step.misconception)).toBe(true);
    const wrong = q.options.find((o) => o.misconception === step.misconception)!;
    const iv = buildIntervention(pack, s, q, wrong);
    expect(iv.style).toBe('plain');
    expect(iv.baseText.length).toBeGreaterThan(20);
    expect(iv.evidence).toMatch(/matches the mistake/);

    expect(matchConcepts('why is it hotter in summer', pack)[0]!.concept).toBe('seasons-effects');
    expect(matchConcepts('how big is the tilt', pack)[0]!.concept).toBe('seasons-cause');
    // everyday words in a topic title ("Why we have seasons") must not pull a question toward that topic
    expect(matchConcepts('why', pack)).toEqual([]);
    expect(matchConcepts('what is the', pack)).toEqual([]);
    expect(matchConcepts('why is it hotter in summer', programming)).toHaveLength(0); // each pack answers only its own subject
  });
});

describe('doubt routing on the programming pack', () => {
  it.each([
    ["I don't get loops", 'loops'],
    ['my function prints None', 'functions'],
    ['what does recursion mean', 'recursion'],
    ['why does my list start at 0', 'lists'],
    ['what is a variable', 'variables'],
  ])('"%s" goes to %s', (text, concept) => {
    expect(matchConcepts(text, programming)[0]!.concept).toBe(concept);
  });
});
