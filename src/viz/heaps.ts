import { A, cellsOf, kv, list } from './frames.ts'
import type { Frame, Viz } from './frames.ts'

/** A tiny binary heap, enough to show the idea; `cmp(a, b) < 0` means a is closer to the top. */
class Heap<T> {
  readonly a: T[] = []
  private readonly cmp: (a: T, b: T) => number
  constructor(cmp: (a: T, b: T) => number) {
    this.cmp = cmp
  }
  get size(): number {
    return this.a.length
  }
  peek(): T | undefined {
    return this.a[0]
  }
  push(x: T): void {
    this.a.push(x)
    let i = this.a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.cmp(this.a[i]!, this.a[p]!) >= 0) break
      ;[this.a[i], this.a[p]] = [this.a[p]!, this.a[i]!]
      i = p
    }
  }
  pop(): T | undefined {
    if (this.a.length === 0) return undefined
    const top = this.a[0]!
    const last = this.a.pop()!
    if (this.a.length) {
      this.a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.a.length && this.cmp(this.a[l]!, this.a[m]!) < 0) m = l
        if (r < this.a.length && this.cmp(this.a[r]!, this.a[m]!) < 0) m = r
        if (m === i) break
        ;[this.a[i], this.a[m]] = [this.a[m]!, this.a[i]!]
        i = m
      }
    }
    return top
  }
}

const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`

/** Kth largest with a min-heap that never grows past k. */
export function boundedHeap(): Viz {
  const nums = [3, 2, 1, 5, 6, 4]
  const k = 2
  const heap = new Heap<number>((a, b) => a - b)
  const f: Frame[] = []
  const hl = (hot?: 'active' | 'bad') => list(`min-heap of size ≤ ${k} (top first)`, heap.a, (j) => (hot && j === 0 ? hot : undefined), 'the top is the smallest of the k largest seen')
  f.push(A({ cells: cellsOf(nums), aux: [hl()], vars: { k }, caption: `Keep the ${k} largest seen so far in a min-heap. Its top is the smallest of them, which is exactly the ${ordinal(k)} largest. Push each number; if the heap exceeds ${k}, pop the top.` }))
  for (let i = 0; i < nums.length; i++) {
    heap.push(nums[i]!)
    f.push(A({ cells: cellsOf(nums, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [hl('active')], caption: `Push ${nums[i]}.${heap.size > k ? ` Size ${heap.size} > ${k}: pop the top.` : ''}` }))
    if (heap.size > k) {
      const gone = heap.pop()
      f.push(A({ cells: cellsOf(nums, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [hl()], caption: `Popped ${gone}: it cannot be among the ${k} largest any more.` }))
    }
  }
  f.push(A({ cells: cellsOf(nums, () => 'dim'), aux: [hl('active')], vars: { [`${k}th largest`]: heap.peek()! }, caption: `Top of the heap: ${heap.peek()}. O(n log k) time, O(k) space; better than sorting when k ≪ n.` }))
  return { title: `nums = [${nums.join(', ')}], k = ${k}`, frames: f }
}

/** Running median with two heaps. */
export function twoHeaps(): Viz {
  const stream = [5, 15, 1, 3, 8]
  const low = new Heap<number>((a, b) => b - a)
  const high = new Heap<number>((a, b) => a - b)
  const f: Frame[] = []
  const aux = () => [list('low: max-heap (top first)', low.a, (j) => (j === 0 ? 'match' : undefined)), list('high: min-heap (top first)', high.a, (j) => (j === 0 ? 'match' : undefined))]
  const median = () => (low.size > high.size ? low.peek()! : (low.peek()! + high.peek()!) / 2)
  f.push(A({ cells: cellsOf(stream), aux: aux(), caption: 'Split the numbers into a lower half (max-heap, so its top is the biggest low value) and an upper half (min-heap). Keep the sizes within one of each other; the median is at the tops.' }))
  for (let i = 0; i < stream.length; i++) {
    const x = stream[i]!
    low.push(x)
    high.push(low.pop()!)
    let note = `Push ${x} into low, then move low's top to high so every low ≤ every high.`
    if (high.size > low.size) {
      low.push(high.pop()!)
      note += ' high got bigger than low: move high’s top back.'
    }
    f.push(A({ cells: cellsOf(stream, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: aux(), vars: { median: median() }, caption: `${note} Median = ${median()}.` }))
  }
  f.push(A({ cells: cellsOf(stream, () => 'dim'), aux: aux(), vars: { median: median() }, caption: 'Each insert is O(log n); the median is O(1) at any moment.' }))
  return { title: `stream = ${stream.join(', ')}`, frames: f }
}

/** Merge k sorted lists with a heap of heads. */
export function kWayMerge(): Viz {
  const lists = [[1, 4, 7], [2, 5], [3, 6, 8]]
  const idx = lists.map(() => 0)
  const heap = new Heap<[number, number]>((a, b) => a[0] - b[0])
  const out: number[] = []
  const f: Frame[] = []
  lists.forEach((l, i) => {
    if (l.length) heap.push([l[0]!, i])
  })
  const aux = () => [...lists.map((l, i) => list(`list ${i}`, l, (j) => (j === idx[i] ? 'active' : j < idx[i]! ? 'dim' : undefined))), list('heap of heads: value (list)', heap.a.map(([v, i]) => `${v} (${i})`), (j) => (j === 0 ? 'match' : undefined))]
  f.push(A({ cells: cellsOf(out), aux: aux(), caption: 'Put each list’s head in a min-heap. Pop the smallest, append it, and push the next element from the same list. The heap never holds more than k items.' }))
  while (heap.size) {
    const [v, i] = heap.pop()!
    out.push(v)
    idx[i]!++
    const nxt = lists[i]![idx[i]!]
    if (nxt !== undefined) heap.push([nxt, i])
    f.push(A({ cells: cellsOf(out, (j) => (j === out.length - 1 ? 'done' : undefined)), aux: aux(), caption: `Pop ${v} from list ${i} and append it. ${nxt !== undefined ? `Push list ${i}'s next head, ${nxt}.` : `List ${i} is exhausted.`}` }))
  }
  f.push(A({ cells: cellsOf(out, () => 'done'), aux: aux(), caption: `Merged ${out.length} values in O(N log k) for N values across k lists.` }))
  return { title: `lists = ${lists.map((l) => `[${l.join(',')}]`).join(', ')}`, frames: f }
}

/** Top-k frequent with a count map and buckets by frequency. */
export function bucketTopK(): Viz {
  const nums = [1, 1, 1, 2, 2, 3, 4, 4]
  const k = 2
  const counts = new Map<number, number>()
  for (const x of nums) counts.set(x, (counts.get(x) ?? 0) + 1)
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => [])
  const f: Frame[] = []
  const bl = (hot?: number) => list('buckets: index = frequency', buckets.map((b, i) => (i === 0 ? '—' : b.length ? b.join(',') : '')), (i) => (i === hot ? 'match' : undefined))
  f.push(A({ cells: cellsOf(nums), table: kv('counts', counts), aux: [bl()], vars: { k }, caption: 'Count each value. A value can appear at most n times, so an array of n + 1 buckets indexed by count sorts the values by frequency with no heap and no log factor.' }))
  for (const [v, c] of counts) {
    buckets[c]!.push(v)
    f.push(A({ cells: cellsOf(nums, (j) => (nums[j] === v ? 'active' : undefined)), table: kv('counts', counts), aux: [bl(c)], caption: `${v} appears ${c} time${c === 1 ? '' : 's'}: drop it into bucket ${c}.` }))
  }
  const out: number[] = []
  for (let c = buckets.length - 1; c >= 0 && out.length < k; c--) {
    for (const v of buckets[c]!) {
      if (out.length < k) out.push(v)
    }
    if (buckets[c]!.length) f.push(A({ cells: cellsOf(nums, (j) => (out.includes(nums[j]!) ? 'done' : undefined)), aux: [bl(c), list('top k', out)], caption: `Walk buckets from the highest frequency down: bucket ${c} gives ${buckets[c]!.join(', ')}.` }))
  }
  f.push(A({ cells: cellsOf(nums, (j) => (out.includes(nums[j]!) ? 'done' : 'dim')), aux: [list('top k', out, () => 'done')], caption: `Top ${k}: [${out.join(', ')}]. O(n) time overall; a heap would be O(n log k).` }))
  return { title: `nums = [${nums.join(', ')}], k = ${k}`, frames: f }
}
