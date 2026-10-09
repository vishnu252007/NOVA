/**
 * Checks content answers by RUNNING the code shown in each question in real Python (task B).
 * Run: npm run verify:content   (needs Python 3 on the computer; set VERIFY_SEEDS to test more generated questions)
 * It checks "What does this print?", "How many times...", "What happens when this runs?", "Which condition can
 * replace ???" and "Which loop header..." questions. Other (conceptual) questions are listed as "needs a person".
 */
import { spawnSync } from 'node:child_process';
import { PACKS } from '../src/content';
import { materializeQuestion } from '../src/core/engine';
import { createDefaultGenerators } from '../src/generators';
import type { Question } from '../src/core/types';

const py = ['python3', 'python'].find((c) => spawnSync(c, ['--version']).status === 0);
if (!py) { console.log('Python 3 was not found, so nothing was checked. Install Python and run again.'); process.exit(0); }

const SEEDS = Number(process.env.VERIFY_SEEDS ?? 40);
const run = (code: string, recursionLimit?: number) => {
  const prog = recursionLimit ? `import sys\nsys.setrecursionlimit(${recursionLimit})\n${code}` : code;
  const r = spawnSync(py, ['-c', prog], { encoding: 'utf8', timeout: 8000 });
  return { out: (r.stdout ?? '').trim(), err: r.stderr ?? '', ok: r.status === 0 };
};
const tokens = (s: string) => s.trim().split(/\s+/).filter(Boolean).join(' ');
const REFERENCE: Record<string, string> = { factorial: 'math.factorial(n)', power_of_two: '2 ** n', power_of_three: '3 ** n' };

type Verdict = { kind: 'checked' | 'skipped'; problems: string[] };

function verify(q: Question): Verdict {
  const code = q.code ?? '';
  const right = q.options.find((o) => o.correct)!;
  const problems: string[] = [];
  const need = (cond: boolean, msg: string) => { if (!cond) problems.push(msg); };

  if (/^What (value )?(does this print|values are printed)/.test(q.prompt) && code) {
    const r = run(code);
    need(r.ok, `code failed: ${r.err.split('\n').slice(-2)[0]}`);
    need(tokens(r.out) === tokens(right.text), `Python prints "${tokens(r.out)}" but the marked answer is "${tokens(right.text)}"`);
    for (const o of q.options.filter((x) => !x.correct)) need(tokens(o.text) !== tokens(r.out), `wrong option "${o.text}" is actually the output`);
    return { kind: 'checked', problems };
  }
  const ev = /^What is (nums\[-?\d+\])\?/.exec(q.prompt);
  if (ev && code) {
    const r = run(`${code}\nprint(${ev[1]})`);
    need(tokens(r.out) === tokens(right.text), `Python gives ${r.out} but the marked answer is ${right.text}`);
    return { kind: 'checked', problems };
  }
  if (/^Which index is the last item/.test(q.prompt) && code) {
    const r = run(`${code}\nprint(len(nums) - 1)`);
    need(r.out === right.text, `the last index is ${r.out} but the marked answer is ${right.text}`);
    return { kind: 'checked', problems };
  }
  if (/^How many times does (print|the loop body) run/.test(q.prompt) && code) {
    const r = run(code);
    need(String(r.out.split('\n').filter(Boolean).length) === right.text, `Python runs print ${r.out.split('\n').filter(Boolean).length} times but the marked answer is ${right.text}`);
    return { kind: 'checked', problems };
  }
  if (/^How many times is f called/.test(q.prompt) && code) {
    const r = run(`import sys\nn = 0\ndef _p(frame, event, arg):\n    global n\n    if event == 'call' and frame.f_code.co_name == 'f':\n        n += 1\nsys.setprofile(_p)\n${code}\nsys.setprofile(None)\nprint(n)`);
    need(r.out === right.text, `f is called ${r.out} times but the marked answer is ${right.text}`);
    return { kind: 'checked', problems };
  }
  if (/^What happens when this runs/.test(q.prompt) && code) {
    const r = run(code, 200);
    need(/RecursionError/.test(r.err) === /RecursionError/.test(right.text), `Python says "${r.err.split('\n').slice(-2)[0]}" which does not match the marked answer`);
    return { kind: 'checked', problems };
  }
  if (code.includes('???') && /Which condition/.test(q.prompt)) {
    const name = /def (\w+)\(n\)/.exec(code)?.[1] ?? '';
    const ref = REFERENCE[name];
    need(!!ref, `no reference function for "${name}"`);
    for (const o of q.options) {
      const test = `import math\n${code.replace('???', o.text)}\nok = True\nfor n in range(0, 7):\n    try:\n        ok = ok and (${name}(n) == ${ref})\n    except RecursionError:\n        ok = False\nprint(ok)`;
      const r = run(test, 300);
      need((r.out === 'True') === !!o.correct, `option "${o.text}" ${r.out === 'True' ? 'works' : 'does not work'} in Python but is marked ${o.correct ? 'correct' : 'wrong'}`);
    }
    return { kind: 'checked', problems };
  }
  if (/^Which loop header/.test(q.prompt) && code) {
    for (const o of q.options) {
      const r = run(`${code.split('#')[0]}\nseen = []\ntry:\n    ${o.text}\n        seen.append(nums[i])\n    print(seen == nums)\nexcept IndexError:\n    print(False)`);
      need((r.out === 'True') === !!o.correct, `header "${o.text}" ${r.out === 'True' ? 'visits every item' : 'does not visit every item'} in Python but is marked ${o.correct ? 'correct' : 'wrong'}`);
    }
    return { kind: 'checked', problems };
  }
  return { kind: 'skipped', problems };
}

const gens = createDefaultGenerators();
let checked = 0, skipped = 0, bad = 0;
const skippedIds = new Set<string>();
for (const pack of PACKS) {
  for (const spec of pack.questions) {
    const seeds = spec.kind === 'generated' ? Array.from({ length: SEEDS }, (_, i) => i + 1) : [1];
    for (const seed of seeds) {
      const v = verify(materializeQuestion(spec, gens, seed));
      if (v.kind === 'skipped') { skipped++; skippedIds.add(`${pack.id}/${spec.id}`); continue; }
      checked++;
      if (v.problems.length) { bad++; console.log(`  MISMATCH ${pack.id}/${spec.id} seed ${seed}:\n    ${v.problems.join('\n    ')}`); if (bad > 25) process.exit(1); }
    }
  }
}
console.log(`\nChecked ${checked} questions by running the code in Python ${bad ? `: ${bad} PROBLEM(S)` : ': all answers match'}.`);
console.log(`${skippedIds.size} question(s) have no runnable code and need a person to check them (listed in docs/content-review/): ${[...skippedIds].slice(0, 6).join(', ')}${skippedIds.size > 6 ? ', ...' : ''}`);
process.exit(bad ? 1 : 0);
