import { useState } from 'react'
import { ArrowLeft, BookOpen } from 'lucide-react'
import ChatThread from './ChatThread.tsx'
import CodeEditor from './CodeEditor.tsx'
import DocLinks from './DocLinks.tsx'
import { TOPIC_DOCS } from '../data/docs.ts'
import useChat, { primerThreadId } from '../hooks/useChat.ts'
import { COMPLEXITY_GLOSSARY } from '../data/primers.ts'
import type { Primer } from '../types.ts'

interface Props {
  primer: Primer
  /** How many problems the topic has, for the header. */
  count: number
  wide: boolean
  onBack: () => void
  onStart: () => void
}

/** Everything someone needs before attempting a topic: how to recognise it, each technique with its template, the traps, and what to say out loud. */
export default function PrimerScreen({ primer, count, wide, onBack, onStart }: Props) {
  const [openTemplates, setOpenTemplates] = useState<Set<number>>(() => new Set())
  const chat = useChat(primerThreadId(primer.track, primer.topic), { primer: { track: primer.track, topic: primer.topic } })
  const first = primer.techniques[0]?.name ?? 'the first technique'
  const second = primer.techniques[1]?.name
  const toggle = (i: number): void => setOpenTemplates((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })
  return (
    <div className="pscreen">
      <div className="pbar">
        {!wide && (
          <button className="icon-btn" aria-label="Back" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="pbar-title">
          <h1><BookOpen size={16} className="inline-icon" /> {primer.topic}</h1>
          <div className="pbar-meta"><span>Primer</span><span className="dot" /><span>{count} problem{count === 1 ? '' : 's'}</span></div>
        </div>
        <button className="btn btn-primary small" onClick={onStart}>Start practising</button>
      </div>
      <div className="pane pane-problem primer">
        <p className="primer-summary">{primer.summary}</p>

        {primer.terms.length > 0 && (
          <>
            <h3>Words used here</h3>
            <dl className="terms">
              {primer.terms.map((t, i) => (
                <div key={i} className="term">
                  <dt>{t.term}</dt>
                  <dd>{t.meaning}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        {(primer.track === 'coding' || primer.track === 'practical') && (
          <details className="spoiler">
            <summary>Reading the complexity notes (O(1), O(n), …)</summary>
            <dl className="terms">
              {COMPLEXITY_GLOSSARY.map((t, i) => (
                <div key={i} className="term">
                  <dt>{t.term}</dt>
                  <dd>{t.meaning}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        <h3>How to recognise it</h3>
        <ul>{primer.recognize.map((r, i) => <li key={i}>{r}</li>)}</ul>

        <h3>Techniques</h3>
        <ol className="primer-techniques">
          {primer.techniques.map((t, i) => (
            <li key={i} className="technique">
              <h4>{t.name}</h4>
              <p className="technique-when"><strong>When:</strong> {t.when}</p>
              <ol className="technique-how">{t.how.map((h, j) => <li key={j}>{h}</li>)}</ol>
              {t.complexity && t.complexity !== '—' && <p className="technique-complexity">{t.complexity}</p>}
              {t.template && (
                <div className="technique-template">
                  <button className="link-btn" onClick={() => toggle(i)}>{openTemplates.has(i) ? 'Hide template' : 'Show template'}</button>
                  {openTemplates.has(i) && <div className="solution"><CodeEditor value={t.template} readOnly height="auto" /></div>}
                </div>
              )}
              {t.pitfalls && t.pitfalls.length > 0 && <ul className="technique-pitfalls">{t.pitfalls.map((p, j) => <li key={j}>{p}</li>)}</ul>}
            </li>
          ))}
        </ol>

        <h3>Pitfalls</h3>
        <ul>{primer.pitfalls.map((p, i) => <li key={i}>{p}</li>)}</ul>

        <h3>Say it out loud</h3>
        <ul>{primer.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>

        <DocLinks links={TOPIC_DOCS[primer.topic] ?? []} title="Read more" />

        <ChatThread
          {...chat}
          enabled
          title="Ask about this topic"
          placeholder="Ask for an example, a walkthrough on a small input, or when to use which technique…"
          suggestions={[
            `Walk me through ${first} on a small example`,
            second ? `When would I use ${first} vs ${second}?` : `What is the most common mistake with ${first}?`,
            'Give me a problem statement that uses this and let me guess the technique',
            'Explain the complexity argument in plain words',
          ]}
          onAsk={chat.ask}
          onStop={chat.stop}
          onClear={() => void chat.clear()}
        />
      </div>
    </div>
  )
}
