import type { RunResult } from '../types.ts'

export default function RunPanel({ run, running }: { run: RunResult | null; running: boolean }) {
  if (running) return <div className="run run-busy">Running tests…</div>
  if (!run) return null
  return (
    <div className={`run ${run.ok ? 'run-ok' : 'run-fail'}`}>
      <div className="run-head">
        {run.error ? 'Could not run' : `${run.passed} of ${run.total} tests passed`}
        <span className="run-ms">{run.ms} ms</span>
      </div>
      {run.error && <pre className="run-error">{run.error}</pre>}
      {run.results.map((r, i) => (
        <div key={i} className={`run-row ${r.pass ? 'pass' : 'fail'}`}>
          <span className="run-mark">{r.pass ? '✓' : '✗'}</span>
          <div className="run-detail">
            <code>{r.name}</code>
            {!r.pass && (
              <div className="run-diff">
                <span>expected <code>{r.expected}</code></span>
                <span>got <code>{r.actual}</code></span>
              </div>
            )}
          </div>
        </div>
      ))}
      {run.output && (
        <details className="run-output">
          <summary>Console output</summary>
          <pre>{run.output}</pre>
        </details>
      )}
    </div>
  )
}
