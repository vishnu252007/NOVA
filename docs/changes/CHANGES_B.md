# Change note: Phase B (content and generators)

## What is new
- **Programming pack v0.2.0:** all six topics (variables, lists, loops, loop bounds, functions, recursion) with a plain explanation plus other styles, a teach-back checklist and routing keywords; 59 named mistakes; **32 questions** (4 to 6 per topic).
- **Four generators (B3):** `accumulator.init`, `loops.while-condition`, `lists.index-vs-value`, `recursion.base-case` in `src/generators/basics.ts`. Registered, used in the pack, and tested with 500 seeds each.
- **Second pack (B4):** `seasons-basics` (Science): 3 topics, 12 questions, 19 mistakes. Same engine, no engine change.
- **`npm run verify:content`:** runs the code in every question in real Python (needs Python 3). 266 questions checked, all marked answers match. Catches a wrong answer on purpose (tested).
- **`npm run content:review`:** writes a readable review sheet per pack to `docs/content-review/` for a person to check and sign. `docs/CONTENT_REVIEW.md` explains how.
- **Validator:** now also warns when a defined mistake is never offered by any question. Both packs: 0 errors, 0 warnings.
- **Pack tests** (`src/content/packs.test.ts`): completeness (4 or more questions per topic, 2 or more explanation styles, 2 or more teach-back items), the new generators are registered and varied, the second pack is a different subject and runs the whole engine flow, and doubt routing works for typical student sentences.

## Removed
- `src/generators/phaseB.ts` (delete it): it was never registered or used, had no tests, produced duplicate answer options in 68 of 200 samples (`lists.index-vs-value`) and one fixed question (`recursion.base-case`). Replaced by `basics.ts`.

## Bugs found while doing this, and fixed
1. **Doubt matcher:** common words in topic titles ("why", "what", "the") counted as matches and pulled questions toward the wrong topic. Now ignored (`src/core/engine/matcher.ts`, with tests).
2. The unused Phase B generators were broken (see above).

## IMPORTANT: the evidence changed
With real content the simulated-learner results changed a lot. **Do not use the old claim that NOVA resolves more learners.** With 59 mistakes and mostly one question per mistake, NOVA finishes about as many learners as a memoryless tutor (31.2% against 31.6% within 40 questions), is slower at the start, and style adaptation is not shown. Its mistake flags are more reliable (83% against 40% precision). I tested two fixes in throwaway runs: stopping the "improving" rule (no free fix) and **preferring questions the learner has not answered yet**, which lifted an ideal learner from 78.6% to 91.0%. That second fix (about 3 lines in `selector.ts`) is recommended as the next patch and is NOT in this one. Details and numbers: `docs/EVIDENCE.md` sections 4 and 5. `docs/DEMO_SCRIPT.md` was changed so it no longer makes the old claim.

## Tests that changed (they assumed the old thin pack)
`diagnostic.test.ts`, `diagnostic.test.tsx`, `dna.test.ts`, `lesson.test.ts`, `fixes.test.ts`, `learn.test.tsx`, `phase-c.test.tsx`, `learnerSim.test.ts`. Examples: the quick check now covers 6 topics and asks 6 to 8 questions; Lists and Loops are locked until Variables is shown (Variables can now be measured); the lock-rule tests now use a copy of the pack without Variables questions to keep testing "a topic that cannot be measured must not block others".

## Files
New: `src/generators/basics.ts`, `src/content/packs/seasons-basics/pack.json`, `src/content/packs.test.ts`, `scripts/verify-content.ts`, `scripts/export-content-review.ts`, `docs/CONTENT_REVIEW.md`, `docs/content-review/programming-basics.md`, `docs/content-review/seasons-basics.md`, `docs/changes/CHANGES_B.md`
Rewritten: `src/content/packs/programming-basics/pack.json`
Changed: `src/generators/index.ts`, `src/content/index.ts`, `src/core/content/validate.ts`, `src/core/engine/matcher.ts`, `src/sim/learnerSim.ts` (measures how many mistakes the questions could reveal), `scripts/run-evidence.ts` (ideal-learner experiment), `package.json` (two scripts), the 8 tests above, `README.md`, `docs/BACKLOG.md`, `docs/PROJECT_DESIGN_REPORT.md`, `docs/EVIDENCE.md`, `docs/DEMO_SCRIPT.md`, `docs/evidence-data/simulation.md` and `simulation.json`, `docs/changes/CHANGES_D4.md` (marked superseded)
NOT changed: `types.ts`, `ports.ts`, `config.ts`, no new dependencies.

## Honest limits
- **AI-drafted, not human-reviewed.** Do `docs/CONTENT_REVIEW.md` before presenting, especially the seasons science.
- Most mistakes are tested by one question (48 of 59 in programming). That limits what NOVA can find.
- The app does not yet let a student pick the seasons pack.
- Only code-based answers are machine-checked. Conceptual answers rely on the human review.

## Commands (PowerShell, in the project folder)
```
Expand-Archive -Path .\nova-B-changes.zip -DestinationPath . -Force
Remove-Item src\generators\phaseB.ts
npm run check
npm run verify:content
npm run content:review
npm run evidence
```
Expected: 172 tests pass, both packs 0 errors and 0 warnings, `verify:content` says all answers match.
