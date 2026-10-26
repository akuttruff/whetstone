import { Braces, Layers, MessagesSquare, Network, Wrench } from 'lucide-react'
import { TRACKS } from '../types.ts'
import type { Track } from '../types.ts'

const ICONS: Record<Track, typeof Braces> = { coding: Braces, practical: Wrench, design: Network, knowledge: Layers, behavioral: MessagesSquare }

/** The five tracks as a bar of equal-width tabs, an icon over a short label, so all five are always in reach on a phone and in the desktop sidebar. */
export default function TrackTabs({ value, onChange }: { value: Track; onChange: (t: Track) => void }) {
  return (
    <div className="tracks" role="tablist" aria-label="Tracks">
      {TRACKS.map((t) => {
        const Icon = ICONS[t.id]
        return (
          <button key={t.id} role="tab" aria-selected={t.id === value} className={`track${t.id === value ? ' active' : ''}`} onClick={() => onChange(t.id)} title={t.blurb}>
            <Icon size={18} strokeWidth={t.id === value ? 2.25 : 1.75} />
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
