> **SUPERSEDED (Phase B):** the headline simulation results below were measured on the small sample pack and no longer hold. See `docs/EVIDENCE.md` for the current results.

# Change note: task D4 (evidence pack)

## What is new
1. **`npm run evidence`** runs 500 simulated learners per policy through the REAL engine: NOVA (quick check, plan, targeted questions, probes, strategy) against a memoryless baseline (random question, plain explanation, no probe). It measures how fast hidden mistakes are removed and how well mistakes are found, plus engine speed. Output: `docs/evidence-data/simulation.md` and `simulation.json`. Results are reproducible (fixed seed).
2. **Device check** in the demo tools: open the app with `?demo=1`, press **Run device check**, then **Copy these numbers**. It times the engine on the device, reads page load timing, JS memory (Chrome) and storage use, and gives plain text for the evidence file. Nothing leaves the device.
3. **`docs/EVIDENCE.md`** with the real numbers, what each test proves, and honest limits.

## The honest headline results (sample content, simulated learners)
- NOVA resolved **98.6%** of learners within 40 questions against **90.4%** for the baseline.
- **Average speed is the same** (15.4 against 15.3 questions).
- **Style adaptation is not shown** in short runs (42.5% best-style, random would be about 50%).
- Diagnosis in 10 questions: precision **89.7%** against 70.6%, but recall **55.4%** against 80.8%.
- Cause of the low recall (tested in a throwaway experiment, not shipped): the rule that lowers a mistake to "improving" after any later correct answer. Removing it raises recall to 90.8% but slows removal. It is a trade-off. A better rule needs a `types.ts` change, so it is left as a recommendation for the lead.

## Files
New: `scripts/run-evidence.ts`, `src/sim/learnerSim.ts`, `src/sim/learnerSim.test.ts`, `src/app/deviceCheck.ts`, `src/app/deviceCheck.test.ts`, `src/ui/screens/device-check.test.tsx`, `docs/EVIDENCE.md`, `docs/evidence-data/simulation.md`, `docs/evidence-data/simulation.json`, `docs/changes/CHANGES_D4.md`
Changed: `src/ui/DemoTools.tsx` (device check button), `package.json` (one script), `README.md`, `docs/BACKLOG.md`, `docs/PROJECT_DESIGN_REPORT.md`
NOT changed: the engine, `types.ts`, `ports.ts`, `config.ts`, no new dependencies.

## Honest limits
- The simulation uses assumed learner behaviour. It is prototype evidence of system behaviour, not proof that students learn more.
- **Weak-device numbers are not measured yet.** I have no weak device. Run the device check on yours and paste the output into `docs/EVIDENCE.md` section 5.
- Numbers come from the small sample pack and will change with real content. Re-run `npm run evidence` after the content lands.
- The timing numbers in `simulation.md` change slightly on every run (the simulation results do not).

## Commands (PowerShell, in the project folder)
```
Expand-Archive -Path .\nova-D4-changes.zip -DestinationPath . -Force
npm run check
npm run evidence
npm run dev
```
Then open `http://localhost:5173/?demo=1` and press "Run device check". Repeat on the weakest device and paste the result into `docs/EVIDENCE.md`.
