import { A, cellsOf, kv, list } from './frames.ts'
import type { Frame, Tone, Viz } from './frames.ts'

/** Two sum: one pass, remembering value → index. */
export function hashMapLookup(): Viz {
  const nums = [3, 8, 11, 2, 7]
  const target = 9
  const seen = new Map<number, number>()
  const f: Frame[] = []
  const table = () => kv('seen: value → index', seen)
  f.push(A({ cells: cellsOf(nums), table: table(), vars: { target }, caption: `Walk the array once. For each number, ask the map whether its partner (${target} minus it) has already been seen.` }))
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]!
    const hit = seen.get(need)
    f.push(A({
      cells: cellsOf(nums, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined)),
      marks: [{ i, label: 'i' }],
      table: table(),
      vars: { 'nums[i]': nums[i]!, need },
      caption: `nums[${i}] = ${nums[i]}, so the partner would be ${need}. ${hit === undefined ? 'The map does not have it.' : `The map has it, at index ${hit}.`}`,
    }))
    if (hit !== undefined) {
      f.push(A({ cells: cellsOf(nums, (j) => (j === i || j === hit ? 'match' : 'dim')), marks: [{ i: hit, label: 'found', tone: 'match' }, { i, label: 'i' }], table: table(), caption: `Answer: [${hit}, ${i}]. One pass, and every lookup is O(1), so the whole thing is O(n).` }))
      break
    }
    seen.set(nums[i]!, i)
    f.push(A({ cells: cellsOf(nums, (j) => (j <= i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], table: table(), caption: `Record ${nums[i]} → ${i}. Checking before recording means a number never pairs with itself.` }))
  }
  return { title: `two sum: nums = [${nums.join(', ')}], target = ${target}`, frames: f }
}

/** Subarray sum equals k with running totals and a count map. */
export function prefixSumMap(): Viz {
  const nums = [1, 2, 1, 2, 1]
  const k = 3
  const seen = new Map<number, number>([[0, 1]])
  let prefix = 0
  let count = 0
  const f: Frame[] = []
  const table = () => kv('seen: running total → how often', seen)
  f.push(A({ cells: cellsOf(nums), table: table(), vars: { k, prefix, count }, caption: `A stretch i..j sums to k exactly when total(0..j) − total(0..i−1) = k. So at each position, count how many earlier totals equal the current total − k. Seed the map with 0 once, for stretches that start at index 0.` }))
  for (let i = 0; i < nums.length; i++) {
    prefix += nums[i]!
    const hits = seen.get(prefix - k) ?? 0
    count += hits
    f.push(A({
      cells: cellsOf(nums, (j) => (j === i ? 'active' : j < i ? 'window' : undefined)),
      marks: [{ i, label: 'i' }],
      table: table(),
      vars: { prefix, 'prefix − k': prefix - k, count },
      caption: `Running total is ${prefix}. Earlier totals equal to ${prefix - k}: ${hits}. ${hits ? `That is ${hits} stretch${hits === 1 ? '' : 'es'} ending here that sum to ${k}.` : 'No stretch ends here.'}`,
    }))
    seen.set(prefix, (seen.get(prefix) ?? 0) + 1)
  }
  f.push(A({ cells: cellsOf(nums, () => 'done'), table: table(), vars: { count }, caption: `${count} subarrays sum to ${k}. Negative numbers would not break this, unlike a sliding window.` }))
  return { title: `subarray sum: nums = [${nums.join(', ')}], k = ${k}`, frames: f }
}

/** Best time to buy and sell: track the lowest price so far. */
export function runningMin(): Viz {
  const prices = [7, 1, 5, 3, 6, 4]
  let low = Infinity
  let lowAt = -1
  let best = 0
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(prices), caption: 'The best sale on any day uses the lowest price before it. So keep one running minimum and one running best profit.' }))
  for (let i = 0; i < prices.length; i++) {
    const p = prices[i]!
    if (p < low) {
      low = p
      lowAt = i
      f.push(A({ cells: cellsOf(prices, (j) => (j === i ? 'match' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }, { i: lowAt, label: 'low', tone: 'match' }], vars: { low, best }, caption: `${p} is a new lowest price. Nothing to sell yet at a profit.` }))
    } else {
      const gain = p - low
      const better = gain > best
      if (better) best = gain
      f.push(A({ cells: cellsOf(prices, (j) => (j === i ? (better ? 'done' : 'active') : j === lowAt ? 'match' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }, { i: lowAt, label: 'low', tone: 'match' }], vars: { low, 'price − low': gain, best }, caption: `Selling at ${p} after buying at ${low} makes ${gain}. ${better ? 'That is the best so far.' : `Not better than ${best}.`}` }))
    }
  }
  f.push(A({ cells: cellsOf(prices, () => 'done'), vars: { best }, caption: `Max profit ${best}, in one pass with two variables: O(n) time, O(1) space.` }))
  return { title: `prices = [${prices.join(', ')}]`, frames: f }
}

/** Maximum subarray: extend or restart. */
export function kadane(): Viz {
  const nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
  let cur = 0
  let best = -Infinity
  let start = 0
  let bestRange: [number, number] = [0, 0]
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), caption: 'At each position ask: is it better to extend the run ending just before me, or to start fresh here? A run with a negative total is never worth extending.' }))
  for (let i = 0; i < nums.length; i++) {
    const restart = cur < 0
    if (restart) {
      cur = nums[i]!
      start = i
    } else cur += nums[i]!
    const improved = cur > best
    if (improved) {
      best = cur
      bestRange = [start, i]
    }
    f.push(A({
      cells: cellsOf(nums, (j) => (j === i ? 'active' : j >= start && j < i ? 'window' : j >= bestRange[0] && j <= bestRange[1] ? 'match' : undefined)),
      marks: [{ i, label: 'i' }],
      range: [start, i],
      vars: { 'current run': cur, best },
      caption: `${restart ? `The run before was negative, so start fresh at ${nums[i]}.` : `Extend the run: ${cur - nums[i]!} + ${nums[i]} = ${cur}.`}${improved ? ` New best: ${best}.` : ''}`,
    }))
  }
  f.push(A({ cells: cellsOf(nums, (j) => (j >= bestRange[0] && j <= bestRange[1] ? 'done' : 'dim')), range: bestRange, vars: { best }, caption: `Best sum ${best}, from index ${bestRange[0]} to ${bestRange[1]}. One pass, O(1) extra space.` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Valid anagram with a count map. */
export function frequencyCount(): Viz {
  const s = 'listen'
  const t = 'silent'
  const counts = new Map<string, number>()
  const f: Frame[] = []
  const cells = (w: string, upto: number, tone: Tone) => cellsOf([...w], (j) => (j < upto ? tone : j === upto ? 'active' : undefined))
  const table = () => kv('counts', counts)
  f.push(A({ cells: cellsOf([...s]), aux: [list('t', [...t])], table: table(), caption: 'Count every letter of s, then let t spend those counts. Anagrams leave every count at zero.' }))
  for (let i = 0; i < s.length; i++) {
    counts.set(s[i]!, (counts.get(s[i]!) ?? 0) + 1)
    f.push(A({ cells: cells(s, i + 1, 'dim'), marks: [{ i, label: 'i' }], aux: [list('t', [...t])], table: table(), caption: `s[${i}] = '${s[i]}': count goes up.` }))
  }
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!
    const n = (counts.get(c) ?? 0) - 1
    if (n < 0) {
      f.push(A({ cells: cellsOf([...s], () => 'dim'), aux: [list('t', [...t], (j) => (j === i ? 'bad' : j < i ? 'dim' : undefined))], table: table(), caption: `'${c}' is not left over in s, so t is not an anagram.` }))
      return { title: `s = "${s}", t = "${t}"`, frames: f }
    }
    if (n === 0) counts.delete(c)
    else counts.set(c, n)
    f.push(A({ cells: cellsOf([...s], () => 'dim'), aux: [list('t', [...t], (j) => (j === i ? 'active' : j < i ? 'dim' : undefined))], table: table(), caption: `t[${i}] = '${c}': spend one. ${n === 0 ? `'${c}' is now used up.` : `${n} left.`}` }))
  }
  f.push(A({ cells: cellsOf([...s], () => 'done'), aux: [list('t', [...t], () => 'done')], table: table(), caption: 'Every count returned to zero: anagram. O(n) time, O(k) space for k distinct letters.' }))
  return { title: `s = "${s}", t = "${t}"`, frames: f }
}

/** Product of array except self: a left pass and a right pass. */
export function prefixSuffix(): Viz {
  const nums = [1, 2, 3, 4]
  const out = new Array<number>(nums.length).fill(1)
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), aux: [list('out', out)], caption: 'out[i] = (product of everything left of i) × (product of everything right of i). Two passes, no division.' }))
  let acc = 1
  for (let i = 0; i < nums.length; i++) {
    out[i] = acc
    f.push(A({ cells: cellsOf(nums, (j) => (j < i ? 'window' : j === i ? 'active' : undefined)), marks: [{ i, label: 'i' }], aux: [list('out', out, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined))], vars: { 'product on the left': acc }, caption: `Left pass: out[${i}] = product of nums[0..${i - 1}] = ${acc}.` }))
    acc *= nums[i]!
  }
  acc = 1
  for (let i = nums.length - 1; i >= 0; i--) {
    out[i]! *= acc
    f.push(A({ cells: cellsOf(nums, (j) => (j > i ? 'window' : j === i ? 'active' : undefined)), marks: [{ i, label: 'i' }], aux: [list('out', out, (j) => (j === i ? 'active' : j > i ? 'done' : undefined))], vars: { 'product on the right': acc }, caption: `Right pass: multiply out[${i}] by the product of nums[${i + 1}..] = ${acc}.` }))
    acc *= nums[i]!
  }
  f.push(A({ cells: cellsOf(nums, () => 'dim'), aux: [list('out', out, () => 'done')], caption: `[${out.join(', ')}]. O(n) time; the right-side product lives in one variable, so O(1) extra space.` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Longest consecutive sequence: only start counting from a sequence's first number. */
export function sequenceStarts(): Viz {
  const nums = [100, 4, 200, 1, 3, 2]
  const set = new Set(nums)
  let best = 0
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), aux: [list('set', [...set])], caption: 'Put everything in a set. A number starts a run only if number − 1 is absent; from a start, walk upwards while the next number exists.' }))
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i]!
    if (set.has(n - 1)) {
      f.push(A({ cells: cellsOf(nums, (j) => (j === i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [list('set', [...set])], vars: { best }, caption: `${n}: ${n - 1} is in the set, so ${n} is inside some run, not its start. Skip it; the start will count it.` }))
      continue
    }
    let len = 1
    const run = [n]
    while (set.has(n + len)) {
      run.push(n + len)
      len++
    }
    best = Math.max(best, len)
    f.push(A({ cells: cellsOf(nums, (j) => (run.includes(nums[j]!) ? 'match' : undefined)), marks: [{ i, label: 'start', tone: 'match' }], aux: [list('run', run, () => 'match')], vars: { length: len, best }, caption: `${n} starts a run (${n - 1} is absent). Walk up: ${run.join(' → ')}. Length ${len}.` }))
  }
  f.push(A({ cells: cellsOf(nums, () => 'done'), vars: { best }, caption: `Longest run ${best}. Each number is visited at most twice, so O(n) despite the inner loop.` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Single number with XOR. */
export function xorCancel(): Viz {
  const nums = [4, 1, 2, 1, 2]
  const bits = (n: number) => n.toString(2).padStart(3, '0')
  let acc = 0
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), aux: [list('acc (binary)', [bits(acc)])], caption: 'x XOR x = 0 and x XOR 0 = x, and XOR is order-independent. So XOR everything together: pairs cancel, the single one remains.' }))
  for (let i = 0; i < nums.length; i++) {
    const before = acc
    acc ^= nums[i]!
    f.push(A({ cells: cellsOf(nums, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [list('acc (binary)', [bits(acc)])], vars: { acc }, caption: `${bits(before)} XOR ${bits(nums[i]!)} (${nums[i]}) = ${bits(acc)} (${acc}).` }))
  }
  f.push(A({ cells: cellsOf(nums, (j) => (nums[j] === acc ? 'done' : 'dim')), vars: { answer: acc }, caption: `${acc} is the number without a pair. O(n) time, O(1) space, no map.` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Jump game: the furthest index reachable so far. */
export function greedyReach(): Viz {
  const nums = [2, 3, 1, 1, 4]
  let reach = 0
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), caption: 'Keep the furthest index you could reach so far. If a position is beyond it, you are stuck; otherwise it may push the reach further.' }))
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) {
      f.push(A({ cells: cellsOf(nums, (j) => (j === i ? 'bad' : j <= reach ? 'window' : undefined)), marks: [{ i, label: 'i' }, { i: reach, label: 'reach', tone: 'match' }], vars: { reach }, caption: `Index ${i} is beyond the reach ${reach}: it can never be stood on. Return false.` }))
      return { title: `nums = [${nums.join(', ')}]`, frames: f }
    }
    const next = Math.max(reach, i + nums[i]!)
    const grew = next > reach
    reach = Math.min(next, nums.length - 1)
    f.push(A({ cells: cellsOf(nums, (j) => (j === i ? 'active' : j <= reach ? 'window' : undefined)), marks: [{ i, label: 'i' }, { i: reach, label: 'reach', tone: 'match' }], range: [0, reach], vars: { 'i + nums[i]': i + nums[i]!, reach }, caption: `From ${i} you can jump to ${i + nums[i]!}. ${grew ? `Reach grows to ${reach}.` : 'Reach does not grow.'}` }))
    if (reach >= nums.length - 1) break
  }
  f.push(A({ cells: cellsOf(nums, () => 'done'), vars: { reach }, caption: 'The reach covers the last index: true. One pass, O(1) space.' }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Gas station: reset the candidate start when the tank goes negative. */
export function resetOnNegative(): Viz {
  const gas = [1, 2, 3, 4, 5]
  const cost = [3, 4, 5, 1, 2]
  let tank = 0
  let total = 0
  let start = 0
  const f: Frame[] = []
  const net = gas.map((g, i) => g - cost[i]!)
  f.push(A({ cells: cellsOf(net), aux: [list('gas', gas), list('cost', cost)], caption: 'Each station gives gas − cost. If the total is negative no start works; otherwise, when the running tank goes negative, no station in that stretch can be the start, so restart from the next one.' }))
  for (let i = 0; i < net.length; i++) {
    tank += net[i]!
    total += net[i]!
    const broke = tank < 0
    f.push(A({ cells: cellsOf(net, (j) => (j === i ? (broke ? 'bad' : 'active') : j >= start && j < i ? 'window' : j < start ? 'dim' : undefined)), marks: [{ i, label: 'i' }, { i: start, label: 'start', tone: 'match' }], vars: { tank, total }, caption: `Tank after station ${i}: ${tank}. ${broke ? `Negative: no start in ${start}..${i} can work. Restart from ${i + 1} with an empty tank.` : 'Still non-negative; keep going.'}` }))
    if (broke) {
      start = i + 1
      tank = 0
    }
  }
  f.push(A({ cells: cellsOf(net, (j) => (j >= start ? 'done' : 'dim')), marks: start < net.length ? [{ i: start, label: 'start', tone: 'match' }] : [], vars: { total, start }, caption: total >= 0 ? `Total ${total} ≥ 0, so a start exists, and it is ${start}: the first station after the last reset.` : `Total ${total} < 0: no start works.` }))
  return { title: `gas = [${gas.join(', ')}], cost = [${cost.join(', ')}]`, frames: f }
}

/** Partition labels: the last occurrence of each letter sets the boundary. */
export function lastOccurrence(): Viz {
  const s = 'ababcbacadefegde'
  const last = new Map<string, number>()
  for (let i = 0; i < s.length; i++) last.set(s[i]!, i)
  const chars = [...s]
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(chars), table: kv('last index of each letter', last), caption: 'A part must contain every occurrence of each letter in it. So extend the part to the last occurrence of every letter seen so far; when i reaches that boundary, the part closes.' }))
  let start = 0
  let end = 0
  const parts: number[] = []
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, last.get(s[i]!)!)
    const close = i === end
    f.push(A({ cells: cellsOf(chars, (j) => (j === i ? 'active' : j >= start && j <= end ? 'window' : j < start ? 'done' : undefined)), marks: [{ i, label: 'i' }, { i: end, label: 'end', tone: 'match' }], range: [start, end], aux: [list('part sizes', parts)], caption: `'${s[i]}' last appears at ${last.get(s[i]!)}, so the part reaches at least ${end}.${close ? ` i = end: close the part [${start}, ${end}], size ${end - start + 1}.` : ''}` }))
    if (close) {
      parts.push(end - start + 1)
      start = i + 1
    }
  }
  f.push(A({ cells: cellsOf(chars, () => 'done'), aux: [list('part sizes', parts, () => 'done')], caption: `Parts of sizes [${parts.join(', ')}]. One pass after the last-index map: O(n).` }))
  return { title: `s = "${s}"`, frames: f }
}
