import type { PortNotes } from './notes.ts'

/**
 * The Java telling of the practical problems: the statement against the Java
 * API in ports-practical-java.ts, hints in Java idiom, and what a strong Java
 * answer gets right (the memory model, executors, erasure, boxing, nullability).
 */
export const JAVA_PRACTICAL_NOTES: Record<string, PortNotes> = {
  'lru-cache': {
    description: [
      'Implement `LRUCache<K, V>` with a fixed `capacity`. `V get(K key)` returns the value, or `null` when the key is absent, and marks the key most recently used; `void set(K key, V value)` inserts or updates and, once the cache is over capacity, evicts the least recently used entry. Both operations are O(1).',
      'The `runLru` driver in `Solution` replays `set`/`get` operations against an `LRUCache<Integer, Integer>` and collects the `Integer` results (`null` for each `set`); leave it as is. The cache is used from one thread: say what you would change for concurrent callers rather than paying for locks the driver never needs.',
    ],
    examples: [
      { input: 'capacity 2: set(1, 1); set(2, 2); get(1); set(3, 3); get(2); get(3)', output: '1, null, 3', note: 'Reading 1 made 2 the least recently used, so inserting 3 evicted 2.' },
      { input: 'capacity 1: set(1, 1); set(2, 2); get(1); get(2)', output: 'null, 2' },
    ],
    hints: [
      '`LinkedHashMap` keeps insertion order, and `remove` followed by `put` moves a key to the tail; the oldest key is `keySet().iterator().next()`.',
      'The idiomatic shortcut: `new LinkedHashMap<>(16, 0.75f, true)` orders by access, and overriding `removeEldestEntry(Map.Entry<K, V> eldest)` to return `size() > capacity` makes `put` evict for you.',
      'Be ready to build it by hand: a `HashMap<K, Node>` plus a doubly linked list with sentinel head and tail nodes, unlinking and relinking in O(1).',
      '`get` alone cannot tell "absent" from "present with a null value"; decide whether null values are allowed and use `containsKey` if they are.',
    ],
    nuances: [
      'With `accessOrder = true`, a `LinkedHashMap.get` is a structural modification: it reorders the list, so even concurrent reads are a data race, and `Collections.synchronizedMap` is the minimum before sharing it.',
      'A `ConcurrentHashMap` alone cannot make this concurrent: eviction needs the recency order and the size check in one atomic step. Name `ReentrantLock` (or `synchronized`) around the whole operation, or a library such as Caffeine, as the real answer.',
      'The return type `V` makes a miss `null`, so a cache that stores `null` values is ambiguous; `Optional<V>` or `containsKey` are the alternatives. The driver expects plain `null` for a miss.',
      'Keys go through `hashCode`/`equals`: a mutable key, or a class overriding only one of the two, breaks the cache silently. The driver uses `Integer` keys, and `==` on them lies above 127 because of the `Integer` cache; the hand-built list must compare with `equals`.',
      '`removeEldestEntry` is called from inside `put` and `putAll` only; it must not modify the map itself and should evict at most the eldest entry. Returning `true` is the whole contract.',
      'Validate `capacity` in the constructor (`IllegalArgumentException` for `<= 0`); a zero-capacity cache that silently evicts on every `set` is a bug waiting for a caller.',
    ],
  },
  'promise-pool': {
    description: [
      'Implement `Pool.mapWithConcurrency(List<T> items, int limit, BiFunction<T, Integer, R> fn)`: apply `fn` to every item (it also receives the index) with at most `limit` calls running at once on separate threads, and return the results as a `List<R>` in the original order. If any call throws, let the others finish and rethrow that exception from the pool.',
      'The `poolDemo` driver calls it with a function that sleeps (longer for smaller items, so completion order differs from input order), counts peak concurrency under `synchronized`, and throws `RuntimeException("boom")` on a chosen item; it expects `[results, peak, errorMessage]`. Running everything serially, or on an unbounded number of threads, both miss the point. Whatever executor you create must be shut down before you return.',
    ],
    examples: [
      { input: 'mapWithConcurrency(List.of(1, 2, 3, 4), 2, (x, i) -> x * 2)', output: '[2, 4, 6, 8]' },
      { input: 'limit 2, five slow tasks', output: 'at most 2 tasks ever run at the same time' },
      { input: 'one task throws RuntimeException("boom")', output: 'mapWithConcurrency throws an exception whose message is "boom"' },
    ],
    hints: [
      'A fixed number of workers, `Math.max(1, Math.min(limit, items.size()))`: each loops, taking the next index from a shared counter, calling `fn`, and storing the result at that index in a pre-sized `List<R>` or an `Object[]`.',
      'The shared counter is an `AtomicInteger.getAndIncrement()`; the result slots are disjoint, so the only synchronisation they need is the happens-before that `Thread.join` or `Future.get` gives the caller.',
      'Or let the library pool: `Executors.newFixedThreadPool(n)`, `submit` one `Callable` per item, then `get` each `Future` in order; the exception arrives wrapped in `ExecutionException`.',
      'Edge cases: an empty list, `limit` larger than the list, `limit <= 0`.',
    ],
    nuances: [
      '`BiFunction` cannot throw checked exceptions, so `fn` fails with an unchecked one; the pool\'s `throws Exception` is where you unwrap `ExecutionException.getCause()` and rethrow the real exception, not the wrapper, because the driver compares the message.',
      'Results written by worker threads are visible to the caller only through a happens-before edge: `Thread.join`, `Future.get`, or a `CountDownLatch` reaching zero. A plain `ArrayList.set` from several threads, even into disjoint slots, is otherwise a data race the Java memory model allows to read stale.',
      'A `newFixedThreadPool` must be shut down in `finally` (`shutdown`, or `shutdownNow` after a failure to interrupt stragglers): its threads are non-daemon and keep the JVM alive. Raw `Thread`s that you `join`, as the port does, avoid the lifecycle but reinvent the pool.',
      'On failure decide whether the remaining tasks still run: a `volatile boolean failed` checked before taking the next index stops early; `Future.cancel(true)` interrupts tasks that honour interruption, and `Thread.sleep` does. Restore the interrupt flag if you catch `InterruptedException` inside a worker.',
      'The index arrives boxed as `Integer`; one allocation per call is nothing here but is the thing to notice in a hot loop. Record it and move on.',
      'Virtual threads (`Executors.newVirtualThreadPerTaskExecutor`) make a thread per item cheap, but the limit still needs a `Semaphore`: the requirement is bounded concurrency, not cheap threads.',
    ],
  },
  'debounce': {
    description: [
      'Implement `Debounced<A>`, built from a `Consumer<A> fn` and `waitMs`. `void call(A arg)` runs `fn` only after `waitMs` milliseconds pass without another call, with the last call\'s argument; `void cancel()` drops a pending run.',
      'The `debounceDemo` driver replays `["call", x]`, `["sleep", ms]` and `["cancel"]` steps from the test thread into a `Debounced<Integer>` whose `fn` appends to a synchronized list, then returns what got through. `fn` therefore runs on a timer thread you own: create it so it does not keep the JVM alive, and make `call`/`cancel` safe to invoke while a scheduled run is firing.',
    ],
    examples: [
      { input: 'd = new Debounced<>(log, 100); d.call(1); d.call(2); d.call(3); Thread.sleep(150)', output: 'log.accept(3), once' },
      { input: 'd.call(1); d.cancel(); Thread.sleep(150)', output: 'log never called' },
    ],
    hints: [
      'A `ScheduledExecutorService` from `Executors.newSingleThreadScheduledExecutor` with a daemon `ThreadFactory`; `schedule(task, waitMs, TimeUnit.MILLISECONDS)` returns the `ScheduledFuture<?>` you keep as the pending run.',
      'Each `call` cancels the previous future (`cancel(false)`) before scheduling the next; `cancel()` does the same and clears the field.',
      'Guard the pending future with `synchronized` (or an `AtomicReference`): `call` on the caller thread and the firing task on the timer thread both touch it.',
      'Know the difference from throttle: throttle guarantees a run at most once per interval while calls keep coming; a debounce can wait forever.',
    ],
    nuances: [
      'The pending `ScheduledFuture` is read and written from two threads; without `synchronized` or `volatile` the timer thread may see a stale reference and a `cancel` racing the firing task can be lost. `ScheduledFuture.cancel(false)` returns `false` once the task has started, so a run already under way goes through unless you also check a generation counter inside the task.',
      '`java.util.Timer` works too, but one uncaught exception in a task kills its thread for good; a `ScheduledExecutorService` swallows the exception into the future instead, which is why a failing `fn` must be caught and logged or it vanishes.',
      'Executor threads are non-daemon by default and keep the JVM alive after `main` returns. The port passes a `ThreadFactory` that sets `setDaemon(true)`; the alternative is a `close()` that calls `shutdown`, which is what implementing `AutoCloseable` is for.',
      'Do not run `fn` while holding the lock: it is arbitrary user code that may block or re-enter `call`, and every caller would serialise behind it. Clear the pending state under the lock, release, then call.',
      '`volatile` is enough for a single flag such as "cancelled", but cancel-then-schedule is a compound action and needs the lock; `volatile` never makes two steps atomic.',
    ],
  },
  'retry-with-backoff': {
    description: [
      'Implement `Retry.retry(Callable<T> fn, RetryOptions options)`: call `fn`, and when it throws wait `baseMs * 2^attempt` milliseconds before trying again, up to `options.retries` further attempts. Return the first success; after the last failure throw the last exception itself. `options.shouldRetry` is a `Predicate<Exception>` that may be `null` (retry everything); when it rejects an exception, fail fast with it.',
      'The `retryDemo` driver counts calls and expects `[result, calls, errorMessage]`: `"down 3"` after `retries = 2`, and a single call when every failure is `"fatal"`. `Thread.sleep` is acceptable for the wait, as long as `InterruptedException` is handled properly.',
    ],
    hints: [
      'A `for` loop over `attempt` with `try`/`catch` reads better than recursion; keep `Exception last` and throw it after the loop.',
      'The delay is `baseMs * (1L << attempt)`; an `int` shift overflows at 31 attempts, and a cap (`Math.min` against a maximum delay) is worth mentioning.',
      'Wait with `Thread.sleep` or `TimeUnit.MILLISECONDS.sleep`; in a real service add jitter from `ThreadLocalRandom` so clients do not retry in lockstep.',
      'Catch `Exception` from `Callable.call`, not `Throwable`: an `Error` such as `OutOfMemoryError` must not be retried.',
    ],
    nuances: [
      '`Callable<T>` may throw checked exceptions and `retry` declares `throws Exception`, so the last exception is rethrown as itself, stack trace intact. Wrapping it in `RuntimeException("gave up")` loses the message the driver checks and the cause the caller needs.',
      '`Thread.sleep` throws `InterruptedException`: an interrupt means the caller wants out, so stop retrying and let it propagate (or restore the flag with `Thread.currentThread().interrupt()` if you convert it). Catching it and continuing to retry is the classic bug.',
      'Test the exception, not its message: production predicates use `instanceof` (`IOException`, a status-code exception) and treat `IllegalArgumentException` and friends as non-retryable. Pattern matching (`e instanceof IOException io`) keeps that readable; the message test in the driver is a convenience for the shared tests.',
      'A sleeping loop holds a thread for the whole backoff. The non-blocking shape is a `ScheduledExecutorService` or `CompletableFuture.delayedExecutor` that reschedules the attempt and completes a `CompletableFuture<T>`; say which the caller wants.',
      '`RetryOptions` is a mutable class with package-private fields. In your own code make it a `record RetryOptions(int retries, long baseMs, Predicate<Exception> shouldRetry)` with validation in a compact constructor, so an options object is immutable and safe to share.',
    ],
  },
  'event-emitter': {
    description: [
      'Implement `Emitter`: `Runnable on(String name, Consumer<Object> handler)` registers a handler and returns a `Runnable` that unsubscribes it; `once` registers a handler that runs one time; `void emit(String name, Object payload)` calls every current handler for that name in registration order. A handler that unsubscribes itself during `emit` must not break the iteration of the others.',
      'The `emitterDemo` driver registers recording handlers, emits payloads (an `Integer`, or `null`), unsubscribes by running the returned `Runnable`, and collects what the handlers saw. Everything runs on one thread; be ready to say what changes when `emit` and `on` come from different threads.',
    ],
    examples: [
      { input: 'e.on("x", a); e.once("x", b); e.emit("x", 1); e.emit("x", 2)', output: 'a.accept(1), b.accept(1), a.accept(2)' },
    ],
    hints: [
      '`Map<String, List<Consumer<Object>>>` with `computeIfAbsent(name, k -> new ArrayList<>())`; the returned `Runnable` captures the list and the handler and calls `list.remove(handler)`.',
      'Iterate a copy (`new ArrayList<>(list)`) in `emit`, or use a `CopyOnWriteArrayList`, so a removal mid-emit cannot throw `ConcurrentModificationException`.',
      '`once` wraps the handler in a lambda that unsubscribes and then delegates; the wrapper needs its own unsubscriber, which in Java means a one-element array or an `AtomicReference`, because a lambda cannot capture a local assigned after it.',
      'Payloads typed per event name need a `Class<T>` token or an event-type key (`<T> on(Class<T> type, Consumer<T> handler)`); erasure forbids anything cleverer.',
    ],
    nuances: [
      '`List.remove(Object)` uses `equals`, and lambdas have identity equality, so the same handler instance registered twice is removed once, from the front. Beware the `remove(int)` overload: a boxed index would silently pick the other one.',
      '`ArrayList` iterators are fail-fast: a handler that unsubscribes during a plain `for` over the live list throws `ConcurrentModificationException`. Copying per emit costs an allocation; `CopyOnWriteArrayList` moves that cost to `on`/`off`, right when emits far outnumber registrations, and it is also safe across threads.',
      'Registration order is part of the contract, so the handler container must be a `List`; a `HashSet` of handlers would iterate in hash order.',
      '`Consumer.accept` cannot throw checked exceptions, and one `RuntimeException` would stop the remaining handlers. Decide and state it: let it propagate, or catch per handler, collect, and rethrow after the loop.',
      'For a thread-safe emitter, `ConcurrentHashMap` plus `CopyOnWriteArrayList` makes `on`/`emit` lock-free, with weakly consistent semantics: a handler added during an emit may or may not see that emit. Saying that out loud is the senior answer.',
    ],
  },
  'token-bucket': {
    description: [
      'Implement `TokenBucket(int capacity, double refillPerSecond, LongSupplier now)` where `now` returns milliseconds. `boolean tryRemove(int n)` removes `n` tokens and returns `true` when they are available, else `false` without taking anything. Tokens refill continuously at `refillPerSecond`, never above `capacity`, computed lazily from the clock on each call rather than by a timer thread.',
      'The `bucketDemo` driver moves an injected clock (`["at", ms]`) and records `tryRemove` results (`["take", n]`); it checks fractional refill (at 1/s, half a second later a request still fails) and that a long idle period does not overshoot capacity. The bucket starts full.',
    ],
    hints: [
      'Keep `double tokens` and `long lastMs`. On every call: `tokens = Math.min(capacity, tokens + (t - lastMs) / 1000.0 * refillPerSecond)`, then `lastMs = t`.',
      'Clamp negative elapsed time to zero; a clock that steps backwards must not drain the bucket.',
      'For a shared limiter make `tryRemove` `synchronized` (refill and take are one compound action), or pack tokens and timestamp into one immutable state swapped with `AtomicReference.compareAndSet`.',
      'Compare with a fixed-window counter and a sliding log; know when each fits.',
    ],
    nuances: [
      '`LongSupplier now` is the Java shape of an injected clock, chosen over `java.time.Clock` because the driver wants a primitive millisecond count. In production measure elapsed time with `System.nanoTime()`: `currentTimeMillis` jumps with NTP adjustments and a backwards step looks like negative refill.',
      'A rate limiter exists to be shared, so `tryRemove` is called from many threads and refill-then-take must be atomic. `synchronized` is the honest answer; a non-`volatile` `double` field is not even guaranteed to be read atomically on all JVMs, and `volatile` alone would still leave the compound action racy.',
      'Integer division truncates silently: `(t - lastMs) / 1000 * rate` with `long` operands drops the fraction the fractional-refill test depends on. Divide by `1000.0` and keep `tokens` as a `double`.',
      'Lock-free variant: an immutable `record State(double tokens, long lastMs)` in an `AtomicReference` with a CAS loop gives the same semantics without blocking; Guava\'s `RateLimiter` and Bucket4j work in that spirit.',
      'Say what `tryRemove(n)` means when `n > capacity`: it can never succeed, so reject it with `IllegalArgumentException` rather than letting callers spin forever.',
    ],
  },
  'flatten-object': {
    description: [
      'Write `Solution.flatten(Map<String, Object> obj, String separator)`, and the one-argument overload with `"."`, turning nested maps into a single-level `Map<String, Object>` whose keys are the joined paths. `List`s count as maps with index keys. Leaves (scalars, `null`, and empty maps or lists) are kept as values, in encounter order.',
      'The tests feed JSON-shaped data: values are `Map`, `List`, `Integer`, `String`, `Boolean` or `null`, so your code dispatches on `Object` at runtime.',
    ],
    examples: [
      { input: 'flatten(Map.of("a", Map.of("b", 1, "c", Map.of("d", 2)), "e", 3))', output: '{a.b=1, a.c.d=2, e=3}' },
      { input: 'flatten(Map.of("xs", List.of(10, Map.of("y", 20))))', output: '{xs.0=10, xs.1.y=20}' },
      { input: 'flatten(Map.of("a", Map.of()))', output: '{a={}}', note: 'An empty map is a leaf.' },
    ],
    hints: [
      'A private recursive `walk(Object value, String prefix, ...)` writing into a `LinkedHashMap<String, Object>`: a non-empty `Map` or `List` recurses with the extended prefix, anything else is `out.put(prefix, value)`.',
      'Dispatch with pattern matching: `if (value instanceof Map<?, ?> m && !m.isEmpty())`; the wildcard avoids an unchecked cast.',
      'Build the key as `prefix.isEmpty() ? key : prefix + separator + key`, so the top level has no leading separator.',
      'Ask whether lists should be flattened; both answers are defensible.',
    ],
    nuances: [
      'The parameter says `Map<String, Object>` but nested maps arrive as `Map<?, ?>` through erasure: a cast to `Map<String, Object>` is unchecked and only fails later, when a non-string key is used. Iterate `Map<?, ?>` and `String.valueOf` the key.',
      '`null` is a legitimate leaf and `Map.of`/`List.of` reject nulls, so build the result with `LinkedHashMap.put` and never the immutable factories; do not `Objects.requireNonNull` a value.',
      'An empty container is a leaf that keeps its identity in the result; replacing it with `Map.of()` changes the object the caller gets back. Keep the original.',
      '`LinkedHashMap` for the result: the tests compare by content, but humans and JSON diffs read the order, and `HashMap` would scramble it. The input order is whatever the parser gave you.',
      'Recursion depth equals nesting depth; for untrusted documents an explicit `ArrayDeque` stack avoids `StackOverflowError` on a hostile payload.',
    ],
  },
  'memoize-ttl': {
    description: [
      'Implement `Memoized<A, R>`, built from a `Function<A, R> fn`, `ttlMs` and a `LongSupplier now` (milliseconds). `R apply(A arg)` returns the cached result for `arg` while its entry is younger than `ttlMs`, otherwise calls `fn` and caches the new value with a fresh expiry; `void clear()` empties the cache.',
      'The `memoDemo` driver memoises a counting adder whose argument is the pair `List.of(a, b)`, moves the injected clock, calls `clear`, and returns `[results, underlyingCalls]`; so the cache key is the argument itself and relies on its `equals`/`hashCode`. Single-threaded in the driver; say what a shared memoiser needs.',
    ],
    examples: [
      { input: 'm = new Memoized<>(slowAdd, 1000, clock); m.apply(List.of(1, 2)); m.apply(List.of(1, 2))', output: 'slowAdd runs once' },
      { input: 'clock advanced by 1001 ms: m.apply(List.of(1, 2))', output: 'slowAdd runs again' },
    ],
    hints: [
      '`Map<A, Entry<R>>` where `Entry` is a small `record Entry<R>(R value, long expiresAt)`; a hit with `expiresAt <= now` is a miss.',
      'Read the clock once per call and use it for both the expiry check and the new expiry.',
      'For concurrent callers, `ConcurrentHashMap.compute(arg, (k, e) -> ...)` makes check-and-recompute one atomic step per key, so two threads never both call `fn`.',
      'Expired entries linger until that key is asked for again; mention a size bound or a sweep when the key space is unbounded.',
    ],
    nuances: [
      'There is no "serialise the arguments to a string" escape hatch: the key is the argument object, so `List.of(1, 2)` works because `List.equals` is element-wise, while an `int[]` argument or a class without `equals`/`hashCode` misses on every call. Say it; multi-argument functions want a `record Key(A a, B b)`.',
      'A `record` for the entry beats an `Object[]` pair: typed, immutable, no unchecked `(R)` cast and no boxed `Long` comparison. Immutable entries are also safely published through a `ConcurrentHashMap`.',
      '`ConcurrentHashMap.compute` holds the bin lock while `fn` runs: good for deduplicating concurrent misses, bad when `fn` is slow and other keys share the bin, and `fn` must not touch the map. Caching a `CompletableFuture<R>` instead of `R` releases the lock at once and lets waiters join the in-flight computation.',
      'Caching `null`: `HashMap` accepts `null` values and `ConcurrentHashMap` does not, so a `Function` that may return `null` needs a sentinel or a documented "not cached" rule.',
      'For a real TTL inject `System::nanoTime` (or a `Clock` with a fake in tests), not `currentTimeMillis`: a wall-clock jump would expire, or resurrect, every entry at once.',
    ],
  },
  'deep-equal': {
    description: [
      'Write `Solution.deepEqual(Object a, Object b)`: structural equality for the JSON-shaped values the tests pass. Numbers compare by value with `NaN` equal to `NaN`; `List`s element-wise; `Map`s key-wise regardless of order; `Date`s by instant. Different container kinds (`List` against `Map`) or different key sets are not equal.',
      'The `deepEqualChecks` driver covers what JSON cannot express: `Double.NaN` against itself, two `new Date(5)`, and `Map.of("a", 1)` against a map holding `a=1` plus `b=null`, which must be unequal because the key sets differ.',
    ],
    examples: [
      { input: 'deepEqual(Map.of("a", List.of(1, Map.of("b", 2))), Map.of("a", List.of(1, Map.of("b", 2))))', output: 'true' },
      { input: 'deepEqual(List.of(1, 2), Map.of("0", 1, "1", 2))', output: 'false', note: 'A list is never equal to a map, whatever the keys.' },
      { input: 'deepEqual(Double.NaN, Double.NaN)', output: 'true' },
    ],
    hints: [
      'Cheap exits first: `a == b` (same reference, covers two nulls), then one null, then dispatch on type.',
      'Numbers: compare as `double` via `Number.doubleValue()` so an `Integer` 1 equals a `Long` 1; `Double.compare(x, y) == 0` treats `NaN` as equal to itself, unlike `==`.',
      'Maps: same `size()`, then for each entry `containsKey` and recurse; `containsKey`, not `get() != null`, is what tells a missing key from a present null.',
      'Senior follow-up: cycles, with an `IdentityHashMap` of visited pairs.',
    ],
    nuances: [
      '`Objects.equals(a, b)` is already structural for `List` and `Map`, and the starter returns it. What it misses is mixed numeric types (`Integer` 1 is not `equals` to `Double` 1.0) and the explicit kind check; say what you add on top of the library instead of rewriting it.',
      'The `instanceof` chain is the dynamic dispatch Java gives you for `Object`; with pattern matching (`a instanceof List<?> la && b instanceof List<?> lb`) the casts disappear. Check both sides for the same kind before recursing.',
      '`Double.compare` and `Double.equals` treat `NaN` as equal and distinguish `0.0` from `-0.0`; primitive `==` does the opposite on both. Pick one and state it; the tests want `NaN` equal.',
      'Numeric widening through `doubleValue()` matches JSON but loses precision above 2^53 for `long` and ignores `BigDecimal` scale. Name the trade-off.',
      '`Map.of` rejects `null` values, which is why the driver builds the null-bearing map with `HashMap`; a `get(key) == null` test cannot tell absent from null-valued, exactly the case the third check exercises.',
      'Mutable `java.util.Date` is compared by `getTime()`; `java.time.Instant` is immutable with a sound `equals` and is what new code should hold.',
    ],
  },
  'throttle': {
    description: [
      'Implement `Throttled<A>` from a `Consumer<A> fn`, `intervalMs` and a `LongSupplier now` (milliseconds). `void call(A arg)` runs `fn` immediately when at least `intervalMs` have passed since the last run; calls inside the interval are coalesced into one trailing run with the latest argument when the interval ends.',
      'The `throttleDemo` driver constructs `new Throttled<>(calls::add, intervalMs, System::currentTimeMillis)` and replays `["call", x]` and `["sleep", ms]` steps from the test thread; the trailing run fires on a timer thread you own, so `call` and the trailing task share state across threads.',
    ],
    examples: [
      { input: 't = new Throttled<>(log, 100, System::currentTimeMillis); t.call(1); t.call(2); t.call(3); Thread.sleep(150)', output: 'log.accept(1) immediately, log.accept(3) at about 100 ms' },
    ],
    hints: [
      'Track `last` (the time of the last run), a pending argument, and a `ScheduledFuture<?>` for the trailing run; a call inside the interval stores the argument and, if nothing is scheduled, schedules a flush for the remaining time.',
      'The flush takes the pending argument under the lock, clears the handle, updates `last`, releases the lock, then calls `fn`.',
      'Initialise `last` so the first call always qualifies without `Long.MIN_VALUE` overflowing when subtracted.',
      'Contrast with debounce: throttle guarantees progress under continuous calls.',
    ],
    nuances: [
      'A generic `A pending` cannot use `null` as "nothing pending", because `null` may be a legitimate argument; the port keeps a separate `boolean hasPending`. `Optional<A>` is the other way to say it.',
      'Overflow is real in `long` time arithmetic: `t - Long.MIN_VALUE` wraps negative and the first call would be dropped. Use a sentinel such as `Long.MIN_VALUE / 2`, or a `boolean hasRun`.',
      '`System::currentTimeMillis` is what the driver injects, but interval measurement wants `System.nanoTime()`; the `LongSupplier` makes that a one-token change at the call site and a fake clock in tests.',
      '`last`, the pending argument and the scheduled future are all touched by the caller thread and the timer thread, so `synchronized` on `call` and inside the flush is the minimum; an unsynchronised read of `last` can see a stale value and run `fn` twice in one interval.',
      'Run `fn` outside the monitor: holding it while `fn` executes serialises every caller behind a possibly slow callback, and if `fn` re-enters `call` the reentrant monitor lets it straight into the middle of your flush.',
    ],
  },
  'async-queue': {
    description: [
      'Implement `TaskQueue(int concurrency)`: `<T> CompletableFuture<T> add(Callable<T> task)` enqueues a task and returns a future for its result, running at most `concurrency` tasks at once in FIFO order on threads you create; `void onIdle()` blocks the calling thread until every added task has settled. A task that throws completes its own future exceptionally and must not stop the queue.',
      'The `queueDemo` driver adds tasks that sleep then return or throw, calls `onIdle()`, then reads each future with `get()`, turning an `ExecutionException` into `"error:" + cause.getMessage()`; it also records peak concurrency. `onIdle` with nothing queued must return at once. No busy-waiting: block on a monitor, a `Condition` or a latch.',
    ],
    hints: [
      'An `ArrayDeque<Runnable>` of pending jobs and an `int active` under one lock; a `startLocked()` helper starts jobs while `active < concurrency && !pending.isEmpty()`.',
      'Each job wraps the `Callable`: `future.complete(task.call())` in `try`, `future.completeExceptionally(e)` in `catch`, and in `finally` decrement `active`, start the next job and `notifyAll()`.',
      '`onIdle` is `synchronized` and loops `while (active > 0 || !pending.isEmpty()) wait();` so a spurious wakeup is harmless.',
      'Alternatively hand the running to a fixed `ExecutorService` of `concurrency` threads and keep only the futures and the idle bookkeeping yourself.',
    ],
    nuances: [
      'The port starts a daemon `Thread` per task: simple, nothing to shut down, but a thread per task is what pools exist to avoid. `Executors.newFixedThreadPool(concurrency)` gives the limit and FIFO for free, at the price of an owner who must call `shutdown`.',
      'Complete the future from the worker: `completeExceptionally(e)` carries the task\'s own exception, and `get()` rethrows it inside `ExecutionException` (`join()` would use `CompletionException`). The driver unwraps `getCause()`, so do not wrap it a second time.',
      '`wait()` belongs in a `while` loop re-checking the condition, under the same monitor `notifyAll()` uses; a bare `if` misses spurious wakeups and the notify-before-wait race. `ReentrantLock` with a `Condition`, or a `Phaser`, say the same thing with clearer ownership.',
      'Decrement `active` and start the next job in `finally`, so a task that throws or is interrupted does not leak a slot and wedge `onIdle` forever.',
      '`Callable` throws checked exceptions and `Runnable` cannot; the wrapping lambda is where that boundary lives. If the task is interrupted (`Thread.sleep` in the driver), the `InterruptedException` is its result; restore the flag if you convert it.',
      'Define `onIdle` under arrivals: it returns at the first moment nothing is running or queued, not when every task that will ever be added has finished. That is the contract the driver relies on.',
    ],
  },
  'deep-clone': {
    description: [
      'Write `Solution.deepClone(Object value)`: copy `Map`s, `List`s, `Set`s and `Date`s recursively, preserving shared references (two fields pointing at one map still point at one map in the copy) and handling cycles, so a cloned cycle points at the clone, not the original. Other values (`Integer`, `String`, `Boolean`, `null`) are returned as they are.',
      'The `check` driver builds a map with a self-reference, a shared sub-map, a `Date` and a `LinkedHashSet` holding a mutable list, clones it, mutates the copy, and verifies independence, the cycle\'s identity (`b.get("self") == b`) and that the set element was copied too.',
    ],
    examples: [
      { input: 'a = {x=[1, {y=2}]}; b = deepClone(a); mutate b.x[1].y to 3', output: 'a.x[1].y is still 2' },
      { input: 'a.put("self", a); b = deepClone(a)', output: 'b.get("self") == b' },
    ],
    hints: [
      'An `IdentityHashMap<Object, Object>` from original to clone, consulted before copying and filled before recursing into children, solves shared references and cycles at once.',
      'Register the new container in the map immediately after creating it, before copying its children; that is what lets the cycle close on the clone.',
      'Dispatch with `instanceof` on `Date`, `List`, `Set`, `Map` before falling through to "return as is".',
    ],
    nuances: [
      '`IdentityHashMap`, not `HashMap`: a `HashMap` keyed by the originals would call `hashCode` on a map that contains itself (stack overflow) and would merge two distinct but equal lists into one clone. Identity is the point.',
      'Returning `Object` is forced by erasure: a `<T> T deepClone(T value)` signature needs an unchecked cast at every container and the caller still casts the result, as the driver does.',
      '`Integer`, `String` and `Boolean` are immutable, so sharing them is a correct copy; `java.util.Date` is mutable and must be copied with `new Date(d.getTime())`, which is why the driver checks `b.get("d") != a.get("d")`. An `Instant` would need no copy.',
      'Choose concrete types deliberately: `LinkedHashMap`, `LinkedHashSet` and `ArrayList` preserve order. The collections\' `clone()` is shallow and `Cloneable` is broken by design; do not reach for either.',
      'A mutable set element whose `hashCode` changes after insertion becomes unfindable; the driver\'s set of lists is a reminder that mutable set elements are a smell even when the copy is correct.',
      'Cycles are not the only recursion hazard: a deep acyclic structure overflows the stack; an iterative version with an explicit work stack is the follow-up.',
    ],
  },
  'group-by': {
    description: [
      'Write `Solution.groupBy(List<T> items, Function<T, K> keyFn)` returning a `Map<K, List<T>>` from key to the items with that key, preserving the order in which keys first appear and the order of items within a group. Then use it for `topPerCategory(List<Order> orders)`: a `Map<String, String>` from category to the `id` of the order with the highest `total`.',
      '`Order` is a plain class with package-private `id`, `category` and `total` fields and a no-argument constructor so the test harness can build it from JSON. The `groupByParity` driver groups integers into `"odd"` and `"even"` through your `groupBy`.',
    ],
    examples: [
      { input: 'groupBy(List.of(1, 2, 3, 4), n -> n % 2 != 0 ? "odd" : "even")', output: '{odd=[1, 3], even=[2, 4]}' },
      { input: 'topPerCategory of orders a (x, 5.0), b (x, 9.0), c (y, 1.0)', output: '{x=b, y=c}' },
    ],
    hints: [
      'A loop with `out.computeIfAbsent(keyFn.apply(item), k -> new ArrayList<>()).add(item)` over a `LinkedHashMap`.',
      'Or streams: `items.stream().collect(Collectors.groupingBy(keyFn, LinkedHashMap::new, Collectors.toList()))`; the three-argument form is the one that keeps order.',
      'For the top order per category, `Collectors.maxBy(Comparator.comparingDouble(o -> o.total))` as the downstream collector, or a plain loop over each group.',
    ],
    nuances: [
      'The `Map<K, List<T>>` return type leaves the implementation free, but callers see iteration order: `Collectors.groupingBy(keyFn)` returns a `HashMap` in arbitrary order, so pass `LinkedHashMap::new` explicitly when order is part of the contract, as it is here.',
      '`groupingBy` throws `NullPointerException` on a `null` key; `computeIfAbsent` on a `LinkedHashMap` accepts one. Decide which behaviour the API promises.',
      '`Order.total` is a primitive `double`: compare with `Comparator.comparingDouble` or `Double.compare`, not `==` and not `Comparator.comparing(o -> o.total)`, which boxes a `Double` per comparison.',
      'Ties: a loop that replaces only on `>` keeps the first order with the maximum; `maxBy` keeps the last among equals. Say which you mean; `maxBy` also hands you an `Optional<Order>` for the impossible empty group.',
      'In your own code `Order` would be a `record Order(String id, String category, double total)`; the port uses a mutable class only because the harness fills it reflectively. Records give `equals`/`hashCode` and are safe to share across threads.',
    ],
  },
  'parse-query-string': {
    description: [
      'Write `Solution.parseQuery(String qs)` turning a query string, with or without a leading `?`, into a `Map<String, Object>` whose values are a `String`, or a `List<String>` once a key repeats. `+` means space, percent-encoding is decoded, a key without `=` gets an empty string, and only the first `=` splits key from value.',
      'The tests expect `{a=[1, 3], b=two words, c=}` for `?a=1&b=two%20words&a=3&c`, `{q=a b, eq=x=y}` for `q=a+b&eq=x=y`, and an empty map for the empty string. `java.net.URLDecoder` and `StandardCharsets` are imported for you.',
    ],
    examples: [
      { input: 'parseQuery("?a=1&b=two%20words&a=3&c")', output: '{a=[1, 3], b=two words, c=}' },
      { input: 'parseQuery("q=a+b&eq=x=y")', output: '{q=a b, eq=x=y}' },
    ],
    hints: [
      'Strip the `?`, return early on an empty body, `split("&")`, skip empty parts, and cut each part at `indexOf(\'=\')`.',
      '`URLDecoder.decode(s, StandardCharsets.UTF_8)` turns `+` into a space and decodes `%xx`; it throws `IllegalArgumentException` on a malformed sequence, so decide whether to keep the raw text.',
      'Pattern matching on the existing value (`prev instanceof List<?> list`) tells you whether to append or to promote a single `String` to a two-element `ArrayList`.',
    ],
    nuances: [
      '`Map<String, Object>` is a union by other means: every caller must `instanceof` each value. A `Map<String, List<String>>` with single-element lists is the type-safe design most Java HTTP libraries choose; the port keeps this shape so the shared tests compare equal.',
      '`URLDecoder` is specified for `application/x-www-form-urlencoded`, so `+` to space is right here and wrong for path segments. Use the `Charset` overload: the `String` charset-name overload throws a checked `UnsupportedEncodingException`, and the no-charset one is deprecated.',
      '`String.split` takes a regex and drops trailing empty strings: `"a&&b"` yields an empty part to skip, and `split("&", -1)` keeps them if you ever need the count. Splitting on `=` would also cut inside the value; use the first index instead.',
      'Promote to a mutable `ArrayList`, not `List.of(prev, value)`: a third repeat must `add` to it, and `List.of` throws `UnsupportedOperationException`.',
      'Split the raw text first and decode the pieces, so a value containing `%26` (an encoded `&`) survives.',
      '`LinkedHashMap` preserves the order keys first appeared, which is what anyone printing or round-tripping a query string expects.',
    ],
  },
  'lfu-cache': {
    description: [
      'Implement `LFUCache(int capacity)` over `int` keys and values: `int get(int key)` returns the value or `-1`; `void set(int key, int value)` inserts or updates, and when over capacity evicts the least frequently used key, breaking ties by least recently used. Both operations are O(1).',
      'The `runLfu` driver replays operations into `Integer[]` results (`null` for each `set`); one test uses capacity `0`, where `set` stores nothing and `get` returns `-1`. Single-threaded.',
    ],
    hints: [
      'Two maps: `Map<Integer, Entry>` from key to `{value, freq}`, and `Map<Integer, LinkedHashSet<Integer>>` from frequency to the keys at that frequency in recency order (oldest first), plus an `int minFreq`.',
      'On any access move the key from bucket `f` to `f + 1`; if bucket `minFreq` became empty, `minFreq++`. On inserting a new key, evict `buckets.get(minFreq).iterator().next()` first if full, then `minFreq = 1`.',
      'A small mutable class or an `int[2]` for the entry avoids re-putting into the map on every frequency bump.',
    ],
    nuances: [
      '`LinkedHashSet` is the structure that gives O(1) add, O(1) remove by key and O(1) oldest element (`iterator().next()`); a `TreeMap` or a sort by frequency is O(log n) and loses the recency tie-break.',
      'The signature is primitive `int`, so there is no `null` for a miss: `-1` is the sentinel the driver expects, and it means `-1` can never be a stored value. A generic `LFUCache<K, V>` would return `null` or `Optional<V>` instead.',
      'Boxing happens wherever a `Map<Integer, ...>` meets an `int`: every `get`/`set` allocates or hits the `Integer` cache. Name primitive collections (Eclipse Collections, fastutil) as the fix if this were hot.',
      'Updating the entry in place (`e[1]++` on an `int[]`, or a mutable field) keeps the map stable; `Integer` keys are immutable, so there is no `equals`/`hashCode` hazard. Remove a bucket when it empties, or the bucket map grows without bound.',
      'Guard capacity `0` first in `set`; otherwise the eviction looks up `buckets.get(minFreq)` on an empty map and throws `NullPointerException`.',
      'Thread-safety is not asked for and would need one lock around both maps and `minFreq`; no combination of concurrent collections keeps a multi-structure invariant atomic.',
    ],
  },
  'circular-buffer': {
    description: [
      'Implement `RingBuffer<T>(int capacity)`: `T push(T item)` appends, and when the buffer is full overwrites the oldest item and returns it (else returns `null`); `T shift()` removes and returns the oldest (`null` when empty); `List<T> toList()` lists oldest to newest; `int size()` is the count.',
      'The `ringDemo` driver records the result of each `push`, `shift`, `toArray` (your `toList`) and `size` step; `null` is the expected result of a push that evicted nothing and of a shift on an empty buffer.',
    ],
    examples: [
      { input: 'b = new RingBuffer<>(3); b.push(1); b.push(2); b.push(3); b.push(4)', output: 'push(4) returns 1; toList() is [2, 3, 4]; size() is 3' },
      { input: 'b = new RingBuffer<>(2); b.push("a"); b.push("b"); b.shift(); b.push("c")', output: 'shift() returned "a"; toList() is [b, c]' },
    ],
    hints: [
      'A fixed `Object[] items` with `int start` and `int count`; the write index is `(start + count) % capacity`.',
      'A full push writes at `start` then advances `start`; a shift reads at `start`, clears the slot, advances `start`, decrements `count`.',
      'Where it shows up: bounded logs, metrics windows, the array behind `ArrayBlockingQueue`.',
    ],
    nuances: [
      'Generic arrays do not exist: `new T[capacity]` does not compile because of erasure. Allocate `Object[]` and cast on read under `@SuppressWarnings("unchecked")`, or go through `Array.newInstance` with a `Class<T>` token; `Object[]` is what `ArrayList` itself does.',
      'Null out the slot in `shift`: the array otherwise keeps a strong reference to the removed item until it is overwritten, a memory leak for a buffer that drains and then sits idle.',
      '`null` as "nothing evicted" is ambiguous once `T` items may be `null`; `Optional<T>`, or a `boolean` plus an out-parameter, are the alternatives, and the driver expects plain `null`.',
      'Index arithmetic: with a power-of-two capacity, `& (capacity - 1)` replaces `%`; `%` of a negative index is negative in Java, so never let `start` go below zero.',
      'As written this is a single-threaded structure. A lock-free single-producer, single-consumer ring needs `volatile` (or `VarHandle` acquire/release) head and tail indices; many producers and consumers want `ArrayBlockingQueue`. Say which the interviewer means.',
      'Capacity `0` makes every `% capacity` an `ArithmeticException`; reject it in the constructor.',
    ],
  },
  'semver-compare': {
    description: [
      'Write `Solution.compareVersions(String a, String b)` returning `-1`, `0` or `1` for versions like `"1.2.10"` and `"1.2.9"`. Missing trailing parts count as `0` (`"1.0"` equals `"1.0.0"`), and a pre-release suffix (`"1.0.0-beta"`) sorts before the release.',
    ],
    hints: [
      'Split off the pre-release with `split("-", 2)`, then the numbers with `split("\\\\.")` (the dot is a regex metacharacter), and compare `Integer.parseInt` values position by position, padding with `0`.',
      'Return exactly `-1`, `0` or `1`: `Integer.compare` only promises negative, zero or positive, so clamp with `Integer.signum` or branch yourself.',
      'A `record Version(int[] nums, String pre) implements Comparable<Version>`, or a `Comparator<String>` built with `comparing`/`thenComparing`, is the reusable form.',
    ],
    nuances: [
      '`String.split` takes a regular expression: `split(".")` matches every character and returns an empty array, the single most common bug in this problem. Escape it (`"\\\\."`) or use `Pattern.quote(".")`.',
      '`String.compareTo` compares UTF-16 code units, so `"10".compareTo("9")` is negative: parse to `int` first. `Integer.parseInt` throws an unchecked `NumberFormatException` on a non-numeric part such as `"beta.2"`; decide whether to catch it or let garbage fail loudly.',
      '`Objects.equals(preA, preB)` handles the two-null case; `preA.equals(preB)` on a `null` throws. A `null` pre-release (the release itself) sorts after any pre-release string.',
      'Keep the comparator honest: antisymmetric and transitive, or `TreeMap` and `sort` misbehave; the `-1/0/1` clamp preserves that while matching the documented contract.',
      'Full SemVer compares pre-release identifiers dot by dot, numerically when both are numeric; plain `compareTo` on the whole suffix is what the tests need, and you should say it is a simplification.',
    ],
  },
  'resolve-dependencies': {
    description: [
      'Write `Solution.installOrder(Map<String, List<String>> deps)` where `deps` maps a package to the packages it depends on (which may not appear as keys themselves). Return an install order in which every package comes after its dependencies, preferring alphabetical order when there is a choice. On a cycle, throw a `RuntimeException` whose message starts with `"cycle"`, ideally `"cycle: a -> b -> a"`.',
      'The `installOrderOrError` driver catches `RuntimeException` and returns its message, so the exception must be unchecked and the message exact.',
    ],
    examples: [
      { input: 'installOrder(Map.of("app", List.of("lib", "util"), "lib", List.of("util"), "util", List.of()))', output: '[util, lib, app]' },
      { input: 'installOrder(Map.of("a", List.of("b"), "b", List.of("a")))', output: 'throws RuntimeException("cycle: a -> b -> a")' },
    ],
    hints: [
      'Kahn\'s algorithm: in-degree per node (`Map<String, Integer>` with `merge`), a reverse map from a dependency to its dependents, and a `PriorityQueue<String>` as the ready set so ties resolve alphabetically.',
      'Collect the node set from both keys and values first; a dependency that is never a key still needs an entry, or `indeg.get` returns `null` and unboxing throws `NullPointerException`.',
      'Output shorter than the node set means a cycle; a DFS with white/grey/black states over a sorted node list finds the actual path for the message.',
    ],
    nuances: [
      'The driver catches `RuntimeException`: a checked `CycleException extends Exception` would not compile against the signature, and a message is what the shared tests can compare. In your own code a dedicated unchecked exception carrying the cycle as a `List<String>` beats parsing a message.',
      '`PriorityQueue<String>` gives the alphabetical tie-break in O(log n) per operation; re-sorting an `ArrayList` after every insertion is O(n log n) per step. A `TreeSet` works too and deduplicates.',
      'In-degrees in a `Map<String, Integer>` are boxed: `indeg.get(n) == 0` unboxes and is fine, but `indeg.get(a) == indeg.get(b)` compares references and lies above 127. `merge(k, -1, Integer::sum)` returns the new value and saves a second lookup.',
      'Iteration over a `HashMap` of deps is in arbitrary order, so which cycle you find first, and therefore the message, depends on it unless you walk a sorted view (`TreeSet`); the test expects the cycle starting at `a`.',
      'Recursive DFS on a large graph can overflow the thread stack (around 512 KB to 1 MB by default); an explicit `ArrayDeque` is the production version.',
    ],
  },
  'match-route': {
    description: [
      'Write `Solution.matchRoute(String pattern, String path)`. The pattern has literal segments, `:param` segments and an optional trailing `*` wildcard. On a match return `Map.of("params", params)` where `params` is a `Map<String, String>` of captured values (the wildcard\'s remainder under `"*"`); return `null` when the path does not match. Literal segments must match exactly, extra path segments fail, and a trailing slash is ignored.',
      'The return type `Map<String, Map<String, String>>` mirrors the `{ params }` shape the shared tests compare against; `java.net.URLDecoder` is imported for decoding captured segments.',
    ],
    examples: [
      { input: 'matchRoute("/users/:id/posts/:postId", "/users/42/posts/7")', output: '{params={id=42, postId=7}}' },
      { input: 'matchRoute("/files/*", "/files/a/b.txt")', output: '{params={*=a/b.txt}}' },
      { input: 'matchRoute("/users/:id", "/users/42/extra")', output: 'null' },
    ],
    hints: [
      'Split both strings on `/` and drop empty segments (that handles leading and trailing slashes), then walk the two lists in lockstep.',
      'A `*` counts as the wildcard only in the last pattern position; join the remaining path segments with `String.join("/", ...)`.',
      'Build `params` as a `LinkedHashMap`, and only after the walk succeeds (including `xs.size() == ps.size()`) wrap it in `Map.of("params", params)`.',
    ],
    nuances: [
      '`URLDecoder` is for form encoding and turns `+` into a space, which is wrong in a path segment where `+` is literal. The port re-encodes `+` as `%2B` before decoding; the honest alternatives are `java.net.URI` or a hand-written percent decoder. Know which decoder belongs to which part of a URL.',
      '`null` for "no match" is what the tests expect; in your own API return `Optional<Map<String, String>>` or a small `record Match(Map<String, String> params)` so callers cannot forget the miss. The nested map exists only to compare equal with the shared tests.',
      '`Map.of` is immutable and rejects `null` keys and values: accumulate `params` in a `LinkedHashMap` while matching and wrap at the end. `Map.of` also iterates in an unspecified order, which matters when you print it.',
      '`String.split("/")` drops trailing empty strings but keeps the leading one for `"/a"`, hence the filter; a `Pattern` compiled once avoids re-parsing the regex per call if routing is hot.',
      'Literal segments compare with `equals`, never `==`; interned literals in a test would make `==` pass by accident and fail in production.',
    ],
  },
  'set-in-immutable': {
    description: [
      'Write `Solution.setIn(Object obj, List<Object> path, Object value)`: return a new structure with the value at `path` replaced, without mutating the input. Path keys are `String`s for maps and `Integer`s for lists. Only the containers along the path are copied; untouched branches are shared by reference. Missing intermediates are created, as a list when the next key is an `Integer`, else as a map.',
      'The `check` driver verifies the new value, that the original is unchanged, that an untouched sibling is the same object (`out.get("c") == c`), and that setting `["list", 1]` copies the list but shares `a`.',
    ],
    examples: [
      { input: 'setIn(input = {a={b=1}, c={d=2}}, List.of("a", "b"), 9)', output: '{a={b=9}, c={d=2}}', note: 'result.get("c") is the same object as input.get("c").' },
      { input: 'setIn(new HashMap<>(), List.of("xs", 0), "a")', output: '{xs=[a]}' },
    ],
    hints: [
      'Recurse on `path`: copy the current container (`new LinkedHashMap<>(map)` or `new ArrayList<>(list)`), replace one key with the recursive result on the existing child (or a fresh container), return the copy.',
      '`path.subList(1, path.size())` is a view, not a copy, and costs nothing per level.',
      'Dispatch with pattern matching on `Map<?, ?>` and `List<?>`; a list index past the end needs padding with `null` before `set`.',
    ],
    nuances: [
      'Structural sharing is the point: each copy is shallow, so the driver\'s `out.get("c") == c` identity check passes and the allocation is O(depth), not O(size). A deep copy would be correct and defeat the purpose.',
      '`Map.copyOf`/`List.copyOf` give immutable copies but reject `null` values and cannot be edited before you return them; copy into a mutable `LinkedHashMap`/`ArrayList`, set the one key, and optionally wrap in `Collections.unmodifiableMap` on the way out.',
      '`(Integer) head` is a runtime cast; with pattern matching (`head instanceof Integer i`) a bad path becomes a readable `IllegalArgumentException` you throw, instead of a `ClassCastException` from deep in the recursion.',
      'The current node may be `null` or a scalar when the path crosses a missing intermediate: `instanceof` is simply `false` on `null`, so the fallthrough must create the right container type rather than cast and throw.',
      'Persistent collections (Vavr, PCollections) make this O(log n) with real immutability guarantees; the hand-rolled version is what a reducer does by hand and what you write without a dependency.',
    ],
  },
  'with-timeout-abort': {
    description: [
      'Implement two static methods on `Timeouts`. `void sleep(long ms, CancelToken token)` waits `ms` milliseconds, or throws an exception with message `"aborted"` as soon as the token is cancelled; a `null` token means a plain sleep. `<T> T withTimeout(Function<CancelToken, T> run, long ms)` runs `run` with a fresh token on another thread; if it has not finished within `ms`, cancel the token and throw an exception with message `"timeout"`. Either way nothing is left running or holding a thread afterwards.',
      'The `CancelToken` class is given: `isCancelled()`, `cancel()` (which wakes waiters) and a timed blocking wait that returns `true` once cancelled. The `timeoutDemo` driver expects `["timeout", "aborted"]` when the limit wins (the inner sleep saw the cancellation) and `["ok", null]` when the run finishes in time; `sleepAtLeast` checks that a plain sleep really waits.',
    ],
    examples: [
      { input: 'withTimeout(token -> { Timeouts.sleep(1000, token); return 1; }, 20)', output: 'throws "timeout" after about 20 ms; the inner sleep threw "aborted"' },
      { input: 'withTimeout(token -> 1, 50)', output: '1, without waiting 50 ms' },
    ],
    hints: [
      '`sleep`: throw at once if the token is already cancelled; otherwise the token\'s timed wait blocks until cancellation or the deadline, and its boolean tells you which happened.',
      '`withTimeout`: submit `() -> run.apply(token)` to a single-thread executor and call `future.get(ms, TimeUnit.MILLISECONDS)`; catch `TimeoutException` to cancel the token and throw, `ExecutionException` to unwrap and rethrow the cause.',
      '`finally { executor.shutdownNow(); }` so the thread is released whether the run completed, failed or timed out.',
      'Without your own executor: `CompletableFuture.supplyAsync(...).orTimeout(ms, MILLISECONDS)` plus a `whenComplete` that cancels the token.',
    ],
    nuances: [
      '`CancelToken` is a cooperative flag built on `synchronized`/`wait`/`notifyAll`: the running code must check it or wait on it. The built-in alternative is interruption (`future.cancel(true)`), which `Thread.sleep` and blocking I/O honour but a CPU loop does not; real libraries end up with both.',
      'The token\'s timed wait loops on `System.nanoTime()` and re-checks the flag after every `wait`, because `Object.wait(ms)` may wake spuriously and `currentTimeMillis` may jump. Any hand-written timed wait needs that loop.',
      'The result of a timed-out run is `"timeout"`, not whatever the callee eventually throws. The port waits for the callee after cancelling so nothing is left running; that blocks forever if the callee ignores the token, so a bounded grace period or `cancel(true)` is the production choice.',
      '`Future.get` wraps the callee\'s exception in `ExecutionException`; unwrap `getCause()` and rethrow so the caller sees the real one. The driver\'s run wraps `"aborted"` in a `RuntimeException`, and that inner message is deliberately not the result.',
      'Executor lifecycle: a `newSingleThreadExecutor` per call is wasteful but self-contained; `shutdownNow` in `finally` interrupts a straggler and lets a non-daemon thread die. A shared pool cannot clean up its thread on timeout, only cancel the future.',
      '`Function<CancelToken, T>` cannot throw checked exceptions, so the callee wraps `sleep`\'s exception in `RuntimeException`; `Callable`-style `throws Exception` would have been the Java-native shape and would let `withTimeout` rethrow checked exceptions unchanged.',
    ],
  },
}
