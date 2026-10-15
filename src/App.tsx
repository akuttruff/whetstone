import { useMemo, useState } from 'react';
import DesignView from './components/DesignView';
import ProblemView from './components/ProblemView';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import { ALGO_PROBLEMS } from './data/problems';
import { DESIGN_PROBLEMS } from './data/designs';
import type { AlgoProblem } from './data/types';
import { loadGenerated, sanitizeGenerated, saveGenerated } from './lib/customProblems';
import { chat, extractJson } from './lib/lmstudio';
import { loadProfile, summarize } from './lib/profile';
import { easierPrompt, generationPrompt } from './lib/prompts';
import { loadSettings } from './lib/settings';

const GENERATE_COUNT = 3;

export default function App() {
  const [selectedId, setSelectedId] = useState(ALGO_PROBLEMS[0].id);
  const [generated, setGenerated] = useState<AlgoProblem[]>(loadGenerated);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<string | null>(null);
  const [easierBusy, setEasierBusy] = useState(false);
  const [easierStatus, setEasierStatus] = useState<string | null>(null);

  const allAlgo = useMemo(() => [...ALGO_PROBLEMS, ...generated], [generated]);
  const algo = allAlgo.find((p) => p.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setEasierStatus(null);
  };

  const generatePractice = async () => {
    const settings = loadSettings();
    if (!settings.token.trim() || !settings.model.trim()) {
      setGenStatus('Open settings (gear icon in the sidebar footer) and connect LM Studio first.');
      return;
    }
    const { weak, strong } = summarize(loadProfile());
    if (weak.length === 0 && strong.length === 0) {
      setGenStatus(
        'No review data yet. Solve a problem with AI feedback first, then generate targeted practice.',
      );
      return;
    }
    setGenerating(true);
    setGenStatus(null);
    try {
      const knownTopics = [...new Set(allAlgo.map((p) => p.topic))];
      const { system, user } = generationPrompt(weak, strong, GENERATE_COUNT, knownTopics);
      const text = await chat(
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        { temperature: 0.8, settings },
      );
      const problems = sanitizeGenerated(extractJson<unknown>(text));
      if (problems.length === 0) {
        setGenStatus('The model returned no usable problems — try again.');
        return;
      }
      setGenerated((prev) => {
        const next = [...prev, ...problems];
        saveGenerated(next);
        return next;
      });
      setGenStatus(
        `Added ${problems.length} problem(s) focused on: ${weak.join(', ') || 'your strong topics (stepped up in difficulty)'}.`,
      );
      setSelectedId(problems[0].id);
    } catch (e) {
      setGenStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const generateEasier = async (problem: AlgoProblem) => {
    const settings = loadSettings();
    if (!settings.token.trim() || !settings.model.trim()) {
      setEasierStatus('Connect LM Studio first — open settings (gear icon in the sidebar footer).');
      return;
    }
    setEasierBusy(true);
    setEasierStatus(null);
    try {
      const { system, user } = easierPrompt(problem);
      const text = await chat(
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        { temperature: 0.8, settings },
      );
      const parsed = extractJson<unknown>(text);
      // Local models often return the bare problem object even when asked for a one-element array.
      const [raw] = sanitizeGenerated(
        Array.isArray(parsed) ? parsed : typeof parsed === 'object' && parsed !== null ? [parsed] : [],
      );
      if (!raw) {
        console.warn('easier: model reply was not a usable problem', text);
        const trimmed = text.replace(/\s+/g, ' ').trim();
        const snippet = trimmed.slice(0, 100);
        setEasierStatus(
          `The model's reply wasn't a usable problem — got: "${snippet}${trimmed.length > 100 ? '…' : ''}". Try again.`,
        );
        return;
      }
      const taken = new Set(allAlgo.map((p) => p.id));
      let id = raw.id;
      let n = 2;
      while (taken.has(id)) id = `${raw.id}-${n++}`;
      const easier: AlgoProblem = { ...raw, id, topic: problem.topic };
      setGenerated((prev) => {
        const next = [...prev, easier];
        saveGenerated(next);
        return next;
      });
      setSelectedId(easier.id);
    } catch (e) {
      setEasierStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setEasierBusy(false);
    }
  };

  return (
    <div className="app">
      <Sidebar
        selectedId={selectedId}
        onSelect={handleSelect}
        generated={generated}
        generating={generating}
        genStatus={genStatus}
        onGenerate={() => void generatePractice()}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="main">
        {algo ? (
          <ProblemView
            key={algo.id}
            problem={algo}
            onEasier={() => void generateEasier(algo)}
            easierBusy={easierBusy}
            easierStatus={easierStatus}
          />
        ) : (
          <DesignView
            key={selectedId}
            problem={DESIGN_PROBLEMS.find((p) => p.id === selectedId)!}
          />
        )}
      </main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
