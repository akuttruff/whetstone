import { useMemo, useState } from 'react'
import { BookOpen, ChevronDown } from 'lucide-react'
import { primerFor } from '../data/primers.ts'
import { DIFFICULTY_LABEL, difficultyRank, scoreTone } from '../lib/format.ts'
import { workKey } from '../types.ts'
import type { Direction, Language, Problem, Progress } from '../types.ts'

interface Props {
  problems: Problem[]
  selectedId: string | null
  progress: Progress
  onSelect: (id: string) => void
  onPrimer: (topic: string) => void
  /** The topic whose primer is open, so its header can show it. */
  primerTopic: string | null
  /** The language being worked in: the score shown is that language's latest. */
  language: Language
}

/** Variants saved before the direction was stored carry it only in their id. */
function variantLabel(p: Problem): Direction {
  return p.direction ?? (/-harder(-\d+)?$/.test(p.id) ? 'harder' : /-similar(-\d+)?$/.test(p.id) ? 'similar' : 'easier')
}

/** A built-in (or orphaned) problem with the generated variants under it. */
interface Entry {
  problem: Problem
  variants: Problem[]
}

export default function ProblemList({ problems, selectedId, progress, onSelect, onPrimer, primerTopic, language }: Props) {
  const groups = useMemo(() => {
    const byTopic = new Map<string, Problem[]>()
    for (const p of problems) {
      const list = byTopic.get(p.topic) ?? []
      list.push(p)
      byTopic.set(p.topic, list)
    }
    return [...byTopic.entries()].map(([topic, list]) => {
      // Roots in difficulty order; a variant's own variants are flattened under the same root.
      const roots = list.filter((p) => !p.parentId || !list.some((q) => q.id === p.parentId)).sort((a, b) => difficultyRank(a) - difficultyRank(b))
      const under = (id: string): Problem[] => list.filter((q) => q.parentId === id).flatMap((v) => [v, ...under(v.id)])
      return { topic, entries: roots.map((problem): Entry => ({ problem, variants: under(problem.id) })) }
    })
  }, [problems])

  // Variants stay folded until asked for; the one that is open is always shown.
  const [opened, setOpened] = useState<Set<string>>(() => new Set())
  const toggle = (id: string): void => {
    setOpened((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (problems.length === 0) return <p className="empty">Nothing here yet.</p>

  const scoreChip = (p: Problem) => {
    const score = progress.latest[workKey(p, language)]
    return score !== undefined && score !== null ? <span className={`score score-${scoreTone(score)}`}>{score}</span> : null
  }

  return (
    <div className="plist">
      {groups.map((g) => (
        <section key={g.topic} className="plist-group">
          <div className="plist-topic-row">
            <h2 className="plist-topic">{g.topic}</h2>
            {primerFor(g.entries[0]!.problem.track, g.topic) && (
              <button className={`primer-btn${primerTopic === g.topic ? ' active' : ''}`} onClick={() => onPrimer(g.topic)} title={`What you need to know for ${g.topic}`}>
                <BookOpen size={13} /> Primer
              </button>
            )}
          </div>
          {g.entries.map(({ problem: p, variants }) => {
            const open = opened.has(p.id) || variants.some((v) => v.id === selectedId)
            return (
              <div key={p.id} className="pentry">
                <div className={`prow${p.id === selectedId ? ' selected' : ''}`}>
                  <button className="prow-main" onClick={() => onSelect(p.id)}>
                    <span className="prow-title">
                      {p.source === 'generated' && <span className="prow-gen">{variantLabel(p)}</span>}
                      {p.title}
                    </span>
                    <span className="prow-meta">
                      <span className={`diff diff-${p.difficulty}`}>{DIFFICULTY_LABEL[p.difficulty]}</span>
                      <span className="prow-pattern">{p.pattern}</span>
                    </span>
                  </button>
                  {scoreChip(p)}
                  {variants.length > 0 && (
                    <button className={`vtoggle${open ? ' open' : ''}`} aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} ${variants.length} generated variant${variants.length === 1 ? '' : 's'} of ${p.title}`} onClick={() => toggle(p.id)}>
                      {variants.length} <ChevronDown size={14} />
                    </button>
                  )}
                </div>
                {open && variants.map((v) => (
                  <div key={v.id} className={`prow variant${v.id === selectedId ? ' selected' : ''}`}>
                    <button className="prow-main" onClick={() => onSelect(v.id)}>
                      <span className="prow-title">
                        <span className="prow-gen">{variantLabel(v)}</span>
                        <span className="prow-vtitle">{v.title}</span>
                        <span className={`diff diff-${v.difficulty}`}>{DIFFICULTY_LABEL[v.difficulty]}</span>
                      </span>
                    </button>
                    {scoreChip(v)}
                  </div>
                ))}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
