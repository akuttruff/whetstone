import { N, kv, list, treeLayout } from './frames.ts'
import type { Frame, GraphEdge, GraphNode, Tone, Viz } from './frames.ts'

interface TreeNode {
  v: number
  l?: TreeNode
  r?: TreeNode
}
const t = (v: number, l?: TreeNode, r?: TreeNode): TreeNode => ({ v, l, r })
const kids = (n: TreeNode): TreeNode[] => [n.l, n.r].filter((x): x is TreeNode => x !== undefined)
const layoutTree = (root: TreeNode) => treeLayout(root, kids, (n) => String(n.v), (n) => String(n.v))

function paint(nodes: GraphNode[], tone: (id: string) => Tone | undefined, tag?: (id: string) => string | undefined): GraphNode[] {
  return nodes.map((n) => ({ ...n, tone: tone(n.id), tag: tag?.(n.id) }))
}
function paintEdges(edges: GraphEdge[], tone: (e: GraphEdge) => Tone | undefined): GraphEdge[] {
  return edges.map((e) => ({ ...e, tone: tone(e) }))
}

/** Level-order traversal: BFS one level at a time. */
export function bfsLevels(): Viz {
  const root = t(3, t(9, t(4), t(8)), t(20, t(15), t(7)))
  const { nodes, edges, height } = layoutTree(root)
  const levels: number[][] = []
  const f: Frame[] = []
  const done = new Set<string>()
  const levelOf = new Map<string, number>()
  f.push(N({ nodes, edges, height, caption: 'A queue holds the nodes of the current level. Take its length, pop exactly that many, push their children: what remains is the next level.' }))
  let queue: TreeNode[] = [root]
  while (queue.length) {
    const size = queue.length
    const level: number[] = []
    const next: TreeNode[] = []
    const L = levels.length
    f.push(N({ nodes: paint(nodes, (id) => (queue.some((q) => String(q.v) === id) ? 'active' : done.has(id) ? 'done' : undefined), (id) => (levelOf.has(id) ? `L${levelOf.get(id)}` : undefined)), edges, height, aux: [list('queue', queue.map((q) => q.v))], vars: { level: L, 'queue length': size }, caption: `Queue holds level ${L}: [${queue.map((q) => q.v).join(', ')}]. Pop exactly ${size} node${size === 1 ? '' : 's'}.` }))
    for (const n of queue) {
      level.push(n.v)
      done.add(String(n.v))
      levelOf.set(String(n.v), L)
      next.push(...kids(n))
    }
    levels.push(level)
    f.push(N({ nodes: paint(nodes, (id) => (next.some((q) => String(q.v) === id) ? 'match' : done.has(id) ? 'done' : undefined), (id) => (levelOf.has(id) ? `L${levelOf.get(id)}` : undefined)), edges, height, aux: [list('queue (next level)', next.map((q) => q.v)), list('levels so far', levels.map((l) => `[${l.join(',')}]`))], caption: `Level ${L} = [${level.join(', ')}]. Their children [${next.map((q) => q.v).join(', ')}] are now the queue.` }))
    queue = next
  }
  f.push(N({ nodes: paint(nodes, () => 'done', (id) => `L${levelOf.get(id)}`), edges, height, aux: [list('levels', levels.map((l) => `[${l.join(',')}]`), () => 'done')], caption: 'Each node is queued once: O(n).' }))
  return { title: 'binary tree, root 3', frames: f }
}

/** Maximum depth: recursive DFS, heights returned upwards. */
export function dfsRecursive(): Viz {
  const root = t(1, t(2, t(4), t(5, t(7))), t(3, undefined, t(6)))
  const { nodes, edges, height } = layoutTree(root)
  const f: Frame[] = []
  const heights = new Map<string, number>()
  const stack: number[] = []
  f.push(N({ nodes, edges, height, caption: 'depth(node) = 1 + max(depth(left), depth(right)); an empty subtree is 0. The recursion goes all the way down first, then answers bubble up from the leaves.' }))
  const depth = (n: TreeNode | undefined): number => {
    if (!n) return 0
    stack.push(n.v)
    f.push(N({ nodes: paint(nodes, (id) => (id === String(n.v) ? 'active' : stack.includes(Number(id)) ? 'window' : heights.has(id) ? 'done' : undefined), (id) => (heights.has(id) ? `h${heights.get(id)}` : undefined)), edges, height, aux: [list('call stack', stack)], caption: `Enter ${n.v}: ask the children first.` }))
    const h = 1 + Math.max(depth(n.l), depth(n.r))
    heights.set(String(n.v), h)
    stack.pop()
    f.push(N({ nodes: paint(nodes, (id) => (id === String(n.v) ? 'match' : stack.includes(Number(id)) ? 'window' : heights.has(id) ? 'done' : undefined), (id) => (heights.has(id) ? `h${heights.get(id)}` : undefined)), edges, height, aux: [list('call stack', stack)], caption: `Leave ${n.v}: depth = 1 + max(${n.l ? heights.get(String(n.l.v)) : 0}, ${n.r ? heights.get(String(n.r.v)) : 0}) = ${h}.` }))
    return h
  }
  const d = depth(root)
  f.push(N({ nodes: paint(nodes, () => 'done', (id) => `h${heights.get(id)}`), edges, height, vars: { depth: d }, caption: `Max depth ${d}. Every node is visited once: O(n), with O(height) stack.` }))
  return { title: 'binary tree, root 1', frames: f }
}

/** Validate BST with bounds passed downwards. */
export function bstBounds(): Viz {
  const root = t(8, t(3, t(1), t(6)), t(10, undefined, t(14, t(13))))
  const { nodes, edges, height } = layoutTree(root)
  const f: Frame[] = []
  const ok = new Set<string>()
  f.push(N({ nodes, edges, height, caption: 'Comparing a node with only its children is not enough. Pass an allowed range (lo, hi) down: going left tightens hi to the parent, going right tightens lo to the parent. Every node must sit inside its range.' }))
  const check = (n: TreeNode | undefined, lo: number, hi: number): boolean => {
    if (!n) return true
    const inside = n.v > lo && n.v < hi
    const fmt = (x: number) => (x === Infinity ? '∞' : x === -Infinity ? '−∞' : x)
    f.push(N({ nodes: paint(nodes, (id) => (id === String(n.v) ? (inside ? 'active' : 'bad') : ok.has(id) ? 'done' : undefined)), edges, height, vars: { node: n.v, range: `(${fmt(lo)}, ${fmt(hi)})` }, caption: `${n.v} must be in (${fmt(lo)}, ${fmt(hi)}): ${inside ? 'yes.' : 'no, not a BST.'}` }))
    if (!inside) return false
    ok.add(String(n.v))
    return check(n.l, lo, n.v) && check(n.r, n.v, hi)
  }
  const valid = check(root, -Infinity, Infinity)
  f.push(N({ nodes: paint(nodes, (id) => (ok.has(id) ? 'done' : undefined)), edges, height, vars: { valid }, caption: valid ? 'Every node fits its range: valid BST. O(n).' : 'Invalid.' }))
  return { title: 'binary tree, root 8', frames: f }
}

/** Topological sort with Kahn's algorithm (in-degrees and a queue). */
export function topoSort(): Viz {
  const ids = ['A', 'B', 'C', 'D', 'E', 'F']
  const pos: Record<string, [number, number]> = { A: [12, 10], B: [12, 40], C: [40, 25], D: [66, 10], E: [66, 40], F: [90, 25] }
  const deps: [string, string][] = [['A', 'C'], ['B', 'C'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F']]
  const nodes: GraphNode[] = ids.map((id) => ({ id, label: id, x: pos[id]![0], y: pos[id]![1] }))
  const edges: GraphEdge[] = deps.map(([a, b]) => ({ a, b, directed: true }))
  const indeg = new Map(ids.map((id) => [id, 0]))
  for (const [, b] of deps) indeg.set(b, indeg.get(b)! + 1)
  const order: string[] = []
  const removed = new Set<string>()
  const f: Frame[] = []
  const frame = (queue: string[], hot: string | null, caption: string) =>
    N({ nodes: paint(nodes, (id) => (id === hot ? 'active' : order.includes(id) ? 'done' : queue.includes(id) ? 'match' : undefined), (id) => (order.includes(id) ? undefined : `in ${indeg.get(id)}`)), edges: paintEdges(edges, (e) => (removed.has(`${e.a}${e.b}`) ? 'dim' : e.a === hot ? 'active' : undefined)), height: 50, aux: [list('queue (in-degree 0)', queue), list('order', order)], caption })
  let queue = ids.filter((id) => indeg.get(id) === 0)
  f.push(frame(queue, null, 'Count incoming edges (in-degree). Anything with 0 has no prerequisites left: queue it. Removing a node lowers its successors’ in-degrees; whenever one hits 0, queue it.'))
  while (queue.length) {
    const u = queue.shift()!
    order.push(u)
    const freed: string[] = []
    for (const [a, b] of deps) {
      if (a !== u) continue
      removed.add(`${a}${b}`)
      indeg.set(b, indeg.get(b)! - 1)
      if (indeg.get(b) === 0) {
        queue.push(b)
        freed.push(b)
      }
    }
    f.push(frame(queue, u, `Take ${u}. Its outgoing edges are removed${freed.length ? `; ${freed.join(', ')} drop${freed.length === 1 ? 's' : ''} to 0 and join${freed.length === 1 ? 's' : ''} the queue.` : '.'}`))
  }
  const cyclic = order.length < ids.length
  f.push(frame([], null, cyclic ? 'Some nodes never reached 0: there is a cycle, so no order exists.' : `Order: ${order.join(' → ')}. Every edge is removed once: O(V + E). If the order is shorter than V, there was a cycle.`))
  return { title: 'A, B → C → D, E → F', frames: f }
}

/** Union-Find: connected components with path compression. */
export function unionFind(): Viz {
  const n = 6
  const pairs: [number, number][] = [[0, 1], [1, 2], [3, 4], [2, 1], [4, 5]]
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!
      x = parent[x]!
    }
    return x
  }
  const nodes: GraphNode[] = Array.from({ length: n }, (_, i) => ({ id: String(i), label: String(i), x: 10 + i * 16, y: 14 }))
  const joined: GraphEdge[] = []
  let components = n
  const f: Frame[] = []
  const frame = (hot: [number, number] | null, caption: string) => {
    const roots = Array.from({ length: n }, (_, i) => find(i))
    return N({ nodes: paint(nodes, (id) => (hot && (Number(id) === hot[0] || Number(id) === hot[1]) ? 'active' : undefined), (id) => `root ${roots[Number(id)]}`), edges: joined, height: 26, aux: [list('parent[]', parent)], vars: { components }, caption })
  }
  f.push(frame(null, 'Each node starts as its own set, parent[i] = i. find(x) follows parents to the root; union links one root under the other. Two nodes are connected exactly when they share a root.'))
  for (const [a, b] of pairs) {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) {
      f.push(frame([a, b], `union(${a}, ${b}): both already have root ${ra}. Nothing to do; this edge would close a cycle.`))
      continue
    }
    parent[ra] = rb
    joined.push({ a: String(a), b: String(b) })
    components--
    f.push(frame([a, b], `union(${a}, ${b}): roots ${ra} and ${rb} differ. Point ${ra} at ${rb}; components drop to ${components}.`))
  }
  f.push(frame(null, `${components} components. With path compression and union by rank, each operation is nearly O(1) (inverse Ackermann).`))
  return { title: `n = ${n}, edges ${pairs.map(([a, b]) => `${a}-${b}`).join(', ')}`, frames: f }
}

/** Dijkstra: always settle the closest unsettled node. */
export function dijkstra(): Viz {
  const pos: Record<string, [number, number]> = { A: [10, 25], B: [38, 8], C: [38, 42], D: [66, 25], E: [92, 25] }
  const w: [string, string, number][] = [['A', 'B', 4], ['A', 'C', 1], ['C', 'B', 2], ['B', 'D', 1], ['C', 'D', 5], ['D', 'E', 3]]
  const ids = Object.keys(pos)
  const nodes: GraphNode[] = ids.map((id) => ({ id, label: id, x: pos[id]![0], y: pos[id]![1] }))
  const edges: GraphEdge[] = w.map(([a, b, d]) => ({ a, b, label: String(d) }))
  const dist = new Map(ids.map((id) => [id, Infinity]))
  dist.set('A', 0)
  const settled = new Set<string>()
  const f: Frame[] = []
  const fmt = (x: number) => (x === Infinity ? '∞' : String(x))
  const frame = (hot: string | null, relaxed: Set<string>, caption: string) =>
    N({ nodes: paint(nodes, (id) => (id === hot ? 'active' : settled.has(id) ? 'done' : relaxed.has(id) ? 'match' : undefined), (id) => fmt(dist.get(id)!)), edges: paintEdges(edges, (e) => (hot && (e.a === hot || e.b === hot) ? 'active' : undefined)), height: 50, table: kv('distance so far', [...dist].map(([k, v]) => [k, fmt(v)])), caption })
  f.push(frame(null, new Set(), 'Distances start at ∞ except the source. Repeatedly take the unsettled node with the smallest distance (a min-heap), settle it, and relax its edges: if going through it is shorter, update the neighbour.'))
  while (settled.size < ids.length) {
    let u: string | null = null
    for (const id of ids) if (!settled.has(id) && (u === null || dist.get(id)! < dist.get(u)!)) u = id
    if (u === null || dist.get(u) === Infinity) break
    settled.add(u)
    const relaxed = new Set<string>()
    const notes: string[] = []
    for (const [a, b, d] of w) {
      const v = a === u ? b : b === u ? a : null
      if (!v || settled.has(v)) continue
      const nd = dist.get(u)! + d
      if (nd < dist.get(v)!) {
        notes.push(`${v}: ${fmt(dist.get(v)!)} → ${nd}`)
        dist.set(v, nd)
        relaxed.add(v)
      }
    }
    f.push(frame(u, relaxed, `Settle ${u} at distance ${dist.get(u)}: nothing can reach it more cheaply. ${notes.length ? `Relax: ${notes.join(', ')}.` : 'No neighbour improves.'}`))
  }
  f.push(frame(null, new Set(), `Shortest distances from A: ${[...dist].map(([k, v]) => `${k}=${v}`).join(', ')}. O((V + E) log V) with a heap. Needs non-negative weights.`))
  return { title: 'weighted graph from A', frames: f }
}

interface TrieNode {
  ch: string
  end: boolean
  kids: Map<string, TrieNode>
}

/** Trie: insert words character by character, then search a prefix. */
export function trie(): Viz {
  const words = ['car', 'cat', 'do']
  const root: TrieNode = { ch: '', end: false, kids: new Map() }
  const f: Frame[] = []
  let counter = 0
  const idOf = new Map<TrieNode, string>([[root, 'root']])
  const layout = () => {
    const { nodes, edges, height } = treeLayout(root, (n) => [...n.kids.values()], (n) => idOf.get(n)!, (n) => (n === root ? '·' : n.end ? `${n.ch}•` : n.ch), 14)
    return { nodes, edges, height }
  }
  f.push(N({ ...layout(), caption: 'Each node is one character; a path from the root spells a prefix. A flag (•) marks where a word ends. Shared prefixes share nodes.' }))
  for (const word of words) {
    let cur = root
    const path = [idOf.get(root)!]
    for (const ch of word) {
      let next = cur.kids.get(ch)
      const created = !next
      if (!next) {
        next = { ch, end: false, kids: new Map() }
        cur.kids.set(ch, next)
        idOf.set(next, `n${counter++}`)
      }
      cur = next
      path.push(idOf.get(cur)!)
      const l = layout()
      f.push(N({ nodes: paint(l.nodes, (id) => (id === idOf.get(cur) ? (created ? 'match' : 'active') : path.includes(id) ? 'window' : undefined)), edges: l.edges, height: l.height, vars: { inserting: word }, caption: `'${ch}': ${created ? 'no child yet, create one.' : 'already a child, walk into it.'}` }))
    }
    cur.end = true
    const l = layout()
    f.push(N({ nodes: paint(l.nodes, (id) => (path.includes(id) ? 'done' : undefined)), edges: l.edges, height: l.height, caption: `Mark the end of "${word}".` }))
  }
  const prefix = 'ca'
  let cur: TrieNode | undefined = root
  const path = ['root']
  for (const ch of prefix) {
    cur = cur?.kids.get(ch)
    if (cur) path.push(idOf.get(cur)!)
  }
  const l = layout()
  f.push(N({ nodes: paint(l.nodes, (id) => (path.includes(id) ? 'match' : undefined)), edges: l.edges, height: l.height, vars: { startsWith: prefix }, caption: `startsWith("${prefix}"): follow c then a; both exist, so true. Searching costs O(length of the query), independent of how many words are stored.` }))
  return { title: `insert ${words.map((w) => `"${w}"`).join(', ')}`, frames: f }
}

interface BtNode {
  id: string
  label: string
  kids: BtNode[]
}

/** Subsets by include/exclude recursion, drawn as the recursion tree. */
export function backtrackingTree(): Viz {
  const nums = [1, 2, 3]
  let counter = 0
  const root: BtNode = { id: 'r', label: '[]', kids: [] }
  const results: string[] = []
  const f: Frame[] = []
  const build = (node: BtNode, i: number, chosen: number[]): void => {
    if (i === nums.length) return
    const inc: BtNode = { id: `n${counter++}`, label: `[${[...chosen, nums[i]!].join(',')}]`, kids: [] }
    const exc: BtNode = { id: `n${counter++}`, label: `[${chosen.join(',')}]`, kids: [] }
    node.kids.push(inc, exc)
    build(inc, i + 1, [...chosen, nums[i]!])
    build(exc, i + 1, chosen)
  }
  build(root, 0, [])
  const { nodes, edges, height } = treeLayout(root, (n) => n.kids, (n) => n.id, (n) => n.label, 15)
  const visited = new Set<string>()
  const pathIds: string[] = []
  f.push(N({ nodes, edges, height, caption: 'At each index decide: include it or not. Two branches per element, so 2ⁿ leaves, each one a subset. Choose, recurse, un-choose (backtrack) so the other branch starts from the same state.' }))
  const walk = (node: BtNode, i: number, chosen: number[]): void => {
    pathIds.push(node.id)
    visited.add(node.id)
    if (i === nums.length) {
      results.push(`[${chosen.join(',')}]`)
      f.push(N({ nodes: paint(nodes, (id) => (id === node.id ? 'match' : pathIds.includes(id) ? 'window' : visited.has(id) ? 'done' : 'dim')), edges: paintEdges(edges, (e) => (pathIds.includes(e.a) && pathIds.includes(e.b) ? 'active' : undefined)), height, aux: [list('subsets', results)], vars: { chosen: `[${chosen.join(', ')}]` }, caption: `Index ${i} = end: record [${chosen.join(', ')}].` }))
      pathIds.pop()
      return
    }
    f.push(N({ nodes: paint(nodes, (id) => (id === node.id ? 'active' : pathIds.includes(id) ? 'window' : visited.has(id) ? 'done' : 'dim')), edges: paintEdges(edges, (e) => (pathIds.includes(e.a) && pathIds.includes(e.b) ? 'active' : undefined)), height, aux: [list('subsets', results)], vars: { chosen: `[${chosen.join(', ')}]`, deciding: nums[i]! }, caption: `At index ${i} with [${chosen.join(', ')}]: first include ${nums[i]}, later exclude it.` }))
    walk(node.kids[0]!, i + 1, [...chosen, nums[i]!])
    walk(node.kids[1]!, i + 1, chosen)
    pathIds.pop()
  }
  walk(root, 0, [])
  f.push(N({ nodes: paint(nodes, () => 'done'), edges, height, aux: [list('subsets', results, () => 'done')], caption: `${results.length} subsets = 2^${nums.length}. Output size is the lower bound, so O(n · 2ⁿ).` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Permutations with a used set, drawn as the recursion tree. */
export function usedSetPermutations(): Viz {
  const nums = [1, 2, 3]
  let counter = 0
  const root: BtNode = { id: 'r', label: '[]', kids: [] }
  const build = (node: BtNode, chosen: number[]): void => {
    for (const x of nums) {
      if (chosen.includes(x)) continue
      const kid: BtNode = { id: `n${counter++}`, label: `${[...chosen, x].join('')}`, kids: [] }
      node.kids.push(kid)
      build(kid, [...chosen, x])
    }
  }
  build(root, [])
  const { nodes, edges, height } = treeLayout(root, (n) => n.kids, (n) => n.id, (n) => n.label, 15)
  const results: string[] = []
  const pathIds: string[] = []
  const visited = new Set<string>()
  const f: Frame[] = []
  f.push(N({ nodes, edges, height, caption: 'Build the permutation one slot at a time. At each slot try every number not already used (a used set makes that O(1)). Mark it, recurse, unmark it.' }))
  const walk = (node: BtNode, chosen: number[]): void => {
    pathIds.push(node.id)
    visited.add(node.id)
    const used = new Set(chosen)
    if (chosen.length === nums.length) {
      results.push(chosen.join(''))
      f.push(N({ nodes: paint(nodes, (id) => (id === node.id ? 'match' : pathIds.includes(id) ? 'window' : visited.has(id) ? 'done' : 'dim')), edges: paintEdges(edges, (e) => (pathIds.includes(e.a) && pathIds.includes(e.b) ? 'active' : undefined)), height, aux: [list('used', [...used]), list('permutations', results)], caption: `All slots filled: record ${chosen.join('')}.` }))
      pathIds.pop()
      return
    }
    f.push(N({ nodes: paint(nodes, (id) => (id === node.id ? 'active' : pathIds.includes(id) ? 'window' : visited.has(id) ? 'done' : 'dim')), edges: paintEdges(edges, (e) => (pathIds.includes(e.a) && pathIds.includes(e.b) ? 'active' : undefined)), height, aux: [list('used', [...used]), list('permutations', results)], caption: `Slot ${chosen.length}: try each unused number, ${nums.filter((x) => !used.has(x)).join(', ')}.` }))
    let k = 0
    for (const x of nums) {
      if (used.has(x)) continue
      walk(node.kids[k++]!, [...chosen, x])
    }
    pathIds.pop()
  }
  walk(root, [])
  f.push(N({ nodes: paint(nodes, () => 'done'), edges, height, aux: [list('permutations', results, () => 'done')], caption: `${results.length} permutations = ${nums.length}!. O(n · n!).` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}
