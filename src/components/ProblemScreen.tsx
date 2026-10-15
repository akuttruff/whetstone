import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronsDown, ChevronsUp, Lightbulb, Play, RotateCcw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import CodeEditor from './CodeEditor.tsx'
import ProblemBody from './ProblemBody.tsx'
import ChatThread from './ChatThread.tsx'
import GuidePanel from './GuidePanel.tsx'
import ReviewPanel from './ReviewPanel.tsx'
import RunPanel from './RunPanel.tsx'
import useDraft from '../hooks/useDraft.ts'
import useChat from '../hooks/useChat.ts'
import useGuide from '../hooks/useGuide.ts'
import useReview from '../hooks/useReview.ts'
import { api } from '../lib/api.ts'
import { DIFFICULTY_LABEL, blankFor } from '../lib/format.ts'
import { isCode } from '../types.ts'
import type { Direction, Problem, PublicSettings, RunResult } from '../types.ts'

type Tab = 'problem' | 'work' | 'review' | 'guide'

interface Props {
  problem: Problem
  settings: PublicSettings
  wide: boolean
  onBack: () => void
  onAutoChange: (auto: boolean) => void
  onVariant: (p: Problem) => void
  onReviewed: () => void
  onPrimer: (topic: string) => void
}

export default function ProblemScreen({ problem, settings, wide, onBack, onAutoChange, onVariant, onReviewed, onPrimer }: Props) {
  const code = isCode(problem)
  const blank = blankFor(problem)
  const draft = useDraft(problem.id, blank)
  const [tab, setTab] = useState<Tab>(wide ? 'work' : 'problem')
  const [run, setRun] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [variantBusy, setVariantBusy] = useState<Direction | null>(null)
  const review = useReview(problem, draft.text, blank, run, settings.autoFeedback && draft.loaded, settings.autoDelayS)
  const guide = useGuide(problem, draft.text, run)
  const chat = useChat(problem.id, { problem, answer: draft.text, run })

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
        <button className="icon-btn small" aria-label="Hints" title="Stuck? Get a hint ladder" onClick={() => setTab('guide')}>
          <Lightbulb size={16} />
        </button>
        <button className="icon-btn small" aria-label="Reset draft" onClick={reset}>
          <RotateCcw size={15} />
        </button>
      </div>
      {code && <RunPanel run={run} running={running} />}
    </div>
  )

  const reviewPanel = (
    <>
      <ReviewPanel {...review} onStart={review.start} onCancel={review.cancel} canReview={canReview} />
      <ChatThread
        {...chat}
        enabled={review.review !== null}
        title="Ask about it"
        placeholder="Ask how to implement a suggestion, what the syntax looks like, why…"
        disabledPlaceholder="Get a review first, then ask follow-ups here."
        suggestions={['How would I implement that suggestion?', 'What would the syntax look like?', 'Why is that better than what I wrote?', 'What edge case am I missing?']}
        onAsk={chat.ask}
        onStop={chat.stop}
        onClear={() => void chat.clear()}
      />
    </>
  )
  const guidePanel = (
    <GuidePanel
      problem={problem}
      guide={guide.guide}
      loaded={guide.loaded}
      writing={guide.writing}
      error={guide.error}
      onWrite={() => void guide.write()}
      onReveal={guide.reveal}
      onShowProblem={() => setTab(wide ? 'work' : 'problem')}
    />
  )

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
        <button role="tab" aria-selected={tab === 'guide'} className={tab === 'guide' ? 'active' : ''} onClick={() => setTab('guide')}>
          Guide{guide.writing ? <span className="pulse" /> : guide.guide ? <span className="tab-score">{guide.guide.revealed}/{guide.guide.steps.length}</span> : null}
        </button>
      </div>

      <div className={`pbody-grid${wide ? ' wide' : ''}`}>
        {(wide || tab === 'problem') && (
          <div className="pane pane-problem">
            <ProblemBody problem={problem} onPrimer={onPrimer} />
          </div>
        )}
        {tab === 'work' && <div className="pane pane-work">{workspace}</div>}
        {tab === 'review' && <div className="pane pane-review">{reviewPanel}</div>}
        {tab === 'guide' && <div className="pane pane-review">{guidePanel}</div>}
      </div>
    </div>
  )
}
