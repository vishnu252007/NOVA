import type { GeneratorRegistry } from '../ports';
import { EXPLANATION_STYLES } from '../types';
import type { ContentPack, MisconceptionId, QuestionBody } from '../types';
import { topoOrder } from '../engine/graph';
import { materializeQuestion } from '../engine/questions';

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

const GENERATED_SAMPLES = 100;

function checkBody(where: string, body: QuestionBody, miscIds: Set<MisconceptionId>, errors: string[], offered?: Set<MisconceptionId>) {
  if (!body.prompt?.trim()) errors.push(`${where}: empty prompt`);
  if (body.options.length < 2) errors.push(`${where}: needs at least 2 options`);
  const correct = body.options.filter((o) => o.correct);
  if (correct.length !== 1) errors.push(`${where}: needs exactly 1 correct option (found ${correct.length})`);
  const texts = new Set(body.options.map((o) => o.text.trim()));
  if (texts.size !== body.options.length) errors.push(`${where}: duplicate option text`);
  for (const o of body.options) {
    if (o.correct) continue;
    if (o.misconception) offered?.add(o.misconception);
    if (!o.misconception) errors.push(`${where}: wrong option "${o.text}" has no misconception tag`);
    else if (!miscIds.has(o.misconception)) errors.push(`${where}: unknown misconception "${o.misconception}"`);
    else if (!body.feedback?.[o.misconception]?.plain) errors.push(`${where}: no feedback.plain for "${o.misconception}"`);
  }
}

/** Static checks on a content pack. Run in CI and by `npm run validate:content`. */
export function validatePack(pack: ContentPack, generators: GeneratorRegistry): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dup = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) { if (seen.has(id)) errors.push(`duplicate ${kind} id "${id}"`); seen.add(id); }
  };
  if (pack.schemaVersion !== 1) errors.push(`unsupported schemaVersion ${String(pack.schemaVersion)}`);
  dup('concept', pack.concepts.map((c) => c.id));
  dup('misconception', pack.misconceptions.map((m) => m.id));
  dup('question', pack.questions.map((q) => q.id));

  const conceptIds = new Set(pack.concepts.map((c) => c.id));
  const miscIds = new Set(pack.misconceptions.map((m) => m.id));

  for (const c of pack.concepts) {
    for (const p of c.prerequisites) if (!conceptIds.has(p)) errors.push(`concept "${c.id}": unknown prerequisite "${p}"`);
    for (const s of Object.keys(c.explanations)) if (!(EXPLANATION_STYLES as readonly string[]).includes(s)) errors.push(`concept "${c.id}": unknown style "${s}"`);
    if (!c.explanations.plain) warnings.push(`concept "${c.id}": no plain explanation`);
    if (!c.keywords.length) warnings.push(`concept "${c.id}": no routing keywords`);
    if (!c.teachBack.length) warnings.push(`concept "${c.id}": no teach-back checklist`);
    if (!pack.questions.some((q) => q.concept === c.id)) warnings.push(`concept "${c.id}": no questions yet`);
  }
  try { topoOrder(pack); } catch (e) { errors.push((e as Error).message); }

  for (const m of pack.misconceptions) {
    if (!conceptIds.has(m.concept)) errors.push(`misconception "${m.id}": unknown concept "${m.concept}"`);
    for (const s of Object.keys(m.explanations)) if (!(EXPLANATION_STYLES as readonly string[]).includes(s)) errors.push(`misconception "${m.id}": unknown style "${s}"`);
  }

  const offered = new Set<MisconceptionId>(); // mistakes some question can actually reveal
  for (const q of pack.questions) {
    const where = `question "${q.id}"`;
    if (!conceptIds.has(q.concept)) { errors.push(`${where}: unknown concept "${q.concept}"`); continue; }
    if (q.kind === 'static') { checkBody(where, q, miscIds, errors, offered); continue; }
    if (!generators.get(q.generator)) { errors.push(`${where}: generator "${q.generator}" is not registered`); continue; }
    for (let seed = 1; seed <= GENERATED_SAMPLES; seed++) {
      try {
        const built = materializeQuestion(q, generators, seed);
        checkBody(`${where} seed ${seed}`, built, miscIds, errors, offered);
      } catch (e) {
        errors.push(`${where} seed ${seed}: ${(e as Error).message}`);
        break;
      }
      if (errors.length > 50) break;
    }
  }
  for (const m of pack.misconceptions) {
    if (!offered.has(m.id)) warnings.push(`misconception "${m.id}" is never offered as a wrong answer by any question, so NOVA can never find it`);
  }
  return { errors, warnings };
}
