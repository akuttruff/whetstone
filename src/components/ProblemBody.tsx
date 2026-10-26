import { memo, useState } from 'react'
import Markdown from 'react-markdown'
import CodeEditor from './CodeEditor.tsx'
import DocLinks from './DocLinks.tsx'
import { PROBLEM_DOCS } from '../data/docs.ts'
import { BookOpen, Play } from 'lucide-react'
import { primerFor } from '../data/primers.ts'
import { LANGUAGE_LABEL, isCode, isDesign, langFor, portFor, statementFor } from '../types.ts'
import type { Language, Problem } from '../types.ts'
import type { TechniqueDoc } from '../data/techniques.ts'

interface Props {
  problem: Problem
  onPrimer?: (topic: string) => void
  /** The techniques the problem exercises; empty (or omitted) when the interview-mode setting hides them. */
  techniques?: TechniqueDoc[]
  onTechnique?: (t: TechniqueDoc) => void
  /** The reference solution is shown in this language when the problem has it. */
  language?: Language
}

/** The statement, prompt or question, with its spoilers behind disclosure. Memoised: it sits beside the editor and must not re-render per keystroke. */
function ProblemBody({ problem, onPrimer, techniques = [], onTechnique, language = 'typescript' }: Props) {
  const [solutionOpen, setSolutionOpen] = useState(false)
  const lang = langFor(problem, language)
  const port = portFor(problem, lang)
  const shownLang: Language = port ? lang : 'typescript'
  const reference = port?.solution ?? (isCode(problem) ? problem.solution : '')
  const primer = primerFor(problem.track, problem.topic)
  const techniqueRow = techniques.length > 0 && onTechnique && (
    <div className="techniques" aria-label="Techniques">
      <span className="techniques-label">Techniques</span>
      {techniques.map((t) => (
        <button key={t.id} className="chip technique-chip" onClick={() => onTechnique(t)} title={t.viz ? 'Explanation with a step-by-step visualisation' : 'Explanation'}>
          {t.name}
          {t.viz && <Play size={11} className="technique-play" />}
        </button>
      ))}
    </div>
  )
  const primerLink = (
    <>
      {primer && onPrimer && (
        <button className="primer-link" onClick={() => onPrimer(problem.topic)}>
          <BookOpen size={14} /> Read the {problem.topic} primer first
        </button>
      )}
      {problem.request && <p className="request-note">Generated from your request: “{problem.request}”</p>}
    </>
  )
  if (isCode(problem)) {
    const st = statementFor(problem, lang)
    return (
      <div className="pbody md">
        {primerLink}
        {st.description.map((d, i) => <Markdown key={i}>{d}</Markdown>)}
        {techniqueRow}
        <h3>Examples</h3>
        {st.examples.map((ex, i) => (
          <div key={i} className="example">
            <div><span className="io">Input</span><pre>{ex.input}</pre></div>
            <div><span className="io">Output</span><pre>{ex.output}</pre></div>
            {ex.note && <p className="note">{ex.note}</p>}
          </div>
        ))}
        {problem.constraints && problem.constraints.length > 0 && (
          <>
            <h3>Constraints</h3>
            <ul>{problem.constraints.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </>
        )}
        {st.nuances.length > 0 && (
          <>
            <h3>What matters in {LANGUAGE_LABEL[lang]}</h3>
            <ul>{st.nuances.map((n, i) => <li key={i}><Markdown>{n}</Markdown></li>)}</ul>
          </>
        )}
        {st.hints.length > 0 && (
          <details className="spoiler">
            <summary>Hints ({st.hints.length})</summary>
            <ol>{st.hints.map((h, i) => <li key={i}>{h}</li>)}</ol>
          </details>
        )}
        <details className="spoiler" open={solutionOpen} onToggle={(e) => setSolutionOpen((e.target as HTMLDetailsElement).open)}>
          <summary>Reference solution</summary>
          {solutionOpen && reference && <div className="solution"><CodeEditor value={reference} readOnly height="auto" language={shownLang} /></div>}
          {solutionOpen && !reference && <p className="template-note">No reference solution in {LANGUAGE_LABEL[lang]} yet; write one from the Code tab.</p>}
          {solutionOpen && reference && shownLang !== lang && <p className="template-note">Shown in TypeScript: no {LANGUAGE_LABEL[lang]} version of this problem yet.</p>}
        </details>
        {problem.tests.length === 0 && <p className="note">This problem has no automated tests; use Review for feedback.</p>}
      </div>
    )
  }
  if (isDesign(problem)) {
    return (
      <div className="pbody md">
        {primerLink}
        {problem.prompt.map((d, i) => <Markdown key={i}>{d}</Markdown>)}
        <h3>Functional requirements</h3>
        <ul>{problem.functional.map((f, i) => <li key={i}>{f}</li>)}</ul>
        <h3>Non-functional requirements</h3>
        <ul>{problem.nonFunctional.map((f, i) => <li key={i}>{f}</li>)}</ul>
        <details className="spoiler">
          <summary>Talking points a strong answer covers</summary>
          {problem.talkingPoints.map((t, i) => (
            <div key={i} className="tp">
              <h4>{t.heading}</h4>
              <ul>{t.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
            </div>
          ))}
        </details>
        <details className="spoiler">
          <summary>Follow-ups to expect</summary>
          <ul>{problem.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </details>
      </div>
    )
  }
  return (
    <div className="pbody md">
      {primerLink}
      {problem.question.map((d, i) => <Markdown key={i}>{d}</Markdown>)}
      {problem.track === 'behavioral' && <p className="note">Answer in STAR form: situation, task, what you did, result. Two minutes, specific, in the first person.</p>}
      <details className="spoiler">
        <summary>{problem.track === 'behavioral' ? 'What interviewers listen for' : 'Key points of a strong answer'}</summary>
        <ul>{problem.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
      </details>
      {problem.followUps.length > 0 && (
        <details className="spoiler">
          <summary>Follow-ups to expect</summary>
          <ul>{problem.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </details>
      )}
      <DocLinks links={PROBLEM_DOCS[problem.id] ?? []} />
    </div>
  )
}

export default memo(ProblemBody)
