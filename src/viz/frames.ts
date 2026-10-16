/**
 * A visualisation is a list of frames recorded while the real algorithm runs
 * on a small fixed example. Each frame is a complete picture (cells, markers,
 * auxiliary structures, variables, a caption), so the viewer can step
 * forwards and backwards freely. Three scene kinds cover everything here:
 * a row of cells (arrays, strings, windows, stacks, heaps), a grid (matrices,
 * DP tables, mazes) and a graph (trees, graphs, linked lists, recursion trees).
 */

export type Tone = 'active' | 'window' | 'done' | 'match' | 'bad' | 'dim' | 'mark'

export interface Cell {
  v: string | number
  tone?: Tone
}

/** A labelled pointer above a cell (i, j, lo, hi, slow, fast…). */
export interface Mark {
  i: number
  label: string
  tone?: Tone
}

/** A named side structure drawn as a row of boxes: a deque, a stack, a heap, the output so far. */
export interface AuxList {
  title: string
  items: Cell[]
  note?: string
}

/** A named key → value table: a hash map, a count map, distances. */
export interface KV {
  title: string
  rows: [string, string][]
}

interface Base {
  caption: string
  vars?: Record<string, string | number | boolean>
  aux?: AuxList[]
  table?: KV
}

export interface ArrayFrame extends Base {
  kind: 'array'
  cells: Cell[]
  marks?: Mark[]
  /** Inclusive index range drawn as a band (a window, a search range). */
  range?: [number, number]
}

export interface GridFrame extends Base {
  kind: 'grid'
  cells: Cell[][]
  rowLabels?: string[]
  colLabels?: string[]
}

export interface GraphNode {
  id: string
  label: string
  /** 0..100 across, 0..height down. */
  x: number
  y: number
  tone?: Tone
  /** Small text under the node: a distance, a level, an in-degree. */
  tag?: string
}

export interface GraphEdge {
  a: string
  b: string
  tone?: Tone
  label?: string
  directed?: boolean
  /** Bow the edge out, for back edges and cycles that would otherwise cross nodes. */
  curve?: boolean
}

export interface GraphFrame extends Base {
  kind: 'graph'
  nodes: GraphNode[]
  edges: GraphEdge[]
  height?: number
}

export type Frame = ArrayFrame | GridFrame | GraphFrame

export interface Viz {
  /** The example being run, e.g. "nums = [1, 3, -1], k = 3". */
  title: string
  frames: Frame[]
}

export const cellsOf = (xs: readonly (string | number)[], tone?: (i: number) => Tone | undefined): Cell[] => xs.map((v, i) => ({ v, tone: tone?.(i) }))

export const list = (title: string, xs: readonly (string | number)[], tone?: (i: number) => Tone | undefined, note?: string): AuxList => ({ title, items: cellsOf(xs, tone), note })

export const kv = (title: string, rows: Iterable<[string | number, string | number]>): KV => ({ title, rows: [...rows].map(([k, v]) => [String(k), String(v)]) })

export const A = (f: Omit<ArrayFrame, 'kind'>): ArrayFrame => ({ kind: 'array', ...f })
export const G = (f: Omit<GridFrame, 'kind'>): GridFrame => ({ kind: 'grid', ...f })
export const N = (f: Omit<GraphFrame, 'kind'>): GraphFrame => ({ kind: 'graph', ...f })

/** A tree laid out for a graph frame: leaves spread evenly across the width, one row per depth. */
export function treeLayout<T>(root: T, children: (n: T) => T[], id: (n: T) => string, label: (n: T) => string, rowGap = 17, top = 6): { nodes: GraphNode[]; edges: GraphEdge[]; height: number } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  let leaves = 0
  let depthMax = 0
  const count = (n: T): number => {
    const cs = children(n)
    return cs.length === 0 ? 1 : cs.reduce((s, c) => s + count(c), 0)
  }
  const total = count(root)
  const place = (n: T, depth: number): number => {
    depthMax = Math.max(depthMax, depth)
    const cs = children(n)
    let x: number
    if (cs.length === 0) {
      x = ((leaves + 0.5) / total) * 100
      leaves++
    } else {
      const xs = cs.map((c) => place(c, depth + 1))
      x = (xs[0]! + xs[xs.length - 1]!) / 2
      for (const c of cs) edges.push({ a: id(n), b: id(c) })
    }
    nodes.push({ id: id(n), label: label(n), x, y: top + depth * rowGap })
    return x
  }
  place(root, 0)
  return { nodes, edges, height: top + depthMax * rowGap + 8 }
}
