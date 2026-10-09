// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TemplateAI } from '@/adapters/ai/templateAI';
import { MemoryStorage } from '@/adapters/storage/memoryStorage';
import { createServices } from '@/app/container';
import { SessionProvider, useSession } from '@/app/session';
import type { AIPort } from '@/core/ports';
import { makeProfile } from '@/seed/personas';
import { NOW, pack } from '@/testkit';
import type { Route } from '../App';
import { Ask } from './Ask';
import { TeachBack } from './TeachBack';

afterEach(cleanup);

function Ready({ children }: { children: React.ReactNode }) {
  const { profile, selectProfile } = useSession();
  useEffect(() => { void selectProfile('phase-c'); }, [selectProfile]);
  return profile ? <>{children}</> : <div>Loading</div>;
}

function ActiveAI() {
  const { ai, updateSettings } = useSession();
  return (
    <div>
      <span>{ai.id}</span>
      <button onClick={() => updateSettings({ aiMode: 'off' })}>Turn lite mode on</button>
      <button onClick={() => updateSettings({ aiMode: 'auto' })}>Turn lite mode off</button>
    </div>
  );
}

async function show(ui: (go: (route: Route) => void) => React.ReactNode, ai: AIPort = new TemplateAI()) {
  const storage = new MemoryStorage();
  const profile = { ...makeProfile('Phase C', NOW), id: 'phase-c' };
  await storage.saveProfile(profile);
  const go = vi.fn();
  const services = createServices({ storage, ai, clock: { now: () => NOW }, demoClock: undefined });
  render(<SessionProvider services={services}><Ready>{ui(go)}</Ready></SessionProvider>);
  return go;
}

describe('Teach-back screen', () => {
  it('switches between configured AI and templates using the profile lite-mode setting', async () => {
    const localAI: AIPort = {
      id: 'local:test',
      isAvailable: async () => true,
      explain: async () => 'Local model text.',
      evaluateTeachBack: async () => ({ covered: [], missing: [], score: 0, message: 'Template-backed checklist.' }),
    };
    await show(() => <ActiveAI />, localAI);
    expect(await screen.findByText('local:test')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Turn lite mode on' }));
    expect(await screen.findByText('template')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Turn lite mode off' }));
    expect(await screen.findByText('local:test')).toBeTruthy();
  });

  it('shows checklist coverage from the AI port and allows lesson review', async () => {
    const ai = new TemplateAI();
    const go = await show((route) => <TeachBack concept="loops" go={route} />, ai);
    fireEvent.change(await screen.findByLabelText('Your explanation'), { target: { value: 'A loop repeats code again.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check my explanation' }));
    expect(await screen.findByText(new RegExp(`Key ideas: 1 of ${pack.concepts.find((c) => c.id === 'loops')!.teachBack.length} covered`))).toBeTruthy();
    expect(screen.getByText('Covered:')).toBeTruthy();
    expect(screen.getByText('a loop repeats code')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Review the lesson' }));
    expect(go).toHaveBeenCalledWith({ name: 'learn', concept: 'loops' });
  });

  it('reports a failure instead of leaving the student without feedback', async () => {
    const ai = {
      id: 'failing-test-ai',
      isAvailable: async () => true,
      explain: async (req: Parameters<TemplateAI['explain']>[0]) => new TemplateAI().explain(req),
      evaluateTeachBack: vi.fn(async () => { throw new Error('unavailable'); }),
    };
    await show((route) => <TeachBack concept="loops" go={route} />, ai);
    fireEvent.change(await screen.findByLabelText('Your explanation'), { target: { value: 'A loop repeats code.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check my explanation' }));
    expect((await screen.findByRole('alert')).textContent).toContain('The feedback could not be checked');
  });
});

describe('Ask screen', () => {
  it('routes a known doubt to verified lesson text and offers practice', async () => {
    const go = await show((route) => <Ask go={route} />);
    fireEvent.change(await screen.findByLabelText('What are you stuck on?'), { target: { value: "I don't get loops" } });
    fireEvent.click(screen.getByRole('button', { name: 'Find my topic' }));
    expect(await screen.findByRole('heading', { name: 'Loops' })).toBeTruthy();
    const loops = pack.concepts.find((item) => item.id === 'loops')!;
    expect(screen.getByText(loops.explanations.plain!)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try a short quiz' }));
    expect(go).toHaveBeenCalledWith({ name: 'practice', concept: 'loops' });
  });

  it('politely reports an unknown topic without inventing an answer', async () => {
    await show((route) => <Ask go={route} />);
    fireEvent.change(await screen.findByLabelText('What are you stuck on?'), { target: { value: 'why is the sky blue' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find my topic' }));
    expect((await screen.findByRole('status')).textContent).toContain("I couldn't match that to a topic");
  });
});
