import type { ContentPack } from '@/core/types';
import programmingBasics from './packs/programming-basics/pack.json';
import seasonsBasics from './packs/seasons-basics/pack.json';

/** Register every content pack here. A new subject = a new folder under packs/ + one line below. */
export const PACKS: ContentPack[] = [programmingBasics as unknown as ContentPack, seasonsBasics as unknown as ContentPack];
export const DEFAULT_PACK_ID = 'programming-basics';

export function getPack(id: string): ContentPack {
  const p = PACKS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown content pack "${id}"`);
  return p;
}
