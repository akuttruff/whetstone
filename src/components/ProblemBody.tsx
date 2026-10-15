import { useState } from 'react'
import Markdown from 'react-markdown'
import CodeEditor from './CodeEditor.tsx'
import { BookOpen } from 'lucide-react'
import { primerFor } from '../data/primers.ts'
import { isCode, isDesign } from '../types.ts'
import type { Problem } from '../types.ts'

/** The statement, prompt or question, with its spoilers behind disclosure. */
export default function ProblemBody({ problem, onPrimer }: { problem: Problem; onPrimer?: (topic: string) => void }) {
  const [solutionOpen, setSolutionOpen] = useState(false)
  const primer = primerFor(problem.track, problem.topic)
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
    return (
      <div className="pbody md">
        {primerLink}
        {problem.description.map((d, i) => <Markdown key={i}>{d}</Markdown>)}
        <h3>Examples</h3>
        {problem.examples.map((ex, i) => (
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
        {problem.hints.length > 0 && (
          <details className="spoiler">
            <summary>Hints ({problem.hints.length})</summary>
            <ol>{problem.hints.map((h, i) => <li key={i}>{h}</li>)}</ol>
          </details>
        )}
        <details className="spoiler" open={solutionOpen} onToggle={(e) => setSolutionOpen((e.target as HTMLDetailsElement).open)}>
          <summary>Reference solution</summary>
          {solutionOpen && <div className="solution"><CodeEditor value={problem.solution} readOnly height="auto" /></div>}
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
    </div>
  )
}
