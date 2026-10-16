import { A, cellsOf, list } from './frames.ts'
import type { Frame, Viz } from './frames.ts'

const fmt = (iv: [number, number]) => `${iv[0]}–${iv[1]}`

/** Merge intervals: sort by start, then sweep. */
export function mergeIntervals(): Viz {
  const input: [number, number][] = [[8, 10], [1, 3], [2, 6], [15, 18], [17, 20]]
  const ivs = [...input].sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(input.map(fmt)), caption: 'Unsorted, overlaps can be anywhere. Sort by start: now an interval can only overlap the one most recently merged, so one pass with a running "current" interval is enough.' }))
  f.push(A({ cells: cellsOf(ivs.map(fmt)), aux: [list('merged', [])], caption: 'Sorted by start.' }))
  for (let i = 0; i < ivs.length; i++) {
    const iv = ivs[i]!
    const last = out[out.length - 1]
    if (last && iv[0] <= last[1]) {
      last[1] = Math.max(last[1], iv[1])
      f.push(A({ cells: cellsOf(ivs.map(fmt), (j) => (j === i ? 'match' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [list('merged', out.map(fmt), (j) => (j === out.length - 1 ? 'match' : undefined))], caption: `${fmt(iv)} starts at ${iv[0]} ≤ ${fmt(last).split('–')[1]}, the current end: overlap. Extend the end to max → ${fmt(last)}.` }))
    } else {
      out.push([iv[0], iv[1]])
      f.push(A({ cells: cellsOf(ivs.map(fmt), (j) => (j === i ? 'active' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [list('merged', out.map(fmt), (j) => (j === out.length - 1 ? 'done' : undefined))], caption: `${fmt(iv)} starts after ${last ? `the current end ${last[1]}` : 'nothing'}: no overlap, start a new merged interval.` }))
    }
  }
  f.push(A({ cells: cellsOf(ivs.map(fmt), () => 'dim'), aux: [list('merged', out.map(fmt), () => 'done')], caption: `[${out.map(fmt).join(', ')}]. O(n log n) for the sort, then O(n).` }))
  return { title: `intervals = [${input.map(fmt).join(', ')}]`, frames: f }
}

/** Meeting rooms II: sweep over start and end events. */
export function sweepLine(): Viz {
  const meetings: [number, number][] = [[0, 30], [5, 10], [15, 20], [25, 35]]
  const events: [number, 'start' | 'end'][] = []
  for (const [s, e] of meetings) events.push([s, 'start'], [e, 'end'])
  events.sort((a, b) => a[0] - b[0] || (a[1] === 'end' ? -1 : 1))
  let rooms = 0
  let best = 0
  const f: Frame[] = []
  const labels = events.map(([t, k]) => `${t} ${k === 'start' ? '▲' : '▼'}`)
  f.push(A({ cells: cellsOf(meetings.map(fmt)), caption: 'Turn each meeting into two events, a start (▲) and an end (▼). Sort by time, ends before starts at a tie. Sweep: +1 room on a start, −1 on an end. The peak is the answer.' }))
  f.push(A({ cells: cellsOf(labels), vars: { rooms, best }, caption: 'Events in time order.' }))
  events.forEach(([t, k], i) => {
    rooms += k === 'start' ? 1 : -1
    best = Math.max(best, rooms)
    f.push(A({ cells: cellsOf(labels, (j) => (j === i ? (k === 'start' ? 'active' : 'bad') : j < i ? 'dim' : undefined)), marks: [{ i, label: 't' }], vars: { time: t, 'rooms in use': rooms, peak: best }, caption: `t = ${t}: a meeting ${k === 'start' ? 'starts, rooms + 1' : 'ends, rooms − 1'} → ${rooms}.${rooms === best && k === 'start' ? ' New peak.' : ''}` }))
  })
  f.push(A({ cells: cellsOf(labels, () => 'dim'), vars: { 'rooms needed': best }, caption: `${best} rooms. O(n log n) for the sort.` }))
  return { title: `meetings = [${meetings.map(fmt).join(', ')}]`, frames: f }
}

/** Non-overlapping intervals: greedy by earliest end. */
export function earliestEnd(): Viz {
  const input: [number, number][] = [[1, 2], [2, 3], [3, 4], [1, 3], [2, 4]]
  const ivs = [...input].sort((a, b) => a[1] - b[1])
  let end = -Infinity
  let kept = 0
  let removed = 0
  const keptSet = new Set<number>()
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(input.map(fmt)), caption: 'To keep as many non-overlapping intervals as possible, always keep the one that ends earliest: it leaves the most room for the rest. Sort by end; keep an interval if it starts at or after the last kept end.' }))
  f.push(A({ cells: cellsOf(ivs.map(fmt)), caption: 'Sorted by end.' }))
  for (let i = 0; i < ivs.length; i++) {
    const iv = ivs[i]!
    if (iv[0] >= end) {
      end = iv[1]
      kept++
      keptSet.add(i)
      f.push(A({ cells: cellsOf(ivs.map(fmt), (j) => (j === i ? 'done' : keptSet.has(j) ? 'window' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], vars: { 'last end': end, kept, removed }, caption: `${fmt(iv)} starts at ${iv[0]} ≥ last end: keep it. Last end becomes ${end}.` }))
    } else {
      removed++
      f.push(A({ cells: cellsOf(ivs.map(fmt), (j) => (j === i ? 'bad' : keptSet.has(j) ? 'window' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], vars: { 'last end': end, kept, removed }, caption: `${fmt(iv)} starts at ${iv[0]} < ${end}: it overlaps the kept one, remove it.` }))
    }
  }
  f.push(A({ cells: cellsOf(ivs.map(fmt), (j) => (keptSet.has(j) ? 'done' : 'bad')), vars: { kept, removed }, caption: `Remove ${removed} to leave ${kept} non-overlapping. O(n log n).` }))
  return { title: `intervals = [${input.map(fmt).join(', ')}]`, frames: f }
}
