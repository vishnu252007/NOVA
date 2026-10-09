import type { ConceptMatch, ContentPack } from '../types';

// Everyday words that appear in topic titles ("Why we have seasons", "What the seasons change") but say nothing
// about the topic. Without this, a student's "why" or "the" would pull the question toward the wrong topic.
const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'be', 'do', 'does', 'did', 'i', 'me', 'my', 'we', 'you', 'it', 'its', 'of', 'to', 'in', 'on', 'at', 'and', 'or', 'why', 'what', 'how', 'when', 'which', 'who', 'have', 'has', 'can', 'this', 'that', 'with', 'as', 'by', 'not', 'no']);

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

function within1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || a.length < 5) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** No-AI routing of a student's doubt to concepts: keyword overlap with small typo tolerance. */
export function matchConcepts(text: string, pack: ContentPack): ConceptMatch[] {
  const words = normalize(text);
  return pack.concepts
    .map((c) => {
      const keys = new Set([...c.keywords, ...normalize(c.title).filter((w) => !STOP.has(w))].map((k) => k.toLowerCase()));
      let score = 0;
      for (const w of words) for (const k of keys) if (w === k) score += 2; else if (within1(w, k)) score += 1;
      return { concept: c.id, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}
