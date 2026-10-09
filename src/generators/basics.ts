import type { GeneratorInput, QuestionGenerator } from '@/core/ports';
import type { FeedbackText, MisconceptionId, OptionDraft, QuestionBody } from '@/core/types';
import { createRng, randInt, shuffle, type Rng } from '@/core/util/rng';

/**
 * Question templates for Variables-to-Recursion (task B3). Same pattern as loopBounds.ts:
 * pick random values, work out the true answer, build each wrong option from ONE known mistake,
 * and write the feedback from the same numbers. `scripts/verify-content.ts` runs the shown code
 * in real Python and checks the correct answer, so the answers cannot drift.
 */

interface Cand { text: string; m: MisconceptionId }
const two = (xs: number[]) => xs.join('  ');
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a) }, (_, k) => a + k);

function distinctNums(r: Rng, n: number, lo = 10, hi = 99): number[] {
  const s = new Set<number>();
  while (s.size < n) s.add(randInt(r, lo, hi));
  return [...s];
}

/** Drops wrong options that repeat the right answer or each other; keeps the learner's current mistakes first. */
function chooseWrongs(r: Rng, correct: string, pool: Cand[], focus: MisconceptionId[]): Cand[] | null {
  const seen = new Set([correct]);
  const unique = pool.filter((c) => (seen.has(c.text) ? false : (seen.add(c.text), true)));
  if (unique.length < 3) return null;
  const mixed = shuffle(r, unique);
  return [...mixed.filter((c) => focus.includes(c.m)), ...mixed.filter((c) => !focus.includes(c.m))].slice(0, 3);
}

/** Tries a few nearby seeds if a random draw gives too few different wrong answers. Still deterministic. */
function build(seed: number, make: (r: Rng) => QuestionBody | null): QuestionBody {
  for (let k = 0; k < 20; k++) {
    const body = make(createRng(seed + k * 7919));
    if (body) return body;
  }
  throw new Error(`Could not build a valid question for seed ${seed}`);
}

function body(r: Rng, prompt: string, code: string, correct: string, wrongs: Cand[], feedback: Record<MisconceptionId, FeedbackText>, hints: string[]): QuestionBody {
  const options: OptionDraft[] = shuffle(r, [{ text: correct, correct: true }, ...wrongs.map((w) => ({ text: w.text, misconception: w.m }))]);
  return { prompt, code, options, feedback, hints };
}

// ---------- loops: a running total ----------
export const accumulatorInit: QuestionGenerator = {
  id: 'accumulator.init',
  concept: 'loops',
  targets: ['accumulator-ignores-start', 'update-replaces-instead-of-adds', 'accumulator-multiplies', 'start-added-every-round'],
  generate({ seed, focus }: GeneratorInput): QuestionBody {
    return build(seed, (r) => {
      const s = randInt(r, 1, 9);
      const [a, b, c] = [randInt(r, 2, 9), randInt(r, 2, 9), randInt(r, 2, 9)] as [number, number, number];
      const right = String(s + a + b + c);
      const wrongs = chooseWrongs(r, right, [
        { text: String(a + b + c), m: 'accumulator-ignores-start' },
        { text: String(c), m: 'update-replaces-instead-of-adds' },
        { text: String(s * a * b * c), m: 'accumulator-multiplies' },
        { text: String(a + b + c + 3 * s), m: 'start-added-every-round' },
      ], focus);
      if (!wrongs) return null;
      return body(r, 'What value does this print?', `total = ${s}\nfor x in [${a}, ${b}, ${c}]:\n    total += x\nprint(total)`, right, wrongs, {
        'accumulator-ignores-start': { plain: `total starts at ${s}, not 0. ${s} + ${a} + ${b} + ${c} = ${right}.`, counter: `Before the loop total is ${s}. After adding ${a} it is ${s + a}, after ${b} it is ${s + a + b}, after ${c} it is ${right}.` },
        'update-replaces-instead-of-adds': { plain: 'total += x means total = total + x. It adds to what is already in total.', counter: `After the first round total is ${s + a} (${s} + ${a}), not ${a}. It keeps growing: ${right} at the end.` },
        'accumulator-multiplies': { plain: '+= adds. It does not multiply.', counter: `Round by round: ${s} + ${a} = ${s + a}, then + ${b} = ${s + a + b}, then + ${c} = ${right}.` },
        'start-added-every-round': { plain: `The start value ${s} is set once, before the loop. The loop only adds ${a}, ${b} and ${c}.`, counter: `total is ${s} once, at the start. Then ${a}, ${b} and ${c} are added: ${right}.` },
      }, ['What is total before the loop starts?', 'Write down total after each round of the loop.']);
    });
  },
};

// ---------- loops: while conditions ----------
export const whileCondition: QuestionGenerator = {
  id: 'loops.while-condition',
  concept: 'loops',
  targets: ['while-includes-stop-value', 'while-stops-too-early', 'while-skips-initial-value', 'less-equal-excludes-stop', 'while-runs-past-stop'],
  generate({ seed, focus }: GeneratorInput): QuestionBody {
    return build(seed, (r) => {
      const strict = r() < 0.5;
      const s = randInt(r, 1, 3);
      const e = s + randInt(r, 3, 5);
      const last = strict ? e - 1 : e; // last value that is printed
      const right = two(range(s, last + 1));
      const pool: Cand[] = strict
        ? [{ text: two(range(s, e + 1)), m: 'while-includes-stop-value' }, { text: two(range(s, e - 1)), m: 'while-stops-too-early' }, { text: two(range(s + 1, e)), m: 'while-skips-initial-value' }, { text: two(range(s, e + 2)), m: 'while-runs-past-stop' }]
        : [{ text: two(range(s, e)), m: 'less-equal-excludes-stop' }, { text: two(range(s, e - 1)), m: 'while-stops-too-early' }, { text: two(range(s + 1, e + 1)), m: 'while-skips-initial-value' }, { text: two(range(s, e + 2)), m: 'while-runs-past-stop' }];
      const wrongs = chooseWrongs(r, right, pool, focus);
      if (!wrongs) return null;
      const cmp = strict ? '<' : '<=';
      const stopNote = strict ? `i < ${e} is false when i reaches ${e}, so ${e} is not printed.` : `i <= ${e} is still true when i is ${e}, so ${e} is printed. It becomes false at ${e + 1}.`;
      return body(r, 'What does this print?', `i = ${s}\nwhile i ${cmp} ${e}:\n    print(i)\n    i += 1`, right, wrongs, {
        'while-includes-stop-value': { plain: stopNote, counter: `When i is ${e} the test i < ${e} is false, so the loop ends before printing ${e}.` },
        'while-stops-too-early': { plain: `The loop keeps going while the condition is true. It prints every value from ${s} to ${last}.`, counter: `i is ${last - 1} and then ${last}: the condition is still true for ${last}, so ${last} is printed.` },
        'while-skips-initial-value': { plain: `i starts at ${s} and the body runs for ${s} first, so ${s} is printed.`, counter: `Before the loop i is ${s}. The test is checked straight away, and print(i) shows ${s}.` },
        'less-equal-excludes-stop': { plain: stopNote, counter: `When i is ${e}, i <= ${e} is true, so print(i) shows ${e}.` },
        'while-runs-past-stop': { plain: `The loop ends the first time the condition is false. ${strict ? `i < ${e}` : `i <= ${e}`} is false for ${last + 1}, so ${last + 1} is never printed.`, counter: `After printing ${last}, i becomes ${last + 1}. The test is false, so the loop ends.` },
      }, ['What is i the first time the test is checked?', 'Is the stop value included for this comparison?']);
    });
  },
};

// ---------- lists: index versus value ----------
export const indexVsValue: QuestionGenerator = {
  id: 'lists.index-vs-value',
  concept: 'lists',
  targets: ['index-starts-at-one', 'index-vs-value', 'index-skips-ahead'],
  generate({ seed }: GeneratorInput): QuestionBody {
    return build(seed, (r) => {
      const nums = distinctNums(r, 4);
      const i = randInt(r, 1, 2);
      const right = String(nums[i]);
      const wrongs: Cand[] = [
        { text: String(nums[i - 1]), m: 'index-starts-at-one' },
        { text: String(i), m: 'index-vs-value' },
        { text: String(nums[i + 1]), m: 'index-skips-ahead' },
      ];
      const ok = chooseWrongs(r, right, wrongs, []);
      if (!ok) return null;
      const items = ['first', 'second', 'third', 'fourth'];
      return body(r, 'What does this print?', `nums = [${nums.join(', ')}]\nprint(nums[${i}])`, right, ok, {
        'index-starts-at-one': { plain: `Indexes start at 0, so nums[${i}] is the ${items[i]} item, ${right}. The ${items[i - 1]} item (${nums[i - 1]}) is nums[${i - 1}].`, counter: `nums[0] is ${nums[0]}. Counting on, nums[${i}] is ${right}.` },
        'index-vs-value': { plain: `nums[${i}] is the value stored at position ${i}, which is ${right}. The number ${i} is the position, not the value.`, counter: `The position is ${i}. The value at that position is ${right}, and print shows the value.` },
        'index-skips-ahead': { plain: `nums[${i}] is exactly the item at position ${i}, ${right}. The item at position ${i + 1} is ${nums[i + 1]}.`, counter: `Count from 0: position 0 is ${nums[0]}, position 1 is ${nums[1]}${i === 2 ? `, position 2 is ${nums[2]}` : ''}. So nums[${i}] is ${right}.` },
      }, ['The first item is at index 0.', `Count ${i} step${i > 1 ? 's' : ''} from the start.`]);
    });
  },
};

// ---------- recursion: choosing the base case ----------
const FUNCTIONS = [
  { name: 'factorial', step: 'n * factorial(n - 1)' },
  { name: 'power_of_two', step: '2 * power_of_two(n - 1)' },
  { name: 'power_of_three', step: '3 * power_of_three(n - 1)' },
];

export const baseCase: QuestionGenerator = {
  id: 'recursion.base-case',
  concept: 'recursion',
  targets: ['base-case-condition-reversed', 'base-case-one-step-too-far', 'base-case-misses-zero'],
  generate({ seed, focus }: GeneratorInput): QuestionBody {
    return build(seed, (r) => {
      const fn = FUNCTIONS[randInt(r, 0, FUNCTIONS.length - 1)]!;
      const wrongs = chooseWrongs(r, 'n == 0', [
        { text: 'n > 0', m: 'base-case-condition-reversed' },
        { text: 'n < 0', m: 'base-case-one-step-too-far' },
        { text: 'n == 1', m: 'base-case-misses-zero' },
      ], focus);
      if (!wrongs) return null;
      return body(r, `Which condition can replace ??? so that ${fn.name}(n) works for every n from 0 upwards?`, `def ${fn.name}(n):\n    if ???:\n        return 1\n    return ${fn.step}`, 'n == 0', wrongs, {
        'base-case-condition-reversed': { plain: `n > 0 is true for the big inputs, so ${fn.name}(3) would stop at once and return 1. The base case must be true only for the smallest input, n == 0.` },
        'base-case-one-step-too-far': { plain: `n < 0 is only reached after n == 0. The call with n == 0 would not stop, so it would use the answer for -1 and give a wrong result for 0.` },
        'base-case-misses-zero': { plain: `Starting from n == 0 the calls go to -1, -2, ... and never reach n == 1, so ${fn.name}(0) would never stop.` },
      }, ['What is the smallest input the function has to handle?', 'The base case must be true for that smallest input, and only there.']);
    });
  },
};
