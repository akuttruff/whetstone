import { A, G, cellsOf, list } from './frames.ts'
import type { Cell, Frame, Viz } from './frames.ts'

/** House robber: take-or-skip over positions. */
export function takeOrSkip(): Viz {
  const nums = [2, 7, 9, 3, 1]
  const dp = new Array<number | string>(nums.length).fill('·')
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), aux: [list('dp: best up to i', dp)], caption: 'dp[i] = the best you can do using houses 0..i. Either skip house i (dp[i−1]) or take it and whatever was best two houses back (nums[i] + dp[i−2]).' }))
  for (let i = 0; i < nums.length; i++) {
    const skip = i >= 1 ? (dp[i - 1] as number) : 0
    const take = nums[i]! + (i >= 2 ? (dp[i - 2] as number) : 0)
    dp[i] = Math.max(skip, take)
    f.push(A({ cells: cellsOf(nums, (j) => (j === i ? 'active' : j === i - 2 ? 'match' : j === i - 1 ? 'window' : undefined)), marks: [{ i, label: 'i' }], aux: [list('dp: best up to i', dp, (j) => (j === i ? 'done' : j === i - 1 ? 'window' : j === i - 2 ? 'match' : undefined))], vars: { 'skip = dp[i−1]': skip, 'take = nums[i] + dp[i−2]': take }, caption: `dp[${i}] = max(skip ${skip}, take ${nums[i]} + ${i >= 2 ? dp[i - 2] : 0} = ${take}) = ${dp[i]}.` }))
  }
  f.push(A({ cells: cellsOf(nums, () => 'dim'), aux: [list('dp: best up to i', dp, () => 'done')], vars: { answer: dp[nums.length - 1]! }, caption: `Answer ${dp[nums.length - 1]}. Only the last two values are ever read, so two variables replace the array: O(n) time, O(1) space.` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Coin change: fewest coins, unbounded knapsack over amounts. */
export function unboundedKnapsack(): Viz {
  const coins = [1, 2, 5]
  const amount = 7
  const dp: (number | string)[] = new Array(amount + 1).fill('∞')
  dp[0] = 0
  const f: Frame[] = []
  const labels = Array.from({ length: amount + 1 }, (_, i) => i)
  f.push(A({ cells: cellsOf(dp), aux: [list('coins', coins)], caption: `dp[a] = fewest coins making amount a. dp[0] = 0. For each amount, try every coin c with c ≤ a: dp[a] = 1 + dp[a − c], keeping the smallest. Coins can repeat, so the inner loop reads values from this same pass.` }))
  for (let a = 1; a <= amount; a++) {
    let best = Infinity
    const tried: string[] = []
    for (const c of coins) {
      if (c > a) continue
      const prev = dp[a - c]
      if (typeof prev === 'number') {
        tried.push(`coin ${c} → 1 + dp[${a - c}] = ${1 + prev}`)
        best = Math.min(best, 1 + prev)
      }
    }
    dp[a] = best === Infinity ? '∞' : best
    f.push(A({ cells: cellsOf(dp, (j) => (j === a ? 'done' : coins.some((c) => j === a - c) ? 'match' : j < a ? 'dim' : undefined)), marks: [{ i: a, label: 'a' }], aux: [list('coins', coins)], caption: `Amount ${a}: ${tried.join('; ')}. dp[${a}] = ${dp[a]}.` }))
  }
  f.push(A({ cells: cellsOf(dp, () => 'done'), marks: labels.filter((i) => i === amount).map((i) => ({ i, label: 'amount' })), vars: { answer: dp[amount]! }, caption: `${amount} needs ${dp[amount]} coins. O(amount × coins) time, O(amount) space.` }))
  return { title: `coins = [${coins.join(', ')}], amount = ${amount}`, frames: f }
}

/** Partition equal subset sum: 0/1 knapsack over a boolean "reachable sums" set. */
export function knapsack01(): Viz {
  const nums = [1, 5, 11, 5]
  const total = nums.reduce((s, x) => s + x, 0)
  const target = total / 2
  const can = new Array<boolean>(target + 1).fill(false)
  can[0] = true
  const f: Frame[] = []
  const cells = (hot: Set<number> = new Set(), from: Set<number> = new Set()): Cell[] => can.map((v, s) => ({ v: `${s}${v ? '✓' : ''}`, tone: hot.has(s) ? 'done' : from.has(s) ? 'match' : v ? 'window' : undefined }))
  f.push(A({ cells: cells(), aux: [list('nums', nums)], vars: { total, target }, caption: `Total ${total}, so one side must sum to ${target}. can[s] = "some subset sums to s". Start with can[0]. For each number, walk s downwards so each number is used at most once.` }))
  nums.forEach((x, i) => {
    const hot = new Set<number>()
    const from = new Set<number>()
    for (let s = target; s >= x; s--) {
      if (can[s - x] && !can[s]) {
        can[s] = true
        hot.add(s)
        from.add(s - x)
      }
    }
    f.push(A({ cells: cells(hot, from), aux: [list('nums', nums, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined))], caption: `Number ${x}: every reachable sum s−${x} (amber) makes s reachable (green). New sums: ${hot.size ? [...hot].sort((a, b) => a - b).join(', ') : 'none'}.` }))
  })
  f.push(A({ cells: cells(), vars: { [`can[${target}]`]: can[target]! }, caption: can[target] ? `${target} is reachable, so the array can be split. O(n × target) time, O(target) space.` : `${target} is not reachable: no split.` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Longest common subsequence: a 2D table over two strings. */
export function dp2dStrings(): Viz {
  const a = 'abcde'
  const b = 'ace'
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  const f: Frame[] = []
  const rowLabels = ['', ...a]
  const colLabels = ['', ...b]
  const grid = (hot?: [number, number], from?: [number, number][], done = false): Cell[][] =>
    dp.map((row, i) => row.map((v, j) => ({ v: i === 0 || j === 0 ? v : i < (hot?.[0] ?? n + 1) || (i === hot?.[0] && j <= (hot?.[1] ?? m + 1)) || done ? v : '·', tone: hot && hot[0] === i && hot[1] === j ? 'done' : from?.some(([x, y]) => x === i && y === j) ? 'match' : i === 0 || j === 0 ? 'dim' : undefined })))
  f.push(G({ cells: grid(), rowLabels, colLabels, caption: `dp[i][j] = LCS of the first i letters of "${a}" and the first j of "${b}". Row 0 and column 0 are 0 (an empty string). If the letters match, extend the diagonal; else take the better of dropping one letter from either side.` }))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const match = a[i - 1] === b[j - 1]
      dp[i]![j] = match ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
      f.push(G({ cells: grid([i, j], match ? [[i - 1, j - 1]] : [[i - 1, j], [i, j - 1]]), rowLabels, colLabels, caption: `'${a[i - 1]}' vs '${b[j - 1]}': ${match ? `match, so dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i]![j]}.` : `no match, so dp[${i}][${j}] = max(up ${dp[i - 1]![j]}, left ${dp[i]![j - 1]}) = ${dp[i]![j]}.`}` }))
    }
  }
  f.push(G({ cells: grid([n, m], [], true), rowLabels, colLabels, vars: { LCS: dp[n]![m]! }, caption: `Bottom-right corner: LCS length ${dp[n]![m]}. O(n·m) time; only the previous row is needed, so O(m) space is possible.` }))
  return { title: `a = "${a}", b = "${b}"`, frames: f }
}

/** Unique paths: a grid DP where each cell sums the cell above and the cell to the left. */
export function gridDp(): Viz {
  const rows = 3
  const cols = 4
  const dp: (number | string)[][] = Array.from({ length: rows }, () => new Array<number | string>(cols).fill('·'))
  const f: Frame[] = []
  const grid = (hot?: [number, number], from?: [number, number][]): Cell[][] => dp.map((row, i) => row.map((v, j) => ({ v, tone: hot && hot[0] === i && hot[1] === j ? 'done' : from?.some(([x, y]) => x === i && y === j) ? 'match' : undefined })))
  f.push(G({ cells: grid(), caption: 'Ways to reach a cell = ways to reach the cell above + ways to reach the cell to the left (you can only move down or right). The first row and column have exactly one way.' }))
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const up = i > 0 ? (dp[i - 1]![j] as number) : 0
      const left = j > 0 ? (dp[i]![j - 1] as number) : 0
      dp[i]![j] = i === 0 || j === 0 ? 1 : up + left
      const from: [number, number][] = []
      if (i > 0) from.push([i - 1, j])
      if (j > 0) from.push([i, j - 1])
      f.push(G({ cells: grid([i, j], from), caption: i === 0 || j === 0 ? `Edge cell (${i}, ${j}): one way, straight along the edge.` : `(${i}, ${j}) = up ${up} + left ${left} = ${dp[i]![j]}.` }))
    }
  }
  f.push(G({ cells: grid([rows - 1, cols - 1]), vars: { paths: dp[rows - 1]![cols - 1]! }, caption: `${dp[rows - 1]![cols - 1]} paths. Each row only needs the previous one, so a rolling row gives O(cols) space.` }))
  return { title: `${rows} × ${cols} grid`, frames: f }
}

/** Longest increasing subsequence with patience sorting: a "tails" array and binary search. */
export function lisPatience(): Viz {
  const nums = [10, 9, 2, 5, 3, 7, 101, 18]
  const tails: number[] = []
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(nums), aux: [list('tails: smallest tail of a rising run of each length', tails)], caption: 'tails[L] = the smallest possible last value of an increasing run of length L+1. For each number, find the first tail ≥ it (binary search) and replace it; if none, append. The length of tails is the answer.' }))
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i]!
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tails[mid]! < x) lo = mid + 1
      else hi = mid
    }
    const append = lo === tails.length
    const old = tails[lo]
    tails[lo] = x
    f.push(A({ cells: cellsOf(nums, (j) => (j === i ? 'active' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }], aux: [list('tails: smallest tail of a rising run of each length', tails, (j) => (j === lo ? (append ? 'done' : 'match') : undefined))], vars: { 'run length so far': tails.length }, caption: append ? `${x} is bigger than every tail: it extends the longest run. Append; length is now ${tails.length}.` : `${x} replaces ${old} at position ${lo}: a run of length ${lo + 1} can now end on a smaller value, which leaves more room to grow.` }))
  }
  f.push(A({ cells: cellsOf(nums, () => 'dim'), aux: [list('tails', tails, () => 'done')], vars: { LIS: tails.length }, caption: `LIS length ${tails.length}. Note tails is not itself a valid subsequence, only its length is meaningful. O(n log n).` }))
  return { title: `nums = [${nums.join(', ')}]`, frames: f }
}

/** Counting bits: dp[i] = dp[i >> 1] + (i & 1). */
export function dpOnBits(): Viz {
  const n = 8
  const dp: (number | string)[] = new Array(n + 1).fill('·')
  dp[0] = 0
  const f: Frame[] = []
  f.push(A({ cells: cellsOf(dp), aux: [list('i in binary', Array.from({ length: n + 1 }, (_, i) => i.toString(2)))], caption: 'Dropping the lowest bit of i gives i >> 1, a smaller number already solved. So ones(i) = ones(i >> 1) + (lowest bit of i).' }))
  for (let i = 1; i <= n; i++) {
    dp[i] = (dp[i >> 1] as number) + (i & 1)
    f.push(A({ cells: cellsOf(dp, (j) => (j === i ? 'done' : j === i >> 1 ? 'match' : j < i ? 'dim' : undefined)), marks: [{ i, label: 'i' }, { i: i >> 1, label: 'i>>1', tone: 'match' }], aux: [list('i in binary', Array.from({ length: n + 1 }, (_, k) => k.toString(2)), (j) => (j === i ? 'active' : j === i >> 1 ? 'match' : undefined))], caption: `${i} = ${i.toString(2)}: dp[${i >> 1}] + ${i & 1} = ${dp[i >> 1]} + ${i & 1} = ${dp[i]}.` }))
  }
  f.push(A({ cells: cellsOf(dp, () => 'done'), caption: `[${dp.join(', ')}] in O(n), one lookup per number.` }))
  return { title: `n = ${n}`, frames: f }
}

/** Word break: reachability over prefixes. */
export function reachabilityDp(): Viz {
  const s = 'leetcode'
  const dict = ['leet', 'code', 'le']
  const n = s.length
  const can = new Array<boolean>(n + 1).fill(false)
  can[0] = true
  const f: Frame[] = []
  const cells = (hot?: number, from?: number): Cell[] => can.map((v, i) => ({ v: `${i}${v ? '✓' : ''}`, tone: i === hot ? 'done' : i === from ? 'match' : v ? 'window' : undefined }))
  f.push(A({ cells: cells(), aux: [list('s', [...s]), list('dict', dict)], caption: `can[i] = "the first i letters can be split into dictionary words". can[0] is true. can[i] is true if some earlier reachable j has s[j..i) in the dictionary.` }))
  for (let i = 1; i <= n; i++) {
    let found: number | null = null
    for (let j = 0; j < i && found === null; j++) if (can[j] && dict.includes(s.slice(j, i))) found = j
    can[i] = found !== null
    f.push(A({ cells: cells(found !== null ? i : undefined, found ?? undefined), aux: [list('s', [...s], (k) => (found !== null && k >= found && k < i ? 'match' : k < i ? 'dim' : undefined)), list('dict', dict)], caption: found !== null ? `Prefix of ${i}: "${s.slice(found, i)}" is a word and can[${found}] is true, so can[${i}] = true.` : `Prefix of ${i}: no reachable j with s[j..${i}) in the dictionary. can[${i}] = false.` }))
  }
  f.push(A({ cells: cells(), vars: { [`can[${n}]`]: can[n]! }, caption: can[n] ? 'The whole string is reachable: true. O(n² · lookup).' : 'Not reachable: false.' }))
  return { title: `s = "${s}", dict = [${dict.join(', ')}]`, frames: f }
}
