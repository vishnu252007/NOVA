// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { createServices } from '@/app/container';
import { SessionProvider, useSession } from '@/app/session';
import { applyAttempt, createLearner } from '@/core/engine';
import { aaravLearner, freshLearner, makeProfile } from '@/seed/personas';
import { attempt, NOW, pack } from '@/testkit';
import type { ContentPack } from '@/core/types';
import { Home } from './Home';
import { Learn } from './Learn';

afterEach(cleanup);

function Harness({ profileId, children }: { profileId: string; children: React.ReactNode }) {
  const { profile, selectProfile } = useSession();
  useEffect(() => { void selectProfile(profileId); }, [profileId, selectProfile]);
  return profile ? <>{children}</> : <div>loading</div>;
}

async function show(kind: 'fresh' | 'aarav', ui: (go: (r: unknown) => void) => React.ReactNode, onGo: (r: unknown) => void = () => {}, usePack: ContentPack = pack) {
  const storage = new MemoryStorage();
  const p = makeProfile(kind, NOW, true);
  await storage.saveProfile(p);
  await storage.saveLearner(kind === 'aarav' ? aaravLearner(p.id, pack, NOW) : freshLearner(p.id, pack, NOW));
  const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW }, pack: usePack });
  render(<SessionProvider services={services}><Harness profileId={p.id}>{ui(onGo)}</Harness></SessionProvider>);
}

describe('Learn screen', () => {
  it('a fresh learner gets the plain style, with a Why this? reason', async () => {
    await show('fresh', (go) => <Learn concept="loop-bounds" go={go} />);
    expect(await screen.findByText('Plain explanation')).toBeTruthy();
    expect(screen.getByText(/gives the numbers from a up to/)).toBeTruthy();
    expect(screen.getByText('Why this?')).toBeTruthy();
    expect(screen.getByText(/no history of what works for you/)).toBeTruthy();
  });

  it('Aarav sees a different style on the same concept, and the reason names his history', async () => {
    await show('aarav', (go) => <Learn concept="loop-bounds" go={go} />);
    expect(await screen.findByText('Counterexample')).toBeTruthy();
    expect(screen.getByText(/Try range\(1, 3\) on \[4, 7, 2\]/)).toBeTruthy();
    expect(screen.getByText(/helped you before/)).toBeTruthy();
  });

  it('the student can look at another style, and it is marked as their choice', async () => {
    await show('aarav', (go) => <Learn concept="loop-bounds" go={go} />);
    await screen.findByText('Counterexample');
    fireEvent.click(screen.getByRole('button', { name: 'Plain explanation' }));
    expect(screen.getByText(/\(your choice\)/)).toBeTruthy();
    expect(screen.getByText(/NOVA would have chosen "Counterexample"/)).toBeTruthy();
    expect(screen.getByText(/gives the numbers from a up to/)).toBeTruthy();
  });

  it('a concept with one style has no "other styles" row', async () => {
    const onePack = structuredClone(pack);
    const lists = onePack.concepts.find((c) => c.id === 'lists')!;
    lists.explanations = { plain: lists.explanations.plain! }; // a topic that has only one way of explaining it
    await show('fresh', (go) => <Learn concept="lists" go={go} />, () => {}, onePack);
    await screen.findByText('Plain explanation');
    expect(screen.queryByRole('group', { name: 'Other ways to explain this' })).toBeNull();
  });
});

describe('Home: learn-new step opens the Learn screen', () => {
  it('Start goes to Learn for a new topic, not to an empty practice', async () => {
    const storage = new MemoryStorage();
    const p = makeProfile('Ravi', NOW);
    await storage.saveProfile(p);
    let s = createLearner(p.id, pack, NOW);
    for (const concept of ['lists', 'loops', 'loop-bounds']) s = applyAttempt(s, attempt({ concept, correct: true }), pack);
    await storage.saveLearner(s);
    const routes: unknown[] = [];
    const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW } });
    render(<SessionProvider services={services}><Harness profileId={p.id}><Home go={(r) => routes.push(r)} /></Harness></SessionProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Start' }));
    expect(routes).toEqual([{ name: 'learn', concept: 'variables' }]);
  });
});
