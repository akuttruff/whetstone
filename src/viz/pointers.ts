import { A, cellsOf, list } from './frames.ts'
import type { Frame, Viz } from './frames.ts'

/** Two sum on a sorted array: pointers walk inwards. */
export function convergingPointers(): Viz {
  const nums = [1, 2, 4, 6, 8, 11]
  const target = 10
  let l = 0
  let r = nums.length - 1
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], vars: { target }, caption: 'Sorted input. Start at both ends. If the pair is too small, only moving the left pointer can make it bigger; too big, only the right can make it smaller. Neither move can skip the answer.' }))
  while (l < r) {
    const sum = nums[l]! + nums[r]!
    if (sum === target) {
      f.push(A({ cells: cellsOf(nums, (j) => (j === l || j === r ? 'match' : j < l || j > r ? 'dim' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], range: [l, r], vars: { sum }, caption: `${nums[l]} + ${nums[r]} = ${target}. Found: indices ${l} and ${r}. O(n) time after sorting, O(1) space.` }))
      return { title: `nums = [${nums.join(', ')}], target = ${target}`, frames: f }
    }
    const small = sum < target
    f.push(A({ cells: cellsOf(nums, (j) => (j === l || j === r ? 'active' : j < l || j > r ? 'dim' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], range: [l, r], vars: { sum }, caption: `${nums[l]} + ${nums[r]} = ${sum}, ${small ? `too small: move l right to get a bigger sum.` : `too big: move r left to get a smaller sum.`}` }))
    if (small) l++
    else r--
  }
  f.push(A({ cells: cellsOf(nums, () => 'dim'), caption: 'Pointers met: no pair.' }))
  return { title: `nums = [${nums.join(', ')}], target = ${target}`, frames: f }
}

/** Remove duplicates from a sorted array in place. */
export function readWritePointers(): Viz {
  const nums = [1, 1, 2, 2, 3, 4, 4]
  const a = [...nums]
  let w = 1
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(a), marks: [{ i: 0, label: 'w' }, { i: 1, label: 'r' }], caption: 'Read pointer r scans every element; write pointer w marks where the next kept element goes. Everything before w is the compacted result.' }))
  for (let r = 1; r < a.length; r++) {
    const keep = a[r] !== a[w - 1]
    if (keep) {
      a[w] = a[r]!
      f.push(A({ cells: cellsOf(a, (j) => (j === w ? 'done' : j === r ? 'active' : j < w ? 'window' : undefined)), marks: [{ i: w, label: 'w' }, { i: r, label: 'r' }], caption: `a[${r}] = ${a[r]} differs from the last kept value ${a[w - 1]}: write it at w = ${w}, then w++.` }))
      w++
    } else {
      f.push(A({ cells: cellsOf(a, (j) => (j === r ? 'bad' : j < w ? 'window' : undefined)), marks: [{ i: w, label: 'w' }, { i: r, label: 'r' }], caption: `a[${r}] = ${a[r]} equals the last kept value: skip it. w stays at ${w}.` }))
    }
  }
  f.push(A({ cells: cellsOf(a, (j) => (j < w ? 'done' : 'dim')), marks: [{ i: w, label: 'w' }], range: [0, w - 1], vars: { 'new length': w }, caption: `Return ${w}: the first ${w} slots hold [${a.slice(0, w).join(', ')}]. One pass, in place.` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Trapping rain water with two running maxima. */
export function twoMaxima(): Viz {
  const h = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
  let l = 0
  let r = h.length - 1
  let lmax = 0
  let rmax = 0
  let water = 0
  const f: Frame[] = []
  const filled = new Set<number>()
  f.push(A({ cells: cellsOf(h), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], caption: 'Water over a cell is min(tallest to its left, tallest to its right) − its height. Walk inwards from both ends; the side with the smaller max is the side whose water is already decided.' }))
  while (l < r) {
    if (h[l]! < h[r]!) {
      if (h[l]! >= lmax) {
        lmax = h[l]!
        f.push(A({ cells: cellsOf(h, (j) => (filled.has(j) ? 'window' : j === l ? 'match' : j === r ? 'active' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], vars: { lmax, rmax, water }, caption: `Left side is lower (${h[l]} < ${h[r]}). h[${l}] = ${h[l]} is a new left max: nothing collects here.` }))
      } else {
        water += lmax - h[l]!
        filled.add(l)
        f.push(A({ cells: cellsOf(h, (j) => (filled.has(j) ? 'window' : j === l ? 'done' : j === r ? 'active' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], vars: { lmax, rmax, water }, caption: `Left side is lower. The right max is at least ${h[r]} ≥ ${lmax}, so cell ${l} holds lmax − h = ${lmax} − ${h[l]} = ${lmax - h[l]!}.` }))
      }
      l++
    } else {
      if (h[r]! >= rmax) {
        rmax = h[r]!
        f.push(A({ cells: cellsOf(h, (j) => (filled.has(j) ? 'window' : j === r ? 'match' : j === l ? 'active' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], vars: { lmax, rmax, water }, caption: `Right side is lower or equal. h[${r}] = ${h[r]} is a new right max: nothing collects here.` }))
      } else {
        water += rmax - h[r]!
        filled.add(r)
        f.push(A({ cells: cellsOf(h, (j) => (filled.has(j) ? 'window' : j === r ? 'done' : j === l ? 'active' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], vars: { lmax, rmax, water }, caption: `Right side is lower or equal. Cell ${r} holds rmax − h = ${rmax} − ${h[r]} = ${rmax - h[r]!}.` }))
      }
      r--
    }
  }
  f.push(A({ cells: cellsOf(h, (j) => (filled.has(j) ? 'done' : 'dim')), vars: { water }, caption: `Total water ${water}. O(n) time, O(1) space.` }))
  return { title: `height = [${h.join(', ')}]`, frames: f }
}

/** Longest palindromic substring by expanding around each centre. */
export function expandAroundCentre(): Viz {
  const s = 'babad'
  const chars = [...s]
  let best: [number, number] = [0, 0]
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(chars), caption: 'Every palindrome has a centre: a character (odd length) or a gap between two (even length). Try each centre and grow outwards while the ends match.' }))
  const expand = (l: number, r: number, what: string): void => {
    const c = l === r ? `centre ${l}` : `gap ${l}|${r}`
    while (l >= 0 && r < s.length && s[l] === s[r]) {
      f.push(A({ cells: cellsOf(chars, (j) => (j >= l && j <= r ? 'match' : undefined)), marks: l === r ? [{ i: l, label: 'c' }] : [{ i: l, label: 'l' }, { i: r, label: 'r' }], range: [l, r], caption: `${what} ${c}: s[${l}] = s[${r}] = '${s[l]}', so "${s.slice(l, r + 1)}" is a palindrome. Grow.` }))
      if (r - l > best[1] - best[0]) best = [l, r]
      l--
      r++
    }
    if (l >= 0 && r < s.length) f.push(A({ cells: cellsOf(chars, (j) => (j === l || j === r ? 'bad' : j > l && j < r ? 'window' : undefined)), marks: [{ i: l, label: 'l' }, { i: r, label: 'r' }], caption: `'${s[l]}' ≠ '${s[r]}': stop growing from this ${l + 1 === r ? 'gap' : 'centre'}.` }))
  }
  for (let i = 0; i < s.length; i++) {
    expand(i, i, 'Odd,')
    if (i + 1 < s.length) expand(i, i + 1, 'Even,')
  }
  f.push(A({ cells: cellsOf(chars, (j) => (j >= best[0] && j <= best[1] ? 'done' : 'dim')), range: best, vars: { answer: s.slice(best[0], best[1] + 1) }, caption: `Longest: "${s.slice(best[0], best[1] + 1)}". 2n − 1 centres, each expansion O(n): O(n²) time, O(1) space.` }))
  return { title: `s = "${s}"`, frames: f }
}

/** Run-length encoding in place with read/write pointers. */
export function runLengthInPlace(): Viz {
  const chars = ['a', 'a', 'b', 'c', 'c', 'c']
  const a = [...chars]
  let w = 0
  let r = 0
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(a), marks: [{ i: 0, label: 'w' }, { i: 0, label: 'r' }], caption: 'r finds the end of each run; w writes the letter and, if the run is longer than 1, its length. w never overtakes r, so writing in place is safe.' }))
  while (r < a.length) {
    const c = a[r]!
    let end = r
    while (end < a.length && a[end] === c) end++
    const n = end - r
    f.push(A({ cells: cellsOf(a, (j) => (j >= r && j < end ? 'window' : j < w ? 'done' : undefined)), marks: [{ i: w, label: 'w' }, { i: r, label: 'r' }], range: [r, end - 1], caption: `Run of '${c}' from ${r}, length ${n}.` }))
    a[w++] = c
    if (n > 1) for (const d of String(n)) a[w++] = d
    f.push(A({ cells: cellsOf(a, (j) => (j < w ? 'done' : j < end ? 'dim' : undefined)), marks: [{ i: Math.min(w, a.length - 1), label: 'w' }, { i: Math.min(end, a.length - 1), label: 'r' }], caption: `Write '${c}'${n > 1 ? ` then '${n}'` : ' alone (a 1 is not written)'}. w = ${w}; r jumps to ${end}.` }))
    r = end
  }
  f.push(A({ cells: cellsOf(a, (j) => (j < w ? 'done' : 'dim')), range: [0, w - 1], vars: { 'new length': w }, caption: `The first ${w} slots read "${a.slice(0, w).join('')}". O(n) time, O(1) extra space.` }))
  return { title: `chars = [${chars.map((c) => `'${c}'`).join(', ')}]`, frames: f }
}

/** Merge two sorted sequences with a cursor on each. */
export function sortedMergeTwoPointers(): Viz {
  const a = [1, 4, 7]
  const b = [2, 3, 9, 10]
  const out: number[] = []
  let i = 0
  let j = 0
  const f: Frame[] = []
  const state = (ti?: number, tj?: number, caption = '') =>
    A({ cells: cellsOf(a, (x) => (x === i && ti !== undefined ? 'active' : x < i ? 'dim' : undefined)), marks: i < a.length ? [{ i, label: 'i' }] : [], aux: [list('b', b, (x) => (x === j && tj !== undefined ? 'active' : x < j ? 'dim' : undefined)), list('merged', out, (x) => (x === out.length - 1 ? 'done' : undefined))], caption })
  f.push(state(undefined, undefined, 'Two sorted sequences. Compare the heads, take the smaller, advance that cursor. The output is sorted because each taken value is ≤ every remaining one.'))
  while (i < a.length && j < b.length) {
    const takeA = a[i]! <= b[j]!
    const taken = takeA ? a[i]! : b[j]!
    f.push(state(takeA ? i : undefined, takeA ? undefined : j, `${a[i]} vs ${b[j]}: take ${taken} from ${takeA ? 'a' : 'b'}.`))
    out.push(taken)
    if (takeA) i++
    else j++
  }
  while (i < a.length) out.push(a[i++]!)
  while (j < b.length) out.push(b[j++]!)
  f.push(state(undefined, undefined, `One side ran out; append the rest of the other. Result [${out.join(', ')}] in O(n + m).`))
  return { title: `a = [${a.join(', ')}], b = [${b.join(', ')}]`, frames: f }
}
