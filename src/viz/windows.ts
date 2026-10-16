import { A, cellsOf, kv, list } from './frames.ts'
import type { Frame, Viz } from './frames.ts'

/** Max sum of any k consecutive elements. */
export function fixedWindow(): Viz {
  const nums = [2, 1, 5, 1, 3, 2]
  const k = 3
  let sum = 0
  let best = -Infinity
  let bestAt = 0
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), vars: { k }, caption: `Window of exactly ${k}. Instead of re-adding ${k} numbers each time, add the one entering and subtract the one leaving: O(1) per step.` }))
  for (let i = 0; i < nums.length; i++) {
    sum += nums[i]!
    const lo = i - k + 1
    let note = `Add nums[${i}] = ${nums[i]}.`
    if (lo > 0) {
      sum -= nums[lo - 1]!
      note += ` Remove nums[${lo - 1}] = ${nums[lo - 1]}.`
    }
    if (i >= k - 1) {
      const better = sum > best
      if (better) {
        best = sum
        bestAt = lo
      }
      note += ` Window [${lo}, ${i}] sums to ${sum}.${better ? ' New best.' : ''}`
    } else note += ' Window not full yet.'
    f.push(A({ cells: cellsOf(nums, (j) => (j === i ? 'active' : j >= Math.max(lo, 0) && j < i ? 'window' : lo > 0 && j === lo - 1 ? 'bad' : undefined)), marks: [{ i, label: 'i' }], range: [Math.max(lo, 0), i], vars: { sum, best: best === -Infinity ? '—' : best }, caption: note }))
  }
  f.push(A({ cells: cellsOf(nums, (j) => (j >= bestAt && j < bestAt + k ? 'done' : 'dim')), range: [bestAt, bestAt + k - 1], vars: { best }, caption: `Best window starts at ${bestAt} with sum ${best}. One pass, O(n).` }))
  return { title: `nums = [${nums.join(', ')}], k = ${k}`, frames: f }
}

/** Longest substring without repeating characters. */
export function variableWindowLongest(): Viz {
  const s = 'abcabcbb'
  const chars = [...s]
  const lastAt = new Map<string, number>()
  let l = 0
  let best = 0
  let bestRange: [number, number] = [0, 0]
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(chars), caption: 'Grow the right end one step at a time. When the window becomes invalid (a repeat), move the left end just past the earlier copy. Every character enters and leaves once.' }))
  for (let r = 0; r < s.length; r++) {
    const c = s[r]!
    const prev = lastAt.get(c)
    if (prev !== undefined && prev >= l) {
      f.push(A({ cells: cellsOf(chars, (j) => (j === r ? 'bad' : j === prev ? 'bad' : j >= l && j < r ? 'window' : j < l ? 'dim' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], range: [l, r], table: kv('last seen', lastAt), caption: `'${c}' already sits in the window at ${prev}. Jump l to ${prev + 1}: anything shorter still contains the repeat.` }))
      l = prev + 1
    }
    lastAt.set(c, r)
    const len = r - l + 1
    const better = len > best
    if (better) {
      best = len
      bestRange = [l, r]
    }
    f.push(A({ cells: cellsOf(chars, (j) => (j === r ? 'active' : j >= l && j < r ? 'window' : j < l ? 'dim' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], range: [l, r], table: kv('last seen', lastAt), vars: { length: len, best }, caption: `Window "${s.slice(l, r + 1)}" is valid, length ${len}.${better ? ' New best.' : ''}` }))
  }
  f.push(A({ cells: cellsOf(chars, (j) => (j >= bestRange[0] && j <= bestRange[1] ? 'done' : 'dim')), range: bestRange, vars: { best }, caption: `Longest: "${s.slice(bestRange[0], bestRange[1] + 1)}", length ${best}. O(n) time; the map holds at most the alphabet.` }))
  return { title: `s = "${s}"`, frames: f }
}

/** Minimum window substring with need/have counts and a "formed" counter. */
export function needHaveWindow(): Viz {
  const s = 'ADOBECODEBANC'
  const t = 'ABC'
  const chars = [...s]
  const need = new Map<string, number>()
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1)
  const have = new Map<string, number>()
  let formed = 0
  let l = 0
  let best: [number, number] | null = null
  const f: Frame[] = []
  const tables = () => [list('need', [...need].map(([k, v]) => `${k}:${v}`)), list('have', [...have].map(([k, v]) => `${k}:${v}`))]
  f.push(A({ cells: cellsOf(chars), aux: tables(), vars: { formed: `${formed}/${need.size}`, t }, caption: `need = counts of t. Grow r until every needed letter is covered ("formed" = ${need.size}); then shrink l as far as it stays covered, recording the best; then grow again.` }))
  for (let r = 0; r < s.length; r++) {
    const c = s[r]!
    if (need.has(c)) {
      have.set(c, (have.get(c) ?? 0) + 1)
      if (have.get(c) === need.get(c)) formed++
    }
    f.push(A({ cells: cellsOf(chars, (j) => (j === r ? 'active' : j >= l && j < r ? 'window' : j < l ? 'dim' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], range: [l, r], aux: tables(), vars: { formed: `${formed}/${need.size}` }, caption: `Take '${c}'.${need.has(c) ? ` have[${c}] = ${have.get(c)}.` : ' Not needed.'} ${formed === need.size ? 'Every letter is covered: shrink from the left.' : 'Not covered yet: keep growing.'}` }))
    while (formed === need.size) {
      if (!best || r - l < best[1] - best[0]) best = [l, r]
      const d = s[l]!
      f.push(A({ cells: cellsOf(chars, (j) => (j === l ? 'match' : j > l && j <= r ? 'window' : j < l ? 'dim' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], range: [l, r], aux: tables(), vars: { formed: `${formed}/${need.size}`, best: `"${s.slice(best[0], best[1] + 1)}"` }, caption: `"${s.slice(l, r + 1)}" covers t (length ${r - l + 1}). Drop '${d}' from the left and see whether it still does.` }))
      if (need.has(d)) {
        if (have.get(d) === need.get(d)) formed--
        have.set(d, have.get(d)! - 1)
      }
      l++
    }
  }
  f.push(A({ cells: cellsOf(chars, (j) => (best && j >= best[0] && j <= best[1] ? 'done' : 'dim')), range: best ?? undefined, vars: { answer: best ? `"${s.slice(best[0], best[1] + 1)}"` : '""' }, caption: `Smallest window: "${best ? s.slice(best[0], best[1] + 1) : ''}". l and r each move at most n times: O(n + m).` }))
  return { title: `s = "${s}", t = "${t}"`, frames: f }
}

/** Sliding window maximum with a monotonic deque of indices. */
export function monotonicDeque(): Viz {
  const nums = [1, 3, -1, -3, 5, 3, 6, 7]
  const k = 3
  const dq: number[] = []
  const out: number[] = []
  const f: Frame[] = []
  const dqList = (hot?: number, tone: 'active' | 'bad' | 'match' = 'active') => list('deque: index (value), front first', dq.map((i) => `${i} (${nums[i]})`), (j) => (dq[j] === hot ? tone : undefined), 'values decrease from front to back')
  const outList = () => list('window maxima', out)
  f.push(A({ cells: cellsOf(nums), aux: [dqList(), outList()], vars: { k }, caption: `Keep a deque of indices whose values are strictly decreasing from front to back. The front is always the current window's maximum. Three moves per step: evict the front if it left the window, pop smaller values off the back, push the new index.` }))
  for (let i = 0; i < nums.length; i++) {
    const lo = i - k + 1
    const band: [number, number] = [Math.max(lo, 0), i]
    if (dq.length && dq[0]! < lo) {
      const gone = dq.shift()!
      f.push(A({ cells: cellsOf(nums, (j) => (j === gone ? 'bad' : j === i ? 'active' : j >= lo && j < i ? 'window' : undefined)), marks: [{ i, label: 'i' }], range: band, aux: [dqList(), outList()], vars: { window: `[${lo}, ${i}]` }, caption: `Evict: index ${gone} is now left of the window [${lo}, ${i}], so it leaves the front.` }))
    }
    while (dq.length && nums[dq[dq.length - 1]!]! <= nums[i]!) {
      const p = dq[dq.length - 1]!
      f.push(A({ cells: cellsOf(nums, (j) => (j === p ? 'bad' : j === i ? 'active' : j >= lo && j < i ? 'window' : undefined)), marks: [{ i, label: 'i' }], range: band, aux: [dqList(p, 'bad'), outList()], caption: `Pop: ${nums[p]} (index ${p}) ≤ ${nums[i]}. While ${nums[i]} is in the window it is newer and at least as big, so ${nums[p]} can never be a maximum again.` }))
      dq.pop()
    }
    dq.push(i)
    const full = i >= k - 1
    if (full) out.push(nums[dq[0]!]!)
    f.push(A({ cells: cellsOf(nums, (j) => (j === dq[0] && full ? 'match' : j === i ? 'active' : j >= lo && j < i ? 'window' : undefined)), marks: [{ i, label: 'i' }], range: band, aux: [dqList(i), outList()], caption: `Push index ${i}.${full ? ` The window [${lo}, ${i}] is full: its max is the front, ${nums[dq[0]!]}.` : ' The window is not full yet.'}` }))
  }
  f.push(A({ cells: cellsOf(nums, () => 'done'), aux: [dqList(), list('window maxima', out, () => 'done')], caption: `Result [${out.join(', ')}]. Each index is pushed once and popped at most once, so the whole pass is O(n) with O(k) space, not O(n·k).` }))
  return { title: `nums = [${nums.join(', ')}], k = ${k}`, frames: f }
}

/** Max consecutive ones with up to k zeros flipped: a window with a budget. */
export function windowWithBudget(): Viz {
  const nums = [1, 1, 0, 0, 1, 1, 1, 0, 1, 1]
  const k = 2
  let l = 0
  let zeros = 0
  let best = 0
  let bestRange: [number, number] = [0, 0]
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), vars: { k }, caption: `The window may hold at most ${k} zeros. Grow r; whenever the zero count exceeds ${k}, move l right until it does not. The widest valid window is the answer.` }))
  for (let r = 0; r < nums.length; r++) {
    if (nums[r] === 0) zeros++
    while (zeros > k) {
      f.push(A({ cells: cellsOf(nums, (j) => (j === l ? 'bad' : j > l && j <= r ? 'window' : j < l ? 'dim' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], range: [l, r], vars: { zeros, k }, caption: `${zeros} zeros > ${k}: shrink. Drop nums[${l}] = ${nums[l]} from the left.` }))
      if (nums[l] === 0) zeros--
      l++
    }
    const len = r - l + 1
    const better = len > best
    if (better) {
      best = len
      bestRange = [l, r]
    }
    f.push(A({ cells: cellsOf(nums, (j) => (j === r ? 'active' : j >= l && j < r ? 'window' : j < l ? 'dim' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], range: [l, r], vars: { zeros, length: len, best }, caption: `Window [${l}, ${r}] has ${zeros} zero${zeros === 1 ? '' : 's'}: valid, length ${len}.${better ? ' New best.' : ''}` }))
  }
  f.push(A({ cells: cellsOf(nums, (j) => (j >= bestRange[0] && j <= bestRange[1] ? 'done' : 'dim')), range: bestRange, vars: { best }, caption: `Longest window ${best}, at [${bestRange[0]}, ${bestRange[1]}]. The window never needs to shrink below a previous best, so O(n).` }))
  return { title: `nums = [${nums.join(', ')}], k = ${k}`, frames: f }
}

/** Permutation in string: fixed window with count matching. */
export function fixedWindowCounts(): Viz {
  const s1 = 'ab'
  const s2 = 'eidbaooo'
  const chars = [...s2]
  const need = new Map<string, number>()
  for (const c of s1) need.set(c, (need.get(c) ?? 0) + 1)
  const have = new Map<string, number>()
  const k = s1.length
  const f: Frame[] = []
  const same = () => [...need].every(([c, n]) => have.get(c) === n) && [...have].every(([c, n]) => n === 0 || need.has(c))
  const tables = () => [list('need', [...need].map(([c, n]) => `${c}:${n}`)), list('have (window)', [...have].filter(([, n]) => n > 0).map(([c, n]) => `${c}:${n}`))]
  f.push(A({ cells: cellsOf(chars), aux: tables(), vars: { k }, caption: `A permutation of s1 is any window of length ${k} with the same letter counts. Slide a window of ${k}, updating the counts by the letter entering and the letter leaving.` }))
  for (let r = 0; r < s2.length; r++) {
    const c = s2[r]!
    have.set(c, (have.get(c) ?? 0) + 1)
    const lo = r - k + 1
    if (lo > 0) {
      const d = s2[lo - 1]!
      have.set(d, have.get(d)! - 1)
    }
    const match = lo >= 0 && same()
    f.push(A({ cells: cellsOf(chars, (j) => (match && j >= lo && j <= r ? 'match' : j === r ? 'active' : j >= Math.max(lo, 0) && j < r ? 'window' : lo > 0 && j === lo - 1 ? 'bad' : undefined)), marks: [{ i: r, label: 'r' }], range: [Math.max(lo, 0), r], aux: tables(), caption: `Add '${c}'${lo > 0 ? `, remove '${s2[lo - 1]}'` : ''}. ${lo < 0 ? 'Window not full yet.' : match ? `Counts match: "${s2.slice(lo, r + 1)}" is a permutation of "${s1}".` : 'Counts differ.'}` }))
    if (match) return { title: `s1 = "${s1}", s2 = "${s2}"`, frames: f }
  }
  f.push(A({ cells: cellsOf(chars, () => 'dim'), caption: 'No window matched.' }))
  return { title: `s1 = "${s1}", s2 = "${s2}"`, frames: f }
}
