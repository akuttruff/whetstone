import type { CodeProblem } from '../types.ts'

type Spec = Omit<CodeProblem, 'track' | 'source'>
const c = (p: Spec): CodeProblem => ({ ...p, track: 'coding', source: 'builtin' })

const LIST = `export interface ListNode {\n  val: number\n  next: ListNode | null\n}\n\n`
const TREE = `export interface TreeNode {\n  val: number\n  left: TreeNode | null\n  right: TreeNode | null\n}\n\n`
const T = (val: number, left: string | null = null, right: string | null = null): string => `{ val: ${val}, left: ${left ?? 'null'}, right: ${right ?? 'null'} }`
const L = (...vals: number[]): string => vals.reduceRight((next, v) => `{ val: ${v}, next: ${next} }`, 'null')

/** Linked lists, trees, heaps and tries. Nodes are plain objects so tests can pass them in. */
export const CODING_STRUCTURES: CodeProblem[] = [
  c({
    id: 'merge-two-sorted-lists', title: 'Merge Two Sorted Lists', topic: 'Linked Lists', pattern: 'Dummy head with two cursors', difficulty: 'easy',
    description: ['Merge two sorted linked lists into one sorted list by splicing their nodes together. Nodes are plain `{ val, next }` objects.'],
    examples: [{ input: 'l1 = [1, 2, 4], l2 = [1, 3, 4]', output: '[1, 1, 2, 3, 4, 4]' }, { input: 'l1 = [], l2 = [0]', output: '[0]' }],
    hints: ['A dummy head node removes the special case for the first element.', 'Whichever list still has nodes when the other runs out is appended whole.'],
    starter: LIST + `export function mergeTwoLists(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n  // your code\n  return null\n}\n`,
    solution: LIST + `export function mergeTwoLists(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n  const dummy: ListNode = { val: 0, next: null }\n  let tail = dummy\n  while (l1 && l2) {\n    if (l1.val <= l2.val) {\n      tail.next = l1\n      l1 = l1.next\n    } else {\n      tail.next = l2\n      l2 = l2.next\n    }\n    tail = tail.next\n  }\n  tail.next = l1 ?? l2\n  return dummy.next\n}\n`,
    tests: [
      { call: `mergeTwoLists(${L(1, 2, 4)}, ${L(1, 3, 4)})`, expected: { val: 1, next: { val: 1, next: { val: 2, next: { val: 3, next: { val: 4, next: { val: 4, next: null } } } } } } },
      { call: `mergeTwoLists(null, ${L(0)})`, expected: { val: 0, next: null } },
      { call: 'mergeTwoLists(null, null)', expected: null },
    ],
  }),
  c({
    id: 'remove-nth-from-end', title: 'Remove Nth Node From End of List', topic: 'Linked Lists', pattern: 'Two pointers with a gap', difficulty: 'medium',
    description: ['Remove the n-th node from the end of a linked list and return the head, in one pass.'],
    examples: [{ input: 'head = [1, 2, 3, 4, 5], n = 2', output: '[1, 2, 3, 5]' }, { input: 'head = [1], n = 1', output: '[]' }],
    hints: ['Advance a lead pointer n steps, then move lead and trail together until lead reaches the end; trail is just before the node to remove.', 'A dummy head handles removing the first node.'],
    starter: LIST + `export function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {\n  // your code\n  return head\n}\n`,
    solution: LIST + `export function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {\n  const dummy: ListNode = { val: 0, next: head }\n  let lead: ListNode | null = dummy\n  let trail: ListNode = dummy\n  for (let i = 0; i <= n; i++) lead = lead!.next\n  while (lead) {\n    lead = lead.next\n    trail = trail.next!\n  }\n  trail.next = trail.next!.next\n  return dummy.next\n}\n`,
    tests: [
      { call: `removeNthFromEnd(${L(1, 2, 3, 4, 5)}, 2)`, expected: { val: 1, next: { val: 2, next: { val: 3, next: { val: 5, next: null } } } } },
      { call: `removeNthFromEnd(${L(1)}, 1)`, expected: null },
      { call: `removeNthFromEnd(${L(1, 2)}, 2)`, expected: { val: 2, next: null } },
    ],
  }),
  c({
    id: 'add-two-numbers', title: 'Add Two Numbers', topic: 'Linked Lists', pattern: 'Digit-by-digit with carry', difficulty: 'medium',
    description: ['Two non-negative integers are stored as linked lists with digits in reverse order. Add them and return the sum as a list in the same form.'],
    examples: [{ input: 'l1 = [2, 4, 3], l2 = [5, 6, 4]', output: '[7, 0, 8]', note: '342 + 465 = 807' }, { input: 'l1 = [9, 9], l2 = [1]', output: '[0, 0, 1]' }],
    hints: ['Walk both lists together, summing digit + digit + carry; emit sum % 10 and carry sum / 10.', 'Do not forget a final carry.'],
    starter: LIST + `export function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n  // your code\n  return null\n}\n`,
    solution: LIST + `export function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n  const dummy: ListNode = { val: 0, next: null }\n  let tail = dummy\n  let carry = 0\n  while (l1 || l2 || carry) {\n    const sum = (l1?.val ?? 0) + (l2?.val ?? 0) + carry\n    carry = Math.floor(sum / 10)\n    tail.next = { val: sum % 10, next: null }\n    tail = tail.next\n    l1 = l1?.next ?? null\n    l2 = l2?.next ?? null\n  }\n  return dummy.next\n}\n`,
    tests: [
      { call: `addTwoNumbers(${L(2, 4, 3)}, ${L(5, 6, 4)})`, expected: { val: 7, next: { val: 0, next: { val: 8, next: null } } } },
      { call: `addTwoNumbers(${L(9, 9)}, ${L(1)})`, expected: { val: 0, next: { val: 0, next: { val: 1, next: null } } } },
    ],
  }),
  c({
    id: 'merge-k-sorted-lists', title: 'Merge K Sorted Lists', topic: 'Heaps & Priority Queues', pattern: 'K-way merge with a heap', difficulty: 'hard',
    description: ['Merge `k` sorted linked lists into one sorted list. With N total nodes, aim for O(N log k).'],
    examples: [{ input: 'lists = [[1, 4, 5], [1, 3, 4], [2, 6]]', output: '[1, 1, 2, 3, 4, 4, 5, 6]' }, { input: 'lists = []', output: '[]' }],
    hints: ['A min-heap of the current head of each list gives the next smallest in O(log k). TypeScript has no heap, so write a small binary heap.', 'Alternative with the same bound: merge lists pairwise (divide and conquer).'],
    starter: LIST + `export function mergeKLists(lists: (ListNode | null)[]): ListNode | null {\n  // your code\n  return null\n}\n`,
    solution: LIST + `class MinHeap {\n  private a: ListNode[] = []\n  get size(): number { return this.a.length }\n  push(n: ListNode): void {\n    this.a.push(n)\n    let i = this.a.length - 1\n    while (i > 0) {\n      const p = (i - 1) >> 1\n      if (this.a[p].val <= this.a[i].val) break\n      ;[this.a[p], this.a[i]] = [this.a[i], this.a[p]]\n      i = p\n    }\n  }\n  pop(): ListNode {\n    const top = this.a[0]\n    const last = this.a.pop()!\n    if (this.a.length > 0) {\n      this.a[0] = last\n      let i = 0\n      for (;;) {\n        const l = 2 * i + 1\n        const r = l + 1\n        let m = i\n        if (l < this.a.length && this.a[l].val < this.a[m].val) m = l\n        if (r < this.a.length && this.a[r].val < this.a[m].val) m = r\n        if (m === i) break\n        ;[this.a[m], this.a[i]] = [this.a[i], this.a[m]]\n        i = m\n      }\n    }\n    return top\n  }\n}\n\nexport function mergeKLists(lists: (ListNode | null)[]): ListNode | null {\n  const heap = new MinHeap()\n  for (const l of lists) if (l) heap.push(l)\n  const dummy: ListNode = { val: 0, next: null }\n  let tail = dummy\n  while (heap.size > 0) {\n    const n = heap.pop()\n    tail.next = n\n    tail = n\n    if (n.next) heap.push(n.next)\n  }\n  return dummy.next\n}\n`,
    tests: [
      { call: `mergeKLists([${L(1, 4, 5)}, ${L(1, 3, 4)}, ${L(2, 6)}])`, expected: { val: 1, next: { val: 1, next: { val: 2, next: { val: 3, next: { val: 4, next: { val: 4, next: { val: 5, next: { val: 6, next: null } } } } } } } } },
      { call: 'mergeKLists([])', expected: null },
      { call: 'mergeKLists([null])', expected: null },
    ],
  }),
  c({
    id: 'max-depth-binary-tree', title: 'Maximum Depth of Binary Tree', topic: 'Graphs & Trees', pattern: 'Recursive DFS', difficulty: 'easy',
    description: ['Return the number of nodes on the longest path from the root down to a leaf. Nodes are plain `{ val, left, right }` objects.'],
    examples: [{ input: 'root = [3, 9, 20, null, null, 15, 7]', output: '3' }, { input: 'root = []', output: '0' }],
    hints: ['depth(node) = 1 + max(depth(left), depth(right)); depth(null) = 0.', 'Be ready to do it iteratively with a BFS level count.'],
    starter: TREE + `export function maxDepth(root: TreeNode | null): number {\n  // your code\n  return 0\n}\n`,
    solution: TREE + `export function maxDepth(root: TreeNode | null): number {\n  return root ? 1 + Math.max(maxDepth(root.left), maxDepth(root.right)) : 0\n}\n`,
    tests: [{ call: `maxDepth(${T(3, T(9), T(20, T(15), T(7)))})`, expected: 3 }, { call: 'maxDepth(null)', expected: 0 }, { call: `maxDepth(${T(1, null, T(2))})`, expected: 2 }],
  }),
  c({
    id: 'invert-binary-tree', title: 'Invert Binary Tree', topic: 'Graphs & Trees', pattern: 'Recursive swap', difficulty: 'easy',
    description: ['Mirror a binary tree: swap the left and right children of every node. Return the root.'],
    examples: [{ input: 'root = [4, 2, 7, 1, 3, 6, 9]', output: '[4, 7, 2, 9, 6, 3, 1]' }, { input: 'root = []', output: '[]' }],
    hints: ['Swap the children, then recurse into both.'],
    starter: TREE + `export function invertTree(root: TreeNode | null): TreeNode | null {\n  // your code\n  return root\n}\n`,
    solution: TREE + `export function invertTree(root: TreeNode | null): TreeNode | null {\n  if (!root) return null\n  const left = root.left\n  root.left = invertTree(root.right)\n  root.right = invertTree(left)\n  return root\n}\n`,
    tests: [
      { call: `invertTree(${T(4, T(2, T(1), T(3)), T(7, T(6), T(9)))})`, expected: { val: 4, left: { val: 7, left: { val: 9, left: null, right: null }, right: { val: 6, left: null, right: null } }, right: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 1, left: null, right: null } } } },
      { call: 'invertTree(null)', expected: null },
    ],
  }),
  c({
    id: 'diameter-binary-tree', title: 'Diameter of Binary Tree', topic: 'Graphs & Trees', pattern: 'Post-order DFS returning height, tracking a global', difficulty: 'medium',
    description: ['The diameter is the number of edges on the longest path between any two nodes (it need not pass through the root). Return it.'],
    examples: [{ input: 'root = [1, 2, 3, 4, 5]', output: '3', note: 'The path 4 → 2 → 1 → 3 or 5 → 2 → 1 → 3.' }, { input: 'root = [1, 2]', output: '1' }],
    hints: ['At each node, the longest path through it is leftHeight + rightHeight. Return the height upward, update the best in a closure.', 'Calling a separate height() per node is O(n²); the post-order approach is O(n).'],
    starter: TREE + `export function diameterOfBinaryTree(root: TreeNode | null): number {\n  // your code\n  return 0\n}\n`,
    solution: TREE + `export function diameterOfBinaryTree(root: TreeNode | null): number {\n  let best = 0\n  const height = (n: TreeNode | null): number => {\n    if (!n) return 0\n    const l = height(n.left)\n    const r = height(n.right)\n    best = Math.max(best, l + r)\n    return 1 + Math.max(l, r)\n  }\n  height(root)\n  return best\n}\n`,
    tests: [{ call: `diameterOfBinaryTree(${T(1, T(2, T(4), T(5)), T(3))})`, expected: 3 }, { call: `diameterOfBinaryTree(${T(1, T(2))})`, expected: 1 }, { call: 'diameterOfBinaryTree(null)', expected: 0 }],
  }),
  c({
    id: 'same-tree', title: 'Same Tree', topic: 'Graphs & Trees', pattern: 'Parallel recursion', difficulty: 'easy',
    description: ['Return true if two binary trees are structurally identical with the same values.'],
    examples: [{ input: 'p = [1, 2, 3], q = [1, 2, 3]', output: 'true' }, { input: 'p = [1, 2], q = [1, null, 2]', output: 'false' }],
    hints: ['Both null: true. One null: false. Else compare values and recurse on both sides.'],
    starter: TREE + `export function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {\n  // your code\n  return false\n}\n`,
    solution: TREE + `export function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {\n  if (!p || !q) return p === q\n  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right)\n}\n`,
    tests: [{ call: `isSameTree(${T(1, T(2), T(3))}, ${T(1, T(2), T(3))})`, expected: true }, { call: `isSameTree(${T(1, T(2))}, ${T(1, null, T(2))})`, expected: false }, { call: 'isSameTree(null, null)', expected: true }],
  }),
  c({
    id: 'lca-bst', title: 'Lowest Common Ancestor of a BST', topic: 'Graphs & Trees', pattern: 'Walk down using BST ordering', difficulty: 'medium',
    description: ['Given a binary search tree and two values `p` and `q` that exist in it, return the value of their lowest common ancestor (a node counts as its own ancestor).'],
    examples: [{ input: 'root = [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p = 2, q = 8', output: '6' }, { input: 'same root, p = 2, q = 4', output: '2' }],
    hints: ['If both values are smaller than the node, go left; both larger, go right; otherwise this node is the split point.', 'O(h) time, O(1) space iteratively.'],
    starter: TREE + `export function lowestCommonAncestor(root: TreeNode | null, p: number, q: number): number | null {\n  // your code\n  return null\n}\n`,
    solution: TREE + `export function lowestCommonAncestor(root: TreeNode | null, p: number, q: number): number | null {\n  let n = root\n  while (n) {\n    if (p < n.val && q < n.val) n = n.left\n    else if (p > n.val && q > n.val) n = n.right\n    else return n.val\n  }\n  return null\n}\n`,
    tests: [
      { call: `lowestCommonAncestor(${T(6, T(2, T(0), T(4, T(3), T(5))), T(8, T(7), T(9)))}, 2, 8)`, expected: 6 },
      { call: `lowestCommonAncestor(${T(6, T(2, T(0), T(4, T(3), T(5))), T(8, T(7), T(9)))}, 2, 4)`, expected: 2 },
      { call: `lowestCommonAncestor(${T(6, T(2, T(0), T(4, T(3), T(5))), T(8, T(7), T(9)))}, 3, 5)`, expected: 4 },
    ],
  }),
  c({
    id: 'kth-smallest-bst', title: 'Kth Smallest Element in a BST', topic: 'Graphs & Trees', pattern: 'In-order traversal with early exit', difficulty: 'medium',
    description: ['Return the k-th smallest value (1-indexed) in a binary search tree.'],
    examples: [{ input: 'root = [3, 1, 4, null, 2], k = 1', output: '1' }, { input: 'root = [5, 3, 6, 2, 4, null, null, 1], k = 3', output: '3' }],
    hints: ['In-order traversal visits BST values in ascending order; stop after k visits.', 'Iterative in-order with an explicit stack avoids visiting the whole tree.'],
    starter: TREE + `export function kthSmallest(root: TreeNode | null, k: number): number {\n  // your code\n  return 0\n}\n`,
    solution: TREE + `export function kthSmallest(root: TreeNode | null, k: number): number {\n  const stack: TreeNode[] = []\n  let n = root\n  while (n || stack.length) {\n    while (n) {\n      stack.push(n)\n      n = n.left\n    }\n    n = stack.pop()!\n    if (--k === 0) return n.val\n    n = n.right\n  }\n  return -1\n}\n`,
    tests: [{ call: `kthSmallest(${T(3, T(1, null, T(2)), T(4))}, 1)`, expected: 1 }, { call: `kthSmallest(${T(5, T(3, T(2, T(1)), T(4)), T(6))}, 3)`, expected: 3 }, { call: `kthSmallest(${T(3, T(1, null, T(2)), T(4))}, 4)`, expected: 4 }],
  }),
  c({
    id: 'build-tree-preorder-inorder', title: 'Construct Binary Tree From Preorder and Inorder', topic: 'Graphs & Trees', pattern: 'Recursive partition by root index', difficulty: 'medium',
    description: ['Given the `preorder` and `inorder` traversals of a tree with distinct values, rebuild the tree and return its root.'],
    examples: [{ input: 'preorder = [3, 9, 20, 15, 7], inorder = [9, 3, 15, 20, 7]', output: '[3, 9, 20, null, null, 15, 7]' }],
    hints: ['preorder[0] is the root. Its index in inorder splits inorder into left and right subtrees, and the sizes tell you how to split preorder.', 'A map from value to inorder index makes each split O(1), giving O(n) overall.'],
    starter: TREE + `export function buildTree(preorder: number[], inorder: number[]): TreeNode | null {\n  // your code\n  return null\n}\n`,
    solution: TREE + `export function buildTree(preorder: number[], inorder: number[]): TreeNode | null {\n  const at = new Map<number, number>()\n  inorder.forEach((v, i) => at.set(v, i))\n  let pre = 0\n  const build = (lo: number, hi: number): TreeNode | null => {\n    if (lo > hi) return null\n    const val = preorder[pre++]\n    const mid = at.get(val)!\n    return { val, left: build(lo, mid - 1), right: build(mid + 1, hi) }\n  }\n  return build(0, inorder.length - 1)\n}\n`,
    tests: [
      { call: 'buildTree([3, 9, 20, 15, 7], [9, 3, 15, 20, 7])', expected: { val: 3, left: { val: 9, left: null, right: null }, right: { val: 20, left: { val: 15, left: null, right: null }, right: { val: 7, left: null, right: null } } } },
      { call: 'buildTree([1], [1])', expected: { val: 1, left: null, right: null } },
      { call: 'buildTree([], [])', expected: null },
    ],
  }),
  c({
    id: 'k-closest-points', title: 'K Closest Points to Origin', topic: 'Heaps & Priority Queues', pattern: 'Bounded max-heap', difficulty: 'medium',
    description: ['Given points on a plane and an integer `k`, return the `k` points closest to the origin (any order).'],
    examples: [{ input: 'points = [[1, 3], [-2, 2]], k = 1', output: '[[-2, 2]]' }, { input: 'points = [[3, 3], [5, -1], [-2, 4]], k = 2', output: '[[3, 3], [-2, 4]]' }],
    hints: ['Sorting by distance is O(n log n). A max-heap of size k keeps the k closest seen so far: O(n log k).', 'Squared distance avoids the square root.'],
    starter: `export function kClosest(points: number[][], k: number): number[][] {\n  // your code\n  return []\n}\n`,
    solution: `export function kClosest(points: number[][], k: number): number[][] {\n  const d = (p: number[]): number => p[0] * p[0] + p[1] * p[1]\n  const heap: number[][] = [] // max-heap by distance\n  const up = (i: number): void => {\n    while (i > 0) {\n      const p = (i - 1) >> 1\n      if (d(heap[p]) >= d(heap[i])) break\n      ;[heap[p], heap[i]] = [heap[i], heap[p]]\n      i = p\n    }\n  }\n  const down = (i: number): void => {\n    for (;;) {\n      const l = 2 * i + 1\n      const r = l + 1\n      let m = i\n      if (l < heap.length && d(heap[l]) > d(heap[m])) m = l\n      if (r < heap.length && d(heap[r]) > d(heap[m])) m = r\n      if (m === i) return\n      ;[heap[m], heap[i]] = [heap[i], heap[m]]\n      i = m\n    }\n  }\n  for (const p of points) {\n    if (heap.length < k) {\n      heap.push(p)\n      up(heap.length - 1)\n    } else if (d(p) < d(heap[0])) {\n      heap[0] = p\n      down(0)\n    }\n  }\n  return heap\n}\n`,
    tests: [{ call: 'kClosest([[1, 3], [-2, 2]], 1)', expected: [[-2, 2]] }, { call: 'kClosest([[3, 3], [5, -1], [-2, 4]], 2)', expected: [[3, 3], [-2, 4]], unordered: true }],
  }),
  c({
    id: 'task-scheduler', title: 'Task Scheduler', topic: 'Heaps & Priority Queues', pattern: 'Greedy by frequency with cooldown', difficulty: 'medium',
    description: ['Given tasks as uppercase letters and a cooldown `n`, the CPU runs one task per unit of time and must wait at least `n` units between two runs of the same task (idling if needed). Return the least total time.'],
    examples: [{ input: 'tasks = ["A", "A", "A", "B", "B", "B"], n = 2', output: '8', note: 'A B idle A B idle A B' }, { input: 'tasks = ["A", "A", "A", "B", "B", "B"], n = 0', output: '6' }],
    hints: ['The most frequent task sets the frame: (maxFreq - 1) × (n + 1) slots plus one for each task tied at maxFreq.', 'The answer is the max of that frame and the number of tasks (when there is enough variety to never idle).'],
    starter: `export function leastInterval(tasks: string[], n: number): number {\n  // your code\n  return 0\n}\n`,
    solution: `export function leastInterval(tasks: string[], n: number): number {\n  const counts = new Map<string, number>()\n  for (const t of tasks) counts.set(t, (counts.get(t) ?? 0) + 1)\n  const max = Math.max(...counts.values())\n  const tied = [...counts.values()].filter((c) => c === max).length\n  return Math.max(tasks.length, (max - 1) * (n + 1) + tied)\n}\n`,
    tests: [{ call: 'leastInterval(["A", "A", "A", "B", "B", "B"], 2)', expected: 8 }, { call: 'leastInterval(["A", "A", "A", "B", "B", "B"], 0)', expected: 6 }, { call: 'leastInterval(["A", "A", "A", "A", "A", "A", "B", "C", "D", "E", "F", "G"], 2)', expected: 16 }],
  }),
  c({
    id: 'median-data-stream', title: 'Find Median From Data Stream', topic: 'Heaps & Priority Queues', pattern: 'Two balanced heaps', difficulty: 'hard',
    description: ['Design `MedianFinder` with `addNum(num)` and `findMedian()` returning the median of all numbers so far. Aim for O(log n) add and O(1) median.', 'The `runMedian` driver replays operations for the tests; leave it as is.'],
    examples: [{ input: 'addNum(1); addNum(2); findMedian(); addNum(3); findMedian()', output: '1.5, 2' }],
    hints: ['A max-heap for the lower half and a min-heap for the upper half; keep their sizes within one of each other.', 'The median is the top of the larger heap, or the average of both tops.'],
    starter: `export class MedianFinder {\n  addNum(num: number): void {\n    // your code\n  }\n  findMedian(): number {\n    // your code\n    return 0\n  }\n}\n\n/** Test driver. Leave as is. */\nexport function runMedian(ops: string[], args: (number | null)[]): (number | null)[] {\n  const m = new MedianFinder()\n  return ops.map((op, i) => (op === 'add' ? (m.addNum(args[i]!), null) : m.findMedian()))\n}\n`,
    solution: `class Heap {\n  private a: number[] = []\n  constructor(private readonly less: (x: number, y: number) => boolean) {}\n  get size(): number { return this.a.length }\n  peek(): number { return this.a[0] }\n  push(v: number): void {\n    this.a.push(v)\n    let i = this.a.length - 1\n    while (i > 0) {\n      const p = (i - 1) >> 1\n      if (!this.less(this.a[i], this.a[p])) break\n      ;[this.a[i], this.a[p]] = [this.a[p], this.a[i]]\n      i = p\n    }\n  }\n  pop(): number {\n    const top = this.a[0]\n    const last = this.a.pop()!\n    if (this.a.length) {\n      this.a[0] = last\n      let i = 0\n      for (;;) {\n        const l = 2 * i + 1\n        const r = l + 1\n        let m = i\n        if (l < this.a.length && this.less(this.a[l], this.a[m])) m = l\n        if (r < this.a.length && this.less(this.a[r], this.a[m])) m = r\n        if (m === i) break\n        ;[this.a[i], this.a[m]] = [this.a[m], this.a[i]]\n        i = m\n      }\n    }\n    return top\n  }\n}\n\nexport class MedianFinder {\n  private readonly low = new Heap((x, y) => x > y) // max-heap\n  private readonly high = new Heap((x, y) => x < y) // min-heap\n  addNum(num: number): void {\n    if (this.low.size === 0 || num <= this.low.peek()) this.low.push(num)\n    else this.high.push(num)\n    if (this.low.size > this.high.size + 1) this.high.push(this.low.pop())\n    else if (this.high.size > this.low.size) this.low.push(this.high.pop())\n  }\n  findMedian(): number {\n    if (this.low.size > this.high.size) return this.low.peek()\n    return (this.low.peek() + this.high.peek()) / 2\n  }\n}\n\n/** Test driver. Leave as is. */\nexport function runMedian(ops: string[], args: (number | null)[]): (number | null)[] {\n  const m = new MedianFinder()\n  return ops.map((op, i) => (op === 'add' ? (m.addNum(args[i]!), null) : m.findMedian()))\n}\n`,
    tests: [
      { call: 'runMedian(["add", "add", "median", "add", "median"], [1, 2, null, 3, null])', expected: [null, null, 1.5, null, 2] },
      { call: 'runMedian(["add", "median", "add", "median", "add", "median"], [5, null, 1, null, 9, null])', expected: [null, 5, null, 3, null, 5] },
    ],
  }),
  c({
    id: 'add-search-words', title: 'Design Add and Search Words', topic: 'Graphs & Trees', pattern: 'Trie with wildcard DFS', difficulty: 'medium',
    description: ['Design `WordDictionary` with `addWord(word)` and `search(word)` where the search may contain "." matching any single letter.', 'The `runDict` driver replays operations; leave it as is.'],
    examples: [{ input: 'addWord("bad"); addWord("dad"); search("pad"); search(".ad"); search("b..")', output: 'false, true, true' }],
    hints: ['A trie; on "." branch into every child (DFS). Without wildcards it is a plain trie walk.'],
    starter: `export class WordDictionary {\n  addWord(word: string): void {\n    // your code\n  }\n  search(word: string): boolean {\n    // your code\n    return false\n  }\n}\n\n/** Test driver. Leave as is. */\nexport function runDict(ops: string[], args: string[]): (boolean | null)[] {\n  const d = new WordDictionary()\n  return ops.map((op, i) => (op === 'add' ? (d.addWord(args[i]), null) : d.search(args[i])))\n}\n`,
    solution: `interface Node { children: Map<string, Node>; end: boolean }\n\nexport class WordDictionary {\n  private readonly root: Node = { children: new Map(), end: false }\n  addWord(word: string): void {\n    let n = this.root\n    for (const ch of word) {\n      let next = n.children.get(ch)\n      if (!next) {\n        next = { children: new Map(), end: false }\n        n.children.set(ch, next)\n      }\n      n = next\n    }\n    n.end = true\n  }\n  search(word: string): boolean {\n    const dfs = (n: Node, i: number): boolean => {\n      if (i === word.length) return n.end\n      const ch = word[i]\n      if (ch === '.') {\n        for (const child of n.children.values()) if (dfs(child, i + 1)) return true\n        return false\n      }\n      const next = n.children.get(ch)\n      return next ? dfs(next, i + 1) : false\n    }\n    return dfs(this.root, 0)\n  }\n}\n\n/** Test driver. Leave as is. */\nexport function runDict(ops: string[], args: string[]): (boolean | null)[] {\n  const d = new WordDictionary()\n  return ops.map((op, i) => (op === 'add' ? (d.addWord(args[i]), null) : d.search(args[i])))\n}\n`,
    tests: [
      { call: 'runDict(["add", "add", "add", "search", "search", "search", "search"], ["bad", "dad", "mad", "pad", "bad", ".ad", "b.."])', expected: [null, null, null, false, true, true, true] },
      { call: 'runDict(["search", "add", "search", "search"], ["a", "a", "a", ".."])', expected: [false, null, true, false] },
    ],
  }),
]
