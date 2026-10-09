// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { createServices } from '@/app/container';
import { SessionProvider, useSession } from '@/app/session';
import { planToday } from '@/core/engine';
import { makeProfile } from '@/seed/personas';
import { NOW, pack } from '@/testkit';
import { diagnosticLength } from '@/core/engine';
import { Home } from './Home';
import { Diagnostic } from './Diagnostic';

afterEach(cleanup);

function Harness({ profileId, onGo = () => {}, screen: Screen = 'diagnostic' }: { profileId: string; onGo?: (r: unknown) => void; screen?: 'diagnostic' | 'home' }) {
  const { profile, selectProfile } = useSession();
  useEffect(() => { void selectProfile(profileId); }, [profileId, selectProfile]);
  if (!profile) return <div>loading</div>;
  return Screen === 'home' ? <Home go={onGo} /> : <Diagnostic go={onGo} />;
}

async function setup(screenName: 'diagnostic' | 'home' = 'diagnostic', onGo: (r: unknown) => void = () => {}) {
  const storage = new MemoryStorage();
  const p = makeProfile('Asha', NOW);
  await storage.saveProfile(p);
  const services = createServices({ storage, ai: new TemplateAI(), clock: { now: () => NOW } });
  render(<SessionProvider services={services}><Harness profileId={p.id} onGo={onGo} screen={screenName} /></SessionProvider>);
  return { storage, p, services };
}

const answerFirstOption = (confidence: string) => {
  fireEvent.click(screen.getByRole('button', { name: confidence }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button')[0]!);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
};

describe('Diagnostic screen', () => {
  it('Home sends a new profile to the diagnostic', async () => {
    const routes: unknown[] = [];
    await setup('home', (r) => routes.push(r));
    expect(await screen.findByText('Start with a quick check')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(routes).toEqual([{ name: 'diagnostic' }]);
  });

  it('runs the whole check, saves mastery for 3+ concepts, and shows the changed plan', async () => {
    const { storage, p, services } = await setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Start the check' }));
    expect(await screen.findByText(`Question 1 of up to ${diagnosticLength(pack).max}`)).toBeTruthy();

    // the check asks 6 to 8 questions (it asks more when a topic gives mixed answers), so follow the screen
    let answered = 0;
    while (screen.queryByRole('group', { name: 'Answer choices' }) && answered < diagnosticLength(pack).max) {
      expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(String(answered));
      // no right/wrong marks are shown while the check runs
      expect(screen.queryByText(/Correct\.|Not quite/)).toBeNull();
      answerFirstOption('sure');
      answered++;
      await new Promise((r) => setTimeout(r, 0)); // let the screen move on
    }
    expect(answered).toBeGreaterThanOrEqual(diagnosticLength(pack).min);

    expect(await screen.findByText('Your starting point')).toBeTruthy();
    expect(screen.getByText(new RegExp(`of ${answered}`))).toBeTruthy();
    expect(screen.getByText('Mistakes NOVA found')).toBeTruthy();
    expect(screen.getByText(/Before: Start with a quick check/)).toBeTruthy();

    const saved = await storage.loadLearner(p.id, pack.id);
    const placed = Object.values(saved!.concepts).filter((c) => c.attempts > 0);
    expect(placed.length).toBeGreaterThanOrEqual(3);
    expect(saved!.history).toHaveLength(answered);
    expect(planToday(saved!, services.pack, NOW).steps[0]!.kind).not.toBe('diagnostic');
  });

  it('Leave in the middle saves nothing, so a new profile is still offered the check', async () => {
    const routes: unknown[] = [];
    const { storage, p } = await setup('diagnostic', (r) => routes.push(r));
    fireEvent.click(await screen.findByRole('button', { name: 'Start the check' }));
    await screen.findByText(`Question 1 of up to ${diagnosticLength(pack).max}`);
    answerFirstOption('guess');
    await screen.findByText(`Question 2 of up to ${diagnosticLength(pack).max}`);
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(routes).toEqual([{ name: 'home' }]);
    const saved = await storage.loadLearner(p.id, pack.id);
    expect(saved?.history ?? []).toHaveLength(0); // nothing was saved
  });

  it('needs a confidence and an answer before Next is enabled', async () => {
    await setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Start the check' }));
    const next = (await screen.findByRole('button', { name: 'Next' })) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'unsure' }));
    expect(next.disabled).toBe(true);
    fireEvent.click(within(screen.getByRole('group', { name: 'Answer choices' })).getAllByRole('button')[0]!);
    await waitFor(() => expect(next.disabled).toBe(false));
  });
});
