import { A, cellsOf, list } from './frames.ts'
import type { Frame, Viz } from './frames.ts'

/** Exact-match binary search. */
export function binarySearch(): Viz {
  const nums = [1, 3, 5, 7, 9, 11, 13, 15]
  const target = 11
  let lo = 0
  let hi = nums.length - 1
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), marks: [{ i: lo, label: 'lo' }, { i: hi, label: 'hi' }], range: [lo, hi], vars: { target }, caption: 'Sorted input. Look at the middle: if it is too small the answer is to the right, too big it is to the left. Each step halves the range.' }))
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = nums[mid]!
    if (v === target) {
      f.push(A({ cells: cellsOf(nums, (j) => (j === mid ? 'match' : j < lo || j > hi ? 'dim' : 'window')), marks: [{ i: lo, label: 'lo' }, { i: mid, label: 'mid', tone: 'match' }, { i: hi, label: 'hi' }], range: [lo, hi], vars: { mid, 'nums[mid]': v }, caption: `nums[${mid}] = ${v} is the target. Found at ${mid} after ${f.length} probes: O(log n).` }))
      return { title: `nums = [${nums.join(', ')}], target = ${target}`, frames: f }
    }
    const small = v < target
    f.push(A({ cells: cellsOf(nums, (j) => (j === mid ? 'active' : j < lo || j > hi ? 'dim' : 'window')), marks: [{ i: lo, label: 'lo' }, { i: mid, label: 'mid' }, { i: hi, label: 'hi' }], range: [lo, hi], vars: { mid, 'nums[mid]': v }, caption: `nums[${mid}] = ${v} is ${small ? 'too small: the target can only be to the right, so lo = mid + 1' : 'too big: the target can only be to the left, so hi = mid − 1'}.` }))
    if (small) lo = mid + 1
    else hi = mid - 1
  }
  f.push(A({ cells: cellsOf(nums, () => 'dim'), caption: 'lo passed hi: not present.' }))
  return { title: `nums = [${nums.join(', ')}], target = ${target}`, frames: f }
}

/** Binary search on the answer: Koko's eating speed. */
export function binarySearchAnswer(): Viz {
  const piles = [3, 6, 7, 11]
  const h = 8
  const hours = (k: number) => piles.reduce((s, p) => s + Math.ceil(p / k), 0)
  const speeds = Array.from({ length: Math.max(...piles) }, (_, i) => i + 1)
  const feasible = speeds.map((k) => hours(k) <= h)
  let lo = 0
  let hi = speeds.length - 1
  const f: Frame[] = []
  const cells = (mid?: number) => cellsOf(speeds, (j) => (j === mid ? 'active' : j < lo || j > hi ? 'dim' : feasible[j] ? 'window' : undefined))
  f.push(A({ cells: cellsOf(speeds), range: [lo, hi], aux: [list('piles', piles)], vars: { h }, caption: `The answer is a speed between 1 and the biggest pile. Feasibility ("can she finish in ${h} hours at speed k?") is false…false true…true, so binary search for the first true.` }))
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const k = speeds[mid]!
    const t = hours(k)
    const ok = t <= h
    f.push(A({ cells: cells(mid), marks: [{ i: lo, label: 'lo' }, { i: mid, label: 'mid' }, { i: hi, label: 'hi' }], range: [lo, hi], aux: [list('hours per pile at this speed', piles.map((p) => Math.ceil(p / k)))], vars: { 'speed k': k, 'hours needed': t, feasible: ok }, caption: `At speed ${k} she needs ${t} hours: ${ok ? `feasible, so the answer is ${k} or slower: hi = mid.` : `too slow, so the answer is faster: lo = mid + 1.`}` }))
    if (ok) hi = mid
    else lo = mid + 1
  }
  f.push(A({ cells: cellsOf(speeds, (j) => (j === lo ? 'done' : feasible[j] ? 'window' : 'dim')), marks: [{ i: lo, label: 'answer', tone: 'done' }], caption: `Smallest feasible speed: ${speeds[lo]}. O(n log m) for n piles and max pile m.` }))
  return { title: `piles = [${piles.join(', ')}], h = ${h}`, frames: f }
}

/** Search in a rotated sorted array: one half is always sorted. */
export function rotatedSearch(): Viz {
  const nums = [4, 5, 6, 7, 0, 1, 2]
  const target = 0
  let lo = 0
  let hi = nums.length - 1
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), marks: [{ i: lo, label: 'lo' }, { i: hi, label: 'hi' }], range: [lo, hi], vars: { target }, caption: 'Split at mid: one of the two halves is always properly sorted. Check whether the target lies inside that sorted half; if so search it, otherwise search the other half.' }))
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (nums[mid] === target) {
      f.push(A({ cells: cellsOf(nums, (j) => (j === mid ? 'match' : j < lo || j > hi ? 'dim' : 'window')), marks: [{ i: mid, label: 'mid', tone: 'match' }], range: [lo, hi], caption: `nums[${mid}] = ${target}: found.` }))
      return { title: `nums = [${nums.join(', ')}], target = ${target}`, frames: f }
    }
    const leftSorted = nums[lo]! <= nums[mid]!
    let goLeft: boolean
    let why: string
    if (leftSorted) {
      goLeft = nums[lo]! <= target && target < nums[mid]!
      why = `Left half [${lo}, ${mid}] is sorted (${nums[lo]}..${nums[mid]}). ${target} ${goLeft ? 'is' : 'is not'} in that range, so search ${goLeft ? 'left' : 'right'}.`
    } else {
      goLeft = !(nums[mid]! < target && target <= nums[hi]!)
      why = `Right half [${mid}, ${hi}] is sorted (${nums[mid]}..${nums[hi]}). ${target} ${goLeft ? 'is not' : 'is'} in that range, so search ${goLeft ? 'left' : 'right'}.`
    }
    f.push(A({ cells: cellsOf(nums, (j) => (j === mid ? 'active' : j < lo || j > hi ? 'dim' : (leftSorted ? j < mid : j > mid) ? 'match' : 'window')), marks: [{ i: lo, label: 'lo' }, { i: mid, label: 'mid' }, { i: hi, label: 'hi' }], range: [lo, hi], caption: why }))
    if (goLeft) hi = mid - 1
    else lo = mid + 1
  }
  f.push(A({ cells: cellsOf(nums, () => 'dim'), caption: 'Not present.' }))
  return { title: `nums = [${nums.join(', ')}], target = ${target}`, frames: f }
}

/** Minimum in a rotated sorted array: compare mid with hi. */
export function findMinRotated(): Viz {
  const nums = [4, 5, 6, 7, 0, 1, 2]
  let lo = 0
  let hi = nums.length - 1
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), marks: [{ i: lo, label: 'lo' }, { i: hi, label: 'hi' }], range: [lo, hi], caption: 'The minimum is the one place where the order "breaks". Compare mid with the right end: if mid is bigger, the break is to the right; otherwise mid could be it, so keep it.' }))
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const right = nums[mid]! > nums[hi]!
    f.push(A({ cells: cellsOf(nums, (j) => (j === mid ? 'active' : j === hi ? 'match' : j < lo || j > hi ? 'dim' : 'window')), marks: [{ i: lo, label: 'lo' }, { i: mid, label: 'mid' }, { i: hi, label: 'hi' }], range: [lo, hi], caption: `nums[${mid}] = ${nums[mid]} ${right ? `> nums[${hi}] = ${nums[hi]}: the minimum is right of mid, lo = mid + 1.` : `≤ nums[${hi}] = ${nums[hi]}: the minimum is at mid or left of it, hi = mid.`}` }))
    if (right) lo = mid + 1
    else hi = mid
  }
  f.push(A({ cells: cellsOf(nums, (j) => (j === lo ? 'done' : 'dim')), marks: [{ i: lo, label: 'min', tone: 'done' }], caption: `lo = hi = ${lo}: the minimum is ${nums[lo]}. O(log n).` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}
