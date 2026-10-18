import { Suspense, lazy, useMemo } from 'react'
import { Drawer } from 'vaul'
import { BookOpen } from 'lucide-react'
import CodeEditor from './CodeEditor.tsx'
import { BUILTIN_PROBLEMS } from '../data/index.ts'
import { primerFor } from '../data/primers.ts'

const TechniqueViz = lazy(() => import('./TechniqueViz.tsx'))
import type { TechniqueDoc } from '../data/techniques.ts'
import { LANGUAGE_LABEL } from '../types.ts'
import type { Language, Problem } from '../types.ts'

interface Props {
  technique: TechniqueDoc | null
  problem: Problem
  onClose: () => void
  onPrimer?: (topic: string) => void
  language?: Language
}

/** A technique explained: what it is, the moves, the invariant, a step-through visualisation, and the primer's template. */
export default function TechniqueSheet({ technique, problem, onClose, onPrimer, language = 'typescript' }: Props) {
  const primer = technique ? primerFor(problem.track, technique.topic) : undefined
  const card = technique?.primerTechnique && primer ? primer.techniques.find((t) => t.name === technique.primerTechnique) : undefined
  const alsoIn = useMemo(() => (technique ? BUILTIN_PROBLEMS.filter((p) => p.id !== problem.id && (p.track === 'coding' || p.track === 'practical') && technique.patterns.test(p.pattern)) : []), [technique, problem.id])
  return (
    <Drawer.Root open={technique !== null} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className="sheet sheet-technique" aria-describedby={undefined}>
          <div className="sheet-handle" />
          {technique && (
            <>
              <Drawer.Title className="sheet-title">{technique.name}</Drawer.Title>
              <div className="sheet-body technique-body">
                <p className="technique-topic">{technique.topic} · <span className="technique-complexity">{technique.complexity}</span></p>
                <p className="technique-summary">{technique.summary}</p>
                {technique.viz && (
                  <Suspense fallback={<div className="viz viz-loading">Loading the visualisation…</div>}>
                    <TechniqueViz id={technique.viz} />
                  </Suspense>
                )}
                <h3>The moves</h3>
                <ol className="technique-steps">{technique.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                {technique.invariant && (
                  <p className="technique-invariant"><strong>What stays true:</strong> {technique.invariant}</p>
                )}
                {card?.template && (() => {
                  const ported = language !== 'typescript' ? card.templates?.[language] : undefined
                  const shown = language === 'typescript' ? 'typescript' : ported ? language : 'typescript'
                  return (
                    <details className="spoiler">
                      <summary>Template to memorise</summary>
                      <div className="solution"><CodeEditor value={ported ?? card.template} readOnly height="auto" language={shown} /></div>
                      {shown !== language && <p className="template-note">Shown in TypeScript: this template has no {LANGUAGE_LABEL[language]} version yet.</p>}
                    </details>
                  )
                })()}
                {card?.pitfalls && card.pitfalls.length > 0 && (
                  <>
                    <h3>Pitfalls</h3>
                    <ul className="technique-steps">{card.pitfalls.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </>
                )}
                {alsoIn.length > 0 && (
                  <>
                    <h3>Also used in</h3>
                    <p className="technique-also">{alsoIn.map((p) => p.title).join(' · ')}</p>
                  </>
                )}
                {primer && onPrimer && (
                  <button className="primer-link" onClick={() => { onClose(); onPrimer(technique.topic) }}>
                    <BookOpen size={14} /> Read the {technique.topic} primer
                  </button>
                )}
              </div>
              <div className="sheet-actions">
                <button className="btn" onClick={onClose}>Close</button>
              </div>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
