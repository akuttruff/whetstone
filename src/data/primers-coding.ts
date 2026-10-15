import type { Primer } from '../types.ts'

const c = (p: Omit<Primer, 'track'>): Primer => ({ ...p, track: 'coding' })

export const PRIMERS_CODING: Primer[] = [
  c({
    topic: 'Arrays & Hashing',
    summary: 'Most "find a pair / count / group / dedupe" questions are one pass with a Map or Set trading O(n) memory for O(1) lookups. The skill is choosing what to key the map by.',
    recognize: ['"Find two elements that…", "does X appear…", "group by…", "count of subarrays whose…"', 'Unsorted input where sorting would cost O(n log n) and the target is O(n)', 'Anything that needs "have I seen this before" or "how many of these so far"'],
    techniques: [
      {
        name: 'Seen-set / complement lookup', when: 'Pairs that satisfy a relation (sum to k, differ by d) or duplicate detection.',
        how: ['Walk once; for each element compute the partner you would need (target - x)', 'Check the map for it; if present you are done, else record the current element', 'Record after checking so an element does not pair with itself'],
        complexity: 'O(n) time, O(n) space',
        template: `const seen = new Map<number, number>() // value -> index\nfor (let i = 0; i < nums.length; i++) {\n  const need = target - nums[i]\n  if (seen.has(need)) return [seen.get(need)!, i]\n  seen.set(nums[i], i)\n}`,
      },
      {
        name: 'Frequency counting', when: 'Anagrams, top-k frequent, "majority", "first unique".',
        how: ['Map<item, count> in one pass', 'Then answer from the counts: compare two maps, bucket by count (bucket sort gives O(n) top-k), or scan for count === 1'],
        complexity: 'O(n) time, O(k) space for k distinct items',
        template: `const counts = new Map<string, number>()\nfor (const x of items) counts.set(x, (counts.get(x) ?? 0) + 1)\n// top-k without a heap: buckets by count\nconst buckets: string[][] = Array.from({ length: items.length + 1 }, () => [])\nfor (const [x, n] of counts) buckets[n].push(x)`,
      },
      {
        name: 'Canonical key grouping', when: '"Group the ones that are the same under some transformation" (anagrams, rotations, equivalent fractions).',
        how: ['Define a canonical form that is equal exactly when the items belong together (sorted chars, 26-count signature, reduced fraction)', 'Map<key, item[]>'],
        complexity: 'O(n·k) with a linear key, O(n·k log k) with sorting',
        template: `const groups = new Map<string, string[]>()\nfor (const s of strs) {\n  const key = [...s].sort().join('') // or a count signature\n  ;(groups.get(key) ?? groups.set(key, []).get(key)!).push(s)\n}`,
      },
      {
        name: 'Prefix sums with a map', when: 'Count or find subarrays with a given sum, especially with negatives (a window cannot shrink reliably).',
        how: ['sum(i..j) = prefix[j] - prefix[i-1]; keep a running prefix', 'Map<prefixValue, count>; at each step add count of (prefix - k) seen', 'Seed the map with {0: 1} for subarrays starting at index 0'],
        complexity: 'O(n) time and space',
        template: `const seen = new Map<number, number>([[0, 1]])\nlet prefix = 0, count = 0\nfor (const x of nums) {\n  prefix += x\n  count += seen.get(prefix - k) ?? 0\n  seen.set(prefix, (seen.get(prefix) ?? 0) + 1)\n}`,
      },
      {
        name: 'Prefix and suffix passes', when: '"For each index, something about everything to its left and right" (product except self, trapping water variants, pivot index).',
        how: ['One pass left to right accumulating; one pass right to left accumulating', 'Combine; often the second pass can be folded into a running variable for O(1) extra space'],
        complexity: 'O(n) time',
      },
      {
        name: 'Set-based sequence walking', when: 'Longest consecutive run of values, "can we reach", membership-heavy logic.',
        how: ['Put everything in a Set', 'Only start work from natural starting points (n where n-1 is absent) so each element is touched O(1) times'],
        complexity: 'O(n)',
      },
    ],
    pitfalls: ['Using an object as a map with numeric keys (keys become strings; order surprises); use Map', 'Forgetting that the same element cannot be used twice (check before insert)', 'Keying by a mutable or non-canonical value (arrays as keys compare by reference)', 'Reaching for sorting when a single pass with a map is asked for'],
    checklist: ['State brute force first (O(n²)) and why it is too slow', 'Say what the map is keyed by and what it stores, before coding', 'Call out the space trade-off and whether duplicates/negatives/empty input change anything'],
  }),
  c({
    topic: 'Two Pointers',
    summary: 'When input is sorted or the answer depends on a pair/partition, two indices moving with a rule replace nested loops. The rule is the whole solution: decide what moving each pointer guarantees.',
    recognize: ['Sorted array, or you are allowed to sort', '"Pair/triple summing to…", "container", "palindrome", "remove in place", "merge"', 'Reads like "scan from both ends" or "a slow and a fast cursor"'],
    techniques: [
      {
        name: 'Converging pointers (sorted)', when: 'Pair with a target sum, container with most water, palindromes.',
        how: ['l = 0, r = n-1', 'Compare the pair to the target; move the pointer that can only improve things (sum too small → l++; too big → r--)', 'For triples, fix one element and run the pair search on the rest; skip duplicates'],
        complexity: 'O(n) per pass, O(n²) for 3Sum after an O(n log n) sort',
        template: `let l = 0, r = nums.length - 1\nwhile (l < r) {\n  const sum = nums[l] + nums[r]\n  if (sum === target) return [l, r]\n  if (sum < target) l++\n  else r--\n}`,
      },
      {
        name: 'Read/write pointers (in place)', when: '"Remove / compact / dedupe in place and return the new length".',
        how: ['write marks where the next kept element goes; read scans everything', 'When read finds a keeper, copy it to write and advance write'],
        complexity: 'O(n) time, O(1) space',
        template: `let write = 0\nfor (let read = 0; read < nums.length; read++) {\n  if (keep(nums[read])) nums[write++] = nums[read]\n}\nreturn write`,
      },
      {
        name: 'Fast and slow', when: 'Linked-list cycles, middle of a list, k-th from end, "nth node".',
        how: ['Advance fast by two (or by k first), slow by one', 'When fast reaches the end, slow is at the middle (or n-k)', 'If fast meets slow, there is a cycle'],
        complexity: 'O(n) time, O(1) space',
      },
      {
        name: 'Merge of two sequences', when: 'Merging sorted arrays/lists, interval intersection, comparing two sorted sets.',
        how: ['One index per sequence; emit the smaller head and advance that index', 'Append whatever remains'],
        complexity: 'O(n + m)',
      },
      {
        name: 'Two running maxima', when: 'Trapping rain water: the water over a cell is bounded by the smaller of the max on each side.',
        how: ['Keep leftMax and rightMax; process the side whose max is smaller, since it is the binding constraint', 'Add min(max) - height for that cell and move inward'],
        complexity: 'O(n) time, O(1) space',
      },
    ],
    pitfalls: ['Moving the wrong pointer; prove which move cannot lose the optimum', 'Off-by-one on l < r vs l <= r (does a pointer pair with itself?)', 'Forgetting to skip duplicates when the output must be unique', 'Applying it to unsorted input without sorting first'],
    checklist: ['Say why moving a pointer is safe (what it rules out)', 'Mention sorting cost if you sort', 'Walk one example by hand before coding'],
  }),
  c({
    topic: 'Sliding Window',
    summary: 'Contiguous subarray/substring questions with a "longest / shortest / count satisfying a condition" shape. Maintain a window that is always valid (or just became invalid), expand the right edge, shrink the left; every element enters and leaves once.',
    recognize: ['"Contiguous", "substring", "subarray", "window of size k"', '"Longest with at most k…", "shortest containing…", "maximum sum of k consecutive"', 'Condition is monotonic: making the window bigger can only make it worse (or better) in one direction'],
    techniques: [
      {
        name: 'Fixed-size window', when: 'Size k is given: max sum of k, averages, anagram occurrences.',
        how: ['Build the first window', 'Slide: add nums[i], remove nums[i-k], update the answer'],
        complexity: 'O(n)',
        template: `let sum = 0, best = -Infinity\nfor (let i = 0; i < nums.length; i++) {\n  sum += nums[i]\n  if (i >= k) sum -= nums[i - k]\n  if (i >= k - 1) best = Math.max(best, sum)\n}`,
      },
      {
        name: 'Variable window, longest valid', when: 'Longest substring without repeats / with at most k distinct / at most k zeros flipped.',
        how: ['Expand right; update counts', 'While the window is invalid, shrink from the left', 'Record right - left + 1 after restoring validity'],
        complexity: 'O(n)',
        template: `const count = new Map<string, number>()\nlet left = 0, best = 0\nfor (let right = 0; right < s.length; right++) {\n  count.set(s[right], (count.get(s[right]) ?? 0) + 1)\n  while (/* invalid */ count.size > k) {\n    const l = s[left++]\n    if (count.get(l) === 1) count.delete(l); else count.set(l, count.get(l)! - 1)\n  }\n  best = Math.max(best, right - left + 1)\n}`,
      },
      {
        name: 'Variable window, shortest valid', when: 'Minimum window substring, shortest subarray with sum ≥ s (positives).',
        how: ['Expand right until the window satisfies the condition', 'While it still satisfies, record the length and shrink from the left'],
        complexity: 'O(n)',
        template: `let left = 0, best = Infinity\nfor (let right = 0; right < n; right++) {\n  add(right)\n  while (valid()) {\n    best = Math.min(best, right - left + 1)\n    remove(left++)\n  }\n}`,
      },
      {
        name: 'Need/have with a "formed" counter', when: 'Window must contain every character of t with multiplicity.',
        how: ['need = counts of t; have = counts in window; formed = number of chars whose have === need', 'Valid when formed === need.size; update formed only on crossings so each step is O(1)'],
        complexity: 'O(|s| + |t|)',
      },
      {
        name: 'Monotonic deque', when: 'Max or min of every window of size k.',
        how: ['Deque of indices with decreasing values (for max)', 'Push: pop smaller tail values; pop head if it fell out of the window; head is the answer'],
        complexity: 'O(n)',
        template: `const dq: number[] = [] // indices, values decreasing\nfor (let i = 0; i < nums.length; i++) {\n  while (dq.length && nums[dq[dq.length - 1]] < nums[i]) dq.pop()\n  dq.push(i)\n  if (dq[0] <= i - k) dq.shift()\n  if (i >= k - 1) out.push(nums[dq[0]])\n}`,
      },
    ],
    pitfalls: ['Using a window when values can be negative and the condition is not monotonic (use prefix sums + map instead)', 'Shrinking with if instead of while', 'Updating the answer before the window is valid again', 'Array.shift() on a plain array inside the loop is O(n); fine for a deque of indices in practice but say so'],
    checklist: ['Name the invariant the window keeps', 'State why each element is processed at most twice', 'Check empty string, k larger than n, all identical'],
  }),
  c({
    topic: 'Stack & Queue',
    summary: 'A stack answers "what is the most recent unresolved thing": matching brackets, evaluating expressions, and the whole family of "next greater/smaller element" questions via a monotonic stack. Queues drive BFS and anything first-in-first-out.',
    recognize: ['Nested or matched structures (brackets, tags, directory paths)', '"Next greater element", "days until warmer", "largest rectangle", "stock span"', 'Postfix/RPN evaluation, undo/redo, iterator design, O(1) min tracking'],
    techniques: [
      {
        name: 'Matching with a stack', when: 'Valid parentheses, simplify path, decode nested strings.',
        how: ['Push openers; on a closer check the top matches and pop', 'Valid iff the stack is empty at the end'],
        complexity: 'O(n)',
      },
      {
        name: 'Monotonic stack', when: 'For each element, the nearest element to the left/right that is greater/smaller.',
        how: ['Keep a stack of indices whose answers are unknown, values monotonic', 'When a new element breaks monotonicity, pop and resolve each popped index with the current one', 'Push the current index; whatever remains has no answer'],
        complexity: 'O(n): each index is pushed and popped once',
        template: `const stack: number[] = [] // indices, values decreasing\nconst answer = new Array(n).fill(0)\nfor (let i = 0; i < n; i++) {\n  while (stack.length && a[stack[stack.length - 1]] < a[i]) {\n    const j = stack.pop()!\n    answer[j] = i - j // next greater is at i\n  }\n  stack.push(i)\n}`,
      },
      {
        name: 'Histogram / sentinel trick', when: 'Largest rectangle in a histogram, maximal rectangle in a matrix.',
        how: ['Increasing stack of indices; when a shorter bar arrives, pop and compute height × width using the new top as the left bound', 'Append a 0 height at the end to flush'],
        complexity: 'O(n)',
      },
      {
        name: 'Auxiliary stack', when: 'Min stack / max stack with O(1) queries.',
        how: ['Store (value, minSoFar) pairs, or a parallel stack of minima'],
        complexity: 'O(1) per operation',
      },
      {
        name: 'Queue and BFS', when: 'Shortest path in unweighted graphs, level order, "minimum steps".',
        how: ['Enqueue the start; mark visited on enqueue; process level by level by taking the queue length at the start of each round'],
        complexity: 'O(V + E)',
      },
    ],
    pitfalls: ['Popping from an empty stack (check length)', 'Choosing the wrong monotonic direction (increasing vs decreasing) for greater vs smaller', 'Marking visited on dequeue instead of enqueue in BFS (duplicates in the queue)', 'Using shift() on a huge array as a queue in hot loops; use an index or a deque when it matters'],
    checklist: ['Say what the stack holds and the invariant it keeps', 'Explain the amortised O(n) argument', 'Test with all-increasing and all-decreasing inputs'],
  }),
  c({
    topic: 'Sorting & Sweeping',
    summary: 'Sort by one coordinate and sweep; most interval problems fall out. Know when sorting by start vs by end is the right greedy, and when a sweep over event points (starts and ends separately) answers "how many at once".',
    recognize: ['Intervals, meetings, bookings, ranges', '"Merge", "insert", "minimum removals", "minimum rooms", "can attend all"', 'Pairs where order matters only by one key'],
    techniques: [
      {
        name: 'Sort by start, merge', when: 'Merge overlapping intervals.',
        how: ['Sort by start', 'Keep the current merged interval; if the next starts ≤ current end, extend; else push and start a new one'],
        complexity: 'O(n log n)',
        template: `intervals.sort((a, b) => a[0] - b[0])\nconst out = [intervals[0]]\nfor (const [s, e] of intervals.slice(1)) {\n  const last = out[out.length - 1]\n  if (s <= last[1]) last[1] = Math.max(last[1], e)\n  else out.push([s, e])\n}`,
      },
      {
        name: 'Sort by end, greedy keep', when: 'Maximum non-overlapping intervals; minimum removals; activity selection.',
        how: ['Sort by end; keep an interval if it starts at or after the last kept end', 'Earliest finishing leaves the most room: the exchange argument'],
        complexity: 'O(n log n)',
      },
      {
        name: 'Event sweep', when: 'Max concurrent intervals (meeting rooms II), skyline-style counting.',
        how: ['Separate starts and ends, sort both', 'Walk starts; if the next start is before the earliest end, open a new room, else close one', 'Or create +1/-1 events, sort by time (ends before starts on ties), prefix-sum'],
        complexity: 'O(n log n)',
      },
      {
        name: 'Three-phase insert', when: 'Insert an interval into a sorted non-overlapping list.',
        how: ['Copy intervals ending before the new start; merge everything that overlaps; copy the rest'],
        complexity: 'O(n)',
      },
      {
        name: 'Custom comparators', when: 'Sort by multiple keys, largest number from digits, version strings.',
        how: ['Write the comparator as "a before b iff …", test it on a 2-element case', 'Prefer numeric subtraction only for numbers; strings need localeCompare or explicit compare'],
        complexity: 'O(n log n)',
      },
    ],
    pitfalls: ['Array.sort() without a comparator sorts numbers lexicographically', 'Touching endpoints: decide whether [1,2] and [2,3] overlap and be consistent', 'Mutating the input when the caller may not expect it', 'Confusing "sort by end" (keep most) with "sort by start" (merge)'],
    checklist: ['State the sort key and why', 'Give the exchange argument for the greedy', 'Mention O(n log n) and whether a linear-time alternative exists (bucket by time)'],
  }),
  c({
    topic: 'Linked Lists',
    summary: 'Pointer surgery with a dummy head and a careful order of reassignment. Draw the boxes. Most problems are reversal, two-cursor tricks, or merging.',
    recognize: ['"Reverse", "merge", "remove nth from end", "reorder", "cycle", "intersection"', 'Explicit ListNode with next pointers; often O(1) extra space is demanded'],
    techniques: [
      {
        name: 'Dummy head', when: 'Any insertion/removal that could touch the first node.',
        how: ['const dummy = { val: 0, next: head }; work from dummy; return dummy.next'],
        complexity: '—',
      },
      {
        name: 'Iterative reversal', when: 'Reverse the whole list or a sublist.',
        how: ['prev = null, curr = head', 'Save next, point curr.next to prev, advance both', 'Return prev'],
        complexity: 'O(n) time, O(1) space',
        template: `let prev: ListNode | null = null\nlet curr = head\nwhile (curr) {\n  const next = curr.next\n  curr.next = prev\n  prev = curr\n  curr = next\n}\nreturn prev`,
      },
      {
        name: 'Fast/slow', when: 'Cycle detection, middle node, palindrome check, k-th from end.',
        how: ['fast moves two, slow moves one; for k-th from end, start fast k ahead', 'Cycle start: after meeting, reset one pointer to head and move both by one'],
        complexity: 'O(n), O(1) space',
      },
      {
        name: 'Merge with two cursors', when: 'Merge two sorted lists; merge k with a heap or pairwise.',
        how: ['Tail pointer from a dummy; attach the smaller head; attach the remainder at the end'],
        complexity: 'O(n + m); O(N log k) for k lists',
      },
      {
        name: 'Digit-by-digit arithmetic', when: 'Add two numbers stored as lists.',
        how: ['Loop while either list or a carry remains; emit sum % 10, carry = floor(sum / 10)'],
        complexity: 'O(max(n, m))',
      },
    ],
    pitfalls: ['Losing the rest of the list by overwriting next before saving it', 'Null dereference at the tail; guard with while (curr && curr.next) where needed', 'Forgetting the final carry', 'Modifying a list that must be returned intact'],
    checklist: ['Draw three nodes and narrate each pointer change', 'Say what the dummy node buys you', 'Test: empty list, one node, two nodes'],
  }),
  c({
    topic: 'Binary Search',
    summary: 'Any monotonic predicate over an index range can be searched in O(log n): sorted arrays, rotated arrays, and "the smallest value that works" (binary search on the answer). Get the loop invariant right and the off-by-ones disappear.',
    recognize: ['Sorted (or rotated sorted) input; "O(log n)" stated', '"Minimum k such that…", "maximum capacity that still…", feasibility checks that are monotonic', '2D matrix with sorted rows and columns'],
    techniques: [
      {
        name: 'Exact match', when: 'Find target in a sorted array.',
        how: ['lo = 0, hi = n-1; while lo <= hi: mid; compare; narrow'],
        complexity: 'O(log n)',
        template: `let lo = 0, hi = nums.length - 1\nwhile (lo <= hi) {\n  const mid = (lo + hi) >> 1\n  if (nums[mid] === target) return mid\n  if (nums[mid] < target) lo = mid + 1\n  else hi = mid - 1\n}\nreturn -1`,
      },
      {
        name: 'First true / lower bound', when: 'Leftmost position where a predicate becomes true (insert position, first bad version, smallest feasible answer).',
        how: ['lo = 0, hi = n (hi exclusive); while lo < hi: mid; if ok(mid) hi = mid else lo = mid + 1', 'Return lo; it is n if nothing is true'],
        complexity: 'O(log n) × cost of the predicate',
        template: `let lo = 0, hi = n // answer in [lo, hi]\nwhile (lo < hi) {\n  const mid = (lo + hi) >> 1\n  if (ok(mid)) hi = mid\n  else lo = mid + 1\n}\nreturn lo`,
      },
      {
        name: 'Binary search on the answer', when: 'Koko bananas, ship packages in D days, split array largest sum, minimum speed.',
        how: ['Define feasible(k) that is monotonic in k', 'Search k over [min possible, max possible] with the first-true template', 'The predicate is usually an O(n) greedy simulation'],
        complexity: 'O(n log(range))',
      },
      {
        name: 'Rotated array', when: 'Search or find min in a rotated sorted array.',
        how: ['At mid, one half is sorted; check whether target lies in the sorted half', 'For min: compare nums[mid] to nums[hi]'],
        complexity: 'O(log n)',
      },
      {
        name: 'Partition search', when: 'Median of two sorted arrays, k-th smallest in sorted matrix.',
        how: ['Search the cut position in the smaller array; the other cut is implied', 'Check the cross conditions with ±Infinity sentinels'],
        complexity: 'O(log(min(m, n)))',
      },
    ],
    pitfalls: ['Mixing the two templates (lo <= hi with hi = mid loops forever)', 'Integer overflow in other languages; in JS (lo + hi) >> 1 is fine below 2^31', 'A predicate that is not monotonic; binary search gives garbage silently', 'Returning mid when the question asked for the boundary'],
    checklist: ['State the invariant: the answer is always in [lo, hi]', 'Say which template you are using and why', 'Test with n = 0, 1, 2 and target at both ends'],
  }),
  c({
    topic: 'Dynamic Programming',
    summary: 'Overlapping subproblems with optimal substructure. Define the state in words, write the recurrence, pick an order, and only then optimise space. Most interview DP is 1D over positions, 2D over two sequences or a grid, or knapsack over items × capacity.',
    recognize: ['"Number of ways", "minimum cost", "longest/shortest … subsequence", "can it be done"', 'Choices at each step with the future depending only on a small summary of the past', 'Brute-force recursion that recomputes the same inputs'],
    techniques: [
      {
        name: 'Top-down memoisation', when: 'The recurrence is natural to write recursively; the state space is large but reachable states are few.',
        how: ['Write the plain recursion in terms of state parameters', 'Add a Map/array cache keyed by the state; return cached results', 'Watch recursion depth (10^4+ levels can overflow); convert to bottom-up if so'],
        complexity: 'O(states × transitions)',
        template: `const memo = new Map<string, number>()\nconst f = (i: number, j: number): number => {\n  const key = i + ',' + j\n  if (memo.has(key)) return memo.get(key)!\n  // base cases...\n  const result = Math.min(f(i - 1, j) + 1, f(i, j - 1) + 1)\n  memo.set(key, result)\n  return result\n}`,
      },
      {
        name: '1D over positions', when: 'Climbing stairs, house robber, decode ways, max subarray (Kadane), coin change.',
        how: ['dp[i] = answer for the prefix (or ending at i)', 'Recurrence looks back a constant number of steps or over all coins', 'Roll to O(1) space when only the last k values are used'],
        complexity: 'O(n) or O(n·k)',
        template: `const dp = new Array(n + 1).fill(0)\ndp[0] = 1\nfor (let i = 1; i <= n; i++) {\n  dp[i] = dp[i - 1] + (i >= 2 ? dp[i - 2] : 0)\n}`,
      },
      {
        name: '2D over two sequences', when: 'LCS, edit distance, regex matching, interleaving strings.',
        how: ['dp[i][j] = answer for the first i of A and first j of B', 'If A[i-1] matches B[j-1], extend the diagonal; else combine the three neighbours', 'Row 0 and column 0 are the base cases; keep two rows for O(min(m, n)) space'],
        complexity: 'O(m·n)',
        template: `let prev = new Array(n + 1).fill(0)\nfor (let i = 1; i <= m; i++) {\n  const cur = new Array(n + 1).fill(0)\n  for (let j = 1; j <= n; j++) {\n    cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1])\n  }\n  prev = cur\n}`,
      },
      {
        name: 'Knapsack (0/1 and unbounded)', when: 'Subset sum, partition equal subset, coin change, target sum, combination counts.',
        how: ['dp over capacity; for 0/1 iterate capacity downward so each item is used once; for unbounded iterate upward', 'Counting ways vs minimising count changes the combine operation (+ vs min)'],
        complexity: 'O(items × capacity)',
        template: `const can = new Array(target + 1).fill(false)\ncan[0] = true\nfor (const x of nums) {\n  for (let s = target; s >= x; s--) if (can[s - x]) can[s] = true // 0/1\n}`,
      },
      {
        name: 'Grid DP', when: 'Unique paths, min path sum, maximal square, dungeon game.',
        how: ['dp[r][c] from up and left (or down and right for reverse problems)', 'Obstacles zero out a cell; one rolling row suffices'],
        complexity: 'O(m·n)',
      },
      {
        name: 'LIS and patience sorting', when: 'Longest increasing subsequence and its variants (envelopes, chains).',
        how: ['O(n²) DP as the baseline', 'O(n log n): tails[k] = smallest tail of an increasing subsequence of length k+1; binary search each element in'],
        complexity: 'O(n log n)',
      },
      {
        name: 'Interval / range DP', when: 'Burst balloons, matrix chain, palindrome partitioning counts.',
        how: ['dp[i][j] over subarray i..j; iterate by increasing length; choose a split or the last action'],
        complexity: 'O(n³) typically',
      },
    ],
    pitfalls: ['Defining the state vaguely; write "dp[i] is …" as a sentence before coding', 'Wrong iteration order so a value is read before it is computed', 'Using Infinity/-Infinity sentinels then adding to them without a check', 'Greedy where DP is required (coin change with coins [1,3,4] and amount 6)'],
    checklist: ['State: what the subproblem is and its size', 'Recurrence, base cases, order, answer location', 'Time and space, then the space optimisation'],
  }),
  c({
    topic: 'Graphs & Trees',
    summary: 'Traversal (DFS/BFS) is the base; everything else is a traversal with extra bookkeeping: distances, visited sets, topological order, union-find for connectivity, Dijkstra for weighted shortest paths. For trees, decide whether information flows down (parameters) or up (return values).',
    recognize: ['Nodes and edges, grids as implicit graphs, prerequisites, "connected", "reachable", "shortest path"', 'Binary tree with left/right; BST ordering', '"Minimum steps" (BFS), "all paths/components" (DFS), "order with dependencies" (topological sort)'],
    techniques: [
      {
        name: 'DFS (recursive and iterative)', when: 'Components, flood fill, paths, cycle detection, tree properties.',
        how: ['Mark visited before recursing; for grids, bounds-check then check the cell', 'Iterative with an explicit stack when depth may exceed ~10^4'],
        complexity: 'O(V + E)',
        template: `const seen = new Set<number>()\nconst dfs = (u: number): void => {\n  seen.add(u)\n  for (const v of adj.get(u) ?? []) if (!seen.has(v)) dfs(v)\n}`,
      },
      {
        name: 'BFS and multi-source BFS', when: 'Shortest path in unweighted graphs, levels, "time to spread" (rotting oranges), nearest zero.',
        how: ['Queue with all sources at distance 0; process level by level', 'Mark visited when enqueuing'],
        complexity: 'O(V + E)',
        template: `let frontier = [start]\nconst seen = new Set([start])\nlet dist = 0\nwhile (frontier.length) {\n  const next = []\n  for (const u of frontier) for (const v of neighbors(u)) {\n    if (!seen.has(v)) { seen.add(v); next.push(v) }\n  }\n  frontier = next\n  dist++\n}`,
      },
      {
        name: 'Topological sort (Kahn)', when: 'Course schedule, build order, alien dictionary.',
        how: ['Indegree per node; queue of zero-indegree nodes; pop, append to order, decrement neighbours', 'If the order is shorter than V there is a cycle'],
        complexity: 'O(V + E)',
        template: `const indeg = new Array(n).fill(0)\nfor (const [a, b] of edges) indeg[b]++\nconst queue = [...indeg.keys()].filter((i) => indeg[i] === 0)\nconst order = []\nwhile (queue.length) {\n  const u = queue.shift()!\n  order.push(u)\n  for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v)\n}`,
      },
      {
        name: 'Union-Find', when: 'Connected components with incremental edges, cycle detection in undirected graphs, Kruskal MST, "accounts merge".',
        how: ['parent array; find with path compression; union by rank/size', 'Count components as n minus successful unions'],
        complexity: 'Near O(1) amortised per operation',
        template: `const parent = Array.from({ length: n }, (_, i) => i)\nconst find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])))\nconst union = (a: number, b: number): boolean => {\n  const ra = find(a), rb = find(b)\n  if (ra === rb) return false\n  parent[rb] = ra\n  return true\n}`,
      },
      {
        name: 'Dijkstra', when: 'Shortest paths with non-negative weights (network delay, cheapest path with weights).',
        how: ['Min-heap of (distance, node); pop the closest; relax neighbours; skip stale entries', 'Write a small binary heap in TypeScript; know its push/pop'],
        complexity: 'O(E log V)',
      },
      {
        name: 'Bellman-Ford with k rounds', when: 'Shortest path with at most k edges, or negative weights.',
        how: ['Relax all edges k+1 times from a copy of the previous round'],
        complexity: 'O(k·E)',
      },
      {
        name: 'Tree recursion: down vs up', when: 'Validate BST (bounds down), depth/diameter/balanced (height up), LCA, path sums.',
        how: ['Information flowing down becomes parameters (min, max, path so far)', 'Information flowing up becomes return values; a closure variable captures a global best', 'In-order traversal of a BST yields sorted order'],
        complexity: 'O(n)',
        template: `let best = 0\nconst height = (n: TreeNode | null): number => {\n  if (!n) return 0\n  const l = height(n.left), r = height(n.right)\n  best = Math.max(best, l + r) // diameter through n\n  return 1 + Math.max(l, r)\n}`,
      },
      {
        name: 'Trie', when: 'Prefix queries, autocomplete, word search with many words, wildcard matching.',
        how: ['Node = children map + end flag; insert/search walk character by character', 'Wildcards branch over all children (DFS)'],
        complexity: 'O(L) per operation',
      },
      {
        name: 'Grid as a graph', when: 'Islands, shortest path in a maze, pacific-atlantic, surrounded regions.',
        how: ['Neighbours via a dirs array; bounds-check; visited matrix or mutate the grid', 'Reverse thinking: start from the border/targets when "reaches the edge" is asked'],
        complexity: 'O(rows × cols)',
      },
    ],
    pitfalls: ['Visited marked too late (BFS) or never (infinite recursion on cycles)', 'Recursion depth on long chains; use iteration', 'Validating a BST by comparing only parent and child', 'Treating a directed graph as undirected or vice versa'],
    checklist: ['Say the representation (adjacency list, grid) and its build cost', 'Name the traversal and why (BFS for shortest, DFS for structure)', 'Complexity in V and E; mention space for visited/queue'],
  }),
  c({
    topic: 'Backtracking',
    summary: 'Enumerate candidates by building a partial solution one choice at a time, recursing, and undoing. The art is pruning early and avoiding duplicate branches via ordering.',
    recognize: ['"All subsets / permutations / combinations / partitions"', '"Place N things so that…", puzzles (sudoku, N-queens), word search', 'Output size is exponential, so the goal is correctness and pruning, not polynomial time'],
    techniques: [
      {
        name: 'Choose, explore, unchoose', when: 'Everything in this topic.',
        how: ['path holds the partial solution; at each level loop over candidates', 'Push, recurse, pop; record a copy of path when it is complete'],
        complexity: 'Output-sensitive; O(2^n), O(n!) …',
        template: `const out: number[][] = []\nconst path: number[] = []\nconst go = (start: number): void => {\n  out.push(path.slice()) // or: if complete, record\n  for (let i = start; i < nums.length; i++) {\n    path.push(nums[i])\n    go(i + 1)\n    path.pop()\n  }\n}\ngo(0)`,
      },
      {
        name: 'Start index to avoid duplicates', when: 'Subsets, combinations, combination sum.',
        how: ['Pass i + 1 to forbid reuse; pass i to allow unlimited reuse', 'With duplicate input values: sort, and skip nums[i] === nums[i-1] when i > start'],
        complexity: '—',
      },
      {
        name: 'Used set for permutations', when: 'Permutations, arrangements.',
        how: ['Boolean used[] per element; try every unused element at each level'],
        complexity: 'O(n!·n)',
      },
      {
        name: 'Constraint sets for pruning', when: 'N-queens, sudoku.',
        how: ['Keep sets of used columns/diagonals (or rows/cols/boxes); reject in O(1) before recursing'],
        complexity: 'Exponential but heavily pruned',
      },
      {
        name: 'Grid DFS with mark/restore', when: 'Word search, paths with no revisits.',
        how: ['Overwrite the cell with a sentinel during recursion; restore after', 'Prune by comparing letter counts first'],
        complexity: 'O(cells × 3^L)',
      },
    ],
    pitfalls: ['Pushing path itself instead of a copy (all results alias one array)', 'Forgetting to undo the choice', 'Generating duplicates when input has repeated values', 'Not pruning: remaining < 0 should return immediately'],
    checklist: ['Describe the decision tree: branching factor and depth', 'Explain the dedupe strategy', 'Give the output-size bound honestly'],
  }),
  c({
    topic: 'Heaps & Priority Queues',
    summary: 'Whenever you repeatedly need the smallest or largest of a changing collection: top-k, k-way merge, scheduling, running medians. TypeScript has no built-in heap, so be able to write a 25-line binary heap or use a bounded alternative (bucket sort, quickselect).',
    recognize: ['"k largest / k closest / k most frequent", "merge k sorted", "schedule tasks with cooldown", "median of a stream"', 'A stream of items where you only ever remove extremes'],
    techniques: [
      {
        name: 'Binary heap from scratch', when: 'Any problem here, if no library is allowed.',
        how: ['Array; parent (i-1)>>1, children 2i+1, 2i+2', 'push: append, sift up; pop: swap root with last, remove, sift down', 'Take a comparator so one class serves min and max'],
        complexity: 'O(log n) push/pop, O(1) peek',
        template: `class Heap<T> {\n  private a: T[] = []\n  constructor(private less: (x: T, y: T) => boolean) {}\n  get size() { return this.a.length }\n  peek() { return this.a[0] }\n  push(v: T) { this.a.push(v); let i = this.a.length - 1\n    while (i > 0) { const p = (i - 1) >> 1; if (!this.less(this.a[i], this.a[p])) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }\n  pop(): T { const top = this.a[0]; const last = this.a.pop()!\n    if (this.a.length) { this.a[0] = last; let i = 0\n      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i\n        if (l < this.a.length && this.less(this.a[l], this.a[m])) m = l\n        if (r < this.a.length && this.less(this.a[r], this.a[m])) m = r\n        if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }\n    return top }\n}`,
      },
      {
        name: 'Bounded heap of size k', when: 'k largest (min-heap of k), k closest (max-heap of k).',
        how: ['Push each item; if size exceeds k, pop the extreme you do not want', 'Remaining heap is the answer'],
        complexity: 'O(n log k), O(k) space',
      },
      {
        name: 'Two heaps', when: 'Running median, scheduling with two queues.',
        how: ['Max-heap for the lower half, min-heap for the upper; rebalance so sizes differ by at most one'],
        complexity: 'O(log n) insert, O(1) median',
      },
      {
        name: 'K-way merge', when: 'Merge k sorted lists/arrays, smallest range covering k lists.',
        how: ['Heap of (value, which list, index); pop the min, push that list\'s next element'],
        complexity: 'O(N log k)',
      },
      {
        name: 'Alternatives to a heap', when: 'Top-k frequent (bucket sort), k-th largest (quickselect), when k is tiny (scan).',
        how: ['Counting into buckets indexed by frequency is O(n)', 'Quickselect partitions like quicksort into the side containing k: O(n) average'],
        complexity: 'O(n) typical',
      },
    ],
    pitfalls: ['Writing the heap under time pressure with a sift-down bug: test push/pop on 3 elements first', 'Using sort() per operation (O(n log n) each) when a heap was the point', 'Storing stale entries in Dijkstra without a skip check', 'Mixing up min-heap vs max-heap for "k largest"'],
    checklist: ['Say which extreme you need and the heap type', 'Give O(n log k) vs O(n log n) and why', 'Mention the no-heap alternative when it applies'],
  }),
  c({
    topic: 'Bit Manipulation',
    summary: 'A handful of identities (XOR cancels pairs, n & (n-1) clears the lowest set bit, shifts multiply/divide) solve "find the odd one out", counting bits, and compact state. In JavaScript bitwise ops are 32-bit signed; use >>> 0 for unsigned results.',
    recognize: ['"Appears once while others appear twice/three times", "count 1 bits", "reverse bits", "power of two"', 'Constraints hinting at O(1) space or masks over ≤ 32 items (subset enumeration)'],
    techniques: [
      {
        name: 'XOR cancellation', when: 'Single number, missing number, swap without temp.',
        how: ['a ^ a = 0, a ^ 0 = a, commutative: XOR everything, pairs vanish', 'Missing number: XOR indices and values'],
        complexity: 'O(n), O(1) space',
      },
      {
        name: 'Clear lowest set bit', when: 'Hamming weight, power of two check.',
        how: ['n & (n - 1) drops the lowest 1; loop until 0 counting steps', 'Power of two iff n > 0 and (n & (n - 1)) === 0'],
        complexity: 'O(set bits)',
      },
      {
        name: 'DP on bits', when: 'Counting bits 0..n.',
        how: ['bits[i] = bits[i >> 1] + (i & 1)'],
        complexity: 'O(n)',
      },
      {
        name: 'Shift-and-OR', when: 'Reverse bits, build numbers bit by bit.',
        how: ['result = (result << 1) | (n & 1); n >>>= 1; 32 times; return result >>> 0'],
        complexity: 'O(32)',
      },
      {
        name: 'Bitmask as a set', when: 'Subsets of ≤ 20 items, visited states in TSP-style DP, letters seen.',
        how: ['Bit i represents item i; test (mask >> i) & 1; add mask | (1 << i); iterate all masks 0..2^n - 1'],
        complexity: 'O(2^n · n)',
      },
    ],
    pitfalls: ['JS numbers above 2^31 - 1 go negative under bitwise ops; use >>> 0 or BigInt', '1 << 31 is negative; 2 ** 31 is not', 'Confusing >> (sign-propagating) with >>> (zero-fill)', 'Overusing tricks that hurt readability in non-interview code'],
    checklist: ['Write the identity you are relying on', 'State the 32-bit caveat', 'Test with 0, 1, and the maximum value'],
  }),
  c({
    topic: 'Greedy',
    summary: 'Make the locally best choice and never revisit it. Valid only when an exchange argument shows a local choice cannot hurt the global optimum; otherwise it is DP. Interviewers want the argument, not just the code.',
    recognize: ['"Minimum number of…", "can you reach…", "maximum you can…" with a scanning feel', 'Choosing by an obvious order (earliest finish, largest first, furthest reach)', 'Small inputs would also be solved by DP: ask which is intended'],
    techniques: [
      {
        name: 'Reach tracking', when: 'Jump game, minimum jumps, video stitching.',
        how: ['Track the furthest index reachable; if the current index exceeds it, fail', 'For minimum jumps, count when you pass the end of the current jump\'s range'],
        complexity: 'O(n)',
      },
      {
        name: 'Reset on negative prefix', when: 'Gas station, maximum subarray (Kadane as greedy).',
        how: ['Keep a running total; when it drops below zero, the optimal start must be after this point; reset', 'Verify global feasibility separately (total gas ≥ total cost)'],
        complexity: 'O(n)',
      },
      {
        name: 'Earliest end first', when: 'Interval scheduling, minimum arrows, non-overlapping intervals.',
        how: ['Sort by end; take every interval compatible with the last taken'],
        complexity: 'O(n log n)',
      },
      {
        name: 'Largest first / frequency first', when: 'Task scheduler, reorganise string, Huffman-like merging.',
        how: ['Process the most frequent item first; fill gaps with the rest; often a formula replaces the simulation'],
        complexity: 'O(n log k) with a heap, O(n) with counting',
      },
      {
        name: 'Last-occurrence boundaries', when: 'Partition labels.',
        how: ['Precompute last index per item; extend the current segment to the max last index seen; cut when reached'],
        complexity: 'O(n)',
      },
    ],
    pitfalls: ['Asserting greedy without an argument', 'Coin change and 0/1 knapsack are not greedy in general', 'Forgetting a feasibility check before trusting the greedy answer', 'Sorting by the wrong key'],
    checklist: ['State the greedy choice and the exchange argument in one sentence', 'Give a counterexample test you tried', 'Compare with the DP alternative and its cost'],
  }),
  c({
    topic: 'Strings',
    summary: 'Strings are arrays with a few extra tools: character counts, expand-around-centre for palindromes, run-length scanning, and prefix functions when matching gets serious. Watch Unicode and immutability in JavaScript.',
    recognize: ['Palindromes, anagrams, compression, parsing, pattern matching', 'Questions about "substring" (contiguous) vs "subsequence" (not contiguous)'],
    techniques: [
      {
        name: 'Expand around centre', when: 'Longest palindromic substring, count palindromic substrings.',
        how: ['2n - 1 centres (each char and each gap); expand while ends match; track the best'],
        complexity: 'O(n²) time, O(1) space',
        template: `const expand = (l: number, r: number): void => {\n  while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++ }\n  // palindrome is s.slice(l + 1, r)\n}\nfor (let i = 0; i < s.length; i++) { expand(i, i); expand(i, i + 1) }`,
      },
      {
        name: 'Run-length scanning', when: 'String compression, count and say, grouping repeated characters.',
        how: ['Two indices: i at the run start, j advancing while equal; emit; i = j'],
        complexity: 'O(n)',
      },
      {
        name: 'Character arithmetic', when: 'Caesar shifts, counting letters in a fixed alphabet.',
        how: ['charCodeAt(0) - 97 to index a 26-array; String.fromCharCode to go back'],
        complexity: 'O(1) per char',
      },
      {
        name: 'Building strings efficiently', when: 'Constructing output in loops.',
        how: ['Collect pieces in an array and join once; repeated += is fine for small n but say why join is safer'],
        complexity: 'O(n) total',
      },
      {
        name: 'KMP / Z-function (know the idea)', when: 'Substring search in O(n + m), repeated substring pattern, shortest palindrome.',
        how: ['Prefix function: longest proper prefix that is also a suffix for each prefix; lets the scan never back up', 'Be able to explain it; implementing from memory is rarely required'],
        complexity: 'O(n + m)',
      },
    ],
    pitfalls: ['Indexing by UTF-16 code unit breaks on emoji/astral characters; mention it', 'Strings are immutable: in-place tricks need an array', 'Case and non-alphanumerics: clarify whether to normalise', 'Confusing substring and subsequence'],
    checklist: ['Clarify the alphabet and case sensitivity', 'State the complexity in terms of n and the alphabet size', 'Test with empty, single char, all same'],
  }),
  c({
    topic: 'Matrix',
    summary: 'Grids reward careful index bookkeeping: boundaries that shrink, transposes and reversals for rotations, and using the matrix itself as scratch space when O(1) extra memory is demanded.',
    recognize: ['n×n or m×n input; rotate, spiral, zeroes, search in sorted matrix, game of life', 'Problems that are really graph traversals on a grid belong to Graphs & Trees'],
    techniques: [
      {
        name: 'Transpose + reverse', when: 'Rotate 90° in place.',
        how: ['Swap (i, j) with (j, i) for j > i; then reverse each row (clockwise) or each column (counter-clockwise)'],
        complexity: 'O(n²)',
      },
      {
        name: 'Shrinking boundaries', when: 'Spiral order, layer-by-layer processing.',
        how: ['top/bottom/left/right; walk each edge; shrink; re-check bounds before the third and fourth edges'],
        complexity: 'O(m·n)',
      },
      {
        name: 'In-place markers', when: 'Set matrix zeroes in O(1) space, game of life.',
        how: ['Use the first row/column (or extra bit states) as flags; resolve at the end in the right order'],
        complexity: 'O(m·n), O(1) extra',
      },
      {
        name: 'Flattened binary search', when: 'Fully sorted matrix.',
        how: ['Index i ↦ (floor(i / cols), i % cols)'],
        complexity: 'O(log(m·n))',
      },
      {
        name: 'Staircase search', when: 'Rows and columns sorted independently.',
        how: ['Start top-right; move left if too big, down if too small'],
        complexity: 'O(m + n)',
      },
    ],
    pitfalls: ['Row/column swapped in indexing', 'Single-row or single-column inputs breaking the spiral loop', 'Creating [[]] copies with fill([]) that alias the same inner array', 'Forgetting m ≠ n for non-square inputs'],
    checklist: ['Draw a 3×3 and trace indices', 'Say whether in place is required and how you achieve it', 'Test 1×1, 1×n, n×1'],
  }),
  c({
    topic: 'Math & Geometry',
    summary: 'Fast exponentiation, gcd, modular arithmetic, and a few geometry primitives cover most math questions. Precision and overflow are the traps.',
    recognize: ['Powers, factorials, primes, gcd/lcm, "count the ways modulo 1e9+7"', 'Points, lines, areas, rotations'],
    techniques: [
      {
        name: 'Exponentiation by squaring', when: 'pow(x, n), modular power, matrix exponentiation for linear recurrences.',
        how: ['Loop over bits of n: square the base each step; multiply into the result on a 1 bit', 'Negative exponent: invert the base'],
        complexity: 'O(log n)',
      },
      {
        name: 'Euclid gcd', when: 'Reduce fractions, lcm, coprime checks.',
        how: ['gcd(a, b) = gcd(b, a % b) until b = 0; lcm = a / gcd * b'],
        complexity: 'O(log min(a, b))',
      },
      {
        name: 'Sieve of Eratosthenes', when: 'Count or list primes up to n.',
        how: ['Boolean array; for each prime p, mark multiples from p²'],
        complexity: 'O(n log log n)',
      },
      {
        name: 'Modular arithmetic', when: 'Answers "modulo 1e9+7".',
        how: ['Reduce after every multiplication; use BigInt if products exceed 2^53; modular inverse via Fermat for division'],
        complexity: '—',
      },
      {
        name: 'Geometry primitives', when: 'Orientation, area, closest pair.',
        how: ['Cross product sign for orientation; shoelace for polygon area; compare squared distances to avoid sqrt'],
        complexity: '—',
      },
    ],
    pitfalls: ['Floating point equality; compare with an epsilon or use integers', 'Products beyond 2^53 lose precision in JS numbers', 'Math.floor vs Math.trunc for negatives', 'Division by zero in gcd/lcm edge cases'],
    checklist: ['Say the numeric range and whether BigInt is needed', 'Name the identity you are using', 'Test 0, 1, negatives, large values'],
  }),
]
