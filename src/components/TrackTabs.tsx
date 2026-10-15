import { TRACKS } from '../types.ts'
import type { Track } from '../types.ts'

export default function TrackTabs({ value, counts, onChange }: { value: Track; counts: Record<Track, number>; onChange: (t: Track) => void }) {
  return (
    <div className="tracks" role="tablist" aria-label="Tracks">
      {TRACKS.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} className={`track${t.id === value ? ' active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
          <span className="track-count">{counts[t.id]}</span>
        </button>
      ))}
    </div>
  )
}
