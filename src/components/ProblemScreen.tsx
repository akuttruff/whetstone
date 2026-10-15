import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronsDown, ChevronsUp, Play, RotateCcw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import CodeEditor from './CodeEditor.tsx'
import ProblemBody from './ProblemBody.tsx'
import ReviewPanel from './ReviewPanel.tsx'
import RunPanel from './RunPanel.tsx'
import useDraft from '../hooks/useDraft.ts'
import useReview from '../hooks/useReview.ts'
import { api } from '../lib/api.ts'
import { DIFFICULTY_LABEL, blankFor } from '../lib/format.ts'
import { isCode } from '../types.ts'
import type { Direction, Problem, PublicSettings, RunResult } from '../types.ts'

type Tab = 'problem' | 'work' | 'review'

interface Props {
  problem: Problem
  settings: PublicSettings
  wide: boolean
  onBack: () => void
  onAutoChange: (auto: boolean) => void
  onVariant: (p: Problem) => void
  onReviewed: () => void
}

export default function ProblemScreen({ problem, settings, wide, onBack, onAutoChange, onVariant, onReviewed }: Props) {
  const code = isCode(problem)
  const blank = blankFor(problem)
  const draft = useDraft(problem.id, blank)
  const [tab, setTab] = useState<Tab>(wide ? 'work' : 'problem')
  const [run, setRun] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [variantBusy, setVariantBusy] = useState<Direction | null>(null)
  const review = useReview(problem, draft.text, blank, run, settings.autoFeedback && draft.loaded, settings.autoDelayS)

  useEffect(() => {
    setTab(wide ? 'work' : 'problem')
    setRun(null)
  }, [problem.id, wide])

  useEffect(() => {
    if (review.review) onReviewed()
  }, [review.review, onReviewed])

  const runTests = async (): Promise<void> => {
    if (!code) return
    setRunning(true)
    try {
      setRun(await api.run(draft.text, problem.tests))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const makeVariant = async (direction: Direction): Promise<void> => {
    setVariantBusy(direction)
    const id = toast.loading(`Writing ${direction === 'easier' ? 'an easier' : 'a harder'} problem on ${problem.pattern.toLowerCase()}…`)
    try {
      const { problem: p, verified } = await api.variant(problem, direction)
      toast.success(
        verified ? `${p.title}: ${verified.passed} of ${verified.total} generated tests verified against its solution` : `${p.title} is ready`,
        { id },
      )
      onVariant(p)
    } catch (err) {
      toast.error((err as Error).message, { id })
    } finally {
      setVariantBusy(null)
    }
  }

  const reset = (): void => {
    if (window.confirm('Start this one over? Your draft will be cleared.')) {
      draft.reset()
      setRun(null)
    }
  }

  const workLabel = code ? 'Code' : problem.track === 'design' ? 'Notes' : 'Answer'
  const canReview = draft.loaded && draft.text.trim().length > 0 && !review.streaming

  const workspace = (
    <div className="work">
      {code ? (
        <div className="editor">{draft.loaded && <CodeEditor value={draft.text} onChange={draft.setText} />}</div>
      ) : (
        <textarea
          className="answer"
          value={draft.text}
          onChange={(e) => draft.setText(e.target.value)}
          placeholder={problem.track === 'design' ? 'Requirements, estimates, components, data model, trade-offs, failure modes…' : 'Say it the way you would out loud, then tighten it.'}
          spellCheck
        />
      )}
      <div className="workbar">
        {code && (
          <button className="btn" onClick={() => void runTests()} disabled={running || problem.tests.length === 0}>
            <Play size={14} /> Run
          </button>
        )}
        <button className="btn btn-primary" onClick={review.start} disabled={!canReview}>
          <Sparkles size={14} /> Review
        </button>
        <label className="switch">
          <input type="checkbox" checked={settings.autoFeedback} onChange={(e) => onAutoChange(e.target.checked)} />
          <span>Auto</span>
        </label>
        <span className="spacer" />
        <button className="icon-btn small" aria-label="Reset draft" onClick={reset}>
          <RotateCcw size={15} />
        </button>
      </div>
      {code && <RunPanel run={run} running={running} />}
    </div>
  )

  const reviewPanel = <ReviewPanel {...review} onStart={review.start} onCancel={review.cancel} canReview={canReview} />

  return (
    <div className="pscreen">
      <div className="pbar">
        {!wide && (
          <button className="icon-btn" aria-label="Back" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="pbar-title">
          <h1>{problem.title}</h1>
          <div className="pbar-meta">
            <span className={`diff diff-${problem.difficulty}`}>{DIFFICULTY_LABEL[problem.difficulty]}</span>
            <span className="dot" />
            <span>{problem.pattern}</span>
          </div>
        </div>
        <div className="variants">
          <button className="btn small" disabled={variantBusy !== null} onClick={() => void makeVariant('easier')} title="A simpler problem on the same pattern">
            <ChevronsDown size={14} /> Easier
          </button>
          <button className="btn small" disabled={variantBusy !== null} onClick={() => void makeVariant('harder')} title="A tougher problem on the same pattern">
            <ChevronsUp size={14} /> Harder
          </button>
        </div>
      </div>

      <div className="ptabs" role="tablist">
        {!wide && <button role="tab" aria-selected={tab === 'problem'} className={tab === 'problem' ? 'active' : ''} onClick={() => setTab('problem')}>Problem</button>}
        <button role="tab" aria-selected={tab === 'work'} className={tab === 'work' ? 'active' : ''} onClick={() => setTab('work')}>{workLabel}</button>
        <button role="tab" aria-selected={tab === 'review'} className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>
          Review{review.streaming ? <span className="pulse" /> : review.review?.score !== undefined && review.review?.score !== null ? <span className="tab-score">{review.review.score}</span> : null}
        </button>
      </div>

      <div className={`pbody-grid${wide ? ' wide' : ''}`}>
        {(wide || tab === 'problem') && (
          <div className="pane pane-problem">
            <ProblemBody problem={problem} />
          </div>
        )}
        {tab === 'work' && <div className="pane pane-work">{workspace}</div>}
        {tab === 'review' && <div className="pane pane-review">{reviewPanel}</div>}
      </div>
    </div>
  )
}
