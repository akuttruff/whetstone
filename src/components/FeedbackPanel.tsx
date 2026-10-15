import { useEffect, useRef, useState } from 'react';
import type { AlgoProblem } from '../data/types';
import { chat, extractJson } from '../lib/lmstudio';
import { recordAttempt } from '../lib/profile';
import { feedbackPrompt, type FeedbackAssessment } from '../lib/prompts';
import { loadSettings, saveSettings } from '../lib/settings';

interface FeedbackPanelProps {
  problem: AlgoProblem;
  code: string;
}

const AUTO_DEBOUNCE_MS = 5000;

function scoreBadgeClass(score: number): string {
  if (score >= 8) return 'badge-easy';
  if (score >= 5) return 'badge-medium';
  return 'badge-hard';
}

export default function FeedbackPanel({ problem, code }: FeedbackPanelProps) {
  const [feedback, setFeedback] = useState<FeedbackAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState<boolean>(() => loadSettings().autoFeedback);
  const codeRef = useRef(code);
  codeRef.current = code;
  const busyRef = useRef(false);

  const run = async (silent: boolean) => {
    const current = codeRef.current;
    if (busyRef.current || !current.trim()) return;
    const settings = loadSettings();
    if (!settings.token.trim() || !settings.model.trim()) {
      if (!silent) {
        setError('Connect LM Studio first — open settings (gear icon in the sidebar footer).');
      }
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const { system, user } = feedbackPrompt(problem, current);
      const text = await chat(
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        { temperature: 0.3, settings },
      );
      const parsed = extractJson<FeedbackAssessment>(text);
      const score = Math.max(0, Math.min(10, Math.round(Number(parsed.score) || 0)));
      setFeedback({
        feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
        score,
        correct: Boolean(parsed.correct),
        weak: typeof parsed.weak === 'string' ? parsed.weak : '',
      });
      recordAttempt(problem.topic, score);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : String(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!auto || code === problem.starter) return;
    const t = setTimeout(() => void run(true), AUTO_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, code, problem.id]);

  return (
    <div className="feedback-panel">
      <div className="feedback-header">
        <span className="feedback-title">AI feedback</span>
        <label className="auto-toggle">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => {
              setAuto(e.target.checked);
              saveSettings({ ...loadSettings(), autoFeedback: e.target.checked });
            }}
          />
          auto
        </label>
        {feedback && (
          <span className={`badge ${scoreBadgeClass(feedback.score)}`}>{feedback.score}/10</span>
        )}
        <button className="btn" disabled={busy} onClick={() => void run(false)}>
          {busy ? 'Reviewing…' : 'Get feedback'}
        </button>
      </div>
      <div className="feedback-body">
        {error ? (
          <p className="feedback-error">{error}</p>
        ) : feedback ? (
          <>
            <p>{feedback.feedback}</p>
            {feedback.weak && <p className="feedback-weak">Focus: {feedback.weak}</p>}
          </>
        ) : (
          <p className="feedback-placeholder">
            Write your solution, then get a review — or turn on <em>auto</em> for feedback while
            you work. Reviews run locally and never leave this machine.
          </p>
        )}
      </div>
    </div>
  );
}
