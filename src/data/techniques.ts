import type { Problem } from '../types.ts'

/**
 * The catalogue of techniques a problem can exercise. A problem is matched by
 * its `pattern` string, which generated variants inherit from their parent,
 * so a new variant on "Monotonic deque" shows the same technique as the
 * original. `viz` names a visualisation in src/viz; `primerTechnique` names
 * the matching card in the topic primer, whose template is shown alongside.
 */
export interface TechniqueDoc {
  id: string
  name: string
  /** The primer topic it belongs to (the coding or practical track's). */
  topic: string
  primerTechnique?: string
  /** What it is and why it works, in plain words. */
  summary: string
  /** The moves, in order. */
  steps: string[]
  /** The thing that stays true throughout, which is what makes the steps correct. */
  invariant?: string
  complexity: string
  /** Matched against a problem's pattern, case-insensitively. */
  patterns: RegExp
  viz?: string
}

export const TECHNIQUES: TechniqueDoc[] = [
  // ── arrays & hashing ──────────────────────────────────────────────────
  {
    id: 'hash-map-lookup', name: 'Hash map lookup', topic: 'Arrays & Hashing', primerTechnique: 'Remember what you have seen (set or map)',
    summary: 'Instead of comparing every element with every other, walk the list once and remember what you have passed in a Map or Set. Asking "have I seen the partner I need?" is O(1), so the double loop collapses into a single pass.',
    steps: ['For the current element, work out what partner would complete the answer (target − x, or x itself for duplicates)', 'Look the partner up in the map; if it is there you are done', 'Only then record the current element, so it cannot pair with itself'],
    invariant: 'The map holds exactly the elements to the left of the current position.',
    complexity: 'O(n) time, O(n) space', patterns: /hash map lookup|hash set membership|hash map/i, viz: 'hash-map-lookup',
  },
  {
    id: 'frequency-count', name: 'Frequency count', topic: 'Arrays & Hashing', primerTechnique: 'Count how often each thing appears',
    summary: 'Many questions ("is this an anagram?", "which items are most common?", "which character appears once?") are answered by a count of each distinct item. Build the counts in one pass, then read the answer off them.',
    steps: ['Map<item, count>: one pass, counts.set(x, (counts.get(x) ?? 0) + 1)', 'Answer from the counts: compare two maps, scan for count === 1, or bucket by count'],
    complexity: 'O(n) time, O(k) space for k distinct items', patterns: /frequency count|character frequency/i, viz: 'frequency-count',
  },
  {
    id: 'canonical-key', name: 'Group by a canonical key', topic: 'Arrays & Hashing', primerTechnique: 'Group by a standard form',
    summary: 'To group things that "count as the same" (anagrams, rotations), write each one in a standard form so equivalent items become literally equal strings, then use that string as a map key.',
    steps: ['Choose a key that is equal exactly when two items belong together: sorted letters, or a 26-slot count signature', 'Map<key, item[]>; push each item under its key', 'The map’s values are the groups'],
    complexity: 'O(n·k) with a count key, O(n·k log k) with sorting', patterns: /canonical key/i,
  },
  {
    id: 'prefix-sum-map', name: 'Prefix sums with a map', topic: 'Arrays & Hashing', primerTechnique: 'Running totals plus a map',
    summary: 'The sum of any stretch is the difference of two running totals. So to count stretches summing to k, at each position count how many earlier running totals equal the current total minus k. Works with negative numbers, where a sliding window does not.',
    steps: ['Keep a running total; seed the map with {0: 1} for stretches starting at index 0', 'At each step add count of (total − k) seen so far to the answer', 'Then record the current total in the map'],
    invariant: 'The map holds every running total to the left, with how often each occurred.',
    complexity: 'O(n) time and space', patterns: /prefix sums with a hash map/i, viz: 'prefix-sum-map',
  },
  {
    id: 'prefix-suffix', name: 'Prefix and suffix passes', topic: 'Arrays & Hashing', primerTechnique: 'One pass from the left, one from the right',
    summary: 'When each position needs something about everything to its left and everything to its right, do one pass accumulating from the left and one from the right, then combine.',
    steps: ['Left pass: out[i] = product (or sum, max…) of everything before i', 'Right pass: multiply in the product of everything after i, carried in a single variable', 'No division needed, so zeros are not a special case'],
    complexity: 'O(n) time, O(1) extra space beyond the output', patterns: /prefix and suffix/i, viz: 'prefix-suffix',
  },
  {
    id: 'sequence-starts', name: 'Walk a sequence through a set', topic: 'Arrays & Hashing', primerTechnique: 'Walk a sequence through a set',
    summary: 'Put everything in a Set so "is this value present?" is instant. Then only start counting from natural starting points (a value whose predecessor is absent); each run is walked once, so the nested loop is still linear overall.',
    steps: ['Set of all values', 'For each value, skip it if value − 1 is in the set (it is inside a run, not its start)', 'Otherwise walk value + 1, value + 2… while present, and record the length'],
    complexity: 'O(n)', patterns: /hash set with sequence starts/i, viz: 'sequence-starts',
  },
  {
    id: 'running-min', name: 'Running minimum, one pass', topic: 'Arrays & Hashing',
    summary: 'The best sale on any day uses the lowest price before it. Keep two numbers while scanning: the lowest value so far and the best result so far. No need to look back.',
    steps: ['low = +∞, best = 0', 'For each price: best = max(best, price − low); low = min(low, price)'],
    complexity: 'O(n) time, O(1) space', patterns: /running minimum/i, viz: 'running-min',
  },

  // ── two pointers ──────────────────────────────────────────────────────
  {
    id: 'converging-pointers', name: 'Converging pointers', topic: 'Two Pointers', primerTechnique: 'Converging pointers (sorted)',
    summary: 'On sorted input (or when the answer depends on the two ends), start a pointer at each end and move them inwards by a rule. The rule must guarantee the move can never skip the answer: too small, only the left pointer can help; too big, only the right.',
    steps: ['Sort if needed; l = 0, r = n − 1', 'Compute the pair’s value; if it is the answer stop', 'Too small → l++; too big → r−−; repeat while l < r', 'For 3Sum, fix one element and run this on the rest, skipping duplicates'],
    complexity: 'O(n) after sorting, O(1) space', patterns: /sort, then two pointers|converging pointers|greedy pointer movement/i, viz: 'converging-pointers',
  },
  {
    id: 'read-write-pointers', name: 'Read/write pointers in place', topic: 'Two Pointers', primerTechnique: 'Read/write pointers (in place)',
    summary: 'To compact, dedupe or rewrite an array without extra memory, let one pointer read every element and another mark where the next kept element goes. The write pointer never overtakes the read pointer, so nothing unread is overwritten.',
    steps: ['w = 0 (or 1); for r over the array: if a[r] should be kept, a[w++] = a[r]', 'Return w: the first w slots are the result'],
    invariant: 'a[0..w) is the compacted result of a[0..r).',
    complexity: 'O(n) time, O(1) space', patterns: /read\/write pointers|run-length encoding in place/i, viz: 'read-write-pointers',
  },
  {
    id: 'run-length-in-place', name: 'Run-length encoding in place', topic: 'Strings',
    summary: 'Find the end of each run of equal characters with a read pointer, then write the character and its count (if more than one) at the write pointer. The encoding is never longer than the input, so writing in place is safe.',
    steps: ['r finds the run’s end; n = run length', 'Write the character; if n > 1 write each digit of n', 'r jumps to the run’s end; repeat'],
    complexity: 'O(n) time, O(1) space', patterns: /run-length encoding in place/i, viz: 'run-length-in-place',
  },
  {
    id: 'two-maxima', name: 'Two running maxima', topic: 'Two Pointers', primerTechnique: 'Two running maxima',
    summary: 'The water over a cell is bounded by the shorter of the tallest wall on each side. Walking inwards from both ends and always moving the lower side, that side’s running maximum is already the binding one, so its water can be settled immediately.',
    steps: ['l = 0, r = n − 1, lmax = rmax = 0', 'If h[l] < h[r]: either update lmax or add lmax − h[l]; l++', 'Else the same on the right; r−−'],
    complexity: 'O(n) time, O(1) space', patterns: /two pointers with running maxima/i, viz: 'two-maxima',
  },
  {
    id: 'expand-centre', name: 'Expand around the centre', topic: 'Strings',
    summary: 'Every palindrome has a centre: a character (odd length) or the gap between two characters (even length). Try each of the 2n − 1 centres and grow outwards while the ends match.',
    steps: ['For each i: expand from (i, i) and from (i, i + 1)', 'While l ≥ 0, r < n and s[l] === s[r]: l−−, r++', 'Keep the longest span found'],
    complexity: 'O(n²) time, O(1) space', patterns: /expand around centre/i, viz: 'expand-centre',
  },

  // ── sliding window ────────────────────────────────────────────────────
  {
    id: 'fixed-window', name: 'Fixed-size window', topic: 'Sliding Window', primerTechnique: 'Fixed-size window',
    summary: 'When the window size k is given, do not recompute the window from scratch each step: add the element entering on the right and remove the one leaving on the left. The window’s summary (sum, counts) updates in O(1).',
    steps: ['Build the first window of k', 'For each further index: add a[i], remove a[i − k], read the summary'],
    complexity: 'O(n) time, O(1) or O(k) space', patterns: /fixed-size window/i, viz: 'fixed-window',
  },
  {
    id: 'fixed-window-counts', name: 'Fixed window with count matching', topic: 'Sliding Window', primerTechnique: 'Fixed-size window',
    summary: 'A permutation of a short string is any window of its length with the same letter counts. Slide a fixed window over the long string, updating a count map by the letter entering and the letter leaving, and compare the counts.',
    steps: ['need = counts of the short string', 'Slide a window of its length over the long string; have = counts in the window', 'Compare have with need each step (or track a "matched letters" counter for O(1) compares)'],
    complexity: 'O(n) time, O(alphabet) space', patterns: /fixed-size window with count matching/i, viz: 'fixed-window-counts',
  },
  {
    id: 'variable-window-longest', name: 'Variable window, longest valid', topic: 'Sliding Window', primerTechnique: 'Variable window, longest valid',
    summary: 'Grow the right end one element at a time. When the window breaks its rule (a repeat, too many distinct…), move the left end right until it is valid again. Every element enters and leaves at most once, so the two loops are linear overall.',
    steps: ['For r over the input: add a[r] to the window state', 'While the window is invalid: remove a[l] from the state, l++', 'Record r − l + 1 if it is the best'],
    invariant: 'After the inner loop, the window [l, r] is valid and l is as small as it can be for this r.',
    complexity: 'O(n) time', patterns: /variable-size sliding window|window valid while|window with a budget/i, viz: 'variable-window-longest',
  },
  {
    id: 'window-budget', name: 'Window with a budget', topic: 'Sliding Window', primerTechnique: 'Variable window, longest valid',
    summary: 'The window may contain at most k "bad" items (zeros to flip, mismatches). Track how many it holds; when the count exceeds k, shrink from the left. The widest window ever seen is the answer.',
    steps: ['zeros = 0; for r: if a[r] is bad, zeros++', 'While zeros > k: if a[l] is bad, zeros−−; l++', 'best = max(best, r − l + 1)'],
    complexity: 'O(n) time, O(1) space', patterns: /window with a budget/i, viz: 'window-budget',
  },
  {
    id: 'window-maxfreq', name: 'Window valid while (size − maxFreq) ≤ k', topic: 'Sliding Window', primerTechnique: 'Variable window, longest valid',
    summary: 'A window can be made uniform with k replacements exactly when its length minus its most common letter’s count is ≤ k. Keep letter counts and the largest count seen; grow r, and shrink l when the rule fails. maxFreq never needs to decrease, because a smaller window cannot beat the best already found.',
    steps: ['counts[s[r]]++, maxFreq = max(maxFreq, counts[s[r]])', 'If (r − l + 1) − maxFreq > k: counts[s[l]]−−, l++', 'best = max(best, r − l + 1)'],
    complexity: 'O(n) time, O(alphabet) space', patterns: /window valid while/i,
  },
  {
    id: 'need-have-window', name: 'Need/have window with a formed counter', topic: 'Sliding Window', primerTechnique: 'Need/have with a "formed" counter',
    summary: 'For "smallest window containing all of t": keep what you need (counts of t) and what you have (counts in the window), plus a counter of how many letters are fully satisfied. Grow until everything is satisfied, then shrink while it stays so, recording the best.',
    steps: ['need = counts of t; formed = 0', 'Grow r: have[c]++; if have[c] === need[c], formed++', 'While formed === need.size: record the window, then drop s[l] (if it was exactly satisfied, formed−−), l++'],
    complexity: 'O(n + m) time', patterns: /sliding window with a need-count/i, viz: 'need-have-window',
  },
  {
    id: 'monotonic-deque', name: 'Monotonic deque', topic: 'Sliding Window', primerTechnique: 'Monotonic deque',
    summary: 'To know the maximum of every window of size k without rescanning, keep a deque of indices whose values are decreasing from front to back. The front is always the current maximum. A new value pops every smaller value off the back, because they can never be a maximum again while the new one is in the window; the front is evicted once it leaves the window.',
    steps: ['Evict the front if its index < i − k + 1', 'Pop from the back while its value ≤ nums[i]', 'Push i', 'Once i ≥ k − 1, the front’s value is this window’s max'],
    invariant: 'The deque holds, in order, every index in the window that could still become a maximum; values strictly decrease front to back.',
    complexity: 'O(n) time, O(k) space', patterns: /monotonic deque/i, viz: 'monotonic-deque',
  },

  // ── stack & queue ─────────────────────────────────────────────────────
  {
    id: 'stack-matching', name: 'Matching with a stack', topic: 'Stack & Queue', primerTechnique: 'Matching with a stack',
    summary: 'The most recently opened thing must close first: that is exactly a stack. Push openers; on a closer, the top must be its partner, otherwise the input is invalid. A leftover stack at the end means something never closed.',
    steps: ['For each character: opener → push', 'Closer → pop and check it is the matching opener (an empty stack is a failure too)', 'Valid iff the stack is empty at the end'],
    complexity: 'O(n) time and space', patterns: /stack matching/i, viz: 'stack-matching',
  },
  {
    id: 'monotonic-stack', name: 'Monotonic stack', topic: 'Stack & Queue', primerTechnique: 'Monotonic stack',
    summary: 'For "the next greater (or smaller) element to the right of each position", keep a stack of indices still waiting for their answer; their values are kept in order (decreasing for next-greater). Each new element answers every waiting index it beats, then joins the stack.',
    steps: ['For each i: while the stack top’s value < a[i]: pop j, answer[j] = i − j (or a[i])', 'Push i', 'Whatever remains has no answer'],
    invariant: 'Stack values are monotonic from bottom to top; every index on it is still unanswered.',
    complexity: 'O(n) time: each index is pushed and popped once', patterns: /monotonic stack/i, viz: 'monotonic-stack',
  },
  {
    id: 'histogram-stack', name: 'Histogram with a sentinel', topic: 'Stack & Queue', primerTechnique: 'Histogram / sentinel trick',
    summary: 'A bar’s best rectangle extends left and right until a shorter bar. With an increasing stack of bars, a shorter arrival is the right edge for every taller bar on the stack, and the bar beneath each on the stack is its left edge. A sentinel 0 appended at the end flushes every bar.',
    steps: ['For each bar i (including the sentinel): while stack top is taller than h[i]: pop it; width = i − (new top + 1, or 0); area = height × width', 'Push i'],
    complexity: 'O(n)', patterns: /monotonic stack with sentinel/i, viz: 'histogram-stack',
  },
  {
    id: 'auxiliary-stack', name: 'Auxiliary stack', topic: 'Stack & Queue', primerTechnique: 'Auxiliary stack',
    summary: 'To answer "what is the minimum right now?" in O(1), keep a second stack where each entry is the minimum of everything at or below that depth. Push min(x, current min) alongside each push, pop both together.',
    steps: ['push(x): stack.push(x); mins.push(min(x, mins.top ?? x))', 'pop(): pop both', 'getMin(): mins.top'],
    complexity: 'O(1) per operation, O(n) space', patterns: /auxiliary stack/i, viz: 'auxiliary-stack',
  },
  {
    id: 'operand-stack', name: 'Operand stack', topic: 'Stack & Queue',
    summary: 'Postfix (reverse Polish) expressions evaluate with a stack: numbers are pushed, and each operator pops its two operands (the first popped is the right-hand one), applies, and pushes the result.',
    steps: ['Number → push', 'Operator → b = pop, a = pop, push a op b', 'The single remaining value is the result'],
    complexity: 'O(n) time and space', patterns: /operand stack/i, viz: 'operand-stack',
  },

  // ── sorting & sweeping ────────────────────────────────────────────────
  {
    id: 'merge-intervals', name: 'Sort by start, then merge', topic: 'Sorting & Sweeping', primerTechnique: 'Sort by start, merge',
    summary: 'Once intervals are sorted by start, an interval can only overlap the most recently merged one. One pass with a "current" interval: extend its end on overlap, otherwise start a new one.',
    steps: ['Sort by start', 'For each interval: if start ≤ current.end, current.end = max(ends); else push current and start a new one'],
    complexity: 'O(n log n)', patterns: /sort by start, sweep|three-phase merge/i, viz: 'merge-intervals',
  },
  {
    id: 'three-phase-insert', name: 'Three-phase insert', topic: 'Sorting & Sweeping', primerTechnique: 'Three-phase insert',
    summary: 'Inserting an interval into a sorted non-overlapping list has three phases: copy everything that ends before the new one starts, merge everything that overlaps into the new one, then copy the rest.',
    steps: ['Phase 1: while iv.end < new.start, push iv', 'Phase 2: while iv.start ≤ new.end, new = [min starts, max ends]', 'Push new; phase 3: push the remaining intervals'],
    complexity: 'O(n)', patterns: /three-phase merge/i,
  },
  {
    id: 'earliest-end', name: 'Greedy by earliest end', topic: 'Sorting & Sweeping', primerTechnique: 'Sort by end, greedy keep',
    summary: 'To keep as many non-overlapping intervals as possible, always keep the one that ends earliest: it leaves the most room for everything after it. Sort by end, keep an interval when it starts at or after the last kept end, otherwise count it as removed.',
    steps: ['Sort by end; lastEnd = −∞', 'For each: if start ≥ lastEnd, keep and lastEnd = end; else remove'],
    complexity: 'O(n log n)', patterns: /greedy by earliest end/i, viz: 'earliest-end',
  },
  {
    id: 'sweep-line', name: 'Event sweep', topic: 'Sorting & Sweeping', primerTechnique: 'Event sweep',
    summary: 'Turn each interval into a start event and an end event, sort them by time (ends before starts at a tie), and sweep: +1 on a start, −1 on an end. The highest count during the sweep is the maximum overlap, e.g. rooms needed.',
    steps: ['events = [(start, +1), (end, −1)] for each interval', 'Sort by time, ends first on ties', 'Running count; answer = its peak'],
    complexity: 'O(n log n)', patterns: /sweep line/i, viz: 'sweep-line',
  },

  // ── linked lists ──────────────────────────────────────────────────────
  {
    id: 'pointer-reversal', name: 'Iterative reversal', topic: 'Linked Lists', primerTechnique: 'Iterative reversal',
    summary: 'Walk the list with three pointers. At each node, save its next, point it back at the previous node, then move prev and cur forward. The reversed part grows behind prev; when cur runs out, prev is the new head.',
    steps: ['prev = null, cur = head', 'While cur: next = cur.next; cur.next = prev; prev = cur; cur = next', 'Return prev'],
    complexity: 'O(n) time, O(1) space', patterns: /pointer reversal/i, viz: 'pointer-reversal',
  },
  {
    id: 'fast-slow', name: 'Fast and slow pointers', topic: 'Linked Lists', primerTechnique: 'Fast/slow',
    summary: 'Two pointers walk the list at different speeds. On a straight list the fast one reaches the end; in a cycle it laps the slow one and they meet, which detects the cycle without storing anything. The same trick finds the middle (slow is there when fast ends).',
    steps: ['slow = fast = head', 'While fast and fast.next: slow = slow.next; fast = fast.next.next; if slow === fast, cycle', 'fast reached null: no cycle'],
    complexity: 'O(n) time, O(1) space', patterns: /tortoise and hare/i, viz: 'fast-slow',
  },
  {
    id: 'gap-pointers', name: 'Two pointers with a gap', topic: 'Linked Lists', primerTechnique: 'Fast/slow',
    summary: 'To reach the nth node from the end in one pass, send a lead pointer n steps ahead, then move lead and trail together. When lead falls off the end, trail is n from the end. Starting from a dummy node makes removing the head no special case.',
    steps: ['dummy → head; lead = trail = dummy', 'Move lead n + 1 steps', 'Move both until lead is null; trail.next is the node to remove'],
    complexity: 'O(n) time, O(1) space', patterns: /two pointers with a gap/i, viz: 'gap-pointers',
  },
  {
    id: 'dummy-head-merge', name: 'Dummy head', topic: 'Linked Lists', primerTechnique: 'Dummy head',
    summary: 'A placeholder node in front of the result means there is always a tail to append to, even before the first real node, and the head is never a special case. Return dummy.next at the end.',
    steps: ['dummy = new node; tail = dummy', 'Append nodes with tail.next = node; tail = tail.next', 'Return dummy.next'],
    complexity: 'O(1) extra space', patterns: /dummy head/i, viz: 'dummy-head-merge',
  },
  {
    id: 'sorted-merge', name: 'Merge two sorted sequences', topic: 'Two Pointers', primerTechnique: 'Merge of two sequences',
    summary: 'Compare the heads of the two sequences, take the smaller, and advance that side. Each taken value is ≤ everything remaining on both sides, so the output is sorted. When one side runs out, append the other.',
    steps: ['i = j = 0', 'While both remain: take the smaller head, advance it', 'Append the remainder of the non-empty side'],
    complexity: 'O(n + m)', patterns: /dummy head with two cursors/i, viz: 'sorted-merge',
  },
  {
    id: 'digit-carry', name: 'Digit-by-digit with carry', topic: 'Linked Lists', primerTechnique: 'Digit-by-digit arithmetic',
    summary: 'Add two numbers stored one digit per node (least significant first) the way you would by hand: add the two digits and the carry, write the last digit, carry the rest. Keep going while either list or the carry remains.',
    steps: ['carry = 0; while a or b or carry: sum = (a?.val ?? 0) + (b?.val ?? 0) + carry', 'Append sum % 10; carry = floor(sum / 10)', 'Advance whichever lists remain'],
    complexity: 'O(max(n, m))', patterns: /digit-by-digit with carry/i,
  },

  // ── binary search ─────────────────────────────────────────────────────
  {
    id: 'binary-search', name: 'Binary search', topic: 'Binary Search', primerTechnique: 'Exact match',
    summary: 'On sorted input, look at the middle: too small means the answer is to the right, too big means to the left. Each probe halves the range, so a million elements take about twenty probes. A 2D matrix with sorted rows laid end to end is just a sorted array with index arithmetic.',
    steps: ['lo = 0, hi = n − 1', 'While lo ≤ hi: mid = (lo + hi) >> 1; equal → found; smaller → lo = mid + 1; bigger → hi = mid − 1', 'Not found when lo passes hi'],
    complexity: 'O(log n)', patterns: /binary search on a sorted array|binary search over a flattened index/i, viz: 'binary-search',
  },
  {
    id: 'binary-search-answer', name: 'Binary search on the answer', topic: 'Binary Search', primerTechnique: 'Binary search on the answer',
    summary: 'When the question is "what is the smallest x such that something is possible", and possibility is monotonic (false…false true…true), binary search over x itself and test each candidate with a feasibility check.',
    steps: ['lo = smallest possible answer, hi = largest', 'While lo < hi: mid; if feasible(mid), hi = mid; else lo = mid + 1', 'lo is the first feasible value'],
    complexity: 'O(log(range) × cost of the check)', patterns: /binary search on the answer/i, viz: 'binary-search-answer',
  },
  {
    id: 'rotated-search', name: 'Search in a rotated array', topic: 'Binary Search', primerTechnique: 'Rotated array',
    summary: 'A rotated sorted array still has one properly sorted half on either side of any midpoint. Work out which half is sorted, check whether the target lies in that half’s range, and discard the other half.',
    steps: ['mid; if nums[lo] ≤ nums[mid] the left half is sorted', 'Target in the sorted half’s range → search it; else search the other half', 'Repeat while lo ≤ hi'],
    complexity: 'O(log n)', patterns: /binary search on a rotated array/i, viz: 'rotated-search',
  },
  {
    id: 'find-min-rotated', name: 'Binary search for the pivot', topic: 'Binary Search', primerTechnique: 'Rotated array',
    summary: 'The minimum of a rotated sorted array is where the order breaks. Compare mid with the right end: if mid is bigger, the break is to the right; otherwise mid might be the minimum, so keep it in the range.',
    steps: ['While lo < hi: mid; if nums[mid] > nums[hi], lo = mid + 1; else hi = mid', 'nums[lo] is the minimum'],
    complexity: 'O(log n)', patterns: /binary search for the pivot/i, viz: 'find-min-rotated',
  },
  {
    id: 'partition-search', name: 'Binary search on a partition', topic: 'Binary Search', primerTechnique: 'Partition search',
    summary: 'For the median of two sorted arrays, binary search over how many elements the shorter array contributes to the left half. The partition is right when every left element is ≤ every right element across both arrays; then the median comes from the four boundary values.',
    steps: ['Search i in [0, m] on the shorter array; j = (m + n + 1) / 2 − i', 'If A[i − 1] > B[j], move i left; if B[j − 1] > A[i], move i right', 'Otherwise the median is max(lefts) or the average of max(lefts) and min(rights)'],
    complexity: 'O(log min(m, n))', patterns: /binary search on a partition/i,
  },

  // ── dynamic programming ───────────────────────────────────────────────
  {
    id: 'kadane', name: 'Kadane’s algorithm', topic: 'Dynamic Programming', primerTechnique: '1D over positions',
    summary: 'The best subarray ending at i is either the best one ending at i − 1 extended by a[i], or a[i] alone, whichever is larger. A run with a negative total is never worth extending. One pass, keeping the best seen.',
    steps: ['cur = max(a[i], cur + a[i])', 'best = max(best, cur)'],
    complexity: 'O(n) time, O(1) space', patterns: /kadane/i, viz: 'kadane',
  },
  {
    id: 'take-or-skip', name: '1D DP over positions', topic: 'Dynamic Programming', primerTechnique: '1D over positions',
    summary: 'dp[i] answers the question for the first i elements, using one or two earlier answers. House robber: take this house plus dp[i − 2], or skip it and keep dp[i − 1]. Climbing stairs and decode ways are the same shape with different rules. Only the last two values are needed, so two variables suffice.',
    steps: ['Define dp[i] in words ("best using houses 0..i")', 'Write the recurrence from the last decision (take or skip)', 'Fill left to right from the base cases; keep only what the recurrence reads'],
    complexity: 'O(n) time, O(1) space', patterns: /take-or-skip|fibonacci recurrence|two-step recurrence/i, viz: 'take-or-skip',
  },
  {
    id: 'unbounded-knapsack', name: 'Unbounded knapsack', topic: 'Dynamic Programming', primerTechnique: 'Knapsack (0/1 and unbounded)',
    summary: 'dp[amount] = fewest coins making that amount. For each amount try every coin; because coins may repeat, the inner loop reads values computed in this same pass (smaller amounts). The ∞ marker means "cannot be made".',
    steps: ['dp[0] = 0, others ∞', 'For a from 1 to amount: dp[a] = min over coins c ≤ a of 1 + dp[a − c]', 'dp[amount], or −1 if still ∞'],
    complexity: 'O(amount × coins) time, O(amount) space', patterns: /unbounded knapsack/i, viz: 'unbounded-knapsack',
  },
  {
    id: 'knapsack-01', name: '0/1 knapsack over a boolean set', topic: 'Dynamic Programming', primerTechnique: 'Knapsack (0/1 and unbounded)',
    summary: 'can[s] says whether some subset sums to s. Each number updates the set: every reachable s − x makes s reachable. Walking s downwards means each number is used at most once per subset, which is what makes it 0/1 rather than unbounded.',
    steps: ['can[0] = true', 'For each x: for s from target down to x: can[s] ||= can[s − x]', 'Answer can[target]'],
    complexity: 'O(n × target) time, O(target) space', patterns: /0\/1 knapsack/i, viz: 'knapsack-01',
  },
  {
    id: 'dp-2d-strings', name: '2D DP over two sequences', topic: 'Dynamic Programming', primerTechnique: '2D over two sequences',
    summary: 'dp[i][j] answers the question for the first i letters of one string and the first j of the other. Each cell depends on its neighbours above, left and diagonal: a match extends the diagonal, a mismatch picks the best of dropping a letter from either side (LCS) or the cheapest edit (edit distance).',
    steps: ['Row 0 and column 0 are the empty-string answers', 'Fill row by row: match → dp[i−1][j−1] + 1 (or + 0 cost); else combine dp[i−1][j], dp[i][j−1] (and dp[i−1][j−1] for a substitution)', 'Answer in the bottom-right corner'],
    complexity: 'O(n·m) time; O(m) space with a rolling row', patterns: /2D dynamic programming table|2D DP over two strings/i, viz: 'dp-2d-strings',
  },
  {
    id: 'grid-dp', name: 'Grid DP', topic: 'Dynamic Programming', primerTechnique: 'Grid DP',
    summary: 'When you can only move down or right, the ways (or best cost) to reach a cell come from the cell above and the cell to the left. Fill the grid in reading order; each row only needs the previous one.',
    steps: ['First row and column: base cases', 'dp[i][j] = dp[i−1][j] + dp[i][j−1] (or min plus the cell’s cost)', 'Keep one rolling row for O(cols) space'],
    complexity: 'O(rows × cols) time, O(cols) space', patterns: /2D grid DP/i, viz: 'grid-dp',
  },
  {
    id: 'lis-patience', name: 'Patience sorting for LIS', topic: 'Dynamic Programming', primerTechnique: 'LIS and patience sorting',
    summary: 'Keep tails[L] = the smallest value that can end an increasing run of length L + 1. Each new number replaces the first tail ≥ it (binary search), or extends the array if it beats every tail. The array’s length is the LIS length; the array itself is not the subsequence.',
    steps: ['For each x: binary search the first tail ≥ x', 'Found → replace it; not found → append', 'Answer tails.length'],
    complexity: 'O(n log n)', patterns: /patience sorting/i, viz: 'lis-patience',
  },
  {
    id: 'reachability-dp', name: 'Reachability over prefixes', topic: 'Dynamic Programming', primerTechnique: '1D over positions',
    summary: 'can[i] says whether the first i characters can be split into dictionary words. It is true if some earlier reachable j has s[j..i) in the dictionary. Build from the empty prefix up.',
    steps: ['can[0] = true', 'For i in 1..n: can[i] = any j < i with can[j] and dict.has(s.slice(j, i))', 'Answer can[n]'],
    complexity: 'O(n² · lookup)', patterns: /reachability DP/i, viz: 'reachability-dp',
  },
  {
    id: 'dp-on-bits', name: 'DP on bit structure', topic: 'Bit Manipulation', primerTechnique: 'DP on bits',
    summary: 'The bits of i are the bits of i >> 1 plus i’s lowest bit, and i >> 1 is a smaller number already solved. So ones(i) = ones(i >> 1) + (i & 1), one lookup per number.',
    steps: ['dp[0] = 0', 'dp[i] = dp[i >> 1] + (i & 1)'],
    complexity: 'O(n)', patterns: /DP on bit structure/i, viz: 'dp-on-bits',
  },

  // ── graphs & trees ────────────────────────────────────────────────────
  {
    id: 'flood-fill', name: 'Flood fill (grid DFS/BFS)', topic: 'Graphs & Trees', primerTechnique: 'Grid as a graph',
    summary: 'A grid is a graph where each cell’s neighbours are the four around it. To find connected regions, scan every cell; when you hit an unvisited cell of the right kind, flood outwards (DFS or BFS) marking everything connected so it is never counted again. Reverse flooding from the borders answers "which cells can reach the edge".',
    steps: ['For every cell: if unvisited land, count a new region and flood from it', 'Flood: mark the cell, then visit each in-bounds unvisited neighbour', 'Visited marks (or overwriting the grid) stop revisits'],
    complexity: 'O(rows × cols)', patterns: /grid flood fill|reverse DFS from the borders/i, viz: 'flood-fill',
  },
  {
    id: 'bfs-grid', name: 'BFS shortest path', topic: 'Graphs & Trees', primerTechnique: 'BFS and multi-source BFS',
    summary: 'When every step costs the same, breadth-first search finds the shortest path: it visits everything at distance 1, then 2, then 3, so the first time a node is reached is the shortest way to it. An "implicit" graph (words one letter apart) works the same, generating neighbours on the fly.',
    steps: ['Queue with the start at distance 0; mark it visited', 'Pop; for each unvisited neighbour: set distance + 1, mark, push', 'Stop when the target is popped (or reached)'],
    complexity: 'O(V + E), which is O(rows × cols) on a grid', patterns: /BFS shortest path on a grid|BFS over implicit graph/i, viz: 'bfs-grid',
  },
  {
    id: 'multi-source-bfs', name: 'Multi-source BFS', topic: 'Graphs & Trees', primerTechnique: 'BFS and multi-source BFS',
    summary: 'When something spreads from several places at once (rot, fire, distance to the nearest zero), seed the queue with all of the sources and expand in rounds. Each round is one time step; a cell’s round is its distance to the nearest source.',
    steps: ['Queue every source at time 0', 'Process the queue level by level; each level is one minute', 'The last non-empty level is the answer; anything unreached is unreachable'],
    complexity: 'O(rows × cols)', patterns: /multi-source BFS/i, viz: 'multi-source-bfs',
  },
  {
    id: 'bfs-levels', name: 'BFS by level', topic: 'Graphs & Trees', primerTechnique: 'BFS and multi-source BFS',
    summary: 'To process a tree one level at a time, note the queue’s length before each round and pop exactly that many nodes: those are the level, and their children (pushed meanwhile) are the next one.',
    steps: ['queue = [root]', 'While queue: size = queue.length; pop size nodes into this level, pushing their children', 'Collect the level'],
    complexity: 'O(n)', patterns: /BFS by level/i, viz: 'bfs-levels',
  },
  {
    id: 'dfs-recursive', name: 'Tree recursion', topic: 'Graphs & Trees', primerTechnique: 'Tree recursion: down vs up',
    summary: 'Most tree questions are one recursive function: ask the children, combine their answers (height, swap, compare, build). The answer flows upwards from the leaves ("up" recursion); a global can be updated on the way for things like the diameter. A visited map turns the same shape into graph DFS.',
    steps: ['Base case: an empty subtree', 'Recurse into the children first', 'Combine: 1 + max(heights), swap left and right, compare the pairs, or split by the root’s index'],
    complexity: 'O(n) time, O(height) stack', patterns: /recursive DFS|recursive swap|parallel recursion|post-order DFS|in-order traversal|recursive partition by root index|DFS with a visited map/i, viz: 'dfs-recursive',
  },
  {
    id: 'bst-bounds', name: 'Bounds passed downwards', topic: 'Graphs & Trees', primerTechnique: 'Tree recursion: down vs up',
    summary: 'A node being bigger than its left child is not enough for a BST: every node in the left subtree must be smaller. Pass an allowed range (lo, hi) down the tree; going left tightens hi to the parent, going right tightens lo. The same ordering lets you walk straight down to the lowest common ancestor.',
    steps: ['check(node, lo, hi): node.val must be in (lo, hi)', 'Recurse left with (lo, node.val) and right with (node.val, hi)'],
    complexity: 'O(n)', patterns: /DFS with bounds|walk down using BST ordering/i, viz: 'bst-bounds',
  },
  {
    id: 'topo-sort', name: 'Topological sort (Kahn)', topic: 'Graphs & Trees', primerTechnique: 'Topological sort (Kahn)',
    summary: 'Order tasks so every prerequisite comes first. Count each node’s incoming edges; nodes with none can go first. Removing a node lowers its successors’ counts, and any that drop to zero are ready. If some nodes never reach zero, there is a cycle.',
    steps: ['indeg[v] for every node; queue those with 0', 'Pop u, append to the order; for each edge u → v: indeg[v]−−, queue v if it hits 0', 'Order shorter than the node count means a cycle'],
    complexity: 'O(V + E)', patterns: /topological sort/i, viz: 'topo-sort',
  },
  {
    id: 'union-find', name: 'Union-Find', topic: 'Graphs & Trees', primerTechnique: 'Union-Find',
    summary: 'Track which nodes are connected as edges arrive. Each set has a root; find(x) follows parent pointers to it, union links one root under the other. Path compression (pointing nodes straight at the root as you go) keeps the trees flat, so operations are nearly constant time.',
    steps: ['parent[i] = i', 'find(x): follow parents to the root, compressing on the way', 'union(a, b): ra = find(a), rb = find(b); if equal, same component (a cycle if this is an edge); else parent[ra] = rb'],
    complexity: 'Nearly O(1) per operation (inverse Ackermann)', patterns: /union-find/i, viz: 'union-find',
  },
  {
    id: 'dijkstra', name: 'Dijkstra’s algorithm', topic: 'Graphs & Trees', primerTechnique: 'Dijkstra',
    summary: 'Shortest paths with non-negative weights. Always settle the unsettled node with the smallest known distance (a min-heap gives it quickly); nothing can reach it more cheaply later. Then relax its edges: if going through it is shorter for a neighbour, update the neighbour.',
    steps: ['dist[source] = 0, others ∞; heap of (dist, node)', 'Pop the smallest; skip if stale; for each edge (u, v, w): if dist[u] + w < dist[v], update and push', 'Stop when the heap is empty or the target is popped'],
    complexity: 'O((V + E) log V)', patterns: /dijkstra/i, viz: 'dijkstra',
  },
  {
    id: 'bellman-ford', name: 'Bellman-Ford with k rounds', topic: 'Graphs & Trees', primerTechnique: 'Bellman-Ford with k rounds',
    summary: 'Relax every edge, repeatedly. After one round, all shortest paths of one edge are correct; after r rounds, all paths of at most r edges. "At most k stops" is therefore k + 1 rounds. Relaxing from a copy of the previous round’s distances stops a round from chaining edges.',
    steps: ['dist[src] = 0, others ∞', 'Repeat k + 1 times: next = copy of dist; for each edge (u, v, w): next[v] = min(next[v], dist[u] + w); dist = next', 'dist[dst], or −1 if ∞'],
    complexity: 'O(k × E)', patterns: /bellman-ford/i,
  },
  {
    id: 'trie', name: 'Trie', topic: 'Graphs & Trees', primerTechnique: 'Trie',
    summary: 'A tree where each node is one character and a path from the root spells a prefix; a flag marks where a word ends. Words with a shared prefix share nodes, so prefix queries cost only the length of the query. A wildcard is handled by trying every child at that position.',
    steps: ['insert: walk or create a child per character; mark the last node', 'search: walk; true if every character exists and the last is marked', 'startsWith: walk; true if every character exists'],
    complexity: 'O(length) per operation', patterns: /trie/i, viz: 'trie',
  },

  // ── backtracking ──────────────────────────────────────────────────────
  {
    id: 'backtracking-tree', name: 'Choose, explore, unchoose', topic: 'Backtracking', primerTechnique: 'Choose, explore, unchoose',
    summary: 'Build each candidate one decision at a time. At each step choose an option, recurse, then undo the choice so the next option starts from the same state. A start index stops the same combination appearing twice in different orders; allowing the start index to stay put lets an element be reused.',
    steps: ['Base case: index past the end (or target reached) → record a copy of the current path', 'For each option from the start index: push, recurse (start = i or i + 1), pop'],
    complexity: 'O(n · 2ⁿ) for subsets; output-sized in general', patterns: /include\/exclude recursion|backtracking with reuse allowed/i, viz: 'backtracking-tree',
  },
  {
    id: 'used-set-permutations', name: 'Used set for permutations', topic: 'Backtracking', primerTechnique: 'Used set for permutations',
    summary: 'A permutation fills slots left to right; at each slot every unused element is a candidate. A used set (or boolean array) makes "already taken?" O(1). Mark, recurse, unmark.',
    steps: ['If the path is full, record it', 'For each x not used: used.add(x), path.push(x), recurse, path.pop(), used.delete(x)'],
    complexity: 'O(n · n!)', patterns: /backtracking with a used set/i, viz: 'used-set-permutations',
  },
  {
    id: 'grid-backtracking', name: 'Grid DFS with mark and restore', topic: 'Backtracking', primerTechnique: 'Grid DFS with mark/restore',
    summary: 'Search for a path through the grid letter by letter. Mark a cell when you step on it so the path cannot reuse it, try the four neighbours, and unmark it when stepping back so other paths may use it.',
    steps: ['From each cell matching the first letter, dfs(r, c, k)', 'Out of bounds, mismatch or visited → false; last letter matched → true', 'Mark; try neighbours with k + 1; unmark; return the result'],
    complexity: 'O(cells × 3^L) worst case', patterns: /grid DFS with visited marking/i, viz: 'grid-backtracking',
  },
  {
    id: 'n-queens', name: 'Row-by-row placement with constraint sets', topic: 'Backtracking', primerTechnique: 'Constraint sets for pruning',
    summary: 'Place one queen per row. A square is attacked if its column, its r − c diagonal or its r + c diagonal already holds a queen; three sets make that an O(1) check, so whole branches are pruned without scanning the board.',
    steps: ['place(row): if row === n, record a solution', 'For each column not in cols, r − c not in diag1, r + c not in diag2: add to all three, recurse, remove from all three'],
    complexity: 'O(n!) worst case, far less with pruning', patterns: /row-by-row placement/i, viz: 'n-queens',
  },

  // ── heaps ─────────────────────────────────────────────────────────────
  {
    id: 'bounded-heap', name: 'Bounded heap of size k', topic: 'Heaps & Priority Queues', primerTechnique: 'Bounded heap of size k',
    summary: 'To keep the k largest items, use a min-heap that never grows past k: push each item, and when the size exceeds k pop the smallest. The heap’s top is then the kth largest. For k closest, flip the comparison and use a max-heap.',
    steps: ['For each x: heap.push(x); if heap.size > k, heap.pop()', 'heap.peek() is the kth largest; the heap holds the k largest'],
    complexity: 'O(n log k) time, O(k) space', patterns: /min-heap of size k|bounded max-heap/i, viz: 'bounded-heap',
  },
  {
    id: 'quickselect', name: 'Quickselect', topic: 'Heaps & Priority Queues', primerTechnique: 'Alternatives to a heap',
    summary: 'Partition the array around a pivot as in quicksort, but recurse into only the side that contains the kth position. Expected linear time, in place, no heap.',
    steps: ['Pick a pivot; partition so smaller values are left of it', 'If the pivot landed at index k, done; else recurse into the side containing k'],
    complexity: 'O(n) expected, O(n²) worst case', patterns: /quickselect/i,
  },
  {
    id: 'two-heaps', name: 'Two heaps', topic: 'Heaps & Priority Queues', primerTechnique: 'Two heaps',
    summary: 'A running median keeps the lower half in a max-heap and the upper half in a min-heap, sizes within one of each other. The median is at the tops. Each insert goes into one heap and may rebalance one element across.',
    steps: ['Push into low; move low’s top to high (so every low ≤ every high)', 'If high is bigger than low, move high’s top back', 'Median = low.top, or the average of the two tops'],
    complexity: 'O(log n) insert, O(1) median', patterns: /two balanced heaps/i, viz: 'two-heaps',
  },
  {
    id: 'k-way-merge', name: 'K-way merge', topic: 'Heaps & Priority Queues', primerTechnique: 'K-way merge',
    summary: 'Merge k sorted lists by keeping each list’s current head in a min-heap. Pop the smallest, append it, push the next element from the same list. The heap never holds more than k items.',
    steps: ['Push (head value, list index) for every non-empty list', 'While the heap is not empty: pop, append, push that list’s next'],
    complexity: 'O(N log k) for N total elements', patterns: /k-way merge/i, viz: 'k-way-merge',
  },
  {
    id: 'bucket-topk', name: 'Bucket sort by frequency', topic: 'Heaps & Priority Queues', primerTechnique: 'Alternatives to a heap',
    summary: 'A value can appear at most n times, so an array of n + 1 buckets indexed by count sorts the values by frequency in linear time. Walk the buckets from the top until k values are collected.',
    steps: ['Count each value', 'buckets[count].push(value)', 'From the highest bucket down, collect until k'],
    complexity: 'O(n)', patterns: /bucket sort/i, viz: 'bucket-topk',
  },
  {
    id: 'greedy-cooldown', name: 'Greedy by frequency with cooldown', topic: 'Heaps & Priority Queues',
    summary: 'The most frequent task sets the schedule: it must appear with at least n idle slots between its copies, and the other tasks fill those slots. Either the formula (maxCount − 1) × (n + 1) + (tasks sharing maxCount) or simulating with a max-heap and a cooldown queue gives the length.',
    steps: ['Count tasks; maxCount = highest count; tied = how many tasks have it', 'Answer = max(total tasks, (maxCount − 1) × (n + 1) + tied)'],
    complexity: 'O(n)', patterns: /greedy by frequency with cooldown/i,
  },

  // ── greedy ────────────────────────────────────────────────────────────
  {
    id: 'greedy-reach', name: 'Greedy reach tracking', topic: 'Greedy',
    summary: 'Keep the furthest index reachable so far. Scanning left to right, if the current index is beyond the reach you are stuck; otherwise it may push the reach further. No need to try every jump.',
    steps: ['reach = 0', 'For i: if i > reach, false; reach = max(reach, i + nums[i])', 'True once reach covers the last index'],
    complexity: 'O(n) time, O(1) space', patterns: /greedy reach/i, viz: 'greedy-reach',
  },
  {
    id: 'reset-on-negative', name: 'Reset on a negative running total', topic: 'Greedy',
    summary: 'If the total gas minus cost is negative, no start works. Otherwise scan with a running tank; whenever it goes negative, no station in that stretch can be the start, so the candidate start moves to the next station and the tank resets.',
    steps: ['total += gain; tank += gain', 'If tank < 0: start = i + 1, tank = 0', 'Answer start if total ≥ 0, else −1'],
    complexity: 'O(n) time, O(1) space', patterns: /reset on negative/i, viz: 'reset-on-negative',
  },
  {
    id: 'last-occurrence', name: 'Last-occurrence boundaries', topic: 'Greedy',
    summary: 'A part must contain every occurrence of each letter in it. Record each letter’s last index, then scan: the current part must extend at least to the last index of every letter seen so far; when the scan reaches that boundary, the part closes.',
    steps: ['last[c] = final index of c', 'end = max(end, last[s[i]]); if i === end, close the part [start, end]'],
    complexity: 'O(n)', patterns: /last-occurrence/i, viz: 'last-occurrence',
  },

  // ── bits, matrix, maths ───────────────────────────────────────────────
  {
    id: 'xor-cancel', name: 'XOR cancellation', topic: 'Bit Manipulation', primerTechnique: 'XOR cancellation',
    summary: 'x XOR x = 0, x XOR 0 = x, and order does not matter. XOR everything together and every pair cancels, leaving the single value. The same idea finds a missing number by XORing indices against values.',
    steps: ['acc = 0; for x: acc ^= x', 'acc is the unpaired value'],
    complexity: 'O(n) time, O(1) space', patterns: /xor cancellation/i, viz: 'xor-cancel',
  },
  {
    id: 'shift-or', name: 'Shift and OR', topic: 'Bit Manipulation', primerTechnique: 'Shift-and-OR',
    summary: 'Build a number bit by bit: shift the result left to make room, OR in the next bit, and shift the source right to expose the following one. 32 rounds reverse a 32-bit integer.',
    steps: ['result = 0; repeat 32 times: result = (result << 1) | (n & 1); n >>>= 1', 'Use >>> and >>> 0 to keep it unsigned in JavaScript'],
    complexity: 'O(1), 32 steps', patterns: /shift and OR/i,
  },
  {
    id: 'shrinking-boundaries', name: 'Shrinking boundaries', topic: 'Matrix',
    summary: 'Walk the matrix in a spiral with four boundaries: top row left to right, right column downwards, bottom row right to left, left column upwards. After each side, pull that boundary in by one; stop when they cross. Check the boundaries before the third and fourth sides so a single row or column is not read twice.',
    steps: ['top, bottom, left, right', 'While top ≤ bottom and left ≤ right: four sides, each followed by moving its boundary', 'Guard the bottom row and left column with top ≤ bottom / left ≤ right'],
    complexity: 'O(rows × cols)', patterns: /shrinking boundaries/i, viz: 'shrinking-boundaries',
  },
  {
    id: 'transpose-reverse', name: 'Transpose, then reverse rows', topic: 'Matrix',
    summary: 'Rotating a square matrix 90° clockwise is a transpose (swap m[i][j] with m[j][i] across the diagonal) followed by reversing each row. Both steps are in place.',
    steps: ['For i < j: swap m[i][j] and m[j][i]', 'Reverse every row'],
    complexity: 'O(n²) time, O(1) space', patterns: /transpose then reverse/i,
  },
  {
    id: 'marker-row-col', name: 'First row and column as markers', topic: 'Matrix',
    summary: 'To zero out rows and columns without extra memory, use the first row and first column as the flags: a zero at m[i][j] sets m[i][0] and m[0][j]. Two separate booleans remember whether the first row and column themselves need zeroing.',
    steps: ['Scan; record flags in row 0 and column 0 (plus two booleans)', 'Zero cells (i, j) for i, j ≥ 1 whose flags are set', 'Finally handle row 0 and column 0 from the booleans'],
    complexity: 'O(rows × cols) time, O(1) space', patterns: /first row\/column as markers/i,
  },
  {
    id: 'fast-pow', name: 'Exponentiation by squaring', topic: 'Math & Geometry',
    summary: 'xⁿ with n halving each step: if n is even, xⁿ = (x²)^(n/2); if odd, peel one x off first. Negative n inverts x. Twenty steps cover n up to a million.',
    steps: ['If n < 0: x = 1 / x, n = −n', 'result = 1; while n > 0: if n is odd, result *= x; x *= x; n >>= 1'],
    complexity: 'O(log n)', patterns: /fast exponentiation/i,
  },

  // ── practical ─────────────────────────────────────────────────────────
  {
    id: 'lru-map-order', name: 'Map insertion order as a recency list', topic: 'Caching',
    summary: 'An insertion-ordered map (a JavaScript Map, a Ruby Hash, Java’s LinkedHashMap) remembers the order keys were added, and deleting then re-inserting a key moves it to the end. So the first key is always the least recently used: an LRU cache needs no hand-built linked list.',
    steps: ['get: if present, delete and re-insert the key, return the value', 'put: delete if present; if at capacity, delete the first key; insert'],
    complexity: 'O(1) per operation', patterns: /map insertion order/i, viz: 'lru-map-order',
  },
  {
    id: 'lfu-buckets', name: 'Frequency buckets with min-frequency tracking', topic: 'Caching',
    summary: 'Keep each key’s count, plus a bucket per count holding its keys in recency order (a Set or Map per count), and the current minimum count. A hit moves the key up one bucket; eviction takes the oldest key from the minimum bucket. The minimum only resets to 1 on an insert, and only rises when its bucket empties.',
    steps: ['key → {value, count}; count → ordered set of keys; minCount', 'touch(key): remove from bucket[count], add to bucket[count + 1]; if bucket[minCount] emptied and it was this key’s, minCount++', 'put at capacity: evict first key of bucket[minCount]; insert with count 1, minCount = 1'],
    complexity: 'O(1) per operation', patterns: /frequency buckets/i,
  },
  {
    id: 'memo-key', name: 'Cache keyed by serialised arguments', topic: 'Caching',
    summary: 'Memoise by turning the argument list into a stable key (a JSON string, a Ruby array, a Java List: anything with value equality) and storing the result with a timestamp. On a hit, check the age against the TTL before returning; expired entries are recomputed.',
    steps: ['key = a value-equal form of the arguments', 'Hit and fresh → return; else compute, store {value, expiresAt: now() + ttl}', 'Inject the clock so tests can control time'],
    complexity: 'O(1) per call plus the key cost', patterns: /cache keyed by serialised args/i,
  },
  {
    id: 'worker-pool', name: 'Worker pool over a shared index', topic: 'Async & Concurrency',
    summary: 'To run tasks with at most n in flight, start n workers (async functions, or threads) that each loop: take the next index from a shared counter, run that task, repeat until the tasks run out. Results go into a preallocated array by index, so order is preserved regardless of completion order.',
    steps: ['next = 0; results = []', 'worker: while (i = next++) < tasks.length: results[i] = run tasks[i] (the counter is atomic or behind a lock when workers are threads)', 'Wait for all n workers; return results'],
    complexity: 'n in flight; O(tasks) total', patterns: /worker pool|queue with concurrency/i,
  },
  {
    id: 'timer-reset', name: 'Timer reset and leading-edge gate', topic: 'Async & Concurrency',
    summary: 'Debounce waits for quiet: every call clears the pending timer and starts a new one, so only the last call in a burst runs. Throttle lets a call through at once, then blocks for the interval, optionally remembering the latest blocked call to run at the end (trailing call).',
    steps: ['Debounce: cancel the pending timer; start a new one that runs fn after the wait (a timer, a scheduled executor, or a sleeping thread with a generation check)', 'Throttle: if not blocked, run and block; else store the latest args; when the block ends, run them if any'],
    complexity: 'O(1) per call', patterns: /timer reset|leading-edge gate/i,
  },
  {
    id: 'retry-backoff', name: 'Retry loop with growing delay', topic: 'Async & Concurrency',
    summary: 'Try; on failure wait, then try again with a longer wait (doubling, capped, often with jitter) until the attempts run out. Only retry errors that are worth retrying, and rethrow the last one when giving up.',
    steps: ['for attempt in 0..max: try return await fn(); catch: if last attempt or not retryable, throw', 'delay = min(base × 2^attempt, cap) ± jitter; await sleep(delay)'],
    complexity: 'Bounded by max attempts', patterns: /retry loop/i,
  },
  {
    id: 'race-cleanup', name: 'Race with cleanup and AbortSignal', topic: 'Async & Concurrency',
    summary: 'Run the work against a timer: whichever settles first wins. The loser must be cleaned up: clear the timer when the work finishes, and cancel the work (through an AbortSignal, or a cancel token in Ruby and Java) when the timer fires. Without the cleanup, timers keep processes alive and work keeps running after it was abandoned.',
    steps: ['Create a cancel handle (AbortController, CancelToken) and a timer that cancels it and fails with "timeout"', 'Race the work against the timer (Promise.race, Thread#join with a limit, Future#get with a timeout); clear the timer in finally', 'Forward an outer cancellation too'],
    complexity: 'O(1)', patterns: /race with cleanup/i,
  },
  {
    id: 'observer', name: 'Observer with unsubscribe handles', topic: 'Patterns & Abstractions',
    summary: 'An event emitter keeps a Set of listeners per event name. on() adds and returns a function that removes exactly that listener, so callers can unsubscribe without holding a reference. emit copies the set before iterating so listeners that unsubscribe during emit do not break the loop.',
    steps: ['Map<event, Set<listener>>', 'on: add; return () => set.delete(listener)', 'emit: for (const l of [...set]) l(...args); once: wrap in a listener that unsubscribes itself'],
    complexity: 'O(listeners) per emit', patterns: /observer with unsubscribe/i,
  },
  {
    id: 'token-bucket', name: 'Lazy refill from an injected clock', topic: 'Patterns & Abstractions',
    summary: 'A token bucket does not need a timer: on each request compute how many tokens have accrued since the last refill (elapsed × rate, capped at the bucket size), add them, then take one if available. Injecting the clock makes it deterministic to test.',
    steps: ['refill(): tokens = min(cap, tokens + (now() − last) × rate); last = now()', 'take(): refill(); if tokens ≥ 1, tokens−−, true; else false'],
    complexity: 'O(1) per request, no timers', patterns: /lazy refill/i,
  },
  {
    id: 'ring-buffer', name: 'Ring with head and tail indices', topic: 'Patterns & Abstractions',
    summary: 'A fixed array used as a loop. head is where the oldest item sits, tail is where the next item goes; both advance with (i + 1) % capacity. A size counter (or one empty slot) tells full from empty, since head === tail in both cases.',
    steps: ['push: if full, refuse or overwrite; buf[tail] = x; tail = (tail + 1) % cap; size++', 'shift: if empty, undefined; x = buf[head]; head = (head + 1) % cap; size−−'],
    complexity: 'O(1) per operation, fixed memory', patterns: /ring with head\/tail/i, viz: 'ring-buffer',
  },
  {
    id: 'segment-match', name: 'Segment matching with captured params', topic: 'Patterns & Abstractions',
    summary: 'Split the pattern and the path on "/" and walk them together: a literal segment must match exactly, a ":name" segment captures the path segment (URL-decoded) into params, and a trailing "*" swallows the rest. Lengths must agree unless a wildcard took the remainder.',
    steps: ['segs = s.split("/").filter(Boolean) for both', 'For each pattern segment: "*" at the end → capture the rest and return; ":x" → params.x = decode(path[i]); else must equal', 'Return null unless the lengths match'],
    complexity: 'O(segments)', patterns: /segment matching/i,
  },
  {
    id: 'recursive-walk', name: 'Structural recursion', topic: 'Data Transformation',
    summary: 'Walk a nested value by its shape: arrays and plain objects recurse into their children, everything else is a leaf. Carry what the recursion needs as parameters (a path prefix for flattening, a WeakMap of visited objects for cycle-safe cloning, the remaining path for an immutable set). Dispatch on the type before recursing so Dates, Maps and class instances are handled deliberately.',
    steps: ['Decide the leaf test (primitive, Date, function…)', 'Arrays: map recursively; plain objects: rebuild from entries', 'Thread state through parameters: prefix, visited, path'],
    complexity: 'O(size of the structure)', patterns: /recursive walk with a path prefix|structural recursion|recursive copy with a weakmap|path copy/i,
  },
  {
    id: 'reduce-keyed', name: 'Reduce into a keyed record', topic: 'Data Transformation',
    summary: 'Grouping is a reduce: for each item compute its key, then push it under that key in an accumulator map, creating the bucket on first sight. Keep the key type precise (a string union in TypeScript, a symbol or value object elsewhere) so the result stays strongly typed.',
    steps: ['acc = empty map; for item: bucket for key(item), created on first sight, gets the item', 'Use an insertion-ordered map when group order matters'],
    complexity: 'O(n)', patterns: /reduce into a keyed record/i,
  },
  {
    id: 'tokenise', name: 'Tokenise, then process field by field', topic: 'Data Transformation',
    summary: 'Parsing small formats is two steps: split into tokens (on "&", "=", ".", "-") and then handle each token deliberately: decode it, convert it, compare it numerically. Keep the split and the interpretation separate so edge cases (empty values, repeated keys, prerelease tags) are each one line.',
    steps: ['Split on the outer separator, then the inner one', 'Decode or convert each piece; accumulate repeated keys into arrays', 'Compare semver numerically field by field, numbers before strings'],
    complexity: 'O(length)', patterns: /tokenise/i,
  },
]

const byId = new Map(TECHNIQUES.map((t) => [t.id, t]))

/** A technique by id. */
export const techniqueById = (id: string): TechniqueDoc | undefined => byId.get(id)

/** The techniques a problem exercises, matched by its pattern (variants inherit their parent's). */
export function techniquesFor(problem: Problem): TechniqueDoc[] {
  if (problem.track !== 'coding' && problem.track !== 'practical') return []
  return TECHNIQUES.filter((t) => t.patterns.test(problem.pattern))
}
