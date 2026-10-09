# How to review the content (task B: a person must do this)

The content was **drafted with AI help**. The code in it is checked by running it in real Python (`npm run verify:content`), but facts, wording and the match between each wrong answer and its named mistake can only be checked by a person.

## Steps (about 1 to 2 hours per pack)
1. Run `npm run content:review`. It writes `docs/content-review/programming-basics.md` and `docs/content-review/seasons-basics.md`.
2. Read one sheet top to bottom. For **every topic**: are the explanations true and clear for a student? Is the teach-back list sensible?
3. For **every question**: is the fact true? Is the marked answer the only correct one? Does each wrong answer really show the mistake named next to it? Is the feedback kind and correct?
4. For **generated questions** read the three examples. They are made by code, so every example follows the same pattern.
5. Fix problems in `src/content/packs/<pack>/pack.json` (or the generator in `src/generators/`), then run `npm run check` and `npm run verify:content`.
6. Run `npm run content:review` again and fill in the sign-off line at the top of each sheet (name, date). Commit the sheets.

## Who
- **Programming pack:** someone who knows Python well and did not write the content.
- **Seasons pack:** someone who can check the science (a science teacher or a science textbook). The key facts: seasons come from the 23.5 degree tilt, not distance; Earth is closest to the Sun in early January; the hemispheres have opposite seasons; the equinoxes (around 21 March and 23 September) have day and night nearly equal.

## Adding questions later
- Copy the pattern of an existing question. Every wrong option needs a `misconception` id that exists in the pack and a `feedback` entry for it.
- **Give every mistake at least two questions** (today most have one). A mistake can only be found if a question offers it.
- Run `npm run validate:content` (it warns about a mistake that no question offers), `npm run verify:content`, and `npm run content:review`.
