# NOVA: Project Design Report

**Project:** NOVA, Your Personal Learning Twin
**Event:** Code Carnival 3.0, Problem Statement PS-06
**Document purpose:** the single source of truth for building NOVA. A person or an AI coding tool should be able to continue the work using only this report and the foundation code.
**Status of this document:** design complete; foundation code written and tested (see section 12).

---

## 0. How to use this document with another AI tool

1. Give the tool the foundation zip and this report.
2. Tell it to read `AGENTS.md` and this report first, then do **one task** from `docs/BACKLOG.md`.
3. Ask it to run `npm run check` before it finishes, and to explain any change to `src/core/types.ts` or `src/core/ports.ts` before making it.

Copy-paste starter prompt:

> You are continuing the NOVA project. Read `AGENTS.md` and `docs/PROJECT_DESIGN_REPORT.md` fully. The foundation (contracts, engine, adapters, content pack, tests) is already built and must not be redesigned. Implement backlog task **<ID>** from `docs/BACKLOG.md` only. Follow every hard rule in `AGENTS.md`. Add tests. Run `npm run check` and fix failures. At the end, list the files you changed and any assumption you made.

---

## 1. Context

### 1.1 The problem statement (PS-06)
"Develop an AI-powered on-device learning assistant that adapts to each student's learning pace, knowledge level, strengths, and weaknesses. The system should provide personalized explanations, practice questions, feedback, and study recommendations while working without constant internet connectivity, ensuring privacy, accessibility, and a smooth learning experience on low-resource devices."

### 1.2 Event facts and unknowns
- Hackathon page: adsc-atmiya.com, Code Carnival 3.0 (Atmiya University, Rajkot). Eight problem statements; NOVA is registered under PS-06.
- The page described an event window of 7 to 10 October 2026, a roughly 70 percent prototype expected on arrival, mandatory GitHub, source code, documentation and a demo-ready prototype, and at least two team members at the table at all times.
- **Unknown, must be confirmed with the organizers:** judging criteria and weights, whether AI-assisted code is allowed, exactly how the "70 percent on arrival" rule is measured, and the exact schedule. Do not assume.

### 1.3 Team
Team of 4. Lead: repo, documentation, demo script, integration. Member 2: AI tools and programming (engine, AI layer, offline). Members 3 and 4: research, content authoring and review, testing, small assigned tasks. Only about two strong programmers, so scope is deliberately small and the foundation is built to make later work simple.

---

## 2. Vision and the pain it solves

**One line:** NOVA is an app on the student's own device that finds out *why* they are stuck and *which kind of explanation works for them*, then plans their next steps, all without internet.

**Pains addressed**
1. Everyone gets the same lesson, so fast students are bored and slow students are lost.
2. Apps say "wrong" without saying *why*. Most errors come from one specific wrong idea (a misconception).
3. Students are often sure but wrong, or unsure but right. Almost no tool tracks this.
4. Forgetting: without timed review, learning fades.
5. Weak internet, shared or old devices, and privacy concerns about sending answers to a cloud service.

**Core differentiator:** the combination of (a) deterministic evidence (answers are checked by code, wrong options carry misconception tags), (b) a persistent, inspectable learner state, (c) misconception-level diagnosis, and (d) adaptive teaching style, with (e) a small on-device model used only as the *voice*.

**Pitch line:** "The internet gives everyone the same AI. NOVA gives every student their own."

**It is not a chatbot.** The system leads the session. A small Ask box exists for doubts but routes to lessons and quizzes.

---

## 3. Product definition

### 3.1 Student flow
1. Open the app (works offline). No account. Pick or create a local profile.
2. First time: a short diagnostic places the student on the concept map.
3. **Home / Today's plan:** the next best actions with reasons ("You made this mistake 3 times").
4. **Learn:** a short explanation in the style that has worked best for this student.
5. **Practice:** the student first taps confidence (Sure / Unsure / Guess), then answers. Wrong answers are matched to a named misconception. Feedback gives evidence and an explanation in the chosen style, with a "Why this?" reveal. Hints are released one at a time.
6. **Probe:** a follow-up question that tests the same mistake. If passed, the mistake becomes "resolved" and the teaching style is credited.
7. **Teach me back:** the student explains the idea in their own words, checked against a checklist of required ideas.
8. **My Learning DNA:** concept map, mistakes (active / improving / resolved), confidence accuracy, best style, reviews due.
9. **Ask (small):** a doubt like "I don't get loops" is routed by keyword matching to the right lesson and a short quiz.

### 3.2 Screens
Profile picker, Home, Learn, Practice, My DNA, plus later: Teach-back, Ask, Settings (text size, contrast, lite mode, export/import).

### 3.3 What a student learns
From **content packs**: authored sets of concepts for a subject. Plan: one deep pack (suggested: "Programming basics: loops and lists", 6 to 10 concepts) and one small second pack (about 10 questions, non-programming) to prove the engine is subject-agnostic. "Bring your own notes" is a stretch goal and must be labeled as AI-generated with weaker diagnosis.

### 3.4 Out of scope for the first version
Accounts and cloud sync, free-form chat as the main interface, leaderboards and streaks, voice input, camera/OCR, many subjects.

---

## 4. Architecture

### 4.1 Principles
1. **Contracts first.** `src/core/types.ts` and `src/core/ports.ts` define everything. All other code is built against them.
2. **Pure core.** The engine is pure functions on plain data. No React, no storage, no AI inside.
3. **Ports and adapters.** The core declares interfaces (storage, AI, clock, generators). Adapters implement them. Swapping Dexie or a model never touches the core.
4. **Code decides, AI voices.** Facts, diagnosis, mastery, strategy and plan come from code. AI only rephrases verified text.
5. **Event-driven state.** The only way learner state changes is `applyAttempt(state, AttemptEvent, pack)`. State can be replayed from history.
6. **Plugins for growth.** Subjects are data (JSON packs). Question templates are generator plugins. Models are runtime plugins. Teaching styles are a list.
7. **Offline by default.** PWA with precached app and packs. IndexedDB storage. No network in the core loop.
8. **Light and accessible.** No heavy libraries. Keyboard operable. Works with the model off.

### 4.2 Layers and dependency rule

```
 ui/ (React screens)
   |
 app/ (session provider, composition root)         -> wires adapters to ports
   |
 core/  <-- ports.ts -->  adapters/ (Dexie, memory, AI template, local model, Ollama)
 (types, config, engine, content validator)
   ^
 generators/ (question plugins)    content/ (JSON packs)    seed/ (demo personas)
```
Dependencies point **inward** to `core`. `core` imports nothing outside `core`.

### 4.3 Folder map
```
src/
  core/
    types.ts            domain contracts (THE foundation)
    ports.ts            interfaces: Clock, StoragePort, AIPort, LocalModelRuntime, QuestionGenerator
    config.ts           all tunable numbers
    util/               rng (seeded), time, id
    engine/             graph, mastery, review, calibration, strategy, misconceptions,
                        learner (applyAttempt), questions, selector, intervention, planner, matcher
    content/validate.ts content pack validator
  generators/           loopBounds.ts (example plugins), registry.ts, index.ts (register here)
  adapters/
    storage/            dexieStorage.ts, memoryStorage.ts, bundle.ts (export/import validation)
    ai/                 templateAI.ts, fallbackAI.ts, localModelAI.ts, prompts.ts, runtimes/ollama.ts, index.ts
  content/              index.ts (register packs), packs/<id>/pack.json
  seed/personas.ts     demo learners built by running scripted attempts through the real engine
  app/                  container.ts (composition root), session.tsx
  ui/                   App.tsx (router), screens/, styles.css
scripts/validate-content.ts
docs/                   this report, BACKLOG.md
```

---

## 5. Domain contracts (summary of `src/core/types.ts`)

- **Identifiers:** strings for packs, concepts, misconceptions, question specs, questions (`specId#seed`), profiles.
- **Teaching vocabulary:** `ExplanationStyle` = plain, worked-example, analogy, counterexample, socratic. `Confidence` = sure, unsure, guess. `Difficulty` = 1, 2, 3.
- **Content:** `ContentPack` { concepts, misconceptions, questions }. `Concept` has prerequisites, routing keywords, explanations per style, and a teach-back checklist. `MisconceptionDef` has a student-friendly title, description, and explanations. `QuestionSpec` is `static` (authored) or `generated` (references a generator id). Every wrong `Option` must have a `misconception` id and the question needs `feedback.plain` for it.
- **Runtime question:** `Question` with materialized options (`o1`..`oN`), hints, and feedback built from the question's own values.
- **Learner state (`LearnerState`):** per-concept `mastery` (0..1), attempts, correct, review stage and next review time; per-misconception `seen`, `status` (active, improving, resolved), first and last seen; per-style `shown` and `helped`; confidence calibration (`n`, `wrong` per level); pace (moving averages); capped history of `AttemptEvent`.
- **`AttemptEvent`:** the only input that changes state (question, chosen option, correctness, tagged misconception, confidence, time, hints, whether it is a probe, which mistake it probes, which style was shown before it).
- **Engine outputs:** `Intervention` (style, evidence, reason, verified baseText), `Plan` with `PlanStep`s, `ConceptMatch`, `TeachBackResult`.
- **Persistence:** `Profile` (with `Settings` and a `seeded` flag), `ExportBundle`.

### Versioning and migrations
Each persisted shape has `schemaVersion` (learner, pack) or `version` (export). When a shape must change: bump the version, write a `migrate(vN) -> vN+1` function, run it on load, add a test with an old fixture. Dexie schema changes add a new `this.version(n)` block and never edit old ones.

---

## 6. Engine rules (reference implementation)

All numbers are in `src/core/config.ts`. Each rule is a replaceable function with a stable signature.

| Area | Rule today | Upgrade path |
|---|---|---|
| Mastery | Correct: close 25% of the gap to 1 (half if "guess"). Wrong: lose 15% (22% if "sure"). | Bayesian Knowledge Tracing, same signature |
| Locking | A concept is locked if any prerequisite that CAN be measured (it has questions) has mastery below 0.35. A prerequisite with no questions never blocks. | Per-concept thresholds |
| Misconceptions | Wrong tagged option: seen+1, active. Correct normal answer in the concept: active becomes improving. Passed probe: resolved. Relapse: active again. | Beta belief scores |
| Review | Expanding intervals 1, 3, 7, 14, 30 days; wrong answer resets | Forgetting-curve model |
| Strategy | 1) a style with at least 2 uses and help rate at least 50% wins; 2) if a mistake repeats 2+ times, try an untried style; 3) else plain. Always returns a human-readable `reason`. | Thompson-sampling bandit |
| Planner | Active mistakes first (most repeated), then due reviews, then next new or shaky unlocked concept; diagnostic if no history. Max 3 steps. | Weighted scoring |
| Selector | Pick question for the concept: closest to target difficulty (from mastery), tests current mistakes, avoids recent questions, deterministic by seed | Item response theory |
| Matcher | Keyword overlap with one-typo tolerance routes a doubt to concepts. No AI. | Embedding similarity (optional AI) |
| Calibration | Overconfident if at least 4 "sure" answers and at least 30% wrong | Per-concept calibration |

**Design intent:** every decision is explainable on screen ("Why this?"). Judges and students can see the rule that fired.

---

## 7. Content system

### 7.1 Pack schema
See `src/core/types.ts` and the sample `src/content/packs/programming-basics/pack.json`. **The sample pack is a placeholder for plumbing; the team must author and review the real content.**

### 7.2 The key idea: misconception-tagged wrong options
Each wrong option encodes one specific wrong belief. Picking it diagnoses the misconception instantly with no AI. For example, for `range(1, 3)` over `[4, 7, 2]`, the option "4 7 2" is tagged `off-by-one-start`.

### 7.3 Generator plugins
A generator (`QuestionGenerator`) takes `{seed, focus, params}` and returns a question body. Pattern: pick random values, **run the logic to get the true answer**, build each wrong option by applying one known mistake (tagged), and write feedback with the same numbers (this yields counterexamples automatically). Keep the learner's `focus` mistakes among the wrong options. Must be deterministic per seed. Register in `src/generators/index.ts`; reference from a pack with `{"kind":"generated","generator":"<id>"}`. Tests sample 500 seeds per generator.

### 7.4 Validation
`npm run validate:content` checks: unique ids; prerequisites exist and have no cycle; every question's concept exists; exactly one correct option; unique option text; every wrong option has a known misconception tag and `feedback.plain`; generators exist and 100 sampled outputs pass the same checks. Warnings flag missing explanations, keywords, checklists or questions.

### 7.5 Authoring workflow (for Members 3 and 4)
1. Use a shared sheet with columns: concept, difficulty, prompt, correct answer, each wrong option, the wrong belief it represents, feedback sentence.
2. AI may draft; **a human must verify every fact and every tag**.
3. Convert to JSON, run the validator, fix errors.
4. Test the wording with real classmates and add any confusion phrases to the concept `keywords`.

---

## 8. AI layer

### 8.1 Policy
**Code decides, AI voices.** The model may rephrase verified text, give friendly teach-back feedback, and later answer doubts grounded in lesson text. It never decides correctness, mastery, labels, strategy or the plan. It is never required.

### 8.2 Structure
- `AIPort` (explain, evaluateTeachBack, optional answerDoubt).
- `TemplateAI`: always available; returns the verified base text; scores teach-back by checklist keywords.
- `LocalModelAI(runtime)`: builds a strict grounded prompt (`prompts.ts`), calls a `LocalModelRuntime`. Teach-back scoring still comes from the checklist; the model only writes the message.
- `FallbackAI(primary, fallback, timeoutMs)`: any error or timeout returns the template answer. It never throws.
- `createAI(aiMode)` in `adapters/ai/index.ts`: `off` (lite mode) = templates only. `VITE_AI_RUNTIME=ollama` plus `VITE_OLLAMA_MODEL=<name>` enables the Ollama example. Add WebLLM or Transformers.js by implementing `LocalModelRuntime` in `adapters/ai/runtimes/`.

### 8.3 Model selection checklist (do this early, on the real demo device)
Record for each candidate model: file size, first-load time, time to first answer, answer time for a 3-sentence rewrite, memory use, quality on 10 sample interventions, licence. Choose the smallest model that rewrites well. Download everything before the event; never rely on venue Wi-Fi. If too slow, ship lite mode and say so honestly. **Specific model names, versions and free-tier limits change; verify them at the time of use.**

### 8.4 Lite mode
For weak devices, `aiMode: 'off'` removes the model. The whole loop still works with templates and generator feedback. Show real size, load time and memory numbers on the weakest device in the demo.

---

## 9. Storage, privacy, offline

- **Storage:** IndexedDB via Dexie (`DexieStorage`); `MemoryStorage` for tests or when IndexedDB is unavailable.
- **Profiles instead of accounts:** local profiles keyed by id; several on one device; seeded demo personas are flagged `seeded` and always labeled "sample data" in the UI.
- **Export/import:** JSON file with format and version checks; import always assigns a new profile id, so it never overwrites.
- **Offline:** `vite-plugin-pwa` precaches the app shell and JSON packs (service worker). The offline test is part of daily routine: load once online, switch Wi-Fi off, reload, run a full session, and confirm the network tab shows no outside requests.
- **Privacy claims to make (and only these):** no account, no cloud calls in the core loop, data stays on the device, export is user-initiated. The optional Ollama runtime talks to `localhost` on the same machine.
- **Browser storage caveat:** clearing site data removes profiles; export is the backup.

---

## 10. UI and accessibility requirements

- **Screens:** see 3.2. The DNA screen is the demo centerpiece: concept map, named mistakes with status, confidence accuracy, best style, reviews due. Every piece of text on it is derived from data the student can inspect.
- **Always show reasons.** "Why this?" under every recommendation and intervention.
- **Accessibility (required):** keyboard operation, visible focus, labels on inputs, status shown with text or shape not only color, adjustable text size, high-contrast mode, read-aloud using the browser's speech synthesis (test offline; voices vary), plain-language mode, no hover-only controls.
- **Low-resource:** small bundle (currently about 400 KB precached / 125.6 KB gzip), no heavy chart or UI libraries, no GPU-dependent animation, respect reduced motion.
- **Tone:** short, specific, encouraging. Never shame an overconfident answer.

---

## 11. Evaluation and evidence plan

Judges trust evidence. Collect and store in `docs/EVIDENCE.md`:
1. **Offline integrity:** video or screenshots with Wi-Fi off and an empty network tab during a full session.
2. **Personalization:** same wrong answer, two learners, different intervention (already covered by a test using the seeded personas).
3. **Adaptation:** strategy choice changes as strategy history changes (unit test exists).
4. **Engine tests:** `npm run test` output.
5. **Simulated learners:** a script that simulates learners with hidden misconceptions and compares NOVA's selection against a memoryless baseline (attempts to diagnose, probe success). Use only as "prototype evidence", never as proof of learning outcomes.
6. **Before/after:** first attempt versus probe result.
7. **Low-resource numbers:** bundle size, first load, memory and answer time on the weakest device.

Do not claim educational impact that was not measured. Say "prototype".

---

## 12. Current status (what the foundation already contains)

| Area | State |
|---|---|
| Contracts, ports, config | Done |
| Engine: mastery, misconceptions, review, calibration, strategy, planner, selector, intervention, matcher, reducer, session summary | Done (reference rules), 18 tests |
| Content validator and script | Done; sample pack passes with 5 warnings (empty concepts) |
| Generators | 2 example plugins for `loop-bounds`; 500-seed tests |
| Storage | Dexie and Memory adapters; export/import validation; tests |
| AI | Grounded Template/LocalModel/Fallback AI, Ollama runtime with abortable generation, Teach-back and Ask screens, per-profile lite mode, low-resource auto-detection. Automated tests cover fallback, routing, checklist coverage and mode selection. Real-device model benchmark is still pending (see `docs/EVIDENCE.md`, section 6). |
| Seeded personas | Fresh and "Aarav", built through the real engine |
| App shell | Composition root, session provider, profile picker, Home, Learn, DNA |
| Review list and demo time (tasks A5 and A6, done) | Home shows due and upcoming reviews. Open the app with `?demo=1` for "+1 day / +7 days / Reset time" to show retention in the demo. A test forbids reading the real time outside the clock |
| Offline proof tooling (task D1, partly done) | `npm run check:offline` inspects the production build (saved files, navigation fallback, manifest, no internet addresses, size). Live offline badge in the app. Sub-path hosting via `VITE_BASE`. Written real-browser procedure in `docs/OFFLINE_TEST.md`. **The real-browser run itself has not been done yet** |
| Settings: accessibility and backup (tasks D2 and D3) | Text size, high contrast (AAA-tested palette), read aloud, skip link, focus movement; backup save and restore with plain-words messages. Manual checks still to do: `docs/ACCESSIBILITY_CHECK.md` |
| Evidence pack (task D4) | `docs/EVIDENCE.md`; `npm run evidence` runs 500 simulated learners per policy through the real engine. **With the real content NOVA is not better than a memoryless tutor at finishing, is slower at the start, and style adaptation is not shown.** Its mistake flags are more reliable (83% against 40% precision). A coverage-first question selection was tested and is recommended as the next patch. In-app device check under `?demo=1` |
| Content (Phase B) | Programming pack: 6 topics, 59 mistakes, 32 questions (answers run in real Python). Seasons pack: 3 topics, 19 mistakes, 12 questions. Four new generators. Review sheets in `docs/content-review/`. **AI-drafted: a person must review and sign off.** Most mistakes are tested by only one question |
| Demo mode (task D5, done in code) | `?demo=1`: demo learners, fixed demo question, safe reset, rehearsal timer; `docs/DEMO_SCRIPT.md`. Rehearsals and the backup recording still have to be done by the team |
| Practice (task A1, done) | 5-question session with progress bar, concept title, hints, probe or skip, Leave/End session, and a summary (score, mistakes, fixed mistakes, mastery before/after, next step). Tested by a jsdom test that plays a full session |
| Diagnostic (task A2, done) | Pure adaptive check in `engine/diagnostic.ts` (coverage first, then follow-ups: harder after right, easier after wrong, stop early when answers agree; numbers in `CONFIG.diagnostic`). `Diagnostic` screen with intro, confidence plus answer per question, no marks during the check, results (levels per topic, mistakes found, plan before and after). Answers are kept in memory and saved together through `applyAttempt` at the end; leaving early saves nothing. Home sends a new profile here. 16 new tests |
| Learn with style (task A3, done) | `engine/lesson.ts` (`buildLesson`, pure) picks the style with the same `chooseStyle` rules as practice feedback and a repeating mistake in that concept counts. Learn screen shows that style, a "Why this?" reason, and buttons for other styles (marked "your choice", no learner state changes). Home sends a new topic to Learn. Lesson text is verified template text; no AI call, so lite mode is unaffected. 11 new tests |
| DNA screen (task A4, done) | `engine/dna.ts` (`buildConceptMap`, `buildMistakeTimeline`, pure). Concept map as a small SVG: columns by prerequisite depth, arrows from a topic to what it unlocks (solid = prerequisite strong enough, dashed = not yet). Status is a glyph, a word, a border style and a percent, never colour alone. Every topic lists what it needs and unlocks; locked topics say exactly what to reach ("reach 35% in Variables, now 0%"). Mistake timeline per misconception with dates in words. 11 new tests |
| PWA | Config present; production build succeeds with service worker precache |
| Verification run | 172 tests pass (including UI tests in jsdom), typecheck passes, content validation passes, production build and offline checks succeed |

**Not done / honest gaps**
- The UI has **not been checked in a real browser**. It is compiled, built, and exercised by jsdom tests (including Practice, Teach-back, Ask and Settings), which do not check visual layout. Visual layout, offline install, and service-worker behavior need manual verification (backlog D1).
- Sample content is placeholder-quality and covers only part of the concepts.
- Phase C's code is implemented, but C1 still needs the team to benchmark 1-2 models on the demo laptop and weakest device before selecting a model (backlog C1; see `docs/EVIDENCE.md`, section 6).
- The `Practice` screen is solid but its look is basic; visual design is still to do.
- Strategy, mastery and planner rules are intentionally simple.
- Unverified external facts: event schedule and rules, model availability and licences, free-tier limits.

---

## 13. Roadmap

Follow `docs/BACKLOG.md`. Summary and suggested owners:

1. **Phase A (core loop, Lead + Member 2):** polish Practice, diagnostic, Learn with style, DNA, plan, clock injection. This reaches the 70 percent prototype.
2. **Phase B (content, Members 3 and 4, reviewed by Lead):** 6 concepts fully authored, 4 to 6 questions per concept, 4 more generators, a second small pack.
3. **Phase C (AI, Member 2):** runtime, Teach-back, Ask and lite mode are implemented; finish the real-device benchmark before selecting a model.
4. **Phase D (offline, accessibility, evidence, demo, whole team):** real-browser offline test, accessibility, export/import UI, evidence pack, demo mode and backup video.
5. **Phase E (stretch):** only after A to D are demo-ready.

Rule of thumb: always keep `main` runnable and demo-able. Cut scope before cutting quality.

---

## 14. Demo script (3 minutes)

1. (20 s) Problem: same lesson for everyone, apps say wrong but not why.
2. (20 s) Turn Wi-Fi off on screen; show the empty network tab.
3. (60 s) Fresh learner marks "Sure", picks a wrong answer. NOVA names the misconception with evidence, explains in a plain style. DNA changes.
4. (40 s) Switch to the seeded learner (labeled sample data). The same wrong answer gets a counterexample; open "Why this?" to show the rule and history.
5. (20 s) Probe passes; the mistake becomes "resolved"; the style is credited.
6. (20 s) DNA map and tomorrow's plan.
7. Close with the pitch line. Keep a recorded backup of this exact run.

### PS keyword coverage
| PS says | Where shown |
|---|---|
| Learning pace | pace stats, hint timing |
| Knowledge level | mastery, concept map, diagnostic |
| Strengths and weaknesses | DNA, named mistakes |
| Personalized explanations | style per student, Why this? |
| Practice questions | selector and generators |
| Feedback | named misconception with evidence |
| Study recommendations | Today's plan with reasons |
| Without constant internet | offline PWA, empty network tab |
| Privacy | local profiles, no cloud, export file |
| Accessibility | section 10 |
| Low-resource devices | lite mode, small bundle, device numbers |
| Smooth experience | no crashes, fast loads, clear next step |

---

## 15. Risks and answers

| Risk | Answer |
|---|---|
| Local model too slow or heavy | Lite mode and template fallback keep the product working |
| Model says something wrong | It only rephrases verified text; code decides facts |
| Scope too big for 2 strong coders | Foundation is done; follow phases; cut stretch items early |
| Content not ready | Start the authoring sheet immediately; AI drafts, humans verify |
| Offline claim doubted | Show the empty network tab live; test daily |
| "Is this just a quiz app?" | A quiz only scores. NOVA diagnoses the mistake, teaches in the student's best style, proves the fix with a probe, and plans the next step |
| Seeded history seen as fake | Label it "sample data" everywhere and say so in the demo |
| Rules unknown (AI code, judging) | Ask organizers early |

---

## 16. Engineering conventions

- TypeScript strict. Small pure functions. Names describe intent.
- Tests colocated as `*.test.ts`; use `src/testkit.ts` helpers and a fake `Clock` for time.
- Branching: short-lived branches, small PRs, `main` always passes `npm run check`.
- Commits: imperative, one logical change each.
- Never add a dependency without a reason; prefer built-ins (bundle size matters).
- Never put secrets or personal data in the repo.
- Definition of done: acceptance criteria met, tests added, `npm run check` passes, works offline, accessibility rules respected, docs updated if behavior changed.

---

## 17. Glossary
**Misconception:** a specific wrong belief behind a wrong answer. **Probe:** a follow-up question that tests whether a mistake is fixed. **Teach-back:** the student explains the idea in their own words. **Learner twin / DNA:** the stored, inspectable model of one student. **Pack:** authored content for a subject. **Generator:** a plugin that makes verified questions from a template. **Port / adapter:** an interface the core needs and a swappable implementation of it. **Lite mode:** run without the local model.
