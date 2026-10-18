import type { CodeProblem, TestCase } from '../types.ts'
import { ALGO_PROBLEMS } from './coding-base.ts'

/** The pattern each first-draft problem exercises, and the checks the Run button applies. */
const META: Record<string, { pattern: string; tests: TestCase[] }> = {
  'two-sum': {
    pattern: 'Hash map lookup',
    tests: [
      { call: 'twoSum([2, 7, 11, 15], 9)', expected: [0, 1], unordered: true },
      { call: 'twoSum([3, 2, 4], 6)', expected: [1, 2], unordered: true },
      { call: 'twoSum([3, 3], 6)', expected: [0, 1], unordered: true },
    ],
  },
  'max-profit-stock': {
    pattern: 'Running minimum, one pass',
    tests: [
      { call: 'maxProfit([7, 1, 5, 3, 6, 4])', expected: 5 },
      { call: 'maxProfit([7, 6, 4, 3, 1])', expected: 0 },
      { call: 'maxProfit([2, 4, 1])', expected: 2 },
    ],
  },
  '3sum': {
    pattern: 'Sort, then two pointers',
    tests: [
      { call: 'threeSum([-1, 0, 1, 2, -1, -4])', expected: [[-1, -1, 2], [-1, 0, 1]], unordered: true },
      { call: 'threeSum([0, 1, 1])', expected: [] },
      { call: 'threeSum([0, 0, 0])', expected: [[0, 0, 0]] },
    ],
  },
  'valid-parentheses': {
    pattern: 'Stack matching',
    tests: [
      { call: 'isValid("()[]{}")', expected: true },
      { call: 'isValid("(]")', expected: false },
      { call: 'isValid("([)]")', expected: false },
      { call: 'isValid("{[]}")', expected: true },
      { call: 'isValid("(")', expected: false },
    ],
  },
  'longest-substring-without-repeating': {
    pattern: 'Variable-size sliding window',
    tests: [
      { call: 'lengthOfLongestSubstring("abcabcbb")', expected: 3 },
      { call: 'lengthOfLongestSubstring("bbbbb")', expected: 1 },
      { call: 'lengthOfLongestSubstring("pwwkew")', expected: 3 },
      { call: 'lengthOfLongestSubstring("")', expected: 0 },
    ],
  },
  'sliding-window-maximum': {
    pattern: 'Monotonic deque',
    tests: [
      { call: 'maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3)', expected: [3, 3, 5, 5, 6, 7] },
      { call: 'maxSlidingWindow([1], 1)', expected: [1] },
      { call: 'maxSlidingWindow([9, 8, 7, 6], 2)', expected: [9, 8, 7] },
    ],
  },
  'merge-intervals': {
    pattern: 'Sort by start, sweep',
    tests: [
      { call: 'merge([[1, 3], [2, 6], [8, 10], [15, 18]])', expected: [[1, 6], [8, 10], [15, 18]] },
      { call: 'merge([[1, 4], [4, 5]])', expected: [[1, 5]] },
      { call: 'merge([[1, 4], [0, 4]])', expected: [[0, 4]] },
    ],
  },
  'reverse-linked-list': {
    pattern: 'Pointer reversal',
    tests: [
      {
        call: 'reverseList({ val: 1, next: { val: 2, next: { val: 3, next: null } } })',
        expected: { val: 3, next: { val: 2, next: { val: 1, next: null } } },
      },
      { call: 'reverseList(null)', expected: null },
      { call: 'reverseList({ val: 1, next: null })', expected: { val: 1, next: null } },
    ],
  },
  'linked-list-cycle': {
    pattern: "Floyd's tortoise and hare",
    tests: [
      { call: 'hasCycleAt([3, 2, 0, -4], 1)', expected: true },
      { call: 'hasCycleAt([1, 2], 0)', expected: true },
      { call: 'hasCycleAt([1, 2], -1)', expected: false },
      { call: 'hasCycleAt([], -1)', expected: false },
    ],
  },
  'binary-search': {
    pattern: 'Binary search on a sorted array',
    tests: [
      { call: 'search([-1, 0, 3, 5, 9, 12], 9)', expected: 4 },
      { call: 'search([-1, 0, 3, 5, 9, 12], 2)', expected: -1 },
      { call: 'search([5], 5)', expected: 0 },
    ],
  },
  'max-subarray': {
    pattern: "Kadane's algorithm",
    tests: [
      { call: 'maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4])', expected: 6 },
      { call: 'maxSubArray([1])', expected: 1 },
      { call: 'maxSubArray([5, 4, -1, 7, 8])', expected: 23 },
      { call: 'maxSubArray([-3, -1, -2])', expected: -1 },
    ],
  },
  'longest-common-subsequence': {
    pattern: '2D dynamic programming table',
    tests: [
      { call: 'longestCommonSubsequence("abcde", "ace")', expected: 3 },
      { call: 'longestCommonSubsequence("abc", "abc")', expected: 3 },
      { call: 'longestCommonSubsequence("abc", "def")', expected: 0 },
    ],
  },
  'number-of-islands': {
    pattern: 'Grid flood fill (BFS/DFS)',
    tests: [
      {
        call: 'numIslands([["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]])',
        expected: 3,
      },
      { call: 'numIslands([["1","1","1"],["0","1","0"],["1","1","1"]])', expected: 1 },
      { call: 'numIslands([["0"]])', expected: 0 },
    ],
  },
  'course-schedule': {
    pattern: "Topological sort (Kahn's algorithm)",
    tests: [
      { call: 'canFinish(2, [[1, 0]])', expected: true },
      { call: 'canFinish(2, [[1, 0], [0, 1]])', expected: false },
      { call: 'canFinish(4, [[1, 0], [2, 1], [3, 2]])', expected: true },
    ],
  },
  permutations: {
    pattern: 'Backtracking with a used set',
    tests: [
      { call: 'permute([1, 2, 3])', expected: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]], unordered: true },
      { call: 'permute([0, 1])', expected: [[0, 1], [1, 0]], unordered: true },
      { call: 'permute([7])', expected: [[7]] },
    ],
  },
  'top-k-frequent-elements': {
    pattern: 'Frequency count, then bucket sort or heap',
    tests: [
      { call: 'topKFrequent([1, 1, 1, 2, 2, 3], 2)', expected: [1, 2], unordered: true },
      { call: 'topKFrequent([1], 1)', expected: [1] },
      { call: 'topKFrequent([4, 4, 5, 5, 6], 2)', expected: [4, 5], unordered: true },
    ],
  },
}

const fromDraft: CodeProblem[] = ALGO_PROBLEMS.map((p) => {
  const meta = META[p.id]
  if (!meta) throw new Error(`coding.ts: no META for ${p.id}`)
  return { ...p, track: 'coding', source: 'builtin', pattern: meta.pattern, tests: meta.tests }
})

const TREE_NODE = `export interface TreeNode {
  val: number
  left: TreeNode | null
  right: TreeNode | null
}

`

const added: CodeProblem[] = [
  {
    id: 'daily-temperatures',
    track: 'coding',
    source: 'builtin',
    title: 'Daily Temperatures',
    topic: 'Stack & Queue',
    pattern: 'Monotonic stack',
    difficulty: 'medium',
    description: [
      'Given an array `temperatures` of daily temperatures, return an array `answer` where `answer[i]` is the number of days you have to wait after day `i` to get a warmer temperature. If there is no future day with a warmer temperature, `answer[i]` is 0.',
    ],
    examples: [
      { input: 'temperatures = [73, 74, 75, 71, 69, 72, 76, 73]', output: '[1, 1, 4, 2, 1, 1, 0, 0]' },
      { input: 'temperatures = [30, 40, 50, 60]', output: '[1, 1, 1, 0]' },
      { input: 'temperatures = [30, 60, 90]', output: '[1, 1, 0]' },
    ],
    constraints: ['1 <= temperatures.length <= 10^5', 'Aim for O(n) time.'],
    hints: [
      'Brute force is O(n²). Which days are still "waiting" for a warmer day at any moment?',
      'Keep a stack of indices whose answer is unknown. When a warmer day arrives, pop every colder index and fill in its answer.',
      'The stack stays decreasing in temperature from bottom to top, so each index is pushed and popped at most once.',
    ],
    starter: `/**
 * For each day, how many days until a warmer temperature (0 if never).
 */
export function dailyTemperatures(temperatures: number[]): number[] {
  // your code
  return []
}
`,
    solution: `export function dailyTemperatures(temperatures: number[]): number[] {
  const answer = new Array<number>(temperatures.length).fill(0)
  const stack: number[] = [] // indices with no warmer day seen yet, temperatures decreasing
  for (let i = 0; i < temperatures.length; i++) {
    while (stack.length > 0 && temperatures[stack[stack.length - 1]] < temperatures[i]) {
      const j = stack.pop()!
      answer[j] = i - j
    }
    stack.push(i)
  }
  return answer
}
`,
    tests: [
      { call: 'dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73])', expected: [1, 1, 4, 2, 1, 1, 0, 0] },
      { call: 'dailyTemperatures([30, 40, 50, 60])', expected: [1, 1, 1, 0] },
      { call: 'dailyTemperatures([90, 80, 70])', expected: [0, 0, 0] },
    ],
  },
  {
    id: 'subarray-sum-equals-k',
    track: 'coding',
    source: 'builtin',
    title: 'Subarray Sum Equals K',
    topic: 'Arrays & Hashing',
    pattern: 'Prefix sums with a hash map',
    difficulty: 'medium',
    description: [
      'Given an array of integers `nums` and an integer `k`, return the total number of contiguous subarrays whose sum equals `k`.',
      'Numbers may be negative, so a sliding window does not work.',
    ],
    examples: [
      { input: 'nums = [1, 1, 1], k = 2', output: '2' },
      { input: 'nums = [1, 2, 3], k = 3', output: '2', note: '[1, 2] and [3].' },
      { input: 'nums = [1, -1, 0], k = 0', output: '3' },
    ],
    constraints: ['1 <= nums.length <= 2 * 10^4', '-1000 <= nums[i] <= 1000'],
    hints: [
      'The sum of nums[i..j] is prefix[j] - prefix[i-1]. You want to count pairs where that difference equals k.',
      'Walk left to right keeping the running prefix sum. How many earlier prefix sums equal (current - k)? A map from prefix sum to count answers that in O(1).',
      'Seed the map with {0: 1} so a subarray starting at index 0 counts.',
    ],
    starter: `/**
 * Count contiguous subarrays that sum to k.
 */
export function subarraySum(nums: number[], k: number): number {
  // your code
  return 0
}
`,
    solution: `export function subarraySum(nums: number[], k: number): number {
  const seen = new Map<number, number>([[0, 1]])
  let prefix = 0
  let count = 0
  for (const n of nums) {
    prefix += n
    count += seen.get(prefix - k) ?? 0
    seen.set(prefix, (seen.get(prefix) ?? 0) + 1)
  }
  return count
}
`,
    tests: [
      { call: 'subarraySum([1, 1, 1], 2)', expected: 2 },
      { call: 'subarraySum([1, 2, 3], 3)', expected: 2 },
      { call: 'subarraySum([1, -1, 0], 0)', expected: 3 },
      { call: 'subarraySum([-1, -1, 1], 0)', expected: 1 },
    ],
  },
  {
    id: 'connected-components',
    track: 'coding',
    source: 'builtin',
    title: 'Number of Connected Components',
    topic: 'Graphs & Trees',
    pattern: 'Union-Find (disjoint set)',
    difficulty: 'medium',
    description: [
      'You have a graph of `n` nodes labelled `0` to `n - 1` and a list of undirected `edges`. Return the number of connected components.',
    ],
    examples: [
      { input: 'n = 5, edges = [[0, 1], [1, 2], [3, 4]]', output: '2' },
      { input: 'n = 5, edges = [[0, 1], [1, 2], [2, 3], [3, 4]]', output: '1' },
      { input: 'n = 3, edges = []', output: '3' },
    ],
    constraints: ['1 <= n <= 2000', 'No duplicate edges.'],
    hints: [
      'DFS from every unvisited node works. Union-Find is the pattern interviewers usually want to see for component counting and dynamic connectivity.',
      'Start with n components. Each union of two different roots reduces the count by one.',
      'Path compression (point nodes straight at the root while finding) and union by rank keep operations near O(1).',
    ],
    starter: `/**
 * Count connected components in an undirected graph.
 */
export function countComponents(n: number, edges: number[][]): number {
  // your code
  return 0
}
`,
    solution: `export function countComponents(n: number, edges: number[][]): number {
  const parent = Array.from({ length: n }, (_, i) => i)
  const rank = new Array<number>(n).fill(0)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]] // path halving
      x = parent[x]
    }
    return x
  }
  let components = n
  for (const [a, b] of edges) {
    let ra = find(a)
    let rb = find(b)
    if (ra === rb) continue
    if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra]
    parent[rb] = ra
    if (rank[ra] === rank[rb]) rank[ra]++
    components--
  }
  return components
}
`,
    tests: [
      { call: 'countComponents(5, [[0, 1], [1, 2], [3, 4]])', expected: 2 },
      { call: 'countComponents(5, [[0, 1], [1, 2], [2, 3], [3, 4]])', expected: 1 },
      { call: 'countComponents(3, [])', expected: 3 },
      { call: 'countComponents(4, [[0, 1], [1, 0], [2, 3]])', expected: 2 },
    ],
  },
  {
    id: 'implement-trie',
    track: 'coding',
    source: 'builtin',
    title: 'Implement a Trie',
    topic: 'Graphs & Trees',
    pattern: 'Trie (prefix tree)',
    difficulty: 'medium',
    description: [
      'Implement a `Trie` with `insert(word)`, `search(word)` (true if the exact word was inserted) and `startsWith(prefix)` (true if any inserted word starts with the prefix).',
      'The `runTrie` driver in the starter is already written; it replays a list of operations against your class so the tests can check it. Leave it as is.',
    ],
    examples: [
      {
        input: 'insert("apple"); search("apple"); search("app"); startsWith("app"); insert("app"); search("app")',
        output: 'true, false, true, true',
      },
    ],
    constraints: ['Words contain only lowercase letters.', 'Up to 3 * 10^4 operations.'],
    hints: [
      'Each node holds a map from character to child node, plus a flag marking the end of a word.',
      'search and startsWith walk the same path; they differ only in whether the final node must be a word end.',
    ],
    starter: `export class Trie {
  // your fields

  insert(word: string): void {
    // your code
  }

  search(word: string): boolean {
    // your code
    return false
  }

  startsWith(prefix: string): boolean {
    // your code
    return false
  }
}

/** Test driver: replays ops against a fresh Trie. Leave as is. */
export function runTrie(ops: string[], args: string[]): (boolean | null)[] {
  const t = new Trie()
  return ops.map((op, i) => {
    if (op === 'insert') { t.insert(args[i]); return null }
    if (op === 'search') return t.search(args[i])
    return t.startsWith(args[i])
  })
}
`,
    solution: `interface Node {
  children: Map<string, Node>
  end: boolean
}

export class Trie {
  private root: Node = { children: new Map(), end: false }

  insert(word: string): void {
    let node = this.root
    for (const ch of word) {
      let next = node.children.get(ch)
      if (!next) {
        next = { children: new Map(), end: false }
        node.children.set(ch, next)
      }
      node = next
    }
    node.end = true
  }

  private walk(s: string): Node | null {
    let node = this.root
    for (const ch of s) {
      const next = node.children.get(ch)
      if (!next) return null
      node = next
    }
    return node
  }

  search(word: string): boolean {
    return this.walk(word)?.end ?? false
  }

  startsWith(prefix: string): boolean {
    return this.walk(prefix) !== null
  }
}

/** Test driver: replays ops against a fresh Trie. Leave as is. */
export function runTrie(ops: string[], args: string[]): (boolean | null)[] {
  const t = new Trie()
  return ops.map((op, i) => {
    if (op === 'insert') { t.insert(args[i]); return null }
    if (op === 'search') return t.search(args[i])
    return t.startsWith(args[i])
  })
}
`,
    tests: [
      {
        call: 'runTrie(["insert", "search", "search", "startsWith", "insert", "search"], ["apple", "apple", "app", "app", "app", "app"])',
        expected: [null, true, false, true, null, true],
      },
      { call: 'runTrie(["search", "startsWith"], ["a", ""])', expected: [false, true] },
    ],
  },
  {
    id: 'single-number',
    track: 'coding',
    source: 'builtin',
    title: 'Single Number',
    topic: 'Bit Manipulation',
    pattern: 'XOR cancellation',
    difficulty: 'easy',
    description: [
      'Every element of `nums` appears exactly twice except one, which appears once. Find it in O(n) time and O(1) extra space.',
    ],
    examples: [
      { input: 'nums = [2, 2, 1]', output: '1' },
      { input: 'nums = [4, 1, 2, 1, 2]', output: '4' },
      { input: 'nums = [1]', output: '1' },
    ],
    hints: [
      'A hash set works but uses O(n) space. Which operation on two equal numbers gives zero?',
      'a ^ a = 0 and a ^ 0 = a, and XOR is commutative, so XOR-ing everything leaves the lone number.',
    ],
    starter: `/**
 * Return the element that appears once (all others appear twice).
 */
export function singleNumber(nums: number[]): number {
  // your code
  return 0
}
`,
    solution: `export function singleNumber(nums: number[]): number {
  let acc = 0
  for (const n of nums) acc ^= n
  return acc
}
`,
    tests: [
      { call: 'singleNumber([2, 2, 1])', expected: 1 },
      { call: 'singleNumber([4, 1, 2, 1, 2])', expected: 4 },
      { call: 'singleNumber([1])', expected: 1 },
    ],
  },
  {
    id: 'jump-game',
    track: 'coding',
    source: 'builtin',
    title: 'Jump Game',
    topic: 'Greedy',
    pattern: 'Greedy reach tracking',
    difficulty: 'medium',
    description: [
      'You start at index 0 of `nums`, where each value is the maximum jump length from that position. Return true if you can reach the last index.',
    ],
    examples: [
      { input: 'nums = [2, 3, 1, 1, 4]', output: 'true' },
      { input: 'nums = [3, 2, 1, 0, 4]', output: 'false', note: 'You always land on index 3 and its value is 0.' },
    ],
    constraints: ['1 <= nums.length <= 10^4', '0 <= nums[i] <= 10^5'],
    hints: [
      'DP over positions works but is O(n²). What single number summarises everything you have seen so far?',
      'Track the furthest index reachable. If the current index is past it, you are stuck.',
    ],
    starter: `/**
 * Can you reach the last index?
 */
export function canJump(nums: number[]): boolean {
  // your code
  return false
}
`,
    solution: `export function canJump(nums: number[]): boolean {
  let reach = 0
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false
    reach = Math.max(reach, i + nums[i])
    if (reach >= nums.length - 1) return true
  }
  return true
}
`,
    tests: [
      { call: 'canJump([2, 3, 1, 1, 4])', expected: true },
      { call: 'canJump([3, 2, 1, 0, 4])', expected: false },
      { call: 'canJump([0])', expected: true },
      { call: 'canJump([0, 1])', expected: false },
    ],
  },
  {
    id: 'kth-largest-element',
    track: 'coding',
    source: 'builtin',
    title: 'Kth Largest Element',
    topic: 'Heaps & Priority Queues',
    pattern: 'Min-heap of size k, or quickselect',
    difficulty: 'medium',
    description: [
      'Given an integer array `nums` and an integer `k`, return the kth largest element in sorted order (not the kth distinct element).',
      'Sorting is O(n log n). Can you do better on average, or with O(k) extra space?',
    ],
    examples: [
      { input: 'nums = [3, 2, 1, 5, 6, 4], k = 2', output: '5' },
      { input: 'nums = [3, 2, 3, 1, 2, 4, 5, 5, 6], k = 4', output: '4' },
    ],
    constraints: ['1 <= k <= nums.length <= 10^5'],
    hints: [
      'Keep a min-heap of the k largest values seen; its top is the answer. O(n log k).',
      'Quickselect partitions like quicksort but recurses into one side only: O(n) average.',
      'TypeScript has no built-in heap, so be ready to write a small one or use quickselect.',
    ],
    starter: `/**
 * The kth largest value in nums.
 */
export function findKthLargest(nums: number[], k: number): number {
  // your code
  return 0
}
`,
    solution: `export function findKthLargest(nums: number[], k: number): number {
  const a = nums.slice()
  const target = a.length - k // index in ascending order
  let lo = 0
  let hi = a.length - 1
  while (lo < hi) {
    const pivot = a[lo + Math.floor(Math.random() * (hi - lo + 1))]
    let i = lo
    let j = hi
    while (i <= j) {
      while (a[i] < pivot) i++
      while (a[j] > pivot) j--
      if (i <= j) {
        ;[a[i], a[j]] = [a[j], a[i]]
        i++
        j--
      }
    }
    if (target <= j) hi = j
    else if (target >= i) lo = i
    else return a[target]
  }
  return a[target]
}
`,
    tests: [
      { call: 'findKthLargest([3, 2, 1, 5, 6, 4], 2)', expected: 5 },
      { call: 'findKthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)', expected: 4 },
      { call: 'findKthLargest([1], 1)', expected: 1 },
      { call: 'findKthLargest([2, 1], 2)', expected: 1 },
    ],
  },
  {
    id: 'coin-change',
    track: 'coding',
    source: 'builtin',
    title: 'Coin Change',
    topic: 'Dynamic Programming',
    pattern: '1D DP, unbounded knapsack',
    difficulty: 'medium',
    description: [
      'Given coin denominations `coins` and an `amount`, return the fewest coins needed to make that amount, or -1 if it cannot be made. You have unlimited coins of each denomination.',
    ],
    examples: [
      { input: 'coins = [1, 2, 5], amount = 11', output: '3', note: '5 + 5 + 1' },
      { input: 'coins = [2], amount = 3', output: '-1' },
      { input: 'coins = [1], amount = 0', output: '0' },
    ],
    constraints: ['1 <= coins.length <= 12', '0 <= amount <= 10^4'],
    hints: [
      'Greedy (largest coin first) fails: coins [1, 3, 4], amount 6.',
      'dp[a] = fewest coins for amount a. dp[a] = 1 + min(dp[a - c]) over coins c <= a.',
      'Fill dp from 0 to amount; use Infinity for unreachable amounts.',
    ],
    starter: `/**
 * Fewest coins to make amount, or -1.
 */
export function coinChange(coins: number[], amount: number): number {
  // your code
  return -1
}
`,
    solution: `export function coinChange(coins: number[], amount: number): number {
  const dp = new Array<number>(amount + 1).fill(Infinity)
  dp[0] = 0
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount]
}
`,
    tests: [
      { call: 'coinChange([1, 2, 5], 11)', expected: 3 },
      { call: 'coinChange([2], 3)', expected: -1 },
      { call: 'coinChange([1], 0)', expected: 0 },
      { call: 'coinChange([1, 3, 4], 6)', expected: 2 },
    ],
  },
  {
    id: 'level-order-traversal',
    track: 'coding',
    source: 'builtin',
    title: 'Binary Tree Level Order Traversal',
    topic: 'Graphs & Trees',
    pattern: 'BFS by level',
    difficulty: 'medium',
    description: [
      'Given the `root` of a binary tree, return its nodes\' values level by level, left to right, as an array of arrays.',
      'Nodes are plain objects of the shape `{ val, left, right }` (see the `TreeNode` interface in the starter).',
    ],
    examples: [
      { input: 'root = [3, 9, 20, null, null, 15, 7]', output: '[[3], [9, 20], [15, 7]]' },
      { input: 'root = [1]', output: '[[1]]' },
      { input: 'root = []', output: '[]' },
    ],
    hints: [
      'A queue gives BFS. To separate levels, note the queue length at the start of each round and process exactly that many nodes.',
    ],
    starter: TREE_NODE + `/**
 * Values level by level.
 */
export function levelOrder(root: TreeNode | null): number[][] {
  // your code
  return []
}
`,
    solution: TREE_NODE + `export function levelOrder(root: TreeNode | null): number[][] {
  const out: number[][] = []
  if (!root) return out
  let queue: TreeNode[] = [root]
  while (queue.length > 0) {
    const next: TreeNode[] = []
    out.push(queue.map((n) => n.val))
    for (const n of queue) {
      if (n.left) next.push(n.left)
      if (n.right) next.push(n.right)
    }
    queue = next
  }
  return out
}
`,
    tests: [
      {
        call: 'levelOrder({ val: 3, left: { val: 9, left: null, right: null }, right: { val: 20, left: { val: 15, left: null, right: null }, right: { val: 7, left: null, right: null } } })',
        expected: [[3], [9, 20], [15, 7]],
      },
      { call: 'levelOrder({ val: 1, left: null, right: null })', expected: [[1]] },
      { call: 'levelOrder(null)', expected: [] },
    ],
  },
  {
    id: 'validate-bst',
    track: 'coding',
    source: 'builtin',
    title: 'Validate Binary Search Tree',
    topic: 'Graphs & Trees',
    pattern: 'DFS with bounds',
    difficulty: 'medium',
    description: [
      'Given the `root` of a binary tree, return true if it is a valid binary search tree: every node in a left subtree is strictly less than its ancestor, every node in a right subtree strictly greater.',
      'Nodes are plain objects `{ val, left, right }`.',
    ],
    examples: [
      { input: 'root = [2, 1, 3]', output: 'true' },
      { input: 'root = [5, 1, 4, null, null, 3, 6]', output: 'false', note: 'The 4 in the right subtree is less than 5... and so is the 3 under it.' },
    ],
    hints: [
      'Checking only parent vs child misses the classic bug: a grandchild that violates a grandparent\'s bound.',
      'Pass down (min, max) bounds. Each node must sit strictly inside them; tighten the bound you pass to each child.',
      'An in-order traversal of a BST is strictly increasing; that is an equally good approach.',
    ],
    starter: TREE_NODE + `/**
 * Is this a valid binary search tree?
 */
export function isValidBST(root: TreeNode | null): boolean {
  // your code
  return false
}
`,
    solution: TREE_NODE + `export function isValidBST(root: TreeNode | null): boolean {
  const ok = (n: TreeNode | null, lo: number, hi: number): boolean =>
    n === null || (n.val > lo && n.val < hi && ok(n.left, lo, n.val) && ok(n.right, n.val, hi))
  return ok(root, -Infinity, Infinity)
}
`,
    tests: [
      { call: 'isValidBST({ val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } })', expected: true },
      {
        call: 'isValidBST({ val: 5, left: { val: 1, left: null, right: null }, right: { val: 4, left: { val: 3, left: null, right: null }, right: { val: 6, left: null, right: null } } })',
        expected: false,
      },
      { call: 'isValidBST({ val: 5, left: { val: 1, left: null, right: { val: 7, left: null, right: null } }, right: null })', expected: false },
      { call: 'isValidBST(null)', expected: true },
    ],
  },
  {
    id: 'search-rotated-array',
    track: 'coding',
    source: 'builtin',
    title: 'Search in Rotated Sorted Array',
    topic: 'Binary Search',
    pattern: 'Binary search on a rotated array',
    difficulty: 'medium',
    description: [
      'A sorted array of distinct integers was rotated at an unknown pivot (e.g. [0,1,2,4,5,6,7] became [4,5,6,7,0,1,2]). Return the index of `target`, or -1, in O(log n) time.',
    ],
    examples: [
      { input: 'nums = [4, 5, 6, 7, 0, 1, 2], target = 0', output: '4' },
      { input: 'nums = [4, 5, 6, 7, 0, 1, 2], target = 3', output: '-1' },
      { input: 'nums = [1], target = 0', output: '-1' },
    ],
    hints: [
      'At any mid, at least one half (left or right of mid) is properly sorted. Decide which, then check whether target lies inside that sorted half.',
      'If target is inside the sorted half, search it; otherwise search the other half.',
    ],
    starter: `/**
 * Index of target in a rotated sorted array, or -1.
 */
export function searchRotated(nums: number[], target: number): number {
  // your code
  return -1
}
`,
    solution: `export function searchRotated(nums: number[], target: number): number {
  let lo = 0
  let hi = nums.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (nums[mid] === target) return mid
    if (nums[lo] <= nums[mid]) {
      // left half sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1
      else lo = mid + 1
    } else {
      // right half sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1
      else hi = mid - 1
    }
  }
  return -1
}
`,
    tests: [
      { call: 'searchRotated([4, 5, 6, 7, 0, 1, 2], 0)', expected: 4 },
      { call: 'searchRotated([4, 5, 6, 7, 0, 1, 2], 3)', expected: -1 },
      { call: 'searchRotated([1], 0)', expected: -1 },
      { call: 'searchRotated([5, 1, 3], 5)', expected: 0 },
    ],
  },
  {
    id: 'min-window-substring',
    track: 'coding',
    source: 'builtin',
    title: 'Minimum Window Substring',
    topic: 'Sliding Window',
    pattern: 'Sliding window with a need-count',
    difficulty: 'hard',
    description: [
      'Given strings `s` and `t`, return the shortest substring of `s` that contains every character of `t` (with multiplicity). Return "" if there is none.',
    ],
    examples: [
      { input: 's = "ADOBECODEBANC", t = "ABC"', output: '"BANC"' },
      { input: 's = "a", t = "a"', output: '"a"' },
      { input: 's = "a", t = "aa"', output: '""' },
    ],
    constraints: ['1 <= s.length, t.length <= 10^5', 'Aim for O(|s| + |t|).'],
    hints: [
      'Count what t needs. Expand the right edge until the window satisfies every need, then shrink the left edge while it still does.',
      'Track how many distinct characters are currently satisfied ("formed") so the check is O(1), not a map comparison.',
    ],
    starter: `/**
 * Shortest substring of s containing all characters of t.
 */
export function minWindow(s: string, t: string): string {
  // your code
  return ''
}
`,
    solution: `export function minWindow(s: string, t: string): string {
  if (t.length > s.length) return ''
  const need = new Map<string, number>()
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1)
  const have = new Map<string, number>()
  let formed = 0
  let best: [number, number] = [0, Infinity]
  let left = 0
  for (let right = 0; right < s.length; right++) {
    const ch = s[right]
    if (!need.has(ch)) continue
    have.set(ch, (have.get(ch) ?? 0) + 1)
    if (have.get(ch) === need.get(ch)) formed++
    while (formed === need.size) {
      if (right - left < best[1] - best[0]) best = [left, right]
      const l = s[left]
      if (need.has(l)) {
        if (have.get(l) === need.get(l)) formed--
        have.set(l, have.get(l)! - 1)
      }
      left++
    }
  }
  return best[1] === Infinity ? '' : s.slice(best[0], best[1] + 1)
}
`,
    tests: [
      { call: 'minWindow("ADOBECODEBANC", "ABC")', expected: 'BANC' },
      { call: 'minWindow("a", "a")', expected: 'a' },
      { call: 'minWindow("a", "aa")', expected: '' },
      { call: 'minWindow("ab", "b")', expected: 'b' },
    ],
  },
  {
    id: 'shortest-path-grid',
    track: 'coding',
    source: 'builtin',
    title: 'Shortest Path in a Grid',
    topic: 'Graphs & Trees',
    pattern: 'BFS shortest path on a grid',
    difficulty: 'medium',
    description: [
      'Given a grid of 0 (open) and 1 (wall), return the length of the shortest path from the top-left cell to the bottom-right cell moving up, down, left or right, counting cells visited including both ends. Return -1 if there is no path.',
    ],
    examples: [
      { input: 'grid = [[0, 0, 0], [1, 1, 0], [0, 0, 0]]', output: '5' },
      { input: 'grid = [[0, 1], [1, 0]]', output: '-1' },
      { input: 'grid = [[0]]', output: '1' },
    ],
    hints: [
      'Unweighted shortest path means BFS, never DFS. Mark cells visited when you enqueue them, not when you dequeue them.',
      'Process the queue level by level so you know the distance of the cell you are expanding.',
    ],
    starter: `/**
 * Length of the shortest open path from (0,0) to (rows-1, cols-1), or -1.
 */
export function shortestPath(grid: number[][]): number {
  // your code
  return -1
}
`,
    solution: `export function shortestPath(grid: number[][]): number {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  if (rows === 0 || cols === 0 || grid[0][0] === 1 || grid[rows - 1][cols - 1] === 1) return -1
  const seen = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false))
  let frontier: [number, number][] = [[0, 0]]
  seen[0][0] = true
  let dist = 1
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  while (frontier.length > 0) {
    const next: [number, number][] = []
    for (const [r, c] of frontier) {
      if (r === rows - 1 && c === cols - 1) return dist
      for (const [dr, dc] of dirs) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen[nr][nc] || grid[nr][nc] === 1) continue
        seen[nr][nc] = true
        next.push([nr, nc])
      }
    }
    frontier = next
    dist++
  }
  return -1
}
`,
    tests: [
      { call: 'shortestPath([[0, 0, 0], [1, 1, 0], [0, 0, 0]])', expected: 5 },
      { call: 'shortestPath([[0, 1], [1, 0]])', expected: -1 },
      { call: 'shortestPath([[0]])', expected: 1 },
      { call: 'shortestPath([[0, 0], [0, 0]])', expected: 3 },
    ],
  },
]

export const CODING_PROBLEMS: CodeProblem[] = [...fromDraft, ...added]
