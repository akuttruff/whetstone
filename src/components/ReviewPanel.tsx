import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import { elapsedLabel, relativeTime, scoreTone } from '../lib/format.ts'
import type { ReviewState } from '../hooks/useReview.ts'

interface Props extends ReviewState {
  stale: boolean
  onStart: () => void
  onCancel: () => void
  canReview: boolean
}

export default function ReviewPanel({ text, streaming, review, error, startedAt, history, stale, onStart, onCancel, canReview }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!streaming) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [streaming])

  const score = review?.score ?? null
  return (
    <div className="review">
      <div className="review-head">
        {streaming ? (
          <>
            <span className="review-status">Reviewing… {elapsedLabel(startedAt, now)}</span>
            <button className="btn" onClick={onCancel}>Stop</button>
          </>
        ) : (
          <>
            {review && (
              <span className={`score score-${scoreTone(score)}`}>{score === null ? '–' : `${score}/10`}</span>
            )}
            {review?.focus && <span className="review-focus">{review.focus}</span>}
            {review && <span className="review-when">{relativeTime(review.createdAt)}{stale ? ' · edited since' : ''}</span>}
            <span className="spacer" />
            <button className="btn btn-primary" onClick={onStart} disabled={!canReview}>
              {review ? 'Review again' : 'Review'}
            </button>
          </>
        )}
      </div>
      {error && <p className="review-error">{error}</p>}
      {text ? (
        <div className="review-body md">
          <Markdown>{text}</Markdown>
          {streaming && <span className="cursor" />}
        </div>
      ) : (
        !streaming && !error && (
          <p className="review-empty">
            Reviews come from your local model and never leave this machine. Turn on <strong>Auto</strong> to get one a few seconds after you stop typing.
          </p>
        )
      )}
      {history.length > 1 && (
        <details className="review-history">
          <summary>Earlier reviews ({history.length - 1})</summary>
          {history.slice(1).map((h) => (
            <div key={h.id} className="review-hist-row">
              <span className={`score score-${scoreTone(h.score)}`}>{h.score ?? '–'}</span>
              <span className="review-focus">{h.focus || '—'}</span>
              <span className="review-when">{relativeTime(h.createdAt)}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}
