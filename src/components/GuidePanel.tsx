import { useEffect, useState } from 'react'
import { Lightbulb, RefreshCw } from 'lucide-react'
import { relativeTime } from '../lib/format.ts'
import type { Guide, Problem } from '../types.ts'

interface Props {
  problem: Problem
  guide: Guide | null
  loaded: boolean
  writing: boolean
  error: string | null
  onWrite: () => void
  onReveal: (n: number) => void
  onShowProblem: () => void
}

export default function GuidePanel({ problem, guide, loaded, writing, error, onWrite, onReveal, onShowProblem }: Props) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!writing) return
    setSeconds(0)
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [writing])

  const code = problem.track === 'coding' || problem.track === 'practical'
  const intro = code
    ? 'Stuck? Get a ladder of hints written for your draft as it is now. Each rung gives away a little more, with one small thing to try before the next, and the last rung is a full plan, never the code.'
    : problem.track === 'design'
      ? 'Stuck? Get a guided walkthrough built from your notes so far: requirements, high-level design, the hard part, trade-offs. One step at a time.'
      : 'Stuck? Get a ladder that builds your answer up one step at a time from what you have so far.'

  if (writing) {
    return (
      <div className="guide">
        <p className="guide-status"><Lightbulb size={16} /> Writing your hint ladder… {seconds} s</p>
        <p className="note">The model reads your draft and the problem, then writes five to seven rungs. Usually about a minute.</p>
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="guide">
        <p className="guide-intro">{intro}</p>
        {error && <p className="review-error">{error}</p>}
        <button className="btn btn-primary" onClick={onWrite} disabled={!loaded}>
          <Lightbulb size={14} /> Help me get there
        </button>
      </div>
    )
  }

  const shown = guide.steps.slice(0, guide.revealed)
  const done = guide.revealed >= guide.steps.length
  return (
    <div className="guide">
      <div className="guide-head">
        <span className="guide-count">{guide.revealed} of {guide.steps.length} hints</span>
        <span className="review-when">written {relativeTime(guide.createdAt)}</span>
        <span className="spacer" />
        <button className="btn small" onClick={onWrite} title="Write a new ladder for your draft as it is now">
          <RefreshCw size={13} /> Rewrite for my draft
        </button>
      </div>
      {error && <p className="review-error">{error}</p>}
      {shown.length === 0 && <p className="guide-intro">Your ladder is ready. Reveal the first rung, try it, then come back for the next.</p>}
      <ol className="guide-steps">
        {shown.map((s, i) => (
          <li key={i} className="guide-step">
            <h4>{s.title}</h4>
            <p>{s.hint}</p>
            {s.tryThis && <p className="guide-try"><strong>Try this:</strong> {s.tryThis}</p>}
          </li>
        ))}
      </ol>
      {!done ? (
        <button className="btn btn-primary" onClick={() => onReveal(guide.revealed + 1)}>
          <Lightbulb size={14} /> {guide.revealed === 0 ? 'Reveal the first hint' : `Reveal hint ${guide.revealed + 1}`}
        </button>
      ) : (
        <div className="guide-done">
          <p className="note">That is the whole ladder. If it still will not come together, the reference {code ? 'solution' : 'points'} are on the Problem tab.</p>
          <button className="btn" onClick={onShowProblem}>Open the Problem tab</button>
        </div>
      )}
      {guide.revealed > 0 && (
        <button className="link-btn" onClick={() => onReveal(0)}>Hide all hints again</button>
      )}
    </div>
  )
}
