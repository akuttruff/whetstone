import type { TestCase } from '../types.ts'

/**
 * Language-neutral tests for the practical track. These problems are about
 * closures, timers and promises, which cannot travel as JSON, so each gets a
 * test driver: a function in the starter (and the solution) that takes plain
 * data, exercises the candidate's code with real callbacks and timers, and
 * returns plain data. The same tests then run against the TypeScript, Ruby
 * and Java versions. The driver text is appended to the TypeScript starter
 * and solution; the Ruby and Java ports carry their own copies.
 */
export const PRACTICAL_DRIVERS: Record<string, { driver?: string; tests: TestCase[] }> = {
  'lru-cache': {
    tests: [
      { fn: 'runLru', args: [2, [['set', 1, 1], ['set', 2, 2], ['get', 1], ['set', 3, 3], ['get', 2], ['get', 3]]], expected: [null, null, 1, null, null, 3] },
      { fn: 'runLru', args: [2, [['set', 1, 1], ['set', 2, 2], ['set', 1, 10], ['set', 3, 3], ['get', 1], ['get', 2]]], expected: [null, null, null, null, 10, null] },
      { fn: 'runLru', args: [1, [['set', 1, 1], ['set', 2, 2], ['get', 1], ['get', 2]]], expected: [null, null, null, 2] },
    ],
  },
  'promise-pool': {
    driver: `const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Test driver. Leave as is. Maps items with a function that sleeps a little
 * (longer for smaller items, so completion order differs from input order),
 * doubles them, and throws "boom" on failOn. Returns [results, peak
 * concurrency, error message].
 */
export async function poolDemo(items: number[], limit: number, failOn: number | null): Promise<[number[] | null, number, string | null]> {
  let active = 0
  let peak = 0
  const fn = async (x: number): Promise<number> => {
    active++
    peak = Math.max(peak, active)
    await sleep(12 - x * 2)
    active--
    if (x === failOn) throw new Error('boom')
    return x * 2
  }
  try {
    return [await mapWithConcurrency(items, limit, fn), peak, null]
  } catch (e) {
    return [null, peak, (e as Error).message]
  }
}
`,
    tests: [
      { fn: 'poolDemo', args: [[1, 2, 3, 4], 2, null], expected: [[2, 4, 6, 8], 2, null] },
      { fn: 'poolDemo', args: [[1, 2, 3], 1, null], expected: [[2, 4, 6], 1, null] },
      { fn: 'poolDemo', args: [[], 3, null], expected: [[], 0, null] },
      { fn: 'poolDemo', args: [[1, 2], 2, 2], expected: [null, 2, 'boom'] },
    ],
  },
  'debounce': {
    driver: `const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Test driver. Leave as is. Replays a script of ["call", x], ["sleep", ms]
 * and ["cancel"] steps against a debounced recorder and returns what got
 * through.
 */
export async function debounceDemo(script: (string | number)[][], waitMs: number): Promise<number[]> {
  const calls: number[] = []
  const d = debounce((x: number) => { calls.push(x) }, waitMs)
  for (const [op, arg] of script) {
    if (op === 'call') d(arg as number)
    else if (op === 'sleep') await wait(arg as number)
    else d.cancel()
  }
  return calls
}
`,
    tests: [
      { fn: 'debounceDemo', args: [[['call', 1], ['call', 2], ['call', 3], ['sleep', 60]], 20], expected: [3] },
      { fn: 'debounceDemo', args: [[['call', 1], ['cancel'], ['sleep', 50]], 20], expected: [] },
      { fn: 'debounceDemo', args: [[['call', 1], ['sleep', 30], ['call', 2], ['sleep', 30]], 10], expected: [1, 2] },
    ],
  },
  'retry-with-backoff': {
    driver: `/**
 * Test driver. Leave as is. The function fails failTimes times with
 * "down <n>" (or always with "fatal" when fatal is set, which shouldRetry
 * refuses to retry), then returns "ok". Returns [result, calls, error].
 */
export async function retryDemo(failTimes: number, retries: number, baseMs: number, fatal: boolean): Promise<[string | null, number, string | null]> {
  let calls = 0
  const fn = async (): Promise<string> => {
    calls++
    if (fatal) throw new Error('fatal')
    if (calls <= failTimes) throw new Error('down ' + calls)
    return 'ok'
  }
  try {
    const r = await retry(fn, { retries, baseMs, shouldRetry: (e) => (e as Error).message !== 'fatal' })
    return [r, calls, null]
  } catch (e) {
    return [null, calls, (e as Error).message]
  }
}
`,
    tests: [
      { fn: 'retryDemo', args: [2, 5, 1, false], expected: ['ok', 3, null] },
      { fn: 'retryDemo', args: [99, 2, 1, false], expected: [null, 3, 'down 3'] },
      { fn: 'retryDemo', args: [99, 5, 1, true], expected: [null, 1, 'fatal'] },
    ],
  },
  'event-emitter': {
    driver: `/**
 * Test driver. Leave as is. Replays ["on"|"once", name, spec], ["emit",
 * name, payload] and ["off", n] (unsubscribe the n-th registration) steps.
 * Handler specs: "record" pushes the payload, "record10" pushes payload * 10,
 * "record:<s>" pushes s, "self-off:<s>" pushes s then unsubscribes itself.
 */
export function emitterDemo(script: unknown[][]): unknown[] {
  const e = new Emitter<Record<string, unknown>>()
  const seen: unknown[] = []
  const offs: (() => void)[] = []
  const handler = (spec: string): { h: (p: unknown) => void; self: { off: () => void } } => {
    const self = { off: () => {} }
    const h = (p: unknown): void => {
      if (spec === 'record') seen.push(p)
      else if (spec === 'record10') seen.push((p as number) * 10)
      else if (spec.startsWith('record:')) seen.push(spec.slice(7))
      else if (spec.startsWith('self-off:')) { seen.push(spec.slice(9)); self.off() }
    }
    return { h, self }
  }
  for (const [op, a, b] of script) {
    if (op === 'on' || op === 'once') {
      const { h, self } = handler(b as string)
      const off = op === 'on' ? e.on(a as string, h) : e.once(a as string, h)
      self.off = off
      offs.push(off)
    } else if (op === 'emit') e.emit(a as string, b)
    else if (op === 'off') offs[a as number]()
  }
  return seen
}
`,
    tests: [
      { fn: 'emitterDemo', args: [[['on', 'x', 'record'], ['once', 'x', 'record10'], ['emit', 'x', 1], ['emit', 'x', 2], ['off', 0], ['emit', 'x', 3]]], expected: [1, 10, 2] },
      { fn: 'emitterDemo', args: [[['on', 't', 'self-off:a'], ['on', 't', 'record:b'], ['emit', 't', null], ['emit', 't', null]]], expected: ['a', 'b', 'b'] },
      { fn: 'emitterDemo', args: [[['emit', 'nothing', 1]]], expected: [] },
    ],
  },
  'token-bucket': {
    driver: `/**
 * Test driver. Leave as is. A bucket with an injected clock: ["take", n]
 * records tryRemove(n), ["at", ms] moves the clock.
 */
export function bucketDemo(capacity: number, refillPerSecond: number, script: (string | number)[][]): boolean[] {
  let t = 0
  const b = new TokenBucket(capacity, refillPerSecond, () => t)
  const out: boolean[] = []
  for (const [op, n] of script) {
    if (op === 'take') out.push(b.tryRemove(n as number))
    else t = n as number
  }
  return out
}
`,
    tests: [
      { fn: 'bucketDemo', args: [3, 1, [['take', 1], ['take', 1], ['take', 1], ['take', 1], ['at', 2000], ['take', 1], ['take', 1], ['take', 1]]], expected: [true, true, true, false, true, true, false] },
      { fn: 'bucketDemo', args: [2, 10, [['take', 2], ['at', 60000], ['take', 1], ['take', 1], ['take', 1]]], expected: [true, true, true, false] },
      { fn: 'bucketDemo', args: [1, 1, [['take', 1], ['at', 500], ['take', 1], ['at', 1000], ['take', 1]]], expected: [true, false, true] },
    ],
  },
  'flatten-object': {
    tests: [
      { fn: 'flatten', args: [{ a: { b: 1, c: { d: 2 } }, e: 3 }], expected: { 'a.b': 1, 'a.c.d': 2, e: 3 } },
      { fn: 'flatten', args: [{ xs: [10, { y: 20 }] }], expected: { 'xs.0': 10, 'xs.1.y': 20 } },
      { fn: 'flatten', args: [{ a: {}, b: null }], expected: { a: {}, b: null } },
      { fn: 'flatten', args: [{ a: { b: 1 } }, '/'], expected: { 'a/b': 1 } },
    ],
  },
  'memoize-ttl': {
    driver: `/**
 * Test driver. Leave as is. Memoises a counting adder with an injected clock:
 * ["call", a, b] records the result, ["at", ms] moves the clock, ["clear"]
 * clears. Returns [results, underlying calls].
 */
export function memoDemo(script: (string | number)[][], ttlMs: number): [number[], number] {
  let t = 0
  let calls = 0
  const m = memoize((a: number, b: number) => { calls++; return a + b }, ttlMs, () => t)
  const results: number[] = []
  for (const [op, a, b] of script) {
    if (op === 'call') results.push(m(a as number, b as number))
    else if (op === 'at') t = a as number
    else m.clear()
  }
  return [results, calls]
}
`,
    tests: [
      { fn: 'memoDemo', args: [[['call', 1, 2], ['call', 1, 2], ['call', 2, 2], ['at', 101], ['call', 1, 2]], 100], expected: [[3, 3, 4, 3], 3] },
      { fn: 'memoDemo', args: [[['call', 1, 1], ['clear'], ['call', 1, 1]], 10000], expected: [[2, 2], 2] },
    ],
  },
  'deep-equal': {
    driver: `/**
 * Test driver. Leave as is. The cases JSON cannot express: NaN against NaN,
 * two equal Dates, and a key that is present but undefined.
 */
export function deepEqualChecks(): boolean[] {
  return [deepEqual(NaN, NaN), deepEqual(new Date(5), new Date(5)), deepEqual({ a: 1 }, { a: 1, b: undefined })]
}
`,
    tests: [
      { fn: 'deepEqual', args: [{ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }], expected: true },
      { fn: 'deepEqual', args: [{ a: 1, b: 2 }, { b: 2, a: 1 }], expected: true },
      { fn: 'deepEqual', args: [[1, 2], { 0: 1, 1: 2 }], expected: false },
      { fn: 'deepEqual', args: [[1, 2], [1, 2, 3]], expected: false },
      { fn: 'deepEqual', args: [{ a: 1, b: null }, { a: 1 }], expected: false },
      { fn: 'deepEqualChecks', args: [], expected: [true, true, false] },
    ],
  },
  'throttle': {
    driver: `const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Test driver. Leave as is. Replays ["call", x] and ["sleep", ms] steps
 * against a throttled recorder and returns what got through.
 */
export async function throttleDemo(script: (string | number)[][], intervalMs: number): Promise<number[]> {
  const calls: number[] = []
  const t = throttle((x: number) => { calls.push(x) }, intervalMs)
  for (const [op, arg] of script) {
    if (op === 'call') t(arg as number)
    else await pause(arg as number)
  }
  return calls
}
`,
    tests: [
      { fn: 'throttleDemo', args: [[['call', 1], ['call', 2], ['call', 3], ['sleep', 60]], 30], expected: [1, 3] },
      { fn: 'throttleDemo', args: [[['call', 1], ['sleep', 25], ['call', 2], ['sleep', 25]], 10], expected: [1, 2] },
    ],
  },
  'async-queue': {
    driver: `const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Test driver. Leave as is. Adds tasks ["ok", value, ms] (resolve with value
 * after ms) and ["fail", message, ms] (reject after ms), waits for idle, and
 * returns [each task's outcome in add order ("error:<message>" for a
 * rejection), peak concurrency].
 */
export async function queueDemo(concurrency: number, tasks: (string | number)[][]): Promise<[unknown[], number]> {
  const q = new TaskQueue(concurrency)
  let active = 0
  let peak = 0
  const outcomes = tasks.map(([kind, value, ms]) =>
    q.add(async () => {
      active++
      peak = Math.max(peak, active)
      await delay(ms as number)
      active--
      if (kind === 'fail') throw new Error(String(value))
      return value
    }).catch((e: Error) => 'error:' + e.message),
  )
  await q.onIdle()
  return [await Promise.all(outcomes), peak]
}
`,
    tests: [
      { fn: 'queueDemo', args: [2, [['ok', 1, 10], ['ok', 2, 10], ['ok', 3, 10]]], expected: [[1, 2, 3], 2] },
      { fn: 'queueDemo', args: [1, [['fail', 'x', 1], ['ok', 'ok', 1]]], expected: [['error:x', 'ok'], 1] },
      { fn: 'queueDemo', args: [1, []], expected: [[], 0] },
    ],
  },
  'deep-clone': {
    tests: [
      { fn: 'check', args: [], expected: [true, true, true, true, true] },
      { fn: 'deepClone', args: [5], expected: 5 },
      { fn: 'deepClone', args: [{ a: [1, 2], b: null }], expected: { a: [1, 2], b: null } },
    ],
  },
  'group-by': {
    driver: `/** Test driver. Leave as is: groups numbers by parity with groupBy. */
export function groupByParity(nums: number[]): Record<string, number[]> {
  return groupBy(nums, (n) => (n % 2 ? 'odd' : 'even'))
}
`,
    tests: [
      { fn: 'groupByParity', args: [[1, 2, 3, 4]], expected: { odd: [1, 3], even: [2, 4] } },
      { fn: 'topPerCategory', args: [[{ id: 'a', category: 'x', total: 5 }, { id: 'b', category: 'x', total: 9 }, { id: 'c', category: 'y', total: 1 }]], expected: { x: 'b', y: 'c' } },
      { fn: 'groupByParity', args: [[]], expected: {} },
    ],
  },
  'parse-query-string': {
    tests: [
      { fn: 'parseQuery', args: ['?a=1&b=two%20words&a=3&c'], expected: { a: ['1', '3'], b: 'two words', c: '' } },
      { fn: 'parseQuery', args: ['q=a+b&eq=x=y'], expected: { q: 'a b', eq: 'x=y' } },
      { fn: 'parseQuery', args: [''], expected: {} },
    ],
  },
  'lfu-cache': {
    tests: [
      { fn: 'runLfu', args: [2, [['set', 1, 1], ['set', 2, 2], ['get', 1], ['set', 3, 3], ['get', 2], ['get', 3], ['set', 4, 4], ['get', 1], ['get', 3], ['get', 4]]], expected: [null, null, 1, null, -1, 3, null, -1, 3, 4] },
      { fn: 'runLfu', args: [0, [['set', 0, 0], ['get', 0]]], expected: [null, -1] },
    ],
  },
  'circular-buffer': {
    driver: `/**
 * Test driver. Leave as is. Replays ["push", x] (records what was evicted),
 * ["shift"], ["toArray"] and ["size"] steps, recording each result.
 */
export function ringDemo(capacity: number, ops: unknown[][]): unknown[] {
  const b = new RingBuffer<unknown>(capacity)
  return ops.map(([op, x]) => {
    if (op === 'push') return b.push(x) ?? null
    if (op === 'shift') return b.shift() ?? null
    if (op === 'toArray') return b.toArray()
    return b.size
  })
}
`,
    tests: [
      { fn: 'ringDemo', args: [3, [['push', 1], ['push', 2], ['push', 3], ['push', 4], ['toArray'], ['size']]], expected: [null, null, null, 1, [2, 3, 4], 3] },
      { fn: 'ringDemo', args: [2, [['push', 'a'], ['push', 'b'], ['shift'], ['push', 'c'], ['toArray'], ['shift'], ['shift'], ['shift']]], expected: [null, null, 'a', null, ['b', 'c'], 'b', 'c', null] },
    ],
  },
  'semver-compare': {
    tests: [
      { fn: 'compareVersions', args: ['1.2.10', '1.2.9'], expected: 1 },
      { fn: 'compareVersions', args: ['1.0', '1.0.0'], expected: 0 },
      { fn: 'compareVersions', args: ['1.0.0-beta', '1.0.0'], expected: -1 },
      { fn: 'compareVersions', args: ['0.9', '1.0'], expected: -1 },
    ],
  },
  'resolve-dependencies': {
    driver: `/** Test driver. Leave as is: the order, or the error message when there is a cycle. */
export function installOrderOrError(deps: Record<string, string[]>): string[] | string {
  try {
    return installOrder(deps)
  } catch (e) {
    return (e as Error).message
  }
}
`,
    tests: [
      { fn: 'installOrder', args: [{ app: ['lib', 'util'], lib: ['util'], util: [] }], expected: ['util', 'lib', 'app'] },
      { fn: 'installOrderOrError', args: [{ a: ['b'], b: ['a'] }], expected: 'cycle: a -> b -> a' },
      { fn: 'installOrder', args: [{ z: [], a: [], m: ['z'] }], expected: ['a', 'z', 'm'] },
    ],
  },
  'match-route': {
    tests: [
      { fn: 'matchRoute', args: ['/users/:id/posts/:postId', '/users/42/posts/7'], expected: { params: { id: '42', postId: '7' } } },
      { fn: 'matchRoute', args: ['/files/*', '/files/a/b.txt'], expected: { params: { '*': 'a/b.txt' } } },
      { fn: 'matchRoute', args: ['/users/:id', '/users'], expected: null },
      { fn: 'matchRoute', args: ['/users/:id', '/users/42/extra'], expected: null },
      { fn: 'matchRoute', args: ['/a/', '/a'], expected: { params: {} } },
    ],
  },
  'set-in-immutable': {
    tests: [
      { fn: 'check', args: [], expected: [true, true, true, true, true] },
      { fn: 'setIn', args: [{}, ['x', 'y'], 1], expected: { x: { y: 1 } } },
      { fn: 'setIn', args: [{}, ['xs', 0], 'a'], expected: { xs: ['a'] } },
    ],
  },
  'with-timeout-abort': {
    driver: `/**
 * Test driver. Leave as is. Runs a sleep of runMs under a limit of limitMs:
 * returns ["timeout", <what the inner sleep rejected with>] when the limit
 * wins, or ["ok", null] when the run completes in time.
 */
export async function timeoutDemo(runMs: number, limitMs: number): Promise<[string, string | null]> {
  let inner: string | null = null
  try {
    await withTimeout((s) => sleep(runMs, s).catch((e: Error) => { inner = e.message; throw e }), limitMs)
    return ['ok', inner]
  } catch (e) {
    await new Promise((r) => setTimeout(r, 5))
    return [(e as Error).message, inner]
  }
}

/** Test driver. Leave as is: a plain sleep really waits. */
export async function sleepAtLeast(ms: number): Promise<boolean> {
  const t = Date.now()
  await sleep(ms)
  return Date.now() - t >= ms - 2
}
`,
    tests: [
      { fn: 'timeoutDemo', args: [500, 20], expected: ['timeout', 'aborted'] },
      { fn: 'timeoutDemo', args: [1, 50], expected: ['ok', null] },
      { fn: 'sleepAtLeast', args: [15], expected: true },
    ],
  },
}
