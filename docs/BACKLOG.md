# Backlog (ordered). Each task is independent unless it lists a dependency.

Definition of done for every task: `npm run check` passes, tests added, works offline, no rule in AGENTS.md broken.

## Phase A: Complete the core loop (needed for the 70% prototype)
| ID | Task | Acceptance |
|---|---|---|
| A1 | **DONE.** Practice screen polish: concept and progress shown, 5-question session (`CONFIG.session.length`), session summary with correct count, mistakes found, fixed mistakes, mastery before/after, and a next step | Verified by `session.test.ts` (logic) and `practice.test.tsx` (full session in jsdom) |
| A2 | **DONE.** Quick diagnostic for a new profile: `diagnostic.ts` (pure, rules in `CONFIG.diagnostic`) and the `Diagnostic` screen; 6 to 8 adaptive questions, answers saved together at the end, results show levels, mistakes and the changed plan | Verified by `diagnostic.test.ts` (engine) and `diagnostic.test.tsx` (full check in jsdom). Needs real-browser check (D1) |
| A3 | **DONE.** Learn screen uses the style chosen by `chooseStyle` (via `buildLesson`), with "Why this?" and a way to look at other styles | Verified by `lesson.test.ts` and `learn.test.tsx`: Fresh sees plain, Aarav sees counterexample on Loop bounds. Needs real-browser check (D1) |
| A4 | **DONE.** DNA screen: concept map (SVG, no library) with prerequisite arrows, status shown by glyph + word + border style + percent, locked topics say what unlocks them, mistake timeline per misconception | Verified by `dna.test.ts` and `dna.test.tsx`. Needs real-browser check (D1) |
| A5 | **DONE.** Home shows today's plan with reasons plus a **Review** list from `reviewSchedule` (due topics with "Review" buttons, or the next review time). Wording: "due today", "due 2 days ago", "due tomorrow", "due in 5 days" | Verified by `review-schedule.test.ts` (fake time) and `home-review.test.tsx` |
| A6 | **DONE.** All app time comes from the injected `Clock` (a test, `clock-guard.test.ts`, fails if `Date.now()` or `new Date()` appears outside `src/app/clock.ts`, `src/core/util/id.ts` and `src/adapters/`). Hidden demo tools: open the app with `?demo=1` to get "+1 day", "+7 days" and "Reset time" | Verified by `clock.test.ts` and `home-review.test.tsx` |

## Phase B: Content
| ID | Task | Acceptance |
|---|---|---|
| B1 | **DONE (drafted, awaiting human review).** All 6 programming topics have a plain explanation plus at least one more style, a teach-back checklist of 3 to 4 items, and routing keywords. The seasons pack has 3 topics. Validator: 0 errors, 0 warnings | `docs/content-review/*.md` signed off by a person |
| B2 | **DONE (drafted, awaiting human review).** Programming: 32 questions (4 to 6 per topic, 266 checked by running the code in real Python). Seasons: 12 questions. Every wrong answer is tagged and has feedback. Each mistake is still offered by only one question for most mistakes (48 of 59), which is the next content job | `npm run verify:content` passes; human sign-off pending |
| B3 | **DONE.** Four generators (`accumulator.init`, `loops.while-condition`, `lists.index-vs-value`, `recursion.base-case`) in `src/generators/basics.ts`, registered, used by the pack, covered by 500-seed tests and the Python check. The old unused `phaseB.ts` (duplicate options in 68 of 200 samples, a fixed question) was removed | `packs.test.ts`, `generators.test.ts`, `npm run verify:content` |
| B4 | **DONE.** Second pack `seasons-basics` (Science): 3 topics, 12 questions, 19 mistakes, runs on the same engine with no engine change (`packs.test.ts`). Not yet selectable in the app (profiles use `programming-basics`) | `packs.test.ts` |

## Phase C: AI layer
| ID | Task | Acceptance |
|---|---|---|
| C1 | **DEVICE TEST PENDING.** Benchmark 1 to 2 small models on the demo laptop and weakest device (load time, answer time, memory) | Procedure and honest unmeasured rows in `docs/EVIDENCE.md`; team must run on both real devices and choose or reject |
| C2 | **DONE.** Ollama `LocalModelRuntime`, grounded rephrasing, timeout cancellation and template fallback | Adapter tests verify model output, errors, timeout and fallback |
| C3 | **DONE.** Teach-back screen using `evaluateTeachBack` | Checklist coverage and message shown; model remains optional |
| C4 | **DONE.** Ask box routes with `matchConcepts`, answers from lesson text and offers lesson/practice | Tests cover "I don't get loops" and unknown-topic response |
| C5 | **DONE.** Lite mode toggle (`aiMode: 'off'`) and auto-detection on low-resource devices | Profile setting selects templates; limits are centralized in `CONFIG.ai` |

## Phase D: Offline, accessibility, evidence
| ID | Task | Acceptance |
|---|---|---|
| D1 | **PARTLY DONE.** Done and tested: `npm run check:offline` (CI), live "Ready to work offline" badge, sub-path hosting support (`VITE_BASE`), step-by-step guide `docs/OFFLINE_TEST.md`. **Still needs a person:** run the real-browser and real-device test and save the screenshot and numbers | Table in `docs/OFFLINE_TEST.md` filled in, screenshot of the empty Network tab |
| D2 | **DONE in code; manual checks pending.** Settings screen with text size (3 sizes), high contrast (palette tested to WCAG AAA), read aloud ("Listen" buttons on lessons and questions, uses a local voice when one exists), skip link, main landmark, focus moves to the new screen, `aria-current` on tabs. Guide: `docs/ACCESSIBILITY_CHECK.md` | Keyboard-only run, 200% zoom, high-contrast look, offline read-aloud and (optional) screen reader checked by a person on the demo device |
| D3 | **DONE.** Settings has "Save a backup file" (clear file name and message) and "Restore from a backup file" (also on the profile screen). Plain-words errors; a restore always makes a NEW profile and adds "(restored)" if the name exists; damaged files are rejected without changing anything | Round trip proven by `backup.test.ts` and `settings.test.tsx` |
| D4 | **DONE except device numbers.** `npm run evidence` (simulated learners: NOVA vs a memoryless tutor, diagnosis precision/recall, engine speed), in-app **device check** (`?demo=1`, "Run device check"), and `docs/EVIDENCE.md` with the real numbers and honest limits. **Still needs a person:** run the device check on the weakest device and paste the numbers | `docs/EVIDENCE.md` section 5 filled in |
| D5 | **DONE in code and tests; rehearsal and recording pending.** Under `?demo=1`: one-click **Open Fresh learner / Open Aarav**, **Start demo question** (same fixed question for both, with a helper line naming the answer to pick), **Reset demo data** (asks first; only deletes sample-data profiles), rehearsal **timer** that says if the run is under 3:00, time buttons, device check. `docs/DEMO_SCRIPT.md` has the minute-by-minute script, roles, fallbacks, backup-recording steps and likely questions. A test plays the whole demo through the real screens, and `demoScript.test.ts` fails if content edits would break it | Rehearsal log in `docs/DEMO_SCRIPT.md` filled in (3 runs under 3:00) and the backup video recorded and copied to 3 places |

## Phase E: Stretch (only if A to D are done)
Bandit strategy selector, BKT mastery, bring-your-own-notes, Pyodide code questions, voice input
