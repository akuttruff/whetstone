import fs from 'node:fs'
import path from 'node:path'
import { Store } from '../server/store.ts'
import { RUBY_PORTS } from '../src/data/ports-ruby.ts'
import { RUST_PORTS } from '../src/data/ports-rust.ts'

/**
 * Fills the development database (.data-dev, the one `npm run dev` uses)
 * with demo data so the app can be screenshotted with something on screen:
 * scores on the list, a saved review with a follow-up thread, a hint ladder,
 * a generated variant and a draft in progress. Run with
 * `npm run seed:demo`; it starts from an empty database every time.
 */

const dir = path.resolve(process.cwd(), '.data-dev')
fs.rmSync(dir, { recursive: true, force: true })
const store = new Store({ dir })

store.setSettings({ language: 'typescript', showTechniques: true })

const review = (problemId: string, track: 'coding' | 'practical' | 'knowledge' | 'design', topic: string, pattern: string, score: number, focus: string, text: string): void => {
  store.addReview({ problemId, track, topic, pattern, score, correct: score >= 8, focus, text, model: 'demo' })
}

// A spread of scores so the progress card has something to say.
review('two-sum', 'coding', 'Arrays & Hashing', 'Hash map lookup', 10, 'clean', 'Correct and idiomatic. The map is keyed by value and checked before the insert, so an element never pairs with itself.')
review('contains-duplicate', 'coding', 'Arrays & Hashing', 'Hash set membership', 9, 'early return', 'Correct. One pass with a Set; you could return as soon as the first repeat is seen rather than building the whole set.')
review('group-anagrams', 'coding', 'Arrays & Hashing', 'Canonical key grouping', 6, 'key cost', 'Works, but sorting each word makes the key O(k log k). A 26-slot count signature keeps it linear per word.')
review('valid-palindrome', 'coding', 'Two Pointers', 'Converging pointers with filtering', 8, 'edge cases', 'Correct. Consider what happens with a string that is all punctuation: both pointers skip everything and meet, which should return true.')
review('merge-intervals', 'coding', 'Sorting & Sweeping', 'Sort by start, sweep', 8, 'mutation', 'Correct and clear. Note that sorting the input in place mutates the caller’s array; a copy is cheap here.')
review('daily-temperatures', 'coding', 'Stack & Queue', 'Monotonic stack', 5, 'stack direction', 'The idea is right but the stack holds temperatures instead of indices, so the distance cannot be recovered. Push indices and compare the temperatures they point at.')
review('sliding-window-maximum', 'coding', 'Sliding Window', 'Monotonic deque', 4, 'eviction', 'Not yet. The deque is never evicted from the front, so a maximum that has left the window is still reported. Compare the front index with i − k + 1 before reading it.')
review('lru-cache', 'practical', 'Caching', 'Map insertion order as a recency list', 9, 'capacity 0', 'Correct and compact. The only gap is capacity 0, where set should store nothing at all.')
review('debounce', 'practical', 'Async & Concurrency', 'Timer reset on each call', 7, 'cancel', 'The timer reset is right. cancel() clears the timer but leaves it referenced, so a second cancel would try to clear a dead handle; set it to null.')
review('ts-event-loop', 'knowledge', 'TypeScript & JavaScript', 'Runtime model', 8, 'starvation', 'Order and reasoning are right. Mention microtask starvation: a promise chain that keeps queueing work blocks timers and rendering.')
review('web-http-caching', 'knowledge', 'Web & HTTP', 'HTTP semantics', 6, 'Vary', 'Good on max-age and ETags. Missing: Vary for content negotiation, and that cookies make shared caches treat responses as private by default.')
review('design-url-shortener', 'design', 'Core Services', 'Read-heavy key lookup with ID generation', 7, 'hot path', 'Solid requirements and estimates. The redirect path still touches the primary store on a cache miss; say how the cache is sized and warmed.')

// The problem the screenshots open: a draft in progress, its review, a thread under it, and a hint ladder.
store.setDraft('sliding-window-maximum', `export function maxSlidingWindow(nums: number[], k: number): number[] {
  const deque: number[] = [] // indices, values decreasing
  const out: number[] = []
  for (let i = 0; i < nums.length; i++) {
    while (deque.length && nums[deque[deque.length - 1]] <= nums[i]) deque.pop()
    deque.push(i)
    // TODO: evict the front once it leaves the window
    if (i >= k - 1) out.push(nums[deque[0]])
  }
  return out
}
`)
// The same problem solved in Ruby (attempts are kept per language).
store.setDraft('sliding-window-maximum@ruby', RUBY_PORTS['sliding-window-maximum']!.solution)
store.setDraft('sliding-window-maximum@rust', RUST_PORTS['sliding-window-maximum']!.solution)
store.addChat('sliding-window-maximum', 'user', 'Why does the front need evicting if I only ever push larger values?')
store.addChat(
  'sliding-window-maximum',
  'assistant',
  'Because the front can be the *oldest* index, not just the largest value. Take `[5, 1, 1, 1]` with `k = 2`: 5 is pushed at index 0 and never popped, since nothing after it is larger. At `i = 2` the window is `[1, 2]`, but your deque front is still index 0, so you report 5 for a window that does not contain it.\n\nThe fix is one line before you read the front:\n\n```ts\nif (deque[0] <= i - k) deque.shift()\n```\n\nThat keeps the invariant: every index in the deque is inside the current window.',
)
store.saveGuide('sliding-window-maximum', [
  { title: 'What the window is', hint: 'The answer has one entry per window, and a window is defined by its right edge i: it covers i − k + 1 to i. Anything older than that must not influence the answer.', tryThis: 'Write down the window for i = 3 with k = 3.' },
  { title: 'What the deque promises', hint: 'The deque holds indices, newest at the back, whose values decrease from front to back. The front is the maximum of whatever the deque covers, so the question is whether it covers exactly the window.', tryThis: 'Trace your code on [5, 1, 1, 1] with k = 2 and write the deque at each step.' },
  { title: 'The missing move', hint: 'Pushing keeps the back honest; nothing keeps the front honest. Before reading the front, check whether its index has fallen outside the window.', tryThis: 'Add that check and rerun the tests.' },
  { title: 'The full plan', hint: 'For each i: pop from the back while the back value is ≤ nums[i]; push i; if the front index is ≤ i − k, drop it; once i ≥ k − 1, record nums[front].', tryThis: 'Compare with your code line by line.' },
  { title: 'Walk the example', hint: 'On [1, 3, −1, −3, 5, 3, 6, 7] with k = 3 the deque after i = 4 is [4] (index of 5) and the maxima so far are [3, 3, 5]. Each index enters and leaves once, so the whole pass is O(n).', tryThis: 'Say the complexity out loud, and why it is not O(n·k).' },
], 'demo')
store.setGuideRevealed('sliding-window-maximum', 2)

// A generated variant under Two Sum, with a verified test.
store.addProblem({
  id: 'pair-with-target-difference-similar',
  track: 'coding',
  title: 'Pair With Target Difference',
  topic: 'Arrays & Hashing',
  pattern: 'Hash map lookup',
  difficulty: 'easy',
  source: 'generated',
  parentId: 'two-sum',
  direction: 'similar',
  description: [
    'Given an array of integers `nums` and an integer `d`, return the indices of two numbers whose difference is exactly `d` (the larger minus the smaller).',
    'Each input has exactly one answer, and you may not use the same element twice.',
  ],
  examples: [{ input: 'nums = [8, 3, 10, 1], d = 7', output: '[1, 2]', note: '10 − 3 = 7.' }],
  hints: ['For each x, the partner is x + d or x − d.'],
  starter: 'export function pairWithDifference(nums: number[], d: number): number[] {\n  // your code\n  return []\n}\n',
  solution: 'export function pairWithDifference(nums: number[], d: number): number[] {\n  const seen = new Map<number, number>()\n  for (let i = 0; i < nums.length; i++) {\n    for (const p of [nums[i] - d, nums[i] + d]) if (seen.has(p)) return [seen.get(p)!, i]\n    seen.set(nums[i], i)\n  }\n  return []\n}\n',
  tests: [{ fn: 'pairWithDifference', args: [[8, 3, 10, 1], 7], expected: [1, 2], unordered: true }],
})
review('pair-with-target-difference-similar', 'coding', 'Arrays & Hashing', 'Hash map lookup', 9, 'both partners', 'Correct. Checking both x − d and x + d is what makes the single pass work regardless of which element comes first.')

store.close()
console.log(`seeded ${dir}`)
