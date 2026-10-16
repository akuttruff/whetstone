import { useEffect, useRef, useState } from 'react'
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { ArrayFrame, AuxList, Frame, GraphFrame, GridFrame, KV, Viz } from '../viz/frames.ts'

const PLAY_MS = 1400

/** Steps through a recorded run of a technique: one frame at a time, forwards and back, or played. */
export default function Visualizer({ viz }: { viz: Viz }) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const last = viz.frames.length - 1
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setI(0)
    setPlaying(false)
  }, [viz])

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setI((x) => {
        if (x >= last) {
          setPlaying(false)
          return x
        }
        return x + 1
      })
    }, PLAY_MS)
    return () => clearInterval(t)
  }, [playing, last])

  const go = (n: number): void => {
    setPlaying(false)
    setI(Math.max(0, Math.min(last, n)))
  }
  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); go(0) }
    else if (e.key === 'End') { e.preventDefault(); go(last) }
    else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
  }

  const frame = viz.frames[i]!
  return (
    <div className="viz" tabIndex={0} onKeyDown={onKey} ref={box} aria-label="Visualisation">
      <p className="viz-title">{viz.title}</p>
      <div className="viz-scene">
        {frame.kind === 'array' && <ArrayScene f={frame} />}
        {frame.kind === 'grid' && <GridScene f={frame} />}
        {frame.kind === 'graph' && <GraphScene f={frame} />}
      </div>
      {frame.aux && frame.aux.length > 0 && (
        <div className="viz-aux">{frame.aux.map((a, k) => <Aux key={k} a={a} />)}</div>
      )}
      {frame.table && <Table t={frame.table} />}
      {frame.vars && Object.keys(frame.vars).length > 0 && (
        <div className="viz-vars">
          {Object.entries(frame.vars).map(([k, v]) => (
            <span key={k} className="viz-var"><span className="viz-var-k">{k}</span> = <span className="viz-var-v">{String(v)}</span></span>
          ))}
        </div>
      )}
      <p className="viz-caption" aria-live="polite">{frame.caption}</p>
      <div className="viz-controls">
        <button className="icon-btn small" aria-label="First step" onClick={() => go(0)} disabled={i === 0}><ChevronFirst size={18} /></button>
        <button className="icon-btn small" aria-label="Previous step" onClick={() => go(i - 1)} disabled={i === 0}><ChevronLeft size={18} /></button>
        <button className="icon-btn small" aria-label={playing ? 'Pause' : 'Play'} onClick={() => { if (i >= last) setI(0); setPlaying((p) => !p) }}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="icon-btn small" aria-label="Next step" onClick={() => go(i + 1)} disabled={i === last}><ChevronRight size={18} /></button>
        <button className="icon-btn small" aria-label="Last step" onClick={() => go(last)} disabled={i === last}><ChevronLast size={18} /></button>
        <input type="range" min={0} max={last} value={i} onChange={(e) => go(Number(e.target.value))} aria-label="Step" />
        <span className="viz-step">{i + 1} / {viz.frames.length}</span>
      </div>
    </div>
  )
}

function Aux({ a }: { a: AuxList }) {
  return (
    <div className="viz-list">
      <span className="viz-list-title">{a.title}</span>
      <div className="viz-list-items">
        {a.items.length === 0 ? <span className="viz-empty">empty</span> : a.items.map((c, k) => <span key={k} className={`viz-box ${c.tone ?? ''}`}>{c.v === '' ? ' ' : c.v}</span>)}
      </div>
      {a.note && <span className="viz-list-note">{a.note}</span>}
    </div>
  )
}

function Table({ t }: { t: KV }) {
  return (
    <div className="viz-list">
      <span className="viz-list-title">{t.title}</span>
      <div className="viz-list-items">
        {t.rows.length === 0 ? <span className="viz-empty">empty</span> : t.rows.map(([k, v], i) => <span key={i} className="viz-box kv"><span className="viz-kv-k">{k}</span><span className="viz-kv-arrow">→</span>{v}</span>)}
      </div>
    </div>
  )
}

function ArrayScene({ f }: { f: ArrayFrame }) {
  const n = f.cells.length
  const style = { gridTemplateColumns: `repeat(${Math.max(n, 1)}, minmax(30px, 1fr))` }
  const inRange = (j: number): boolean => f.range !== undefined && j >= f.range[0] && j <= f.range[1]
  return (
    <div className="viz-array">
      <div className="viz-row viz-marks" style={style}>
        {f.cells.map((_, j) => (
          <div key={j} className="viz-slot">
            {(f.marks ?? []).filter((m) => m.i === j).map((m) => <span key={m.label} className={`viz-mark ${m.tone ?? ''}`}>{m.label}</span>)}
          </div>
        ))}
      </div>
      <div className="viz-row viz-cells" style={style}>
        {f.cells.map((c, j) => (
          <div key={j} className={`viz-cell ${c.tone ?? ''}${inRange(j) ? ' in-range' : ''}`}>{c.v === '' ? ' ' : c.v}</div>
        ))}
        {n === 0 && <div className="viz-empty">empty</div>}
      </div>
      <div className="viz-row viz-indices" style={style}>
        {f.cells.map((_, j) => <div key={j} className="viz-slot">{j}</div>)}
      </div>
    </div>
  )
}

function GridScene({ f }: { f: GridFrame }) {
  const cols = f.cells[0]?.length ?? 0
  const hasRow = f.rowLabels !== undefined
  const style = { gridTemplateColumns: `${hasRow ? 'auto ' : ''}repeat(${cols}, minmax(28px, 1fr))` }
  return (
    <div className="viz-grid" style={style}>
      {f.colLabels && (
        <>
          {hasRow && <div className="viz-grid-label" />}
          {f.colLabels.map((l, j) => <div key={j} className="viz-grid-label">{l}</div>)}
        </>
      )}
      {f.cells.map((row, i) => (
        <div key={i} className="viz-grid-row-contents" style={{ display: 'contents' }}>
          {hasRow && <div className="viz-grid-label">{f.rowLabels![i]}</div>}
          {row.map((c, j) => <div key={j} className={`viz-cell ${c.tone ?? ''}`}>{c.v === '' ? ' ' : c.v}</div>)}
        </div>
      ))}
    </div>
  )
}

const R = 4.4

function GraphScene({ f }: { f: GraphFrame }) {
  const by = new Map(f.nodes.map((n) => [n.id, n]))
  const h = f.height ?? 60
  return (
    <svg className="viz-graph" viewBox={`0 0 100 ${h}`} role="img">
      <defs>
        <marker id="viz-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 z" className="viz-arrowhead" />
        </marker>
        <marker id="viz-arrow-active" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 z" className="viz-arrowhead active" />
        </marker>
      </defs>
      {f.edges.map((e, k) => {
        const a = by.get(e.a)
        const b = by.get(e.b)
        if (!a || !b) return null
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy) || 1
        const ux = dx / len
        const uy = dy / len
        // Start and end on the circles' edges, so arrowheads are visible.
        const x1 = a.x + ux * R
        const y1 = a.y + uy * R
        const x2 = b.x - ux * (R + (e.directed ? 1.2 : 0))
        const y2 = b.y - uy * (R + (e.directed ? 1.2 : 0))
        const cls = `viz-edge ${e.tone ?? ''}`
        const marker = e.directed ? `url(#${e.tone === 'active' ? 'viz-arrow-active' : 'viz-arrow'})` : undefined
        if (e.curve) {
          const cx = (a.x + b.x) / 2 - uy * 14
          const cy = (a.y + b.y) / 2 + ux * 14
          const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`
          return (
            <g key={k}>
              <path d={d} className={cls} markerEnd={marker} />
              {e.label && <text x={(x1 + 2 * cx + x2) / 4} y={(y1 + 2 * cy + y2) / 4 - 1} className="viz-edge-label">{e.label}</text>}
            </g>
          )
        }
        return (
          <g key={k}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} className={cls} markerEnd={marker} />
            {e.label && <text x={(x1 + x2) / 2 - uy * 2.4} y={(y1 + y2) / 2 + ux * 2.4 + 1} className="viz-edge-label">{e.label}</text>}
          </g>
        )
      })}
      {f.nodes.map((n) => (
        <g key={n.id} className={`viz-node ${n.tone ?? ''}`}>
          <circle cx={n.x} cy={n.y} r={R} />
          <text x={n.x} y={n.y + 1.3} className="viz-node-label">{n.label}</text>
          {n.tag && <text x={n.x} y={n.y + R + 3.2} className="viz-node-tag">{n.tag}</text>}
        </g>
      ))}
    </svg>
  )
}

export type { Frame }
