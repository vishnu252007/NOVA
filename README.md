# NOVA: Your Personal Learning Twin

An offline-first, on-device learning assistant (Code Carnival 3.0, PS-06). It learns *why* a student gets things wrong and *how* they learn best, then plans what to teach next. No account. Data stays on the device.

> Start with `docs/PROJECT_DESIGN_REPORT.md` (the full design) and `AGENTS.md` (rules for AI coding tools).

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # typecheck + tests + content validation (run before every commit)
npm run verify:content # runs every code question in real Python (needs Python 3)
npm run content:review  # writes the review sheets in docs/content-review/ for a person to check and sign
npm run evidence      # simulated-learner results and engine speed -> docs/evidence-data/ (see docs/EVIDENCE.md)
npm run check:offline # after a build: is everything saved for offline use? (see docs/OFFLINE_TEST.md)
npm run build && npm run preview   # production build with the offline service worker
```

Offline test: open the built app once online, switch Wi-Fi off, reload, and use it.

## Architecture in one picture

```
 ui/ (React)  ->  app/ (session, container)  ->  core/ (pure domain + engine)  <-  ports.ts
                                                                                   ^
                     adapters/ (Dexie storage, AI runtimes)  ---------implements---+
                     generators/ (question plugins)  content/ (JSON packs)
```

`core/` imports nothing outside `core/`. Everything else depends inward on it.

## Demo mode

Open the app with `?demo=1` for the demo tools: **Open Fresh learner / Open Aarav**, **Start demo question**, **Reset demo data** (only sample-data profiles), a rehearsal timer, time buttons and a device check. The full script is in `docs/DEMO_SCRIPT.md`.

## Demo tip: show the review schedule without waiting

Open the app with `?demo=1` (for example `http://localhost:5173/?demo=1`). A small bar appears with **+1 day**, **+7 days** and **Reset time**. It moves only the app clock, so a topic practised today becomes "due for review" on Home. Students do not see this bar without `?demo=1`.

## Where to add things

| I want to add... | Do this |
|---|---|
| A subject | New folder in `src/content/packs/<id>/pack.json`, register in `src/content/index.ts`, run `npm run validate:content` |
| A question template | New file in `src/generators/`, register in `src/generators/index.ts`, add a spec with `kind: "generated"` to a pack |
| A teaching style | Add to `EXPLANATION_STYLES` in `src/core/types.ts`, add text in packs |
| A local model | Implement `LocalModelRuntime` in `src/adapters/ai/runtimes/` and select it in `src/adapters/ai/index.ts` |
| A screen | `src/ui/screens/`, add a route in `src/ui/App.tsx` |
| A tuning change | `src/core/config.ts` |

## Status

Foundation complete: contracts, engine, storage, AI port with fallback, generator plugins, content validator, sample pack, seeded personas, PWA shell, and a thin working UI slice. See the status table in the design report.

## Project history and honesty

- The foundation (architecture, engine, storage, sample content pack, tests, CI) was prepared **before** the event. Features, real content and the demo built from the event start are visible in the git history.
- AI tools (Claude) were used to help write parts of the code and documents. Every change is covered by automated checks (`npm run check`), and the team reviews and tests it.
- Demo learners are **sample data** and are labeled that way in the app.
- Per-task change notes are in `docs/changes/`.

## Accessibility and backup

Open **Settings** in the app for text size, high contrast, read aloud, and backup/restore of a profile. Manual accessibility checks are in `docs/ACCESSIBILITY_CHECK.md`.
