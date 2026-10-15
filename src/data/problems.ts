import type { AlgoProblem } from './types';

const LIST_NODE = `export class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

`;

export const ALGO_PROBLEMS: AlgoProblem[] = [
  // ─── Arrays & Hashing ───────────────────────────────────────────────
  {
    id: 'two-sum',
    title: 'Two Sum',
    topic: 'Arrays & Hashing',
    difficulty: 'easy',
    description: [
      'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.',
      'You may assume that each input has exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
    ],
    examples: [
      {
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        note: 'nums[0] = 2 and nums[1] = 7; 2 + 7 = 9.',
      },
      {
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
      },
      {
        input: 'nums = [3, 3], target = 6',
        output: '[0, 1]',
      },
    ],
    hints: [
      'A brute-force double loop is O(n²). Can you do one pass?',
      'For each number x, the value you need is target − x. Keep a hash map from value → index seen so far.',
    ],
    starter: `/**
 * Return the indices of the two numbers in nums that sum to target.
 */
export function twoSum(nums: number[], target: number): number[] {
  // your code
  return [];
}
`,
    solution: `export function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement)!, i];
    seen.set(nums[i], i);
  }
  throw new Error('no two-sum solution exists');
}
`,
  },
  {
    id: 'max-profit-stock',
    title: 'Best Time to Buy and Sell Stock',
    topic: 'Arrays & Hashing',
    difficulty: 'easy',
    description: [
      'Given an array `prices` where `prices[i]` is the price of a given stock on day i, design an algorithm to compute the maximum profit you can achieve.',
      'You may complete **at most one transaction**: you must buy before you sell. If you cannot achieve a profit, return 0.',
    ],
    examples: [
      {
        input: 'prices = [7, 1, 5, 3, 6, 4]',
        output: '5',
        note: 'Buy at price 1 (day 2) and sell at price 6 (day 5).',
      },
      {
        input: 'prices = [7, 6, 4, 3, 1]',
        output: '0',
        note: 'No transaction is done.',
      },
    ],
    hints: [
      'For each day, the best profit if you sell today is price − cheapest so far.',
      'Track the running minimum in a single pass.',
    ],
    starter: `/**
 * Maximum profit from at most one buy/sell transaction.
 */
export function maxProfit(prices: number[]): number {
  // your code
  return 0;
}
`,
    solution: `export function maxProfit(prices: number[]): number {
  let minSoFar = Infinity;
  let best = 0;
  for (const price of prices) {
    minSoFar = Math.min(minSoFar, price);
    best = Math.max(best, price - minSoFar);
  }
  return best;
}
`,
  },

  // ─── Two Pointers ───────────────────────────────────────────────────
  {
    id: '3sum',
    title: '3Sum',
    topic: 'Two Pointers',
    difficulty: 'medium',
    description: [
      'Given an integer array `nums`, return all unique triplets `[nums[i], nums[j], nums[k]]` such that `nums[i] + nums[j] + nums[k] = 0`.',
      'The solution set must not contain duplicate triplets.',
    ],
    examples: [
      {
        input: 'nums = [-1, 0, 1, 2, -4, -4]',
        output: '[[-1, 0, 1]]',
      },
      {
        input: 'nums = [0, 0, 0, 0]',
        output: '[[0, 0, 0]]',
      },
      {
        input: 'nums = [-2, 0, 0, 2, 2]',
        output: '[[-2, 0, 2]]',
      },
    ],
    hints: [
      'Sort first — this makes duplicate-skipping trivial and reduces the inner search to two pointers.',
      'Fix one element at index i, then search for pairs summing to −nums[i] in the rest with left/right pointers.',
      'Skip duplicates: advance i past equal values; after finding a pair, advance left/right past equal values.',
    ],
    starter: `/**
 * All unique triplets in nums that sum to zero.
 */
export function threeSum(nums: number[]): number[][] {
  // your code
  return [];
}
`,
    solution: `export function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  const result: number[][] = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let left = i + 1;
    let right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum < 0) left++;
      else if (sum > 0) right--;
      else {
        result.push([nums[i], nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++;
        right--;
      }
    }
  }
  return result;
}
`,
  },

  // ─── Stack & Queue ──────────────────────────────────────────────────
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    topic: 'Stack & Queue',
    difficulty: 'easy',
    description: [
      "Given a string `s` containing just the characters `'('`, `')'`, `'['`, `']'`, `'{'` and `'}'`, determine if the input string is valid.",
      'An input string is valid if: open brackets must be closed by the **same type** of bracket, open brackets must be closed in the **correct order**, and every close bracket has a corresponding open bracket of the same type.',
    ],
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
      { input: 's = "([)]"', output: 'false' },
      { input: 's = "{[]}"', output: 'true' },
    ],
    hints: [
      'This is the canonical stack problem: push opening brackets, and on a closing bracket check the top of the stack.',
      'The string is valid only if the stack is empty at the end.',
    ],
    starter: `/**
 * Whether s is a valid sequence of matched parentheses.
 */
export function isValid(s: string): boolean {
  // your code
  return false;
}
`,
    solution: `export function isValid(s: string): boolean {
  const closeToOpen: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: string[] = [];
  for (const ch of s) {
    if (ch in closeToOpen) {
      if (stack.pop() !== closeToOpen[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}
`,
  },

  // ─── Sliding Window ─────────────────────────────────────────────────
  {
    id: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    topic: 'Sliding Window',
    difficulty: 'medium',
    description: [
      'Given a string `s`, find the length of the **longest substring** without duplicate characters.',
    ],
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        note: 'The answer is "abc".',
      },
      { input: 's = "bbbbb"', output: '1', note: 'The answer is "b".' },
      {
        input: 's = "pwwkew"',
        output: '3',
        note: 'The answer is "wke" — "pwke" is a subsequence, not a substring.',
      },
    ],
    hints: [
      'Maintain a window [left, right) that never contains duplicates; grow right, shrink left when forced.',
      'Store the last index each character was seen at. When s[right] was seen at index prev >= left, jump left to prev + 1.',
    ],
    starter: `/**
 * Length of the longest substring of s with no repeating characters.
 */
export function lengthOfLongestSubstring(s: string): number {
  // your code
  return 0;
}
`,
    solution: `export function lengthOfLongestSubstring(s: string): number {
  const lastSeen = new Map<string, number>();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    const prev = lastSeen.get(ch);
    if (prev !== undefined && prev >= left) left = prev + 1;
    lastSeen.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
`,
  },
  {
    id: 'sliding-window-maximum',
    title: 'Sliding Window Maximum',
    topic: 'Sliding Window',
    difficulty: 'hard',
    description: [
      'You are given an array of integers `nums`, there is a sliding window of size `k` which is moving from the very left of the array to the very right. You can only see the `k` numbers in the window. Each time the sliding window moves right by one position.',
      'Return the max sliding window — the maximum of each window as it moves left to right.',
    ],
    examples: [
      {
        input: 'nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3',
        output: '[3, 3, 5, 5, 6, 7]',
      },
      { input: 'nums = [1, -1], k = 1', output: '[1, -1]' },
    ],
    hints: [
      'Naive is O(n·k). You want O(n) with an amortized-constant-window structure.',
      'Keep a deque of indices whose values are strictly decreasing. Popping from the back removes indices that can never be a window maximum; dropping the front removes indices that left the window.',
    ],
    starter: `/**
 * Maximum of each sliding window of size k.
 */
export function maxSlidingWindow(nums: number[], k: number): number[] {
  // your code
  return [];
}
`,
    solution: `export function maxSlidingWindow(nums: number[], k: number): number[] {
  const deque: number[] = []; // indices, values strictly decreasing
  const result: number[] = [];
  for (let right = 0; right < nums.length; right++) {
    while (deque.length > 0 && nums[deque[deque.length - 1]] <= nums[right]) {
      deque.pop();
    }
    deque.push(right);
    if (deque[0] <= right - k) deque.shift();
    if (right >= k - 1) result.push(nums[deque[0]]);
  }
  return result;
}
`,
  },

  // ─── Sorting & Sweeping ─────────────────────────────────────────────
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    topic: 'Sorting & Sweeping',
    difficulty: 'medium',
    description: [
      'Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals and return an array of the **non-overlapping** intervals that cover all the input intervals exactly.',
      'Intervals that merely touch at an endpoint (e.g. [1,4] and [4,5]) are considered overlapping.',
    ],
    examples: [
      {
        input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
        output: '[[1,6],[8,10],[15,18]]',
        note: '[1,3] and [2,6] overlap → [1,6].',
      },
      {
        input: 'intervals = [[1,4],[4,5]]',
        output: '[[1,5]]',
      },
    ],
    hints: [
      'Sorting by start time is the key move — after that it is a single sweep.',
      'If the next interval starts ≤ the current merged end, extend the current end; otherwise start a new one.',
    ],
    starter: `/**
 * Merge all overlapping intervals.
 */
export function merge(intervals: number[][]): number[][] {
  // your code
  return [];
}
`,
    solution: `export function merge(intervals: number[][]): number[][] {
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: number[][] = [];
  for (const [start, end] of intervals) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}
`,
  },

  // ─── Linked Lists ───────────────────────────────────────────────────
  {
    id: 'reverse-linked-list',
    title: 'Reverse Linked List',
    topic: 'Linked Lists',
    difficulty: 'easy',
    description: [
      'Given the `head` of a singly linked list, reverse the list, and return the reversed list.',
    ],
    examples: [
      { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' },
      { input: 'head = []', output: '[]' },
      { input: 'head = [1]', output: '[1]' },
    ],
    hints: [
      'Iterative version: keep `prev` and `curr`. At each step, point `curr.next` to `prev`, then advance both.',
      'A recursive version also works: reverse the tail, then reattach the head. What is the space cost?',
    ],
    starter: LIST_NODE + `/**
 * Reverse a singly linked list and return the new head.
 */
export function reverseList(head: ListNode | null): ListNode | null {
  // your code
  return null;
}
`,
    solution: LIST_NODE + `export function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}
`,
  },
  {
    id: 'linked-list-cycle',
    title: 'Linked List Cycle',
    topic: 'Linked Lists',
    difficulty: 'easy',
    description: [
      'Given the `head` of a linked list, determine if the linked list has a cycle in it.',
      'There is a cycle in the linked list if there is some node that can be reached by continuously following the `next` pointer. Return `true` if there is a cycle in the linked list. Otherwise, return `false`.',
    ],
    examples: [
      {
        input: 'list = [3, 2, 0, -4], where -4.next points back to the node with value 2',
        output: 'true',
      },
      {
        input: 'list = [1, 2], where 2.next points back to the node with value 1',
        output: 'true',
      },
      { input: 'list = [1]', output: 'false' },
    ],
    hints: [
      'A hash set of visited nodes works in O(n) space — but interviewers usually want O(1).',
      "Floyd's tortoise and hare: advance one pointer by 1 and another by 2. They meet if and only if a cycle exists.",
    ],
    starter: LIST_NODE + `/**
 * Whether the linked list contains a cycle.
 */
export function hasCycle(head: ListNode | null): boolean {
  // your code
  return false;
}
`,
    solution: LIST_NODE + `export function hasCycle(head: ListNode | null): boolean {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next!;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
`,
  },

  // ─── Binary Search ──────────────────────────────────────────────────
  {
    id: 'binary-search',
    title: 'Binary Search',
    topic: 'Binary Search',
    difficulty: 'easy',
    description: [
      'Given a `sorted (ascending)` array of distinct integers `nums` and an integer `target`, write a function to return the index of `target` if it exists in `nums`, otherwise return `-1`.',
      'Your algorithm must have O(log n) runtime complexity.',
    ],
    examples: [
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', output: '4' },
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 2', output: '-1' },
    ],
    hints: [
      'Maintain a closed interval [lo, hi]. Compute mid as lo + floor((hi − lo) / 2) to avoid overflow-style mistakes.',
      'Be deliberate about whether lo/hi are inclusive — pick one convention and keep it consistent in the loop condition and updates.',
    ],
    starter: `/**
 * Index of target in sorted nums, or -1 if absent. Must be O(log n).
 */
export function search(nums: number[], target: number): number {
  // your code
  return -1;
}
`,
    solution: `export function search(nums: number[], target: number): number {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
`,
  },

  // ─── Dynamic Programming ────────────────────────────────────────────
  {
    id: 'max-subarray',
    title: 'Maximum Subarray',
    topic: 'Dynamic Programming',
    difficulty: 'medium',
    description: [
      'Given an integer array `nums`, find the **contiguous subarray** (containing at least one number) which has the largest sum, and return its sum.',
    ],
    examples: [
      {
        input: 'nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]',
        output: '6',
        note: 'The subarray [4, -1, 2, 1] has the largest sum (6).',
      },
      { input: 'nums = [1]', output: '1' },
      { input: 'nums = [5, 4, -1, 7, 8]', output: '23' },
    ],
    hints: [
      'Kadane\'s algorithm: let bestEndingHere be the max sum of a subarray ending at index i.',
      'bestEndingHere = max(nums[i], bestEndingHere + nums[i]) — either start fresh or extend. The answer is the max over all i.',
    ],
    starter: `/**
 * Largest sum of any contiguous subarray of nums.
 */
export function maxSubArray(nums: number[]): number {
  // your code
  return 0;
}
`,
    solution: `export function maxSubArray(nums: number[]): number {
  let bestHere = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    bestHere = Math.max(nums[i], bestHere + nums[i]);
    best = Math.max(best, bestHere);
  }
  return best;
}
`,
  },
  {
    id: 'longest-common-subsequence',
    title: 'Longest Common Subsequence',
    topic: 'Dynamic Programming',
    difficulty: 'medium',
    description: [
      'Given two strings `text1` and `text2`, return the length of their **longest common subsequence**. If there is no common subsequence, return 0.',
      'A subsequence is a sequence that can be derived by deleting zero or more characters without changing the order of the remaining characters.',
    ],
    examples: [
      {
        input: 'text1 = "abcde", text2 = "ace"',
        output: '3',
        note: 'The LCS is "ace".',
      },
      { input: 'text1 = "abc", text2 = "abc"', output: '3' },
      { input: 'text1 = "abc", text2 = "def"', output: '0' },
    ],
    hints: [
      'Define dp[i][j] = length of the LCS of text1[i:] and text2[j:].',
      'If the characters match: 1 + dp[i+1][j+1]. Otherwise: max(dp[i+1][j], dp[i][j+1]). Compress the 2D table to a single row.',
    ],
    starter: `/**
 * Length of the longest common subsequence of text1 and text2.
 */
export function longestCommonSubsequence(text1: string, text2: string): number {
  // your code
  return 0;
}
`,
    solution: `export function longestCommonSubsequence(text1: string, text2: string): number {
  const m = text1.length;
  const n = text2.length;
  let prev = new Array<number>(n + 1).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    const curr = new Array<number>(n + 1).fill(0);
    for (let j = n - 1; j >= 0; j--) {
      if (text1[i] === text2[j]) curr[j] = 1 + prev[j + 1];
      else curr[j] = Math.max(prev[j], curr[j + 1]);
    }
    prev = curr;
  }
  return prev[0];
}
`,
  },

  // ─── Graphs & Trees ─────────────────────────────────────────────────
  {
    id: 'number-of-islands',
    title: 'Number of Islands',
    topic: 'Graphs & Trees',
    difficulty: 'medium',
    description: [
      "Given an `m x n` 2D grid map of `'1'`s (land) and `'0'`s (water), return the number of islands.",
      'An island is surrounded by water and is formed by connecting adjacent lands **horizontally or vertically**. You may assume all four edges of the grid are surrounded by water.',
    ],
    examples: [
      {
        input:
          'grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]',
        output: '3',
      },
      {
        input:
          'grid = [\n  ["0","0","0","0"],\n  ["0","1","1","0"],\n  ["0","0","0","0"]\n]',
        output: '1',
      },
    ],
    hints: [
      'Each land cell belongs to exactly one island. Scan every cell; when you hit unvisited land, count one and flood-fill the whole island.',
      'Mutating the grid in place (marking visited land as water) is the simplest way to track visited state.',
    ],
    starter: `/**
 * Number of 4-directionally-connected land regions in grid.
 */
export function numIslands(grid: string[][]): number {
  // your code
  return 0;
}
`,
    solution: `export function numIslands(grid: string[][]): number {
  if (grid.length === 0) return 0;
  const rows = grid.length;
  const cols = grid[0].length;

  const visit = (r: number, c: number): void => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    visit(r + 1, c);
    visit(r - 1, c);
    visit(r, c + 1);
    visit(r, c - 1);
  };

  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        count++;
        visit(r, c);
      }
    }
  }
  return count;
}
`,
  },
  {
    id: 'course-schedule',
    title: 'Course Schedule',
    topic: 'Graphs & Trees',
    difficulty: 'medium',
    description: [
      'There are a total of `numCourses` courses to take, labeled 0 to `numCourses - 1`.',
      'You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you **must take course b before taking course a**. Return `true` if you can finish all courses (i.e. the prerequisite graph has no cycle), and `false` otherwise.',
    ],
    examples: [
      { input: 'numCourses = 2, prerequisites = [[1,0]]', output: 'true' },
      { input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]', output: 'false' },
      { input: 'numCourses = 3, prerequisites = [[2,0],[2,1],[1,0]]', output: 'true' },
    ],
    hints: [
      'This is cycle detection in a directed graph — if there is a cycle, you can never finish.',
      'Kahn\'s algorithm: repeatedly remove courses with in-degree 0. If you remove fewer than numCourses courses, a cycle remains.',
    ],
    starter: `/**
 * Whether all numCourses can be taken given the prerequisites.
 */
export function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  // your code
  return false;
}
`,
    solution: `export function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const adj: number[][] = Array.from({ length: numCourses }, () => []);
  const indegree = new Array<number>(numCourses).fill(0);
  for (const [a, b] of prerequisites) {
    adj[b].push(a);
    indegree[a]++;
  }

  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) {
    if (indegree[i] === 0) queue.push(i);
  }

  let done = 0;
  while (queue.length > 0) {
    const course = queue.shift()!;
    done++;
    for (const next of adj[course]) {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next);
    }
  }
  return done === numCourses;
}
`,
  },

  // ─── Backtracking ───────────────────────────────────────────────────
  {
    id: 'permutations',
    title: 'Permutations',
    topic: 'Backtracking',
    difficulty: 'medium',
    description: [
      'Given an array `nums` of **distinct integers**, return all possible permutations. You may return the answer in any order.',
    ],
    examples: [
      {
        input: 'nums = [1, 2, 3]',
        output: '[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]',
      },
      {
        input: 'nums = [0, 1]',
        output: '[[0,1],[1,0]]',
      },
    ],
    hints: [
      'Build the answer one position at a time: at each step, pick an element that has not been used yet.',
      'The backtracking loop: choose → recurse → un-choose (pop the element and mark it unused).',
    ],
    starter: `/**
 * All permutations of nums, in any order.
 */
export function permute(nums: number[]): number[][] {
  // your code
  return [];
}
`,
    solution: `export function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  const current: number[] = [];
  const used = new Array<boolean>(nums.length).fill(false);

  const backtrack = (): void => {
    if (current.length === nums.length) {
      result.push([...current]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(nums[i]);
      backtrack();
      current.pop();
      used[i] = false;
    }
  };

  backtrack();
  return result;
}
`,
  },

  // ─── Heaps & Priority Queues ────────────────────────────────────────
  {
    id: 'top-k-frequent-elements',
    title: 'Top K Frequent Elements',
    topic: 'Heaps & Priority Queues',
    difficulty: 'medium',
    description: [
      'Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.',
    ],
    examples: [
      { input: 'nums = [1, 1, 1, 3, 3, 2], k = 2', output: '[1, 3]' },
      { input: 'nums = [1], k = 1', output: '[1]' },
    ],
    hints: [
      'First pass: count frequencies in a hash map.',
      'Then either sort by frequency (O(n log n)), use a min-heap of size k, or use bucket sort by frequency (O(n)).',
    ],
    starter: `/**
 * The k most frequent elements of nums, in any order.
 */
export function topKFrequent(nums: number[], k: number): number[] {
  // your code
  return [];
}
`,
    solution: `export function topKFrequent(nums: number[], k: number): number[] {
  const freq = new Map<number, number>();
  for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1);

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([value]) => value);
}
`,
  },
];
