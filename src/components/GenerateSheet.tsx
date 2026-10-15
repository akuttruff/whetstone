import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import { ChevronsDown, ChevronsUp, Repeat } from 'lucide-react'
import { DIFFICULTY_LABEL } from '../lib/format.ts'
import type { Direction, Problem } from '../types.ts'

interface Props {
  open: boolean
  problem: Problem
  /** The direction currently being generated, if any; disables the level buttons. */
  busy: Direction | null
  onClose: () => void
  onGenerate: (direction: Direction, request: string) => void
}

const REQUEST_MAX = 600

const LEVELS: { direction: Direction; name: string; blurb: string; icon: typeof Repeat }[] = [
  { direction: 'easier', name: 'Easier', blurb: 'One step down: the same idea with less in the way, for when this one would not click.', icon: ChevronsDown },
  { direction: 'similar', name: 'Similar', blurb: 'Same level, new scenario: drill the move you just made until it is automatic.', icon: Repeat },
  { direction: 'harder', name: 'Harder', blurb: 'One step up: the follow-up twist an interviewer would add once you solved this.', icon: ChevronsUp },
]

/** A bottom sheet for generating the next problem: an optional steer, then the level. */
export default function GenerateSheet({ open, problem, busy, onClose, onGenerate }: Props) {
  const [request, setRequest] = useState('')
  // A fresh sheet per problem: the steer written for one problem should not quietly carry to the next.
  useEffect(() => { setRequest('') }, [problem.id])
  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o && !busy) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className="sheet" aria-describedby={undefined}>
          <div className="sheet-handle" />
          <Drawer.Title className="sheet-title">New problem</Drawer.Title>
          <div className="sheet-body">
            <p className="gen-from">
              Based on <b>{problem.title}</b> · {DIFFICULTY_LABEL[problem.difficulty]} · {problem.pattern}
            </p>
            <label className="field">
              <span>Anything specific? (optional)</span>
              <textarea
                rows={3}
                value={request}
                maxLength={REQUEST_MAX}
                onChange={(e) => setRequest(e.target.value)}
                placeholder="e.g. I'd like to keep practising hash lookups but focus on counting-related problems"
                disabled={busy !== null}
              />
              <small>The model keeps the pattern and follows your steer for the scenario and emphasis.</small>
            </label>
            <div className="gen-levels">
              {LEVELS.map(({ direction, name, blurb, icon: Icon }) => (
                <button key={direction} className="gen-level" disabled={busy !== null} onClick={() => onGenerate(direction, request.trim())}>
                  <span className="gen-level-name"><Icon size={15} /> {busy === direction ? `Writing ${name.toLowerCase()}…` : name}</span>
                  <small>{blurb}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="sheet-actions">
            <button className="btn" onClick={onClose} disabled={busy !== null}>Cancel</button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
