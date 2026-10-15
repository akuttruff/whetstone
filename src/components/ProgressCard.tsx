import type { Progress, Track } from '../types.ts'

export default function ProgressCard({ progress, track }: { progress: Progress; track: Track }) {
  const rows = progress.patterns.filter((p) => p.track === track)
  if (rows.length === 0) return null
  const weak = rows.filter((r) => r.avg < 6).slice(0, 3)
  const strong = rows.filter((r) => r.avg >= 8).slice(-3)
  const attempts = rows.reduce((n, r) => n + r.attempts, 0)
  const avg = rows.reduce((n, r) => n + r.avg * r.attempts, 0) / Math.max(1, attempts)
  return (
    <div className="progress">
      <div className="progress-line">
        <span>{attempts} review{attempts === 1 ? '' : 's'}</span>
        <span className="dot" />
        <span>avg {avg.toFixed(1)}</span>
      </div>
      {weak.length > 0 && (
        <div className="progress-line">
          <span className="progress-label low">Work on</span>
          <span>{weak.map((w) => w.pattern).join(', ')}</span>
        </div>
      )}
      {strong.length > 0 && (
        <div className="progress-line">
          <span className="progress-label good">Solid</span>
          <span>{strong.map((w) => w.pattern).join(', ')}</span>
        </div>
      )}
    </div>
  )
}
