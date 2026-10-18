import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Lightbulb, Play, RotateCcw, Sparkles, WandSparkles } from 'lucide-react'
import GenerateSheet from './GenerateSheet.tsx'
import { toast } from 'sonner'
import CodeEditor from './CodeEditor.tsx'
import ProblemBody from './ProblemBody.tsx'
import ChatThread from './ChatThread.tsx'
import GuidePanel from './GuidePanel.tsx'
import ReviewPanel from './ReviewPanel.tsx'
import RunPanel from './RunPanel.tsx'
import TechniqueSheet from './TechniqueSheet.tsx'
import useDraft from '../hooks/useDraft.ts'
import useChat, { aboutThreadId } from '../hooks/useChat.ts'
import useGuide from '../hooks/useGuide.ts'
import useReview from '../hooks/useReview.ts'
import { api } from '../lib/api.ts'
import { DIFFICULTY_LABEL, blankFor } from '../lib/format.ts'
import { techniquesFor } from '../data/techniques.ts'
import type { TechniqueDoc } from '../data/techniques.ts'
import { LANGUAGE_LABEL, isCode, langFor, portFor, portedLanguages, workKey } from '../types.ts'
import type { Direction, Problem, PublicSettings, RunResult, Track } from '../types.ts'

type Tab = 'problem' | 'work' | 'review' | 'guide'

/** Openers for the thread under the problem: anything goes, this is practice. */
const ABOUT_SUGGESTIONS: Record<Track, string[]> = {
  coding: ['Which technique fits this, and why?', 'Walk me through the approach on the first example', 'What are the edge cases?', 'What is the best possible complexity here?'],
  practical: ['How would you structure this?', 'What should happen on invalid input or overlapping calls?', 'What are the edge cases?', 'Show me the core of the solution'],
  design: ['How many users and requests per second should I assume?', 'Which components does a strong answer have?', 'What is the hardest part of this design?', 'What trade-offs will the interviewer probe?'],
  knowledge: ['Explain the mechanism from first principles', 'What are the trade-offs?', 'Give me a concrete example', 'What follow-up would an interviewer ask?'],
  behavioral: ['What makes a strong example for this question?', 'What are interviewers listening for?', 'How do I phrase the result?', 'What follow-ups should I expect?'],
}

interface Props {
  problem: Problem
  settings: PublicSettings
  wide: boolean
  onBack: () => void
  onAutoChange: (auto: boolean) => void
  onVariant: (p: Problem) => void
  /** A generated problem gained a port: the list's copy is replaced. */
  onPorted: (p: Problem) => void
  onReviewed: () => void
  onPrimer: (topic: string) => void
}

export default function ProblemScreen({ problem, settings, wide, onBack, onAutoChange, onVariant, onPorted, onReviewed, onPrimer }: Props) {
  const code = isCode(problem)
  // Practical problems are TypeScript whatever the toggle says; coding ones follow it.
  const language = langFor(problem, settings.language)
  const port = portFor(problem, language)
  /** Drafts, reviews, guides and threads are per language: the problem id in TypeScript, id@language otherwise. */
  const key = workKey(problem, language)
  const blank = blankFor(problem, language)
  const draft = useDraft(key, blank)
  const [tab, setTab] = useState<Tab>(wide ? 'work' : 'problem')
  const [run, setRun] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [porting, setPorting] = useState(false)
  const [variantBusy, setVariantBusy] = useState<Direction | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)
  const review = useReview(problem, key, language, draft.text, blank, run, settings.autoFeedback && draft.loaded, settings.autoDelayS)
  const guide = useGuide(problem, key, language, draft.text, run)
  const chat = useChat(key, { problem, answer: draft.text, run, language })
  const about = useChat(aboutThreadId(key), { about: true, problem, language })
  const techniques = useMemo(() => (settings.showTechniques ? techniquesFor(problem) : []), [problem, settings.showTechniques])
  const [technique, setTechnique] = useState<TechniqueDoc | null>(null)

  useEffect(() => {
    setTab(wide ? 'work' : 'problem')
    setRun(null)
  }, [key, wide])

  useEffect(() => {
    if (review.review) onReviewed()
  }, [review.review, onReviewed])

  const runTests = async (): Promise<void> => {
    if (!code) return
    setRunning(true)
    try {
      setRun(await api.run(draft.text, problem.tests, language))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const makeVariant = async (direction: Direction, request: string): Promise<void> => {
    setVariantBusy(direction)
    const article = direction === 'easier' ? 'an easier' : direction === 'similar' ? 'another' : 'a harder'
    const id = toast.loading(`Writing ${article} problem on ${problem.pattern.toLowerCase()}…`)
    try {
      const { problem: p, verified } = await api.variant(problem, direction, request, language)
      toast.success(
        verified ? `${p.title}: ${verified.passed} of ${verified.total} generated tests verified against its solution` : `${p.title} is ready`,
        { id },
      )
      setGenerateOpen(false)
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

  /** A generated problem written in another language: the model ports it, verified against the same tests before it is saved. */
  const writePort = async (): Promise<void> => {
    setPorting(true)
    const id = toast.loading(`Writing the ${LANGUAGE_LABEL[language]} version of ${problem.title}…`)
    try {
      const { problem: p, verified } = await api.port(problem, language)
      toast.success(verified ? `${LANGUAGE_LABEL[language]} version ready: ${verified.passed} of ${verified.total} tests pass` : `${LANGUAGE_LABEL[language]} version ready`, { id })
      onPorted(p)
    } catch (err) {
      toast.error((err as Error).message, { id, duration: 10000 })
    } finally {
      setPorting(false)
    }
  }

  const workLabel = code ? 'Code' : problem.track === 'design' ? 'Notes' : 'Answer'
  const canReview = draft.loaded && draft.text.trim().length > 0 && !review.streaming

  const noPort = code && !port
  const inOther = portedLanguages(problem).map((l) => LANGUAGE_LABEL[l])
  const workspace = (
    <div className="work">
      {noPort ? (
        <div className="noport">
          <p><strong>No {LANGUAGE_LABEL[language]} version yet.</strong></p>
          <p className="hint">
            This generated problem exists in {inOther.join(' and ') || 'no language'}. The model can write the {LANGUAGE_LABEL[language]} starter and solution; it is saved only once the solution passes the same tests.
          </p>
          <button className="btn btn-primary" disabled={porting} onClick={() => void writePort()}>
            <Sparkles size={14} /> {porting ? 'Writing…' : `Write it in ${LANGUAGE_LABEL[language]}`}
          </button>
        </div>
      ) : code ? (
        <div className="editor">{draft.loaded && <CodeEditor value={draft.text} onChange={draft.setText} language={language} />}</div>
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
          <button className="btn" onClick={() => void runTests()} disabled={running || noPort || problem.tests.length === 0}>
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
            {problem.track === 'coding' && (
              <>
                <span className="dot" />
                <span>{LANGUAGE_LABEL[language]}</span>
              </>
            )}
          </div>
        </div>
        <div className="variants">
          <button className="btn small" disabled={variantBusy !== null} onClick={() => setGenerateOpen(true)} title="Generate a new problem on this pattern: easier, similar or harder, with your own steer">
            <WandSparkles size={14} /> <span>New problem</span>
          </button>
        </div>
      </div>
      <GenerateSheet open={generateOpen} problem={problem} busy={variantBusy} onClose={() => setGenerateOpen(false)} onGenerate={(d, r) => void makeVariant(d, r)} />

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
            <ProblemBody problem={problem} onPrimer={onPrimer} techniques={techniques} onTechnique={setTechnique} language={language} />
            <ChatThread
              {...about}
              enabled
              title="Ask about the problem"
              placeholder="Anything: what it means, which technique, how it works, the code…"
              suggestions={ABOUT_SUGGESTIONS[problem.track]}
              onAsk={about.ask}
              onStop={about.stop}
              onClear={() => void about.clear()}
            />
          </div>
        )}
        {tab === 'work' && <div className="pane pane-work">{workspace}</div>}
        {tab === 'review' && <div className="pane pane-review">{reviewPanel}</div>}
        {tab === 'guide' && <div className="pane pane-review">{guidePanel}</div>}
      </div>
      <TechniqueSheet technique={technique} problem={problem} onClose={() => setTechnique(null)} onPrimer={onPrimer} language={language} />
    </div>
  )
}
