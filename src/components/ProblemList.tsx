import { useMemo } from 'react'
import { BookOpen, ChevronRight, Trash2 } from 'lucide-react'
import { primerFor } from '../data/primers.ts'
import { DIFFICULTY_LABEL, difficultyRank, scoreTone } from '../lib/format.ts'
import { workKey } from '../types.ts'
import type { Direction, Language, Problem, Progress } from '../types.ts'

interface Props {
  problems: Problem[]
  selectedId: string | null
  progress: Progress
  onSelect: (id: string) => void
  onDelete: (p: Problem) => void
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

export default function ProblemList({ problems, selectedId, progress, onSelect, onDelete, onPrimer, primerTopic, language }: Props) {
  const groups = useMemo(() => {
    const byTopic = new Map<string, Problem[]>()
    for (const p of problems) {
      const list = byTopic.get(p.topic) ?? []
      list.push(p)
      byTopic.set(p.topic, list)
    }
    return [...byTopic.entries()].map(([topic, list]) => {
      // Variants sit right under their parent, in difficulty order otherwise.
      const roots = list.filter((p) => !p.parentId || !list.some((q) => q.id === p.parentId)).sort((a, b) => difficultyRank(a) - difficultyRank(b))
      const ordered: Problem[] = []
      const push = (p: Problem): void => {
        ordered.push(p)
        for (const v of list.filter((q) => q.parentId === p.id)) push(v)
      }
      for (const r of roots) push(r)
      return { topic, items: ordered }
    })
  }, [problems])

  if (problems.length === 0) return <p className="empty">Nothing here yet.</p>

  return (
    <div className="plist">
      {groups.map((g) => (
        <section key={g.topic} className="plist-group">
          <div className="plist-topic-row">
            <h2 className="plist-topic">{g.topic}</h2>
            {primerFor(g.items[0]!.track, g.topic) && (
              <button className={`primer-btn${primerTopic === g.topic ? ' active' : ''}`} onClick={() => onPrimer(g.topic)} title={`What you need to know for ${g.topic}`}>
                <BookOpen size={13} /> Primer
              </button>
            )}
          </div>
          {g.items.map((p) => {
            const score = progress.latest[workKey(p, language)]
            const tone = scoreTone(score)
            const depth = p.parentId ? 1 : 0
            return (
              <div key={p.id} className={`prow${p.id === selectedId ? ' selected' : ''}${depth ? ' variant' : ''}`}>
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
                {score !== undefined && score !== null && <span className={`score score-${tone}`}>{score}</span>}
                {p.source === 'generated' ? (
                  <button className="icon-btn small" aria-label={`Delete ${p.title}`} onClick={() => onDelete(p)}>
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <ChevronRight size={16} className="prow-chev" />
                )}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
