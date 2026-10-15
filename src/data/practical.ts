import type { CodeProblem } from '../types.ts'

/**
 * The "write it live" problems: no trick algorithm, but they show whether
 * someone can design a small, correct API under time pressure, reason about
 * async control flow, and handle the edge cases a reviewer will poke at.
 */
export const PRACTICAL_PROBLEMS: CodeProblem[] = [
  {
    id: 'lru-cache',
    track: 'practical',
    source: 'builtin',
    title: 'LRU Cache',
    topic: 'Caching',
    pattern: 'Map insertion order as a recency list',
    difficulty: 'medium',
    description: [
      'Implement `LRUCache<K, V>` with a fixed `capacity`. `get(key)` returns the value or undefined and marks the key most recently used; `set(key, value)` inserts or updates, and when the cache is over capacity evicts the least recently used entry.',
      'Both operations must be O(1). The `runLru` driver in the starter replays operations for the tests; leave it as is.',
    ],
    examples: [
      {
        input: 'capacity 2: set(1, 1); set(2, 2); get(1); set(3, 3); get(2); get(3)',
        output: '1, undefined, 3',
        note: 'Reading 1 made 2 the least recently used, so inserting 3 evicted 2.',
      },
    ],
    hints: [
      'A JavaScript Map iterates in insertion order and deleting + re-inserting a key moves it to the end. That is a doubly linked list for free.',
      'map.keys().next().value is the oldest key.',
      'Be ready to explain how you would do it without Map ordering: a hash map plus a doubly linked list of nodes.',
    ],
    starter: `export class LRUCache<K, V> {
  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    // your code
    return undefined
  }

  set(key: K, value: V): void {
    // your code
  }
}

/** Test driver. Leave as is. */
export function runLru(capacity: number, ops: ['get' | 'set', number, number?][]): (number | null)[] {
  const c = new LRUCache<number, number>(capacity)
  return ops.map(([op, k, v]) => (op === 'set' ? (c.set(k, v!), null) : (c.get(k) ?? null)))
}
`,
    solution: `export class LRUCache<K, V> {
  private readonly items = new Map<K, V>()

  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    if (!this.items.has(key)) return undefined
    const value = this.items.get(key)!
    this.items.delete(key)
    this.items.set(key, value) // move to most recent
    return value
  }

  set(key: K, value: V): void {
    if (this.items.has(key)) this.items.delete(key)
    this.items.set(key, value)
    if (this.items.size > this.capacity) {
      const oldest = this.items.keys().next().value as K
      this.items.delete(oldest)
    }
  }
}

/** Test driver. Leave as is. */
export function runLru(capacity: number, ops: ['get' | 'set', number, number?][]): (number | null)[] {
  const c = new LRUCache<number, number>(capacity)
  return ops.map(([op, k, v]) => (op === 'set' ? (c.set(k, v!), null) : (c.get(k) ?? null)))
}
`,
    tests: [
      {
        call: 'runLru(2, [["set", 1, 1], ["set", 2, 2], ["get", 1], ["set", 3, 3], ["get", 2], ["get", 3]])',
        expected: [null, null, 1, null, null, 3],
      },
      {
        name: 'updating a key refreshes it',
        call: 'runLru(2, [["set", 1, 1], ["set", 2, 2], ["set", 1, 10], ["set", 3, 3], ["get", 1], ["get", 2]])',
        expected: [null, null, null, null, 10, null],
      },
      { call: 'runLru(1, [["set", 1, 1], ["set", 2, 2], ["get", 1], ["get", 2]])', expected: [null, null, null, 2] },
    ],
  },
  {
    id: 'promise-pool',
    track: 'practical',
    source: 'builtin',
    title: 'Map With Concurrency Limit',
    topic: 'Async & Concurrency',
    pattern: 'Worker pool over a shared index',
    difficulty: 'medium',
    description: [
      'Write `mapWithConcurrency(items, limit, fn)`: apply the async `fn` to every item with at most `limit` calls in flight at once, and resolve to the results in the original order.',
      'If any call rejects, the returned promise rejects with that error. Promise.all with no limit, or running everything serially, both miss the point.',
    ],
    examples: [
      { input: 'mapWithConcurrency([1, 2, 3, 4], 2, async (x) => x * 2)', output: '[2, 4, 6, 8]' },
      { input: 'limit 2, five slow tasks', output: 'at most 2 tasks ever run at the same time' },
    ],
    hints: [
      'Start `limit` workers. Each worker loops: take the next index from a shared counter, run fn, store the result at that index, repeat until items run out.',
      'await Promise.all(workers) then return the results array. Rejections propagate naturally through Promise.all.',
      'Edge cases: an empty array; a limit larger than the number of items; limit <= 0.',
    ],
    starter: `/**
 * Like Promise.all(items.map(fn)) but with at most \`limit\` calls in flight.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  // your code
  return []
}
`,
    solution: `export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker)
  await Promise.all(workers)
  return results
}
`,
    tests: [
      {
        call: 'mapWithConcurrency([1, 2, 3, 4], 2, async (x) => { await new Promise((r) => setTimeout(r, 5 - x)); return x * 2 })',
        expected: [2, 4, 6, 8],
      },
      {
        name: 'never exceeds the limit',
        call: '(async () => { let active = 0, peak = 0; await mapWithConcurrency([1, 2, 3, 4, 5], 2, async () => { active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 10)); active-- }); return peak })()',
        expected: 2,
      },
      { call: 'mapWithConcurrency([], 3, async (x) => x)', expected: [] },
      {
        name: 'rejects when a task fails',
        call: '(async () => { try { await mapWithConcurrency([1, 2], 2, async (x) => { if (x === 2) throw new Error("boom"); return x }); return "resolved" } catch (e) { return e.message } })()',
        expected: 'boom',
      },
    ],
  },
  {
    id: 'debounce',
    track: 'practical',
    source: 'builtin',
    title: 'Debounce',
    topic: 'Async & Concurrency',
    pattern: 'Timer reset on each call',
    difficulty: 'easy',
    description: [
      'Write `debounce(fn, waitMs)` returning a function that delays calling `fn` until `waitMs` milliseconds have passed without another call. Only the last call\'s arguments are used.',
      'The returned function should also expose `cancel()` to drop a pending call.',
    ],
    examples: [
      { input: 'd = debounce(log, 100); d(1); d(2); d(3); (wait 150ms)', output: 'log(3) called once' },
      { input: 'd(1); d.cancel(); (wait)', output: 'log never called' },
    ],
    hints: [
      'Keep the timer id in a closure; clearTimeout before every setTimeout.',
      'Preserve `this` and the arguments with rest parameters and fn.apply, or an arrow that captures them.',
      'Know the difference from throttle: throttle guarantees a call at most once per interval even if calls keep coming.',
    ],
    starter: `export interface Debounced<A extends unknown[]> {
  (...args: A): void
  cancel(): void
}

/**
 * Call fn only after waitMs of silence; the last call's args win.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): Debounced<A> {
  // your code
  const d = ((..._args: A) => {}) as Debounced<A>
  d.cancel = () => {}
  return d
}
`,
    solution: `export interface Debounced<A extends unknown[]> {
  (...args: A): void
  cancel(): void
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const d = ((...args: A) => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, waitMs)
  }) as Debounced<A>
  d.cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
  return d
}
`,
    tests: [
      {
        call: '(async () => { const calls = []; const d = debounce((x) => calls.push(x), 20); d(1); d(2); d(3); await new Promise((r) => setTimeout(r, 60)); return calls })()',
        expected: [3],
      },
      {
        name: 'cancel drops the pending call',
        call: '(async () => { let n = 0; const d = debounce(() => n++, 20); d(); d.cancel(); await new Promise((r) => setTimeout(r, 50)); return n })()',
        expected: 0,
      },
      {
        name: 'separate bursts each fire',
        call: '(async () => { let n = 0; const d = debounce(() => n++, 10); d(); await new Promise((r) => setTimeout(r, 30)); d(); await new Promise((r) => setTimeout(r, 30)); return n })()',
        expected: 2,
      },
    ],
  },
  {
    id: 'retry-with-backoff',
    track: 'practical',
    source: 'builtin',
    title: 'Retry With Exponential Backoff',
    topic: 'Async & Concurrency',
    pattern: 'Retry loop with growing delay',
    difficulty: 'medium',
    description: [
      'Write `retry(fn, options)` that calls the async `fn`, and on rejection waits `baseMs * 2^attempt` milliseconds before trying again, up to `retries` additional attempts. Resolve with the first success; after the last failure, reject with the last error.',
      'Optionally honour `shouldRetry(error)` so non-transient errors fail fast.',
    ],
    examples: [
      { input: 'fn fails twice then succeeds; retries 5, baseMs 10', output: 'resolves after 3 calls, having waited 10ms then 20ms' },
      { input: 'fn always fails; retries 2', output: 'rejects with the third error' },
    ],
    hints: [
      'A for loop over attempts with try/catch is clearer than recursion here.',
      'Compute the delay from the attempt number; add jitter in real systems so retrying clients do not synchronise.',
      'Make sure the final failure rejects with the real error, not a generic "gave up".',
    ],
    starter: `export interface RetryOptions {
  retries: number
  baseMs: number
  shouldRetry?: (error: unknown) => boolean
}

/**
 * Call fn, retrying with exponential backoff.
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  // your code
  return fn()
}
`,
    solution: `export interface RetryOptions {
  retries: number
  baseMs: number
  shouldRetry?: (error: unknown) => boolean
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseMs, shouldRetry = () => true } = options
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === retries || !shouldRetry(err)) break
      await sleep(baseMs * 2 ** attempt)
    }
  }
  throw lastError
}
`,
    tests: [
      {
        call: '(async () => { let calls = 0; const r = await retry(async () => { calls++; if (calls < 3) throw new Error("flaky"); return "ok" }, { retries: 5, baseMs: 1 }); return [r, calls] })()',
        expected: ['ok', 3],
      },
      {
        name: 'gives up with the last error',
        call: '(async () => { let calls = 0; try { await retry(async () => { calls++; throw new Error("down " + calls) }, { retries: 2, baseMs: 1 }); return "resolved" } catch (e) { return e.message } })()',
        expected: 'down 3',
      },
      {
        name: 'shouldRetry stops early',
        call: '(async () => { let calls = 0; try { await retry(async () => { calls++; throw new Error("fatal") }, { retries: 5, baseMs: 1, shouldRetry: (e) => e.message !== "fatal" }) } catch {} return calls })()',
        expected: 1,
      },
    ],
  },
  {
    id: 'event-emitter',
    track: 'practical',
    source: 'builtin',
    title: 'Typed Event Emitter',
    topic: 'Patterns & Abstractions',
    pattern: 'Observer with unsubscribe handles',
    difficulty: 'easy',
    description: [
      'Implement `Emitter<Events>` where `Events` maps event names to their payload type. `on(name, handler)` returns an unsubscribe function; `once(name, handler)` runs the handler one time; `emit(name, payload)` calls every current handler in registration order.',
      'A handler that unsubscribes during emit must not break iteration of the others.',
    ],
    examples: [
      {
        input: 'e.on("x", a); e.once("x", b); e.emit("x", 1); e.emit("x", 2)',
        output: 'a(1), b(1), a(2)',
      },
    ],
    hints: [
      'Map<event, Set<handler>>. Copy the set (or spread it) before iterating so removal mid-emit is safe.',
      'once wraps the handler: call it, then unsubscribe itself.',
      'The generic signature is the senior part: `on<K extends keyof Events>(name: K, handler: (payload: Events[K]) => void)`.',
    ],
    starter: `export class Emitter<Events extends Record<string, unknown>> {
  on<K extends keyof Events>(name: K, handler: (payload: Events[K]) => void): () => void {
    // your code
    return () => {}
  }

  once<K extends keyof Events>(name: K, handler: (payload: Events[K]) => void): () => void {
    // your code
    return () => {}
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    // your code
  }
}
`,
    solution: `type Handler<T> = (payload: T) => void

export class Emitter<Events extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof Events, Set<Handler<never>>>()

  on<K extends keyof Events>(name: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(name)
    if (!set) {
      set = new Set()
      this.handlers.set(name, set)
    }
    set.add(handler as Handler<never>)
    return () => {
      set.delete(handler as Handler<never>)
    }
  }

  once<K extends keyof Events>(name: K, handler: Handler<Events[K]>): () => void {
    const off = this.on(name, (payload) => {
      off()
      handler(payload)
    })
    return off
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    const set = this.handlers.get(name)
    if (!set) return
    for (const h of [...set]) (h as Handler<Events[K]>)(payload)
  }
}
`,
    tests: [
      {
        call: '(() => { const e = new Emitter(); const seen = []; const off = e.on("x", (v) => seen.push(v)); e.once("x", (v) => seen.push(v * 10)); e.emit("x", 1); e.emit("x", 2); off(); e.emit("x", 3); return seen })()',
        expected: [1, 10, 2],
      },
      {
        name: 'unsubscribing during emit is safe',
        call: '(() => { const e = new Emitter(); const seen = []; const offA = e.on("t", () => { seen.push("a"); offA() }); e.on("t", () => seen.push("b")); e.emit("t", null); e.emit("t", null); return seen })()',
        expected: ['a', 'b', 'b'],
      },
      { call: '(() => { const e = new Emitter(); e.emit("nothing", 1); return "ok" })()', expected: 'ok' },
    ],
  },
  {
    id: 'token-bucket',
    track: 'practical',
    source: 'builtin',
    title: 'Token Bucket Rate Limiter',
    topic: 'Patterns & Abstractions',
    pattern: 'Lazy refill from an injected clock',
    difficulty: 'medium',
    description: [
      'Implement `TokenBucket(capacity, refillPerSecond, now)` where `now` returns milliseconds. `tryRemove(n = 1)` returns true and removes `n` tokens if available, else false. Tokens refill continuously at `refillPerSecond`, never exceeding `capacity`.',
      'Refill lazily: compute how many tokens accrued since the last call rather than running a timer. Injecting `now` is what makes this testable.',
    ],
    examples: [
      { input: 'capacity 3, refill 1/s: tryRemove x4 at t=0', output: 'true, true, true, false' },
      { input: 'then at t=2000: tryRemove x3', output: 'true, true, false' },
    ],
    hints: [
      'Keep `tokens` (a float) and `lastRefillMs`. On every call: tokens = min(capacity, tokens + elapsedSeconds * rate).',
      'Fractional tokens matter: at 1/s, after 500ms you have 0.5 tokens, so a request still fails.',
      'Compare with a sliding window log or fixed window counter; know when each is appropriate.',
    ],
    starter: `export class TokenBucket {
  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  tryRemove(n = 1): boolean {
    // your code
    return false
  }
}
`,
    solution: `export class TokenBucket {
  private tokens: number
  private lastMs: number

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.tokens = capacity
    this.lastMs = now()
  }

  private refill(): void {
    const t = this.now()
    const elapsed = Math.max(0, t - this.lastMs) / 1000
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond)
    this.lastMs = t
  }

  tryRemove(n = 1): boolean {
    this.refill()
    if (this.tokens < n) return false
    this.tokens -= n
    return true
  }
}
`,
    tests: [
      {
        call: '(() => { let t = 0; const b = new TokenBucket(3, 1, () => t); const r = [b.tryRemove(), b.tryRemove(), b.tryRemove(), b.tryRemove()]; t = 2000; r.push(b.tryRemove(), b.tryRemove(), b.tryRemove()); return r })()',
        expected: [true, true, true, false, true, true, false],
      },
      {
        name: 'never exceeds capacity',
        call: '(() => { let t = 0; const b = new TokenBucket(2, 10, () => t); b.tryRemove(2); t = 60000; return [b.tryRemove(), b.tryRemove(), b.tryRemove()] })()',
        expected: [true, true, false],
      },
      {
        name: 'fractional refill',
        call: '(() => { let t = 0; const b = new TokenBucket(1, 1, () => t); b.tryRemove(); t = 500; const a = b.tryRemove(); t = 1000; return [a, b.tryRemove()] })()',
        expected: [false, true],
      },
    ],
  },
  {
    id: 'flatten-object',
    track: 'practical',
    source: 'builtin',
    title: 'Flatten a Nested Object',
    topic: 'Data Transformation',
    pattern: 'Recursive walk with a path prefix',
    difficulty: 'easy',
    description: [
      'Write `flatten(obj, separator = ".")` that turns nested plain objects into a single-level object whose keys are the joined paths. Arrays are treated like objects with index keys. Leaves (primitives, null) are kept as values.',
    ],
    examples: [
      { input: 'flatten({ a: { b: 1, c: { d: 2 } }, e: 3 })', output: '{ "a.b": 1, "a.c.d": 2, e: 3 }' },
      { input: 'flatten({ xs: [10, { y: 20 }] })', output: '{ "xs.0": 10, "xs.1.y": 20 }' },
      { input: 'flatten({ a: {} })', output: '{ a: {} }', note: 'An empty object is a leaf.' },
    ],
    hints: [
      'Recurse with the current path prefix; when you hit a non-object or an empty object, write it under the prefix.',
      'typeof null === "object": handle null before recursing.',
      'Ask the interviewer whether arrays should be flattened; both answers are defensible.',
    ],
    starter: `/**
 * Flatten nested objects into dotted keys.
 */
export function flatten(obj: Record<string, unknown>, separator = '.'): Record<string, unknown> {
  // your code
  return {}
}
`,
    solution: `export function flatten(obj: Record<string, unknown>, separator = '.'): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const walk = (value: unknown, prefix: string): void => {
    const isContainer = typeof value === 'object' && value !== null
    if (isContainer && Object.keys(value as object).length > 0) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, prefix ? prefix + separator + k : k)
      }
    } else {
      out[prefix] = value
    }
  }
  walk(obj, '')
  return out
}
`,
    tests: [
      { call: 'flatten({ a: { b: 1, c: { d: 2 } }, e: 3 })', expected: { 'a.b': 1, 'a.c.d': 2, e: 3 } },
      { call: 'flatten({ xs: [10, { y: 20 }] })', expected: { 'xs.0': 10, 'xs.1.y': 20 } },
      { call: 'flatten({ a: {}, b: null })', expected: { a: {}, b: null } },
      { call: 'flatten({ a: { b: 1 } }, "/")', expected: { 'a/b': 1 } },
    ],
  },
  {
    id: 'memoize-ttl',
    track: 'practical',
    source: 'builtin',
    title: 'Memoize With TTL',
    topic: 'Caching',
    pattern: 'Cache keyed by serialised args with expiry',
    difficulty: 'medium',
    description: [
      'Write `memoize(fn, ttlMs, now)` returning a function with the same signature that caches results per argument list for `ttlMs` milliseconds. After the TTL, the next call recomputes. `now` returns milliseconds and defaults to Date.now.',
      'Also expose `clear()` on the returned function.',
    ],
    examples: [
      { input: 'm = memoize(slowAdd, 1000); m(1, 2); m(1, 2)', output: 'slowAdd runs once' },
      { input: 'after 1001ms: m(1, 2)', output: 'slowAdd runs again' },
    ],
    hints: [
      'A cache key from JSON.stringify(args) is the common first answer; be ready to discuss its failure modes (objects with key order, undefined, functions).',
      'Store { value, expiresAt } and treat an expired entry as a miss.',
      'Discuss: what about promise-returning fns? Caching a rejected promise is usually a bug.',
    ],
    starter: `export interface Memoized<A extends unknown[], R> {
  (...args: A): R
  clear(): void
}

/**
 * Cache fn's results per argument list for ttlMs.
 */
export function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  ttlMs: number,
  now: () => number = () => Date.now(),
): Memoized<A, R> {
  // your code
  const m = ((...args: A) => fn(...args)) as Memoized<A, R>
  m.clear = () => {}
  return m
}
`,
    solution: `export interface Memoized<A extends unknown[], R> {
  (...args: A): R
  clear(): void
}

export function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  ttlMs: number,
  now: () => number = () => Date.now(),
): Memoized<A, R> {
  const cache = new Map<string, { value: R; expiresAt: number }>()
  const m = ((...args: A): R => {
    const key = JSON.stringify(args)
    const hit = cache.get(key)
    const t = now()
    if (hit && hit.expiresAt > t) return hit.value
    const value = fn(...args)
    cache.set(key, { value, expiresAt: t + ttlMs })
    return value
  }) as Memoized<A, R>
  m.clear = () => cache.clear()
  return m
}
`,
    tests: [
      {
        call: '(() => { let t = 0, calls = 0; const m = memoize((a, b) => { calls++; return a + b }, 100, () => t); const r = [m(1, 2), m(1, 2), m(2, 2)]; t = 101; r.push(m(1, 2)); return [r, calls] })()',
        expected: [[3, 3, 4, 3], 3],
      },
      {
        name: 'clear forces recompute',
        call: '(() => { let calls = 0; const m = memoize(() => ++calls, 10000); m(); m.clear(); m(); return calls })()',
        expected: 2,
      },
    ],
  },
  {
    id: 'deep-equal',
    track: 'practical',
    source: 'builtin',
    title: 'Deep Equality',
    topic: 'Data Transformation',
    pattern: 'Structural recursion with type dispatch',
    difficulty: 'medium',
    description: [
      'Write `deepEqual(a, b)` that returns true when two values are structurally equal: primitives by value (treat NaN equal to NaN), arrays element-wise, plain objects key-wise regardless of key order, Dates by time. Objects of different types or with different key sets are not equal.',
    ],
    examples: [
      { input: 'deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })', output: 'true' },
      { input: 'deepEqual({ a: 1 }, { a: 1, b: undefined })', output: 'false' },
      { input: 'deepEqual(NaN, NaN)', output: 'true' },
    ],
    hints: [
      'Object.is handles NaN and distinguishes +0/-0; decide which you want and say so.',
      'Check constructors or Array.isArray on both sides before comparing children, so [] and {} are not equal.',
      'Senior follow-up: cycles. A WeakMap of visited pairs prevents infinite recursion.',
    ],
    starter: `/**
 * Structural equality.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // your code
  return a === b
}
`,
    solution: `export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
  }
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  const bo = b as Record<string, unknown>
  return ka.every((k) => Object.hasOwn(bo, k) && deepEqual((a as Record<string, unknown>)[k], bo[k]))
}
`,
    tests: [
      { call: 'deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })', expected: true },
      { call: 'deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })', expected: true },
      { call: 'deepEqual({ a: 1 }, { a: 1, b: undefined })', expected: false },
      { call: 'deepEqual([1, 2], { 0: 1, 1: 2 })', expected: false },
      { call: 'deepEqual(NaN, NaN)', expected: true },
      { call: 'deepEqual(new Date(5), new Date(5))', expected: true },
      { call: 'deepEqual([1, 2], [1, 2, 3])', expected: false },
    ],
  },
]
