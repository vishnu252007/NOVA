# NOVA demo script (task D5): 3 minutes, two people

**Rule:** only say what is in `docs/EVIDENCE.md`. Say "prototype". Say that the learner history is **sample data**.

Open the app with **`?demo=1`** on the address (for example `http://localhost:4173/?demo=1`). A "Demo tools" bar appears. Students never see it without `?demo=1`.

## Roles (the rules need two people at the table)
- **Presenter:** talks and clicks.
- **Partner:** holds the backup (video and screenshots), watches the timer, and answers the second question. Never leave the table empty.

## Before the judges arrive (10 minutes)
- [ ] Device charged and plugged in, brightness high, notifications and sleep off, other tabs closed.
- [ ] `npm run check` is green on the exact build being shown. (A test, `demoScript.test.ts`, fails if content edits would break this demo.)
- [ ] Open the app once **online** and wait for the line **"Ready to work offline"**. Then switch Wi-Fi off. Reload once to prove it still loads.
- [ ] In the Demo tools press **Reset demo data**, then **Yes, reset**. Press **Reset time**.
- [ ] Go to the profile screen (press **Switch**). Settings text size: Normal or Large, so it can be read from a distance.
- [ ] Backup video and screenshots are on this laptop, on a phone and on a USB stick, and the video plays with Wi-Fi off.

## The script (target 2 minutes 45 seconds; hard limit 3:00)
Start the **timer** in the Demo tools when you start speaking.

| Time | Do (exact buttons) | Say |
|---|---|---|
| 0:00 to 0:20 | Nothing on screen. | "Every student gets the same lesson, and apps say wrong without saying why. NOVA is a tutor that lives on your own device and learns how you learn." |
| 0:20 to 0:35 | Point at the badge under the title: **Offline mode: working from files saved on this device**. Show that Wi-Fi is off. | "Wi-Fi is off. Everything you will see runs on this device. No account, no cloud." |
| 0:35 to 1:15 | Press **Open Fresh learner**, then **Start demo question**. The **Demo helper** line says which answer to pick. Press **sure**, pick that answer, press **Check answer**. | "A new learner. I say I am sure, and I am wrong. NOVA names the mistake: off-by-one at the start of the loop, and shows the evidence. It has no history yet, so it starts with a plain explanation." Open **Why this?** and read the reason. |
| 1:15 to 2:00 | Press **Open Aarav**, then **Start demo question**. Same question. Pick the same answer, **sure**, **Check answer**. | "Aarav, three weeks of history. This is sample data, and the screen says so. Same question, same wrong answer. But NOVA remembers that counterexamples worked for him, so he gets one." Open **Why this?**: "counterexample helped you before, 2 of 2." |
| 2:00 to 2:25 | Press **Take the probe**, answer it correctly, press **End session**. | "NOVA checks the fix with a new question, not by trusting him. The mistake moves to fixed." (Summary shows **Fixed in this session**.) |
| 2:25 to 2:45 | Press **Back to Home**. Point at the **Review** card. Optional: press **+7 days** ("I moved the clock for the demo"). | "It also schedules reviews, so what he learned does not fade. Tomorrow's plan comes from his own history." |
| 2:45 to 3:00 | Stop the timer. | "The internet gives everyone the same AI. NOVA gives every student their own." Optional, if asked: "In a simulation, when NOVA flags a mistake it is right 83% of the time, while a tutor that flags every wrong answer is right 40% of the time. We also found where it must improve: it needs more questions per mistake." |

## If something goes wrong
| Problem | Do |
|---|---|
| App does not open offline | Play the backup video. Say honestly that you are showing the recording. |
| Old version shows | Before the demo: DevTools, Application, Service Workers, Unregister, reload online, wait for the badge. |
| The demo answer is not offered | Press **Reset demo data**. If it still fails, run `npm run check` and read the failing `demoScript` test. |
| Learners look strange after practising | **Reset demo data**. Real profiles are never touched. |
| A button is missing | The page was not opened with `?demo=1`. |
| Read aloud is silent | Skip it. It needs a voice installed on the device. |

## Backup recording (do this twice)
1. Windows: press **Win + Alt + R** (Xbox Game Bar) while the browser is active, or use OBS. Record the **whole 3-minute run with narration**.
2. Do the Before checklist first, so the recording shows the offline badge and Wi-Fi off.
3. Save as `NOVA-demo-backup.mp4`. Copy to the laptop, a phone and a USB stick. Play it once with Wi-Fi off.
4. Also take 4 screenshots: the offline badge, the plain and counterexample explanations side by side, **Why this?** open, and the **Fixed in this session** summary.
5. Do not commit the video to the repository (it is large). Keep it with the team.

## Rehearsal log (fill in; the target is under 3:00 every time)
| Run | Who | Time shown by the Demo tools timer | Problems |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

## Questions judges may ask (honest answers)
- **Is this just a quiz app?** A quiz scores. NOVA finds the specific mistake, teaches in the style that worked for this learner, proves the fix with a new question, and plans the next step.
- **Where is the AI?** Say exactly what runs on demo day. Today the decisions (right or wrong, which mistake, which style, the plan) are made by code on purpose, so they are correct and explainable. A small on-device model only rewrites the verified explanation, and the app works without it (lite mode). If the model is not installed on the demo device, say so.
- **How do you know it works?** 172 automated tests, plus simulated learners (`docs/EVIDENCE.md`). No real students have used it yet, so we make no learning claims.
- **Does it send data anywhere?** No. Data stays on the device. You can show the Network tab. Backup is a file the student saves.
- **What if browser data is cleared?** The student keeps a backup file (Settings, Save a backup file) and can restore it.
- **Low-resource devices?** The saved app is about 140 KB gzipped, and the engine takes microseconds. Quote the weak-device numbers from `docs/EVIDENCE.md` once they are filled in.
- **What did you build during the event?** Be open: the foundation was prepared before the event (see the README). Show the git history from the event start.
- **Does NOVA fix more mistakes than a normal tutor?** We do not claim that. In our simulation it did not finish more learners than a memoryless tutor, and we know why: each mistake is tested by one question. Its flags are more reliable (83% against 40%), and we tested a coverage fix that raised an ideal learner from 78.6% to 91.0%. It is the next patch. No real students have used it yet.
- **Why not just use a big chatbot?** A chatbot decides facts by guessing. Here code decides facts and AI only phrases them, so the learner is never taught something wrong by the model.
