import { A, N, cellsOf, list } from './frames.ts'
import type { Frame, GraphEdge, GraphNode, Tone, Viz } from './frames.ts'

const row = (vals: (string | number)[], y = 14, x0 = 8, gap = 15): GraphNode[] => vals.map((v, i) => ({ id: String(i), label: String(v), x: x0 + i * gap, y }))
const chain = (n: number, from = 0): GraphEdge[] => Array.from({ length: n - 1 - from }, (_, i) => ({ a: String(from + i), b: String(from + i + 1), directed: true }))
const paint = (nodes: GraphNode[], tone: (i: number) => Tone | undefined, tag?: (i: number) => string | undefined): GraphNode[] => nodes.map((n, i) => ({ ...n, tone: tone(i), tag: tag?.(i) }))

/** Floyd's tortoise and hare on a linked list with a cycle. */
export function fastSlow(): Viz {
  const vals = [1, 2, 3, 4, 5, 6]
  const cycleTo = 2
  const nodes = row(vals)
  const edges: GraphEdge[] = [...chain(vals.length), { a: String(vals.length - 1), b: String(cycleTo), directed: true, curve: true }]
  const next = (i: number): number => (i === vals.length - 1 ? cycleTo : i + 1)
  let slow = 0
  let fast = 0
  const f: Frame[] = []
  const frame = (caption: string, tone?: Tone) => N({ nodes: paint(nodes, (i) => (i === slow && i === fast ? (tone ?? 'match') : i === slow ? 'active' : i === fast ? 'window' : undefined), (i) => (i === slow && i === fast ? 'slow, fast' : i === slow ? 'slow' : i === fast ? 'fast' : undefined)), edges, height: 30, vars: { slow: vals[slow]!, fast: vals[fast]! }, caption })
  f.push(frame('Two pointers walk the list: slow moves one node per step, fast moves two. On a straight list fast hits the end. In a cycle fast laps slow, and they land on the same node: that proves a cycle without storing anything.'))
  for (let step = 1; step < 20; step++) {
    slow = next(slow)
    fast = next(next(fast))
    if (slow === fast) {
      f.push(frame(`Step ${step}: slow and fast meet at node ${vals[slow]}. Cycle detected, with O(1) extra space.`, 'done'))
      return { title: `1 → 2 → 3 → 4 → 5 → 6 → back to ${vals[cycleTo]}`, frames: f }
    }
    f.push(frame(`Step ${step}: slow → ${vals[slow]}, fast → ${vals[fast]}. The gap between them shrinks by one each step inside the cycle.`))
  }
  return { title: 'linked list with a cycle', frames: f }
}

/** Reverse a linked list iteratively with prev / cur / next. */
export function pointerReversal(): Viz {
  const vals = [1, 2, 3, 4]
  const nodes = row(vals)
  const nextOf: (number | null)[] = vals.map((_, i) => (i + 1 < vals.length ? i + 1 : null))
  let prev: number | null = null
  let cur: number | null = 0
  const f: Frame[] = []
  const edges = (): GraphEdge[] => nextOf.flatMap((n, i) => (n === null ? [] : [{ a: String(i), b: String(n), directed: true, curve: n < i }]))
  const frame = (caption: string, nxt: number | null = null) =>
    N({ nodes: paint(nodes, (i) => (i === cur ? 'active' : i === prev ? 'match' : i === nxt ? 'window' : undefined), (i) => [i === prev ? 'prev' : '', i === cur ? 'cur' : '', i === nxt ? 'next' : ''].filter(Boolean).join(', ') || undefined), edges: edges(), height: 30, caption })
  f.push(frame('Three pointers. Each step: remember cur.next, point cur.next back at prev, then slide prev and cur one node forward. The reversed part grows behind prev.'))
  while (cur !== null) {
    const nxt: number | null = nextOf[cur]!
    f.push(frame(`Save next = ${nxt === null ? 'null' : vals[nxt]} before touching the link.`, nxt))
    nextOf[cur] = prev
    f.push(frame(`Flip: ${vals[cur]}.next now points ${prev === null ? 'to null (it becomes the tail)' : `back at ${vals[prev]}`}.`, nxt))
    prev = cur
    cur = nxt
  }
  f.push(N({ nodes: paint(nodes, () => 'done', (i) => (i === prev ? 'head' : undefined)), edges: edges(), height: 30, caption: `cur is null: done. prev (${vals[prev!]}) is the new head. O(n) time, O(1) space.` }))
  return { title: `1 → 2 → 3 → 4`, frames: f }
}

/** Merge two sorted lists through a dummy head. */
export function dummyHeadMerge(): Viz {
  const a = [1, 3, 5]
  const b = [2, 4]
  const out: number[] = []
  let i = 0
  let j = 0
  const f: Frame[] = []
  const state = (caption: string, took?: 'a' | 'b') =>
    A({ cells: cellsOf(['dummy', ...out], (x) => (x === 0 ? 'dim' : x === out.length && took ? 'done' : 'window')), aux: [list('a', a, (x) => (x === i ? 'active' : x < i ? 'dim' : undefined)), list('b', b, (x) => (x === j ? 'active' : x < j ? 'dim' : undefined))], caption })
  f.push(state('A dummy node in front of the result means there is always a "tail" to append to, even before the first real node. Compare the two heads, link the smaller one behind the tail, advance that list.'))
  while (i < a.length && j < b.length) {
    const takeA = a[i]! <= b[j]!
    out.push(takeA ? a[i]! : b[j]!)
    f.push(state(`${a[i]} vs ${b[j]}: append ${takeA ? a[i] : b[j]} from ${takeA ? 'a' : 'b'}, move tail forward.`, takeA ? 'a' : 'b'))
    if (takeA) i++
    else j++
  }
  const rest = i < a.length ? a.slice(i) : b.slice(j)
  out.push(...rest)
  f.push(state(`One list is exhausted: link the rest of the other (${rest.join(' → ')}) in one go. Return dummy.next.`, 'a'))
  return { title: `a = ${a.join(' → ')}, b = ${b.join(' → ')}`, frames: f }
}

/** Remove the nth node from the end with two pointers kept n apart. */
export function gapPointers(): Viz {
  const vals = [1, 2, 3, 4, 5]
  const n = 2
  const nodes = row(['dummy', ...vals], 14, 6, 15)
  const len = vals.length + 1
  let lead = 0
  let trail = 0
  const f: Frame[] = []
  const frame = (caption: string, removed = false) =>
    N({ nodes: paint(nodes, (i) => (removed && i === trail + 1 ? 'bad' : i === lead ? 'window' : i === trail ? 'active' : undefined), (i) => (i === lead && i === trail ? 'both' : i === lead ? 'lead' : i === trail ? 'trail' : undefined)), edges: removed ? [...chain(trail + 1), { a: String(trail), b: String(trail + 2), directed: true, curve: true }, ...chain(len, trail + 2)] : chain(len), height: 30, vars: { n }, caption })
  f.push(frame(`Start both at a dummy before the head. Move lead ${n} + 1 steps ahead, then advance both together: when lead falls off the end, trail sits just before the node to remove.`))
  for (let k = 0; k <= n; k++) {
    lead++
    f.push(frame(`Lead moves ahead: ${k + 1} of ${n + 1} steps.`))
  }
  while (lead < len - 1) {
    lead++
    trail++
    f.push(frame(`Both advance; the gap stays ${n + 1}.`))
  }
  f.push(frame(`Lead is at the last node, so trail.next (${vals[trail]}) is the ${n}th from the end. Unlink it: trail.next = trail.next.next. One pass, O(1) space.`, true))
  return { title: `1 → 2 → 3 → 4 → 5, n = ${n}`, frames: f }
}

/** Ring buffer with head and tail indices. */
export function ringBuffer(): Viz {
  const cap = 4
  const buf: (string | number)[] = new Array(cap).fill('')
  let head = 0
  let tail = 0
  let size = 0
  const ops: (['push', number] | ['shift'])[] = [['push', 7], ['push', 8], ['push', 9], ['shift'], ['push', 10], ['push', 11], ['shift'], ['shift']]
  const f: Frame[] = []
  const frame = (caption: string, hot?: number, tone: Tone = 'active') =>
    A({ cells: cellsOf(buf, (i) => (i === hot ? tone : buf[i] !== '' ? 'window' : undefined)), marks: [{ i: head, label: 'head' }, { i: tail, label: 'tail', tone: 'match' }], vars: { size, capacity: cap }, caption })
  f.push(frame('A fixed array used as a loop. head is where the oldest item is; tail is where the next item goes. Both advance with (i + 1) % capacity, wrapping to the start. size tells full from empty.'))
  for (const op of ops) {
    if (op[0] === 'push') {
      if (size === cap) {
        f.push(frame(`push ${op[1]}: full, refuse (or overwrite the oldest, by policy).`))
        continue
      }
      buf[tail] = op[1]
      const at = tail
      tail = (tail + 1) % cap
      size++
      f.push(frame(`push ${op[1]} at slot ${at}; tail becomes (${at} + 1) % ${cap} = ${tail}.`, at, 'done'))
    } else {
      if (size === 0) {
        f.push(frame('shift: empty, nothing to return.'))
        continue
      }
      const v = buf[head]
      const at = head
      buf[head] = ''
      head = (head + 1) % cap
      size--
      f.push(frame(`shift returns ${v} from slot ${at}; head becomes ${head}.${head < at ? ' It wrapped around.' : ''}`, at, 'bad'))
    }
  }
  f.push(frame('Every operation is O(1) and the memory never grows or moves.'))
  return { title: `capacity ${cap}: ${ops.map((o) => (o[0] === 'push' ? `push ${o[1]}` : 'shift')).join(', ')}`, frames: f }
}

/** LRU cache using a Map's insertion order as the recency list. */
export function lruMapOrder(): Viz {
  const cap = 2
  const map = new Map<string, number>()
  const ops: (['put', string, number] | ['get', string])[] = [['put', 'a', 1], ['put', 'b', 2], ['get', 'a'], ['put', 'c', 3], ['get', 'b'], ['put', 'a', 9]]
  const f: Frame[] = []
  const frame = (caption: string, hot?: string, tone: Tone = 'active') =>
    A({ cells: cellsOf([...map].map(([k, v]) => `${k}:${v}`), (i) => ([...map.keys()][i] === hot ? tone : i === 0 ? 'dim' : undefined)), marks: map.size ? [{ i: 0, label: 'oldest' }, { i: map.size - 1, label: 'newest', tone: 'match' }] : [], vars: { capacity: cap }, caption })
  f.push(frame('A JavaScript Map remembers insertion order. Deleting and re-inserting a key moves it to the end, so the first key is always the least recently used.'))
  for (const op of ops) {
    if (op[0] === 'get') {
      const v = map.get(op[1])
      if (v === undefined) {
        f.push(frame(`get ${op[1]}: miss, return −1.`))
        continue
      }
      map.delete(op[1])
      map.set(op[1], v)
      f.push(frame(`get ${op[1]} = ${v}: delete and re-insert so it becomes the newest.`, op[1], 'match'))
    } else {
      const [, k, v] = op
      if (map.has(k)) map.delete(k)
      else if (map.size === cap) {
        const oldest = map.keys().next().value as string
        map.delete(oldest)
        f.push(frame(`put ${k}: full, so evict the first key, ${oldest} (least recently used).`))
      }
      map.set(k, v)
      f.push(frame(`put ${k} = ${v} at the end.`, k, 'done'))
    }
  }
  f.push(frame('get and put are both O(1): one Map does the job of a hash map plus a doubly linked list.'))
  return { title: `capacity ${cap}: ${ops.map((o) => (o[0] === 'put' ? `put(${o[1]},${o[2]})` : `get(${o[1]})`)).join(', ')}`, frames: f }
}
