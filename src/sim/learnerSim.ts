/**
 * Simulated learners, used as PROTOTYPE EVIDENCE of system behaviour (task D4).
 *
 * Each simulated learner secretly holds some misconceptions and has a secret best teaching style.
 * Two policies serve them the same content:
 *   - NOVA:     the real engine (quick check, plan, targeted questions, probes, strategy choice).
 *   - BASELINE: a memoryless tutor (random question, always the plain explanation, no probe, no memory).
 * The learner model is an ASSUMPTION (see DEFAULT_SIM). Results show how the system behaves under these
 * assumptions. They are NOT evidence that real students learn more.
 */
import {
  applyAttempt, buildIntervention, createLearner, diagnosticConcepts, materializeQuestion, nextDiagnosticQuestion, planToday, selectQuestion,
} from '@/core/engine';
import type { GeneratorRegistry } from '@/core/ports';
import type { AttemptEvent, ContentPack, ExplanationStyle, LearnerState, MisconceptionId, Question } from '@/core/types';
import { createRng, randInt, shuffle, type Rng } from '@/core/util/rng';

export interface SimConfig {
  learners: number;
  seed: number;
  budget: number; // most questions a learner may answer
  pHold: number; // chance a learner with a mistake falls into it when a matching wrong option is offered
  pSlip: number; // chance of a random wrong answer when no held mistake applies (noise)
  pLearnMatch: number; // chance an explanation in the learner's best style removes the mistake
  pLearnMismatch: number; // same, in another style
  styles: ExplanationStyle[]; // styles that exist in the sample pack
  diagnosisQuestions: number; // K for the diagnosis experiment
}

export const DEFAULT_SIM: SimConfig = {
  learners: 500, seed: 2026, budget: 40, pHold: 0.9, pSlip: 0.15, pLearnMatch: 0.8, pLearnMismatch: 0.35,
  styles: ['plain', 'counterexample'], diagnosisQuestions: 10,
};

export interface SimInput { pack: ContentPack; generators: GeneratorRegistry; cfg: SimConfig }
export type Policy = 'nova' | 'baseline';

interface Learner { hidden: Set<MisconceptionId>; initial: MisconceptionId[]; best: ExplanationStyle }

/** Mistakes a question can actually test (so every simulated mistake can be found). */
function testable(i: SimInput): MisconceptionId[] {
  const out = new Set<MisconceptionId>();
  for (const q of i.pack.questions) {
    if (q.kind === 'static') q.options.forEach((o) => o.misconception && out.add(o.misconception));
    else i.generators.get(q.generator)?.targets.forEach((t) => out.add(t));
  }
  return i.pack.misconceptions.map((m) => m.id).filter((id) => out.has(id));
}

export function makeLearner(i: SimInput, index: number): Learner {
  const r = createRng(i.cfg.seed * 7919 + index);
  const pool = shuffle(r, testable(i));
  const initial = pool.slice(0, randInt(r, 1, 3));
  return { hidden: new Set(initial), initial, best: i.cfg.styles[randInt(r, 0, i.cfg.styles.length - 1)]! };
}

function answer(l: Learner, q: Question, r: Rng, cfg: SimConfig) {
  const held = q.options.filter((o) => !o.correct && o.misconception && l.hidden.has(o.misconception));
  if (held.length && r() < cfg.pHold) return { option: held[0]!, fell: true };
  const wrong = q.options.filter((o) => !o.correct);
  if (r() < cfg.pSlip) return { option: wrong[randInt(r, 0, wrong.length - 1)]!, fell: false };
  return { option: q.options.find((o) => o.correct)!, fell: false };
}

export interface RunResult {
  attempts: number; // questions answered
  resolvedAt: number | null; // attempts when no hidden mistake was left (null = not within the budget)
  wrong: number;
  interventions: number;
  interventionsInBestStyle: number;
  predictedActive: Set<MisconceptionId>; // what the system believed at the end
  offeredShare: number; // share of the learner's mistakes that at least one asked question offered as a wrong answer
  hiddenButOffered: number; // mistakes still hidden at the end although a question offered them
}

/** One learner through one policy. `learning=false` turns teaching off (used for the diagnosis experiment). */
export function runLearner(i: SimInput, index: number, policy: Policy, budget: number, learning: boolean): RunResult {
  const { pack, generators, cfg } = i;
  const l = makeLearner(i, index);
  const r = createRng(cfg.seed * 104729 + index * 31 + (policy === 'nova' ? 1 : 2));
  const concepts = diagnosticConcepts(pack);
  const specs = pack.questions.filter((q) => concepts.includes(q.concept));

  let state: LearnerState = createLearner('sim', pack, 0);
  const events: AttemptEvent[] = [];
  const seen = new Set<MisconceptionId>(); // baseline's only memory of the current run: none used for choices
  const recent: string[] = [];
  let attempts = 0, wrong = 0, interventions = 0, inBest = 0, resolvedAt: number | null = l.hidden.size === 0 ? 0 : null;
  let probeFor: MisconceptionId | undefined;
  let afterStyle: ExplanationStyle | undefined;
  let diagnosticDone = policy === 'baseline';
  const diagEvents: AttemptEvent[] = [];
  const offered = new Set<MisconceptionId>(); // wrong answers the asked questions made possible

  while (attempts < budget) {
    let q: Question | null = null;
    if (policy === 'baseline') {
      q = materializeQuestion(specs[randInt(r, 0, specs.length - 1)]!, generators, randInt(r, 1, 1e6), []);
    } else if (!diagnosticDone) {
      q = nextDiagnosticQuestion({ pack, generators, events: diagEvents, seed: randInt(r, 1, 1e6) });
      if (!q) diagnosticDone = true;
    }
    if (!q && policy === 'nova') {
      const step = planToday(state, pack, attempts).steps[0];
      const concept = probeFor ? pack.misconceptions.find((m) => m.id === probeFor)!.concept : step?.concept;
      const focus = probeFor ? [probeFor] : step?.misconception ? [step.misconception] : [];
      const seed = randInt(r, 1, 1e6);
      q = (concept && concepts.includes(concept) ? selectQuestion({ pack, state, generators, concept, seed, focus, recentSpecIds: recent }) : null)
        ?? selectQuestion({ pack, state, generators, concept: concepts[randInt(r, 0, concepts.length - 1)]!, seed, focus, recentSpecIds: recent });
    }
    if (!q) break;

    q.options.forEach((o) => o.misconception && offered.add(o.misconception));
    const { option, fell } = answer(l, q, r, cfg);
    const correct = !!option.correct;
    const ev: AttemptEvent = {
      type: 'attempt', at: attempts, questionId: q.id, specId: q.specId, concept: q.concept, chosenOptionId: option.id, correct,
      misconception: option.misconception, confidence: fell ? 'sure' : 'unsure', timeMs: 10000, hintsUsed: 0,
      isProbe: !!probeFor, probeFor, afterStyle: probeFor ? afterStyle : undefined,
    };
    attempts++;
    if (!correct) { wrong++; if (option.misconception) seen.add(option.misconception); }
    recent.push(q.specId);
    if (policy === 'nova') {
      state = applyAttempt(state, ev, pack);
      if (!diagnosticDone) diagEvents.push(ev);
    }

    probeFor = undefined;
    if (!correct && option.misconception) {
      const style: ExplanationStyle = policy === 'nova' ? buildIntervention(pack, state, q, option).style : 'plain';
      if (learning && diagnosticDone) { // the quick check only measures; teaching starts after it (as in the app)
        interventions++;
        if (style === l.best) inBest++;
        if (l.hidden.has(option.misconception) && r() < (style === l.best ? cfg.pLearnMatch : cfg.pLearnMismatch)) l.hidden.delete(option.misconception);
        if (policy === 'nova') { probeFor = option.misconception; afterStyle = style; }
      }
    }
    if (resolvedAt === null && l.hidden.size === 0) { resolvedAt = attempts; if (learning) break; }
  }

  const predictedActive = policy === 'nova'
    ? new Set(Object.entries(state.misconceptions).filter(([, m]) => m.status === 'active').map(([id]) => id))
    : seen;
  return {
    attempts, resolvedAt, wrong, interventions, interventionsInBestStyle: inBest, predictedActive,
    offeredShare: l.initial.length ? l.initial.filter((m) => offered.has(m)).length / l.initial.length : 1,
    hiddenButOffered: [...l.hidden].filter((m) => offered.has(m)).length,
  };
}

// ---------- summaries ----------
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const ci = (xs: number[]) => {
  const m = mean(xs);
  const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  return 1.96 * sd / Math.sqrt(xs.length || 1);
};
const prop = (hits: number, n: number) => ({ p: n ? hits / n : 0, ci: n ? 1.96 * Math.sqrt(((hits / n) * (1 - hits / n)) / n) : 0 });

export interface ResolutionStats {
  policy: Policy; learners: number;
  meanAttemptsToResolve: number; ciAttempts: number; // unresolved learners count as the budget
  resolvedWithin20: { p: number; ci: number }; resolvedWithinBudget: { p: number; ci: number };
  meanWrongAnswers: number; bestStyleShare: number;
  mistakesOfferedShare: number; // average share of a learner's mistakes that some asked question could reveal
  unfixedOfferedShare: number; // share of learners left with a mistake that a question had offered but that was not fixed
}
export interface DiagnosisStats { policy: Policy; learners: number; precision: number; recall: number; f1: number }

export function resolutionExperiment(i: SimInput, policy: Policy): ResolutionStats {
  const runs = Array.from({ length: i.cfg.learners }, (_, k) => runLearner(i, k, policy, i.cfg.budget, true));
  const att = runs.map((x) => x.resolvedAt ?? i.cfg.budget);
  const inter = runs.reduce((a, b) => a + b.interventions, 0);
  return {
    policy, learners: runs.length,
    meanAttemptsToResolve: mean(att), ciAttempts: ci(att),
    resolvedWithin20: prop(runs.filter((x) => x.resolvedAt !== null && x.resolvedAt <= 20).length, runs.length),
    resolvedWithinBudget: prop(runs.filter((x) => x.resolvedAt !== null).length, runs.length),
    meanWrongAnswers: mean(runs.map((x) => x.wrong)),
    bestStyleShare: inter ? runs.reduce((a, b) => a + b.interventionsInBestStyle, 0) / inter : 0,
    mistakesOfferedShare: mean(runs.map((x) => x.offeredShare)),
    unfixedOfferedShare: runs.filter((x) => x.hiddenButOffered > 0).length / runs.length,
  };
}

export function diagnosisExperiment(i: SimInput, policy: Policy): DiagnosisStats {
  const ps: number[] = [], rs: number[] = [];
  for (let k = 0; k < i.cfg.learners; k++) {
    const truth = new Set(makeLearner(i, k).initial);
    const run = runLearner(i, k, policy, i.cfg.diagnosisQuestions, false);
    const tp = [...run.predictedActive].filter((m) => truth.has(m)).length;
    ps.push(run.predictedActive.size ? tp / run.predictedActive.size : 1); // nothing flagged = nothing wrong flagged
    rs.push(truth.size ? tp / truth.size : 1);
  }
  const precision = mean(ps), recall = mean(rs);
  return { policy, learners: i.cfg.learners, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0 };
}
