import * as arrays from './arrays.ts'
import * as dp from './dp.ts'
import * as graphs from './graphs.ts'
import * as grids from './grids.ts'
import * as heaps from './heaps.ts'
import * as intervals from './intervals.ts'
import * as lists from './lists.ts'
import * as pointers from './pointers.ts'
import * as search from './search.ts'
import * as stacks from './stacks.ts'
import * as windows from './windows.ts'
import type { Viz } from './frames.ts'

/** Every visualisation by id; each runs its algorithm on a fixed example and records the frames. */
export const VIZ: Record<string, () => Viz> = {
  'hash-map-lookup': arrays.hashMapLookup,
  'prefix-sum-map': arrays.prefixSumMap,
  'running-min': arrays.runningMin,
  kadane: arrays.kadane,
  'frequency-count': arrays.frequencyCount,
  'prefix-suffix': arrays.prefixSuffix,
  'sequence-starts': arrays.sequenceStarts,
  'xor-cancel': arrays.xorCancel,
  'greedy-reach': arrays.greedyReach,
  'reset-on-negative': arrays.resetOnNegative,
  'last-occurrence': arrays.lastOccurrence,
  'converging-pointers': pointers.convergingPointers,
  'read-write-pointers': pointers.readWritePointers,
  'two-maxima': pointers.twoMaxima,
  'expand-centre': pointers.expandAroundCentre,
  'run-length-in-place': pointers.runLengthInPlace,
  'sorted-merge': pointers.sortedMergeTwoPointers,
  'fixed-window': windows.fixedWindow,
  'fixed-window-counts': windows.fixedWindowCounts,
  'variable-window-longest': windows.variableWindowLongest,
  'need-have-window': windows.needHaveWindow,
  'monotonic-deque': windows.monotonicDeque,
  'window-budget': windows.windowWithBudget,
  'stack-matching': stacks.stackMatching,
  'monotonic-stack': stacks.monotonicStack,
  'auxiliary-stack': stacks.auxiliaryStack,
  'operand-stack': stacks.operandStack,
  'histogram-stack': stacks.histogramStack,
  'binary-search': search.binarySearch,
  'binary-search-answer': search.binarySearchAnswer,
  'rotated-search': search.rotatedSearch,
  'find-min-rotated': search.findMinRotated,
  'take-or-skip': dp.takeOrSkip,
  'unbounded-knapsack': dp.unboundedKnapsack,
  'knapsack-01': dp.knapsack01,
  'dp-2d-strings': dp.dp2dStrings,
  'grid-dp': dp.gridDp,
  'lis-patience': dp.lisPatience,
  'dp-on-bits': dp.dpOnBits,
  'reachability-dp': dp.reachabilityDp,
  'flood-fill': grids.floodFill,
  'bfs-grid': grids.bfsGrid,
  'multi-source-bfs': grids.multiSourceBfs,
  'grid-backtracking': grids.gridBacktracking,
  'shrinking-boundaries': grids.shrinkingBoundaries,
  'n-queens': grids.nQueens,
  'bfs-levels': graphs.bfsLevels,
  'dfs-recursive': graphs.dfsRecursive,
  'bst-bounds': graphs.bstBounds,
  'topo-sort': graphs.topoSort,
  'union-find': graphs.unionFind,
  dijkstra: graphs.dijkstra,
  trie: graphs.trie,
  'backtracking-tree': graphs.backtrackingTree,
  'used-set-permutations': graphs.usedSetPermutations,
  'fast-slow': lists.fastSlow,
  'pointer-reversal': lists.pointerReversal,
  'dummy-head-merge': lists.dummyHeadMerge,
  'gap-pointers': lists.gapPointers,
  'ring-buffer': lists.ringBuffer,
  'lru-map-order': lists.lruMapOrder,
  'bounded-heap': heaps.boundedHeap,
  'two-heaps': heaps.twoHeaps,
  'k-way-merge': heaps.kWayMerge,
  'bucket-topk': heaps.bucketTopK,
  'merge-intervals': intervals.mergeIntervals,
  'sweep-line': intervals.sweepLine,
  'earliest-end': intervals.earliestEnd,
}

const cache = new Map<string, Viz>()

/** The frames for a visualisation, built once and kept. */
export function vizFor(id: string): Viz | undefined {
  const cached = cache.get(id)
  if (cached) return cached
  const build = VIZ[id]
  if (!build) return undefined
  const v = build()
  cache.set(id, v)
  return v
}
