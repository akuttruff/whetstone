import type { PortNotes } from './notes.ts'

/**
 * The Ruby telling of the practical problems: the statement against the Ruby
 * API in the port, hints in Ruby idiom, and what a strong Ruby answer gets
 * right that a transliteration from another language misses.
 */
export const RUBY_PRACTICAL_NOTES: Record<string, PortNotes> = {
  'lru-cache': {
    description: [
      'Implement `LRUCache` with `LRUCache.new(capacity)`, `get(key)` returning the value or `nil` and marking the key most recently used, and `set(key, value)` inserting or updating and evicting the least recently used entry once the cache is over capacity.',
      'Both operations must be O(1), including the eviction. The `run_lru` driver replays `["set", k, v]` and `["get", k]` operations and collects what `get` returns (`nil` for a `set`); leave it as is. A single-threaded cache is fine here, but say what you would add if several threads shared it.',
    ],
    examples: [
      { input: 'c = LRUCache.new(2); c.set(1, 1); c.set(2, 2); c.get(1); c.set(3, 3); c.get(2); c.get(3)', output: '1, nil, 3', note: 'Reading 1 made 2 the least recently used, so inserting 3 evicted 2.' },
    ],
    hints: [
      'A Ruby `Hash` keeps insertion order, and `delete` followed by `[]=` moves a key to the end. That is the recency list.',
      'The oldest key is the first one: `@items.first` or `@items.each_key.first` reads it without building an array; `Hash#shift` removes and returns it.',
      'Be ready to explain the version without ordered hashes: a hash from key to node plus a doubly linked list.',
    ],
    nuances: [
      '`Hash` has been insertion-ordered since 1.9, so delete-and-reinsert is the whole trick; name that this is a language guarantee, not an implementation accident.',
      '`@items.keys.first` allocates an array of every key, which makes eviction O(n). `@items.first[0]`, `@items.each_key.first` or `@items.shift` are O(1).',
      '`nil` is the absent value, so a stored `nil` is indistinguishable from a miss through `get`. Check presence with `key?` inside, and say whether `nil` values are allowed.',
      'Hash lookup uses `eql?` and `hash`: `1` and `1.0` are different keys, a String key is duplicated and frozen on insert, and a mutable Array key that is mutated afterwards is lost until `rehash`.',
      'The GVL does not make `get` atomic: it is several Ruby operations and a thread switch can land between them. Shared across threads, wrap both methods in one `Mutex#synchronize`, and remember `Mutex` is not reentrant.',
    ],
  },
  'promise-pool': {
    description: [
      'Write `map_with_concurrency(items, limit, &fn)`: call the block with `(item, index)` for every item, with at most `limit` calls running at once on threads, and return the results in the original order. If any call raises, raise that error, but only after every worker thread has been joined so nothing is left running.',
      'The `pool_demo` driver passes a lambda with two parameters that sleeps, records peak concurrency under its own `Mutex`, and raises "boom" for one item; it returns `[results, peak, error_message]`. Running everything serially or spawning a thread per item both miss the point.',
    ],
    examples: [
      { input: 'map_with_concurrency([1, 2, 3, 4], 2) { |x, _i| x * 2 }', output: '[2, 4, 6, 8]' },
      { input: 'limit 2, five slow items', output: 'at most 2 blocks ever run at the same time' },
    ],
    hints: [
      'Start `[limit, items.length].min` worker threads. Each loops: claim the next index, run the block, store the result at that index, until the indices run out.',
      'The shared index needs a `Mutex`; a `Queue` of indices (`q.close`, then `while (i = q.pop)`) gives you the claiming for free.',
      '`workers.each(&:join)` before returning. Capture any error inside the worker and raise it after the joins.',
      'Edge cases: an empty array (no threads), a limit above the item count, a limit of 0 or less.',
    ],
    nuances: [
      'The GVL does not protect compound operations: `next_index += 1` is a read, an add and a write, and a thread switch can land between them. The counter needs the `Mutex` or a `Queue`; writing `results[i]` from each thread is a single C call and is safe in practice.',
      'An exception escaping a thread kills only that thread, and `Thread#join` re-raises it in the joiner, which would skip joining the rest. Rescue inside the worker, join everything, then `raise` the saved error object so its backtrace survives.',
      'The driver\'s `fn` is a lambda with two parameters, and lambdas have strict arity: `fn.call(items[i])` raises `ArgumentError`. Always pass `(item, index)`.',
      'Threads help here because the work sleeps or waits on I/O, which releases the GVL. For CPU-bound blocks threads would not speed anything up; name processes, `Ractor` or the Fiber scheduler as what would.',
      'Set `Thread.report_on_exception = false` on workers whose errors you handle, or every failure also prints a backtrace to stderr. Never `Thread#kill` the remaining workers on failure; let them finish their current item and stop.',
    ],
  },
  'debounce': {
    description: [
      'Implement `Debounced`: `Debounced.new(wait_ms, &fn)` wraps a block, `call(*args)` runs it only after `wait_ms` milliseconds have passed without another call, with the last call\'s arguments, and `cancel` drops a pending call. `debounce(wait_ms, &fn)` builds one.',
      'The `debounce_demo` driver replays `["call", x]`, `["sleep", ms]` and `["cancel"]` steps against a recorder block and returns what got through. The block will run on a thread you create, so say which thread calls it and what that means for the caller\'s data. No busy loops.',
    ],
    examples: [
      { input: 'd = debounce(100) { |x| log(x) }; d.call(1); d.call(2); d.call(3); sleep 0.15', output: 'log(3) called once' },
      { input: 'd.call(1); d.cancel; sleep 0.15', output: 'log never called' },
    ],
    hints: [
      'There is no timer primitive; a `Thread` that sleeps then fires is the timer. Keep the state (`@mutex`, what is pending) in the instance.',
      'A generation counter beats cancelling threads: each `call` bumps it, the sleeper fires only if its generation is still current, and `cancel` just bumps it.',
      'The alternative is one long-lived timer thread waiting on a `ConditionVariable` with a timeout, re-armed by each call.',
      'Know the difference from throttle: throttle guarantees a call at most once per interval even if calls keep coming.',
    ],
    nuances: [
      'The debounced block runs on the timer thread, not the caller\'s. The driver\'s `calls << x` is a single C call and fine under the GVL, but a block that touches richer shared state needs the caller\'s lock.',
      '`@generation += 1` read from two threads is a compound operation; the `Mutex` around both the bump and the comparison is what makes "only the latest fires" true.',
      'The port leaves stale sleeper threads to wake and do nothing rather than `Thread#kill` them. Killing a thread that only sleeps is safe, but say why (it holds no lock, runs no `ensure`); a single re-armed timer thread avoids the question and the thread churn.',
      '`sleep` takes seconds as a Float: `wait_ms / 1000.0`, never `wait_ms / 1000`, which is Integer division and sleeps 0 for anything under a second.',
      'The block is a proc, so `@fn.call(*args)` is arity-lenient, and a `return` inside it would be a `LocalJumpError`; a lambda would be strict and `return` cleanly. Say which you expect.',
    ],
  },
  'retry-with-backoff': {
    description: [
      'Write `with_retry(retries:, base_ms:, should_retry: nil) { ... }`: run the block, and when it raises wait `base_ms * 2**attempt` milliseconds before trying again, up to `retries` more times. Return the first successful value; after the last failure, raise the last error. `should_retry` is an optional lambda from error to boolean so non-transient errors fail fast.',
      'The `retry_demo` driver passes a block that fails a given number of times with "down <n>" (or always with "fatal", which its `should_retry` refuses) and returns `[result, calls, error_message]`. Keyword arguments and `yield` are the API; keep them.',
    ],
    hints: [
      '`(0..retries).each do |attempt|` with `begin`/`rescue => e` inside is clearer than recursion or the `retry` keyword.',
      '`return yield` inside the block returns from `with_retry` itself, which is the block semantics you want here.',
      'Compute the delay from the attempt number and `sleep(ms / 1000.0)`; add jitter (`rand`) in real systems so clients do not synchronise.',
      'Raise the saved error object, not a new "gave up" error.',
    ],
    nuances: [
      '`rescue => e` catches `StandardError` only, which is right: `Interrupt`, `NoMemoryError` and `SystemExit` must not be retried. Never `rescue Exception`.',
      'Ruby has a `retry` keyword that re-runs the `begin` block from a `rescue`; it is idiomatic but unbounded unless you count attempts yourself, so the explicit loop is the safer interview answer.',
      '`base_ms * 2**attempt / 1000` is Integer division: with `base_ms` 1 it sleeps zero and the tests still pass, which is how a backoff that never backs off ships. Divide by `1000.0`.',
      '`raise last_error` re-raises the same object with its original backtrace; a bare `raise` in the rescue re-raises `$!`. Wrapping in a new error would set `cause` automatically, which is the right move only if you add information.',
      '`should_retry` is a lambda, so call it with `.call(e)`; a block parameter for it would be lenient on arity but could not also be the block being retried. `sleep` releases the GVL, so other threads run during the wait.',
    ],
  },
  'event-emitter': {
    description: [
      'Implement `Emitter`: `on(name) { |payload| ... }` registers a handler and returns a lambda that unsubscribes it; `once(name) { ... }` runs the handler one time; `emit(name, payload)` calls every current handler in registration order, and emitting a name nobody listens to is a no-op.',
      'A handler that unsubscribes during `emit` must not break iteration of the others. The `emitter_demo` driver replays `["on"|"once", name, spec]`, `["emit", name, payload]` and `["off", n]` steps, calling the n-th returned lambda to unsubscribe, and returns what the handlers recorded.',
    ],
    examples: [
      { input: 'off = e.on("x") { |v| seen << v }; e.once("x") { |v| seen << v * 10 }; e.emit("x", 1); e.emit("x", 2); off.call', output: 'seen == [1, 10, 2]' },
    ],
    hints: [
      '`Hash.new { |h, k| h[k] = [] }` maps each name to its handlers in order; the handler is the block captured with `&handler`.',
      'Iterate a copy (`@handlers[name].dup.each`) so a handler may unsubscribe mid-emit.',
      '`once` wraps the block in a new one that unsubscribes itself then delegates; the `off` local must be assigned before the wrapper runs, so declare it first.',
      'The returned unsubscriber is a lambda (`-> { ... }`) so the caller can `.call` it like any other.',
    ],
    nuances: [
      'Handlers are Procs captured by `&handler`, and `Array#delete` removes every element `==` to its argument, so registering one proc twice and unsubscribing once removes both. Unsubscribe by identity (`delete_if { |h| h.equal?(handler) }`) or hand out a token.',
      'A default-proc `Hash` creates an entry on every read, so `emit` for an unknown name grows the hash; read with `fetch(name, [])` or `@handlers[name]` only where creating is intended.',
      'Closures capture variables by reference: in `once`, `off = nil; off = on(name) { off.call; ... }` works because the block sees the later assignment. Written as `off = on(name) { off.call }` in one expression it raises `NoMethodError` on `nil`.',
      'Blocks and procs are lenient about arity, so a handler `{ |p| }` and one with none both work; `return` inside a handler block would exit the method that defined it. Lambdas would be strict and safe to `return` from.',
      'Nothing here is thread-safe: `on` during `emit` from another thread can race the `dup`. Say that a `Mutex` around registration and the copy is enough, and that handlers must run outside it (`Mutex` is not reentrant, and a handler may call `on`).',
    ],
  },
  'token-bucket': {
    description: [
      'Implement `TokenBucket.new(capacity, refill_per_second, now)` where `now` is a lambda returning milliseconds (defaulting to the monotonic clock). `try_remove(n = 1)` returns `true` and removes `n` tokens if available, else `false`. Tokens refill continuously at `refill_per_second`, never exceeding `capacity`.',
      'Refill lazily from the injected clock rather than with a timer thread. The `bucket_demo` driver injects `-> { t }` and moves `t` with `["at", ms]` steps between `["take", n]` calls, so the clock must be read through `@now.call` on every call.',
    ],
    hints: [
      'Keep `@tokens` as a Float and `@last_ms`. On every call: `@tokens = [@capacity, @tokens + elapsed_seconds * rate].min`, then check and subtract.',
      'Fractional tokens matter: at 1/s, 500ms later you have 0.5 tokens and a request still fails.',
      '`Process.clock_gettime(Process::CLOCK_MONOTONIC, :millisecond)` gives integer milliseconds directly; the default lambda is the only place the real clock appears.',
      'Compare with a sliding window log or a fixed window counter and say when each fits.',
    ],
    nuances: [
      '`(t - @last_ms) / 1000` is Integer division and throws away the fraction the problem is about; use `/ 1000.0` or `fdiv`, and start `@tokens` as `capacity.to_f`.',
      'The injected clock is a lambda: `@now.call` (or `@now.()`), not `@now`, which is just the object. Reading the clock once per call keeps the arithmetic consistent.',
      'Default to `Process.clock_gettime(Process::CLOCK_MONOTONIC)`, never `Time.now`: wall time jumps with NTP and daylight changes, and a backwards jump would mint tokens. Clamp a negative elapsed time to zero anyway.',
      '`try_remove` is check-then-act, and the GVL does not make the sequence atomic. A limiter shared across Puma threads needs a `Mutex#synchronize` around refill, check and subtract, which is fine because it never blocks.',
      'Float accumulation drifts in the last bits; comparing `@tokens < n` tolerates that, and the `min` against capacity keeps it bounded. Use `Rational` only if exact accounting is a requirement.',
    ],
  },
  'flatten-object': {
    description: [
      'Write `flatten(obj, separator = ".")` that turns nested hashes into a single-level hash whose keys are the joined paths as Strings. Arrays are treated like hashes with index keys. Leaves (scalars, `nil`, and empty containers) are kept as values.',
      'The tests call `flatten` with hashes parsed from JSON, so the keys are Strings and the output keys must be too; a second argument changes the separator.',
    ],
    examples: [
      { input: 'flatten({ "a" => { "b" => 1, "c" => { "d" => 2 } }, "e" => 3 })', output: '{ "a.b" => 1, "a.c.d" => 2, "e" => 3 }' },
      { input: 'flatten({ "xs" => [10, { "y" => 20 }] })', output: '{ "xs.0" => 10, "xs.1.y" => 20 }' },
      { input: 'flatten({ "a" => {} })', output: '{ "a" => {} }', note: 'An empty hash is a leaf.' },
    ],
    hints: [
      'Recurse with the current path prefix; when the value is not a non-empty Hash or Array, write it under the prefix.',
      '`Hash#each` yields `|k, v|`; `array.each_with_index` yields `|v, i|`, so the pairs line up differently.',
      'A lambda or a private helper with a default-argument accumulator (`out = {}`) keeps the public signature clean.',
      'Ask whether arrays should be flattened; both answers are defensible.',
    ],
    nuances: [
      'Decide container-ness with `is_a?(Hash)` and `is_a?(Array)`, not `respond_to?(:each)`: Strings, Ranges and Structs also iterate and must stay leaves. `nil` needs no special case, unlike languages where it is "an object".',
      'Path keys are built with interpolation, which calls `to_s`, so Symbol and Integer keys join fine; the root-level key must be `k.to_s` explicitly or a Symbol key leaks through unchanged.',
      '`empty?` is the leaf test for both `{}` and `[]`; `Hash#any?` is not the same thing when values are `nil` or `false`.',
      'A hash with a default proc or `compare_by_identity` loses both in the output `{}`; say so if the input could be one.',
      'Recursion depth is the only scaling limit (`SystemStackError` around ten thousand frames); an explicit stack of `[value, prefix]` pairs removes it.',
    ],
  },
  'memoize-ttl': {
    description: [
      'Implement `Memoized`: `Memoized.new(ttl_ms, now, &fn)` wraps a block, `call(*args)` caches the block\'s result per argument list for `ttl_ms` milliseconds and recomputes after that, and `clear` empties the cache. `memoize(ttl_ms, now = <monotonic clock>, &fn)` builds one; `now` is a lambda returning milliseconds.',
      'The `memo_demo` driver memoises a counting adder with an injected clock, moving it with `["at", ms]` steps and calling `clear` on `["clear"]`, and returns `[results, underlying_calls]`.',
    ],
    examples: [
      { input: 'm = memoize(1000) { |a, b| slow_add(a, b) }; m.call(1, 2); m.call(1, 2)', output: 'slow_add runs once' },
      { input: 'after 1001ms: m.call(1, 2)', output: 'slow_add runs again' },
    ],
    hints: [
      'The `args` Array is a fine Hash key as it is: Arrays hash and compare structurally.',
      'Store `[value, expires_at]` and treat an expired entry as a miss; read the clock once per call.',
      'Discuss what the key misses: `1` versus `1.0`, keyword arguments, and arguments that are mutated after the call.',
    ],
    nuances: [
      'Hash keys use `eql?` and `hash`, so `[1, 2]` and `[1.0, 2]` are different entries while `==` would say they are equal; a mutable argument mutated after the call strands its entry until `rehash`. Say when you would serialise instead.',
      '`@cache[key] ||= compute` cannot memoise `nil` or `false`. Storing a `[value, expires_at]` pair, or checking `key?` / using `fetch`, keeps falsy results cached.',
      'Do not cache a raised error: let it propagate and leave no entry, or the failure outlives the problem for a whole TTL.',
      'Two threads missing at once both compute; the GVL does not serialise the check and the store. A `Mutex` around the lookup-or-compute prevents the stampede but holds the lock during the block, so say which trade you are making.',
      'Expired entries are never removed, so the cache grows with distinct arguments. Sweep on `call`, cap the size, or combine with the LRU; `clear` is the blunt instrument.',
    ],
  },
  'deep-equal': {
    description: [
      'Write `deep_equal(a, b)` returning `true` when two values are structurally equal: scalars by value (treating `Float::NAN` as equal to itself), Arrays element-wise, Hashes key-wise regardless of order, `Time`s by instant. Values of different types or with different key sets are not equal, and a key present with `nil` is not the same as a missing key.',
      'The JSON tests cover arrays and hashes; the `deep_equal_checks` driver covers what JSON cannot say: `Float::NAN`, two equal `Time`s, and `{ "a" => 1 }` against `{ "a" => 1, "b" => nil }`.',
    ],
    examples: [
      { input: 'deep_equal({ "a" => [1, { "b" => 2 }] }, { "a" => [1, { "b" => 2 }] })', output: 'true' },
      { input: 'deep_equal({ "a" => 1 }, { "a" => 1, "b" => nil })', output: 'false' },
      { input: 'deep_equal(Float::NAN, Float::NAN)', output: 'true' },
    ],
    hints: [
      'Start from what `==` already does for Arrays and Hashes and name exactly where it stops; that is most of the interview.',
      'Dispatch on type with `is_a?` on both sides before comparing children, so `[]` and `{}` are not equal.',
      'Check keys with `key?`, not `b[k].nil?`, so a stored `nil` is distinguished from absence.',
    ],
    nuances: [
      'Ruby has three equalities: `==` (value, overridable), `eql?` (value plus type, used by Hash keys: `1 == 1.0` but not `1.eql?(1.0)`), and `equal?` (identity). Say which one "structurally equal" means for `1` and `1.0`, then implement that.',
      '`Array#==` and `Hash#==` are already recursive and `Hash#==` ignores order, so `a == b` passes most tests. It fails on `Float::NAN` (never `==` itself) and on classes that do not define `==` (`Object#==` is identity), which is what the hand-written version adds.',
      'Do not rely on `a.equal?(b)` to catch NaN: `Float::NAN` is one constant object, but `0.0 / 0.0` builds a fresh one, so check `nan?` on both sides.',
      '`Time#==` compares the instant including sub-second precision and ignores the zone, so two `Time`s with different `utc_offset` for the same moment are equal; `to_r` makes that explicit.',
      'Cycles: Ruby\'s own `Array#==` detects recursive arrays, but a hand-written walk overflows the stack. A visited set keyed by identity (`compare_by_identity`) of pairs is the senior follow-up.',
    ],
  },
  'throttle': {
    description: [
      'Implement `Throttled`: `Throttled.new(interval_ms, now, &fn)` wraps a block; `call(*args)` runs it immediately on the first call, and calls during the interval are coalesced into one trailing call with the latest arguments when the interval ends. `throttle(interval_ms, now = <monotonic clock>, &fn)` builds one; `now` is a lambda returning milliseconds.',
      'The `throttle_demo` driver replays `["call", x]` and `["sleep", ms]` steps against a recorder block and returns what got through. The trailing call needs a timer thread, so the block runs on two different threads; keep the state under one `Mutex` and call the block outside it.',
    ],
    examples: [
      { input: 't = throttle(100) { |x| log(x) }; t.call(1); t.call(2); t.call(3); sleep 0.15', output: 'log(1) immediately, log(3) at about 100ms' },
    ],
    hints: [
      'Track `@last` (start at `-Float::INFINITY`) and `@pending` args. If the interval has passed and no timer is armed, run now; otherwise store the args and arm a timer for the remaining time.',
      '`@timer ||= Thread.new { sleep(...); flush }` arms at most one timer; `flush` clears it, takes the pending args under the lock, and calls the block.',
      'Contrast with debounce: throttle guarantees progress under continuous calls.',
    ],
    nuances: [
      'Call the block outside `Mutex#synchronize`. `Mutex` is not reentrant: a block that calls the throttled object again (or anything that re-enters) raises `ThreadError: deadlock; recursive locking`. The port\'s immediate path does call it under the lock; that is the thing to fix in an interview.',
      'The trailing call runs on the timer thread, so the block must be safe to run off the caller\'s thread; the driver\'s `calls << x` is one C call and fine under the GVL.',
      '`@timer ||= Thread.new` is only atomic because it is inside the lock; two callers racing on the `nil` check would arm two timers.',
      'The remaining-time arithmetic mixes the injected clock with a real `sleep`, so `[0, interval - (t - @last)].max / 1000.0` must guard against negatives and Integer division.',
      'A timer thread per interval is cheap but each one dies with its exception if the block raises; set `report_on_exception = false` only if you handle the error, otherwise let it print.',
    ],
  },
  'async-queue': {
    description: [
      'Implement `TaskQueue.new(concurrency)` with `add { ... }` returning a `Handle`, running at most `concurrency` tasks at once on threads in FIFO order, and `on_idle` blocking until every added task has settled. A failing task settles its own `Handle` with the error and must not stop the queue.',
      'The `Handle` class is given: `settle(value, error)` from the worker, and `value` blocks on a `ConditionVariable` until settled, then returns the value or re-raises the error in the caller\'s thread. The `queue_demo` driver adds `["ok", value, ms]` and `["fail", message, ms]` tasks, calls `on_idle`, then reads every `value`, returning `[outcomes, peak_concurrency]`. No busy loops: block on the condition variable.',
    ],
    examples: [
      { input: 'q = TaskQueue.new(2); ha = q.add { a }; hb = q.add { b }; hc = q.add { c }', output: 'a and b start now; c starts when one finishes; `hc.value` blocks until c settles' },
    ],
    hints: [
      'Keep `@pending` (task, handle) pairs, an `@active` count, one `Mutex` and a `ConditionVariable` for idle.',
      'A `start_locked` helper, called with the lock held from both `add` and a finishing worker, starts tasks while `@active < @concurrency`.',
      'In the worker: `handle.settle(task.call, nil)` with a `rescue => e` that settles the error, and an `ensure` that decrements, starts the next task and broadcasts idle.',
      '`on_idle` is `@idle.wait(@mutex) until @active.zero? && @pending.empty?` inside `synchronize`.',
    ],
    nuances: [
      '`ConditionVariable#wait` can return without a `signal` and must be re-checked in a loop (`wait until predicate`). `broadcast`, not `signal`, for idle: several callers may be waiting.',
      '`Handle` is a hand-rolled future because a queued task has no thread yet, so `Thread#value` cannot stand in. It re-raises the task\'s error object in the reading thread, which keeps the worker\'s backtrace and leaves the queue running.',
      'The `ensure` in the worker re-takes `@mutex` while the main thread may hold it in `add`; that is fine because neither nests the lock. Calling `task.call` under the lock would serialise the queue and deadlock on reentry.',
      'The alternative design is `concurrency` long-lived workers blocking on a `Queue#pop` (`close` to shut down). Simpler accounting and no thread churn, but workers outlive the tasks and need an explicit shutdown the driver never calls; the port\'s thread-per-task design needs none.',
      'A task that raises something outside `StandardError` (an `Interrupt`, a `NoMemoryError`) escapes `rescue => e`, kills its thread, and would leave `@active` wrong without the `ensure`. Set `report_on_exception = false` only for errors you settle.',
    ],
  },
  'deep-clone': {
    description: [
      'Write `deep_clone(value, seen = {})` that copies Hashes, Arrays, `Time`s and `Set`s recursively, preserves shared references (two keys pointing at one hash point at one copy) and handles cycles (a cloned cycle points at the clone, not the original). Scalars are returned as is.',
      'The `check` driver builds a hash with a self-reference, a shared sub-hash, a `Time` and a `Set` holding an array, mutates the clone, and verifies with `equal?` that identities are preserved on the copy and separate from the original; `deep_clone(5)` and a plain nested hash are also tested.',
    ],
    examples: [
      { input: 'a = { "x" => [1, { "y" => 2 }] }; b = deep_clone(a); b["x"][1]["y"] = 3', output: 'a["x"][1]["y"] is still 2' },
      { input: 'a["self"] = a; b = deep_clone(a)', output: 'b["self"].equal?(b)' },
    ],
    hints: [
      'A memo from original object to its copy, consulted before copying and filled before recursing into children, handles both shared references and cycles.',
      'Key the memo by identity: `seen.compare_by_identity` or `value.object_id`. A plain `{}` would key by `hash`/`eql?`.',
      'Check `Time`, `Array`, `Set` and `Hash` with `is_a?` before the scalar fall-through; clone Hash keys as well as values.',
    ],
    nuances: [
      '`dup` and `clone` are both shallow: children are shared. `clone` also copies the frozen state and singleton methods, `dup` does not. Neither is a deep copy; this function is.',
      'A memo keyed by the object itself uses structural `hash` and `eql?`, so two equal-but-distinct sub-hashes collapse into one copy and a cyclic hash hashes itself while you are mutating its copy. `compare_by_identity` (or `object_id`) is the fix, and the reason the `seen` parameter is a Hash.',
      '`Marshal.load(Marshal.dump(x))` is the stdlib deep copy and does preserve cycles and shared references, but it refuses Procs, IO, `Mutex` and singleton objects and round-trips through a String. Say you know it and when you would use it.',
      'Immediates (Integer, Symbol, `nil`, `true`, most Floats) have no identity to copy; `1.dup` returns itself. A `Time` must be `dup`ed since it is a mutable object; `freeze` is shallow and does not change what needs copying.',
      'A fresh `{}` loses the source\'s `default_proc`, `compare_by_identity` and subclass; `value.class.new` or `value.dup.clear` keeps them. Structs and `Data` need a members walk; say what you would do for them.',
    ],
  },
  'group-by': {
    description: [
      'Write `group_by(items) { |item| key }` returning a Hash from key to the items with that key, in encounter order. Then write `top_per_category(orders)`: for each category, the `id` of the order with the highest `total`. An order is a Hash with String keys `"id"`, `"category"` and `"total"`.',
      'The `group_by_parity` driver groups numbers by `"odd"` and `"even"` through your `group_by`; `top_per_category` is called with the order hashes directly.',
    ],
    examples: [
      { input: 'group_by([1, 2, 3, 4]) { |n| n.odd? ? "odd" : "even" }', output: '{ "odd" => [1, 3], "even" => [2, 4] }' },
    ],
    hints: [
      '`(out[key] ||= []) << item` inside `each`, or `each_with_object({})`; a `Hash.new { |h, k| h[k] = [] }` default proc also works.',
      '`Enumerable#group_by`, `max_by` and `transform_values` compose into `top_per_category` in one line.',
      'The orders are JSON, so `o["category"]`, not `o[:category]`, which silently returns `nil`.',
    ],
    nuances: [
      '`Enumerable#group_by` exists; in an interview say so, then write it, and notice that defining a top-level `group_by` adds a private method to `Object` that does not shadow the Array one.',
      '`Hash.new([])` is the classic bug: one shared default array that every key appends to and that the hash never stores. `Hash.new { |h, k| h[k] = [] }` builds one per key.',
      'String keys versus Symbol keys are different Hash entries; JSON-sourced data has Strings, and `o[:total]` is `nil` rather than an error. `fetch` fails loudly.',
      '`max_by` returns the first maximum on ties and `nil` for an empty group; `transform_values` keeps the category order from `group_by`, so the output order is deterministic.',
      'Prefer `each_with_object`, `group_by`, `tally` and `transform_values` over index loops and `inject` with an accumulator you have to return; they read as the shape of the data.',
    ],
  },
  'parse-query-string': {
    description: [
      'Write `parse_query(qs)` turning a query string, with or without a leading `?`, into a Hash with String keys. Repeated keys become Arrays, `+` means space, percent-encoding is decoded, and a key without `=` gets an empty string. The starter requires `uri`.',
    ],
    examples: [
      { input: 'parse_query("?a=1&b=two%20words&a=3&c")', output: '{ "a" => ["1", "3"], "b" => "two words", "c" => "" }' },
      { input: 'parse_query("q=a+b&eq=x=y")', output: '{ "q" => "a b", "eq" => "x=y" }' },
    ],
    hints: [
      '`split("&")`, then `part.split("=", 2)` so a value may contain `=`; the second element is `nil` when there was no `=`.',
      '`URI.decode_www_form_component` handles both `+` and `%xx`; it raises `ArgumentError` on malformed input, so decide what to do (keep the raw text).',
      'Know `URI.decode_www_form` (pairs), `CGI.parse` (always arrays) and `Rack::Utils.parse_nested_query` (`a[]=`), and say why you are hand-rolling.',
    ],
    nuances: [
      '`String#split` drops trailing empty strings, so `"a=1&".split("&")` is `["a=1"]`, and `"".split("&")` is `[]`; `"a==b".split("=", 2)` keeps the second `=` in the value. Know what the limit argument does.',
      '`key, value = part.split("=", 2)` leaves `value` as `nil` when there is no `=`; `value || ""` is the empty-string rule. `nil` is the absent value throughout.',
      'The three outcomes for a key (first value, second value, further values) are a `case` on `out[key]`: `nil`, an Array, a String. Checking `is_a?(Array)` matters because `prev << value` on a String would concatenate.',
      '`URI.decode_www_form_component` treats `+` as space, which is right for query strings and wrong for paths; `URI.decode_uri_component` (newer `uri`) or `URI::DEFAULT_PARSER.unescape` leave `+` alone.',
      '`delete_prefix("?")` and `start_with?` read better than slicing; `qs[1..]` is the endless-range form if you do slice.',
    ],
  },
  'lfu-cache': {
    description: [
      'Implement `LFUCache.new(capacity)` with `get(key)` returning the value or `-1`, and `set(key, value)` inserting or updating; when over capacity evict the least frequently used key, breaking ties by least recently used. Both in O(1). A capacity of 0 stores nothing.',
      'The `run_lfu` driver replays `["set", k, v]` and `["get", k]` operations and collects what `get` returns (`nil` for a `set`); leave it as is.',
    ],
    hints: [
      'Two hashes: key to `[value, freq]`, and freq to an insertion-ordered Hash of keys used as an ordered set (`{ key => true }`); plus `@min_freq`.',
      'On access move the key from bucket f to f + 1 (delete, then insert at the end); if bucket `@min_freq` became empty, `@min_freq += 1`. A new key goes in bucket 1 and `@min_freq = 1`.',
      'The eviction victim is the first key in bucket `@min_freq`: `bucket.each_key.first` or `bucket.shift`.',
    ],
    nuances: [
      'An ordered set is a `Hash` with `true` values; `Set` works too because it is Hash-backed and insertion-ordered, but says less about why order matters here.',
      '`bucket.keys.first` allocates every key and makes eviction O(n); `each_key.first`, `first[0]` or `shift` are O(1). This is the line interviewers look at.',
      'A default-proc `Hash` for the buckets auto-creates a bucket on read, so `@buckets[f].empty?` as a check creates empty buckets; delete a bucket when it empties and read with `key?` or `fetch` where you only want to look.',
      '`-1` as the miss value is the driver\'s contract, so a stored `-1` is ambiguous; in your own API return `nil` or take a block for the default like `Hash#fetch`.',
      'The `[value, freq]` entry is a mutable Array mutated in place; a `Struct.new(:value, :freq)` or a small class names the fields and still updates in place. `Data` would be immutable and need `with` on every touch.',
    ],
  },
  'circular-buffer': {
    description: [
      'Implement `RingBuffer.new(capacity)` with `push(item)` (overwrites the oldest when full and returns it, else `nil`), `shift` (removes and returns the oldest, `nil` when empty), `to_a` (oldest to newest) and `size`.',
      'The `ring_demo` driver replays `["push", x]`, `["shift"]`, `["toArray"]` and `["size"]` steps and records each result. Use a fixed `Array` with index arithmetic, not a growing Array you trim.',
    ],
    examples: [
      { input: 'b = RingBuffer.new(3); b.push(1); b.push(2); b.push(3); b.push(4)', output: 'push(4) returns 1; to_a == [2, 3, 4]' },
    ],
    hints: [
      '`Array.new(capacity)` preallocates the slots; keep `@start` and `@count`, and index with `(@start + i) % @capacity`.',
      '`Array.new(@count) { |i| @items[(@start + i) % @capacity] }` is `to_a` in one line.',
      'Where this shows up: bounded logs, metrics windows, backpressure buffers.',
    ],
    nuances: [
      'Ruby\'s `%` on a negative Integer returns a non-negative result, so `(index - 1) % capacity` wraps correctly without the fix-up other languages need.',
      '`nil` is both the empty slot and the "nothing evicted" return, so a buffer that stores `nil` items cannot tell them apart through `push`; say that and offer a block or a sentinel for your own API.',
      'A plain `Array` with `push` and `shift` is amortised O(1) in CRuby (shift shares the buffer and moves the start), so the naive version is not slow; the ring is about a fixed footprint and no reallocation, and you should be able to say so.',
      'Clear the vacated slot in `shift` (`@items[@start] = nil`) so the buffer does not keep old objects alive; the GC only frees what nothing references.',
      'Defining `each` and including `Enumerable` would give `to_a`, `first`, `map` and friends for free; `size` and `length` are conventionally aliases.',
    ],
  },
  'semver-compare': {
    description: [
      'Write `compare_versions(a, b)` returning `-1`, `0` or `1` for versions like `"1.2.10"` and `"1.2.9"`. Missing trailing parts count as 0 (`"1.0"` equals `"1.0.0"`). A pre-release suffix (`"1.0.0-beta"`) sorts before the release.',
    ],
    examples: [
      { input: 'compare_versions("1.2.10", "1.2.9")', output: '1' },
      { input: 'compare_versions("1.0", "1.0.0")', output: '0' },
      { input: 'compare_versions("1.0.0-beta", "1.0.0")', output: '-1' },
    ],
    hints: [
      'Split off the pre-release with `split("-", 2)`, then `split(".").map(&:to_i)` and compare position by position, padding with 0.',
      '`Array#<=>` compares element-wise, so once both arrays are padded to the same length one `<=>` does the numeric part.',
      'Comparing the Strings is the classic bug: `"10" < "9"`.',
    ],
    nuances: [
      '`Gem::Version` ships with RubyGems and already orders pre-releases correctly; the strong answer names it, says why you would use it in production, and then writes the function.',
      'The Ruby way to make something orderable is `<=>` plus `include Comparable`, which gives `<`, `==`, `between?`, `clamp` and `sort` for free; a `Version` value object with that is the shape to describe.',
      '`"1a".to_i` is `1` silently; `Integer("1a")` raises `ArgumentError`. Say which you want for malformed input.',
      '`nil <=> "beta"` is `nil`, not an ordering, so the pre-release comparison must handle the absent side explicitly before falling back to `String#<=>` (which is byte order, so `"beta" < "rc"` but `"Beta" < "alpha"`).',
      'The result contract is `-1`, `0`, `1`; `sort` accepts any Integer from a block, but callers testing `== 1` do not, so normalise with `<=>` rather than returning a difference.',
    ],
  },
  'resolve-dependencies': {
    description: [
      'Given `deps`, a Hash from each package to the packages it depends on, `install_order(deps)` returns an install order where every package comes after its dependencies, including packages that appear only as dependencies. If there is a cycle, raise an error whose message starts with `"cycle"`, naming the path. Among valid orders, prefer alphabetical when there is a choice.',
      'The `install_order_or_error` driver rescues the error and returns its message, so the error must be a `StandardError`.',
    ],
    examples: [
      { input: 'install_order({ "app" => ["lib", "util"], "lib" => ["util"], "util" => [] })', output: '["util", "lib", "app"]' },
      { input: 'install_order({ "a" => ["b"], "b" => ["a"] })', output: 'raises "cycle: a -> b -> a"' },
    ],
    hints: [
      'Kahn\'s algorithm: in-degrees in a `Hash.new(0)`, dependents in a `Hash.new { |h, k| h[k] = [] }`, a sorted ready list; leftover nodes mean a cycle.',
      'DFS with `:active`/`:done` marks finds the actual cycle path for the message.',
      'The stdlib has `TSort` (`require "tsort"`), which raises `TSort::Cyclic`; know it, then write your own for the alphabetical tie-break.',
    ],
    nuances: [
      '`return` inside a lambda returns from the lambda; inside a proc or a `do` block it returns from the enclosing method. A DFS written as a lambda can `return` the cycle path; written as a proc it would exit `install_order` with it. This is where the distinction bites.',
      '`raise "cycle: ..."` raises a `RuntimeError`, which `rescue => e` catches; a `class CycleError < StandardError` is better API and still satisfies the driver. Never inherit from `Exception` directly.',
      'Default-proc Hashes auto-vivify on read, so `dependents[n].each` on a leaf creates an empty entry; harmless here, a surprise if you later iterate the hash.',
      '`sort` on Strings is byte order (`"Z" < "a"`); say that "alphabetical" means `sort` and offer `sort_by(&:downcase)` if case matters. Re-sorting the ready list on every insert is O(n log n) per step; a sorted insert or a heap is the follow-up.',
      'Recursive DFS hits `SystemStackError` around ten thousand frames deep; for a package graph that is fine, and you should say when you would switch to an explicit stack.',
    ],
  },
  'match-route': {
    description: [
      'Write `match_route(pattern, path)` where the pattern has literal segments, `:param` segments and an optional trailing `*` wildcard. Return `{ "params" => { ... } }` on a match (the wildcard\'s remainder joined with `/` under `"*"`), or `nil`. Literal segments must match exactly, a trailing slash is ignored, and extra path segments without a wildcard are not a match.',
      'The tests compare against JSON, so the outer key `"params"` and the parameter names are Strings; percent-encoded segments are decoded.',
    ],
    examples: [
      { input: 'match_route("/users/:id/posts/:post_id", "/users/42/posts/7")', output: '{ "params" => { "id" => "42", "post_id" => "7" } }' },
      { input: 'match_route("/files/*", "/files/a/b.txt")', output: '{ "params" => { "*" => "a/b.txt" } }' },
      { input: 'match_route("/users/:id", "/users")', output: 'nil' },
    ],
    hints: [
      '`s.split("/").reject(&:empty?)` for both sides handles the leading and trailing slashes; then walk with `each_with_index`.',
      '`p.start_with?(":")` and `p[1..]` name a parameter; `xs[i..]` is the wildcard remainder.',
      'The other Ruby shape is compiling the pattern to a `Regexp` with named captures and reading `MatchData#named_captures`.',
    ],
    nuances: [
      '`"/a/".split("/")` is `["", "a"]`: Ruby keeps the leading empty string and drops trailing ones, so `reject(&:empty?)` is not optional.',
      '`return nil` inside an `each_with_index` block returns from the method, which is the block semantics you rely on for the early exits; in a lambda it would only leave the lambda.',
      '`URI.decode_www_form_component` turns `+` into a space, which is wrong for path segments; use `URI.decode_uri_component` (newer `uri`), `URI::DEFAULT_PARSER.unescape` or a `gsub(/%([0-9A-Fa-f]{2})/)` as the port does.',
      'Routers like Sinatra compile patterns to a `Regexp` once and match many paths; `named_captures` gives the params Hash directly. Say when the segment walk (readable, no regex escaping) beats it.',
      'String keys throughout because the result is compared as JSON; symbolising (`"id".to_sym`) would be idiomatic inside a Rails app and wrong here. Know that `Hash#transform_keys(&:to_sym)` is the one-line bridge.',
    ],
  },
  'set-in-immutable': {
    description: [
      'Write `set_in(obj, path, value)` returning a new object with the value at `path` (an Array of keys) replaced, without mutating the input. Only the containers along the path are copied; untouched branches are shared, so `out["c"].equal?(input["c"])`. Missing intermediates are created: an Array when the next key is an Integer, else a Hash.',
      'The `check` driver sets into a hash and into an array inside it and verifies with `equal?` that siblings are shared and the input is unchanged; `set_in({}, ["x", "y"], 1)` and `set_in({}, ["xs", 0], "a")` are also tested.',
    ],
    examples: [
      { input: 'set_in({ "a" => { "b" => 1 }, "c" => { "d" => 2 } }, ["a", "b"], 9)', output: '{ "a" => { "b" => 9 }, "c" => { "d" => 2 } }, with out["c"].equal?(input["c"])' },
    ],
    hints: [
      '`head, *rest = path`; recurse into `obj[head]` with `rest`, then `copy = obj.dup; copy[head] = child`.',
      '`dup` is shallow, which is exactly the structural sharing you want: only the spine is copied.',
      'Decide the container to create from `rest.first.is_a?(Integer)`.',
    ],
    nuances: [
      '`dup` copies one level and returns an unfrozen object even from a frozen source, so this works on frozen configuration trees; `clone` would keep the frozen state and fail on `[]=`. Say why `dup` is the right one here.',
      'For a Hash, `obj.merge(head => child)` is the idiomatic copy-with-one-change and equally shallow; Arrays have no `merge`, so `dup` plus `[]=` covers both uniformly.',
      '`Array#[]=` past the end pads with `nil` (`[][2] = "a"` gives `[nil, nil, "a"]`), which is what "missing intermediates" means for arrays; a negative index would raise `IndexError`.',
      '`Hash#dup` keeps the default proc and `compare_by_identity`; a literal `{}` for a missing intermediate has neither. String versus Symbol keys are distinct, and the tests use Strings.',
      'This is what `Data#with` and `Struct` copies do for value objects; for deep updates in Ruby, mention that `Hash#dig` is the read-side twin and that there is no `dig=`, which is why this function exists.',
    ],
  },
  'with-timeout-abort': {
    description: [
      'Two functions over the given `CancelToken` (`cancelled?`, `cancel`, and `wait(ms)` which blocks until cancelled or the time passes, returning `true` if cancelled). `sleep_ms(ms, token = nil)` sleeps for `ms` milliseconds, or raises `"aborted"` as soon as the token is cancelled; with no token it is a plain sleep. `with_timeout(ms) { |token| ... }` runs the block on a thread with a fresh token; if it does not finish within `ms`, cancel the token, wait for the block to stop, and raise `"timeout"`. Either way no thread may be left running.',
      'The `timeout_demo` driver runs `sleep_ms(run_ms, token)` under `with_timeout(limit_ms)`, returning `["timeout", "aborted"]` when the limit wins and `["ok", nil]` when the block finishes in time; `sleep_at_least` checks that a plain `sleep_ms` really waits. Cancellation is cooperative: the block is told to stop, never killed.',
    ],
    examples: [
      { input: 'with_timeout(20) { |token| sleep_ms(1000, token) }', output: 'raises "timeout" after about 20ms; the inner sleep_ms raised "aborted"' },
      { input: 'with_timeout(50) { 1 }', output: '1, without waiting 50ms' },
    ],
    hints: [
      '`sleep_ms` with a token is `raise "aborted" if token.wait(ms)`, after a fast `cancelled?` check.',
      '`Thread#join(seconds)` returns `nil` when the time runs out; then `token.cancel`, `join` again without a limit, and raise.',
      'On success `thread.value` returns the block\'s result, or re-raises its error in the caller.',
      'The error the cancelled block raised on its own thread is not the result; the timeout is.',
    ],
    nuances: [
      '`Timeout.timeout` raises asynchronously inside the target thread from a watcher, so the exception can land anywhere: inside an `ensure`, mid-way through a C call, while holding a `Mutex`. That is why this problem hands you a token instead and why the strong answer refuses `Timeout.timeout` in library code.',
      '`Thread#kill` has the same problem and no return value: resources half-released, locks dropped by `ensure` in an unknown state. Cooperative cancellation (the block checks or waits on the token) is slower to stop but always consistent, and the wrapper must then `join` to prove it stopped.',
      '`CancelToken#wait` loops on `ConditionVariable#wait(mutex, left)` against a monotonic deadline because a wait can return early (spurious wakeup or a `broadcast` for another reason) and the clock, not the number of wakeups, decides the timeout.',
      '`Process.clock_gettime(Process::CLOCK_MONOTONIC)` for the deadline, never `Time.now`: a wall clock that jumps backwards makes a timeout never fire.',
      '`thread.report_on_exception = false` keeps the cancelled block\'s "aborted" from being printed as a crash; `thread.value` on the success path re-raises a genuine error of the block in the caller, with its backtrace, which is the right place for it.',
      'A thread whose block ignores the token never stops and the second `join` blocks forever; say that a bounded second join plus a loud error is the production compromise, and that `Fiber` with a scheduler is the other model where cancellation needs no threads at all.',
    ],
  },
}
