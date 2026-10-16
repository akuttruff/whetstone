import { describe, expect, it } from 'vitest'
import { TECHNIQUES, techniquesFor } from './techniques.ts'
import { BUILTIN_PROBLEMS } from './index.ts'
import { primerFor } from './primers.ts'
import { VIZ, vizFor } from '../viz/index.ts'

describe('technique catalogue', () => {
  it('has unique ids and visualisations that exist', () => {
    const ids = TECHNIQUES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of TECHNIQUES) if (t.viz) expect(VIZ[t.viz], `${t.id} → ${t.viz}`).toBeDefined()
  })

  it('names primer cards that exist', () => {
    for (const t of TECHNIQUES) {
      if (!t.primerTechnique) continue
      const primer = primerFor('coding', t.topic) ?? primerFor('practical', t.topic)
      expect(primer, `${t.id}: primer for ${t.topic}`).toBeDefined()
      expect(primer!.techniques.map((c) => c.name), `${t.id}: card "${t.primerTechnique}"`).toContain(t.primerTechnique)
    }
  })

  it('matches every built-in coding and practical problem to at least one technique', () => {
    const missing = BUILTIN_PROBLEMS.filter((p) => (p.track === 'coding' || p.track === 'practical') && techniquesFor(p).length === 0).map((p) => `${p.id} (${p.pattern})`)
    expect(missing).toEqual([])
  })

  it('gives other tracks nothing, and variants their parent’s techniques via the pattern', () => {
    const design = BUILTIN_PROBLEMS.find((p) => p.track === 'design')!
    expect(techniquesFor(design)).toEqual([])
    const parent = BUILTIN_PROBLEMS.find((p) => p.id === 'sliding-window-maximum')!
    const variant = { ...parent, id: 'x', source: 'generated' as const, parentId: parent.id }
    expect(techniquesFor(variant).map((t) => t.id)).toEqual(['monotonic-deque'])
  })

  it('every technique with a visualisation is reachable from some built-in problem', () => {
    const used = new Set(BUILTIN_PROBLEMS.flatMap((p) => techniquesFor(p).map((t) => t.id)))
    const orphans = TECHNIQUES.filter((t) => !used.has(t.id)).map((t) => t.id)
    expect(orphans).toEqual([])
  })
})

describe('visualisations', () => {
  it.each(Object.keys(VIZ))('%s records a consistent run', (id) => {
    const viz = vizFor(id)!
    expect(viz.title.length).toBeGreaterThan(0)
    expect(viz.frames.length).toBeGreaterThanOrEqual(3)
    for (const f of viz.frames) {
      expect(f.caption.trim().length).toBeGreaterThan(0)
      if (f.kind === 'array') {
        for (const m of f.marks ?? []) expect(m.i, `${id}: mark ${m.label}`).toBeGreaterThanOrEqual(0)
        for (const m of f.marks ?? []) expect(m.i, `${id}: mark ${m.label}`).toBeLessThan(f.cells.length)
        if (f.range) {
          expect(f.range[0]).toBeLessThanOrEqual(f.range[1])
          expect(f.range[1]).toBeLessThan(f.cells.length)
        }
      } else if (f.kind === 'grid') {
        const w = f.cells[0]!.length
        for (const row of f.cells) expect(row.length).toBe(w)
      } else {
        const ids = new Set(f.nodes.map((n) => n.id))
        expect(ids.size).toBe(f.nodes.length)
        for (const e of f.edges) {
          expect(ids.has(e.a), `${id}: edge from ${e.a}`).toBe(true)
          expect(ids.has(e.b), `${id}: edge to ${e.b}`).toBe(true)
        }
        for (const n of f.nodes) {
          expect(n.x).toBeGreaterThanOrEqual(0)
          expect(n.x).toBeLessThanOrEqual(100)
          expect(n.y).toBeLessThanOrEqual(f.height ?? 60)
        }
      }
    }
    expect(vizFor(id)).toBe(viz) // cached
  })

  it('the monotonic deque run ends with the right maxima', () => {
    const viz = vizFor('monotonic-deque')!
    const last = viz.frames[viz.frames.length - 1]!
    expect(last.aux?.find((a) => a.title === 'window maxima')?.items.map((c) => c.v)).toEqual([3, 3, 5, 5, 6, 7])
  })

  it('the hash map run finds the pair', () => {
    const viz = vizFor('hash-map-lookup')!
    expect(viz.frames[viz.frames.length - 1]!.caption).toMatch(/Answer: \[3, 4\]/)
  })
})
