import type { PortNotes } from './notes.ts'

/**
 * The Rust telling of the practical problems: each statement retold against the
 * Rust port's actual structs and signatures, hints in Rust idiom, and the nuances
 * (ownership, Send/Sync, poisoning, Condvar loops, Drop) a strong Rust answer gets
 * right that a transliteration from another language misses.
 */
export const RUST_PRACTICAL_NOTES: Record<string, PortNotes> = {
  'lru-cache': {
    description: [
      'Implement `LruCache<K, V>` with `LruCache::new(capacity)`, `get(&mut self, key: &K) -> Option<&V>` (marks the key most recently used) and `set(&mut self, key: K, value: V)` (inserts or updates; once over capacity, evicts the least recently used entry). Both O(1), with `K: Hash + Eq + Clone` and no bound on `V`.',
      '`set` takes ownership of the key and the value; `get` borrows the key and lends the value back. The `run_lru` driver builds an `LruCache<i64, i64>`, replays `["set", k, v]` and `["get", k]` steps and records `c.get(&key).copied()`; leave it as is. std only, no `unsafe`.',
    ],
    examples: [
      { input: 'capacity 2: set(1, 1); set(2, 2); get(&1); set(3, 3); get(&2); get(&3)', output: 'Some(&1), None, Some(&3)', note: 'Reading 1 made 2 the least recently used, so inserting 3 evicted 2.' },
      { input: 'capacity 1: set(1, 1); set(2, 2); get(&1); get(&2)', output: 'None, Some(&2)' },
    ],
    hints: [
      'A `HashMap` has no order you can rely on, so unlike an insertion-ordered map in other languages it cannot double as the recency list: the order has to live in a structure of your own.',
      'A doubly linked list of `Rc<RefCell<Node>>` fights the borrow checker. Instead keep an arena `Vec<Node<K, V>>` with `prev: Option<usize>` and `next: Option<usize>` links, plus `HashMap<K, usize>` from key to slot.',
      'Write `unlink(i)` and `push_front(i)` once; `get` and `set` are then a lookup plus those two calls. On eviction remove the tail\'s key from the map and reuse its slot for the new node.',
      'Capacity 0 is a valid argument: `set` must not reach `tail.expect(..)` on an empty cache.',
    ],
    nuances: [
      'The returned `Option<&V>` borrows the whole cache (the method takes `&mut self`), so the caller cannot call `set` while holding it; the driver sidesteps this with `.copied()`. Returning `Option<V>` with `V: Clone` is the alternative; say which you would ship and why.',
      '`HashMap` iteration order is randomised per map, so there is no "oldest key" to read off it; recency must be an explicit list, and indices into a `Vec` arena give O(1) relinking with no `Rc`, no `RefCell` borrow panics and no `unsafe`.',
      'Never `Vec::remove` an arena slot: it shifts every later index and breaks every link. Reuse the evicted slot (`self.nodes[evicted] = node`) so the arena never grows past capacity.',
      'The key lives twice (in the map and in the node, so eviction can find its map entry), which is why `K: Clone` is on the impl; an `Rc<K>` shared between the two is the way to avoid the clone for large keys.',
      'Updating an existing key assigns the value in place and relinks; it must not evict. `std::mem::replace` hands the old value back if the API ever wants it.',
      'Capacity is `usize`, so a negative capacity cannot happen, but zero can; `tail.expect(..)` would panic there, and a panic in a cache is a bug in the cache, not in the caller.',
    ],
  },
  'promise-pool': {
    description: [
      'Write `map_with_concurrency(items: &[T], limit: usize, f: F) -> Result<Vec<R>, E>` where `F: Fn(&T, usize) -> Result<R, E> + Sync`: apply `f` to every item on threads with at most `limit` calls running at once, and return the results in the original order. If any call fails, return that error once the other running calls have finished.',
      'The `pool_demo` driver counts peak concurrency with atomics and fails on one item with `"boom"`; the bounds are `T: Sync`, `R: Send`, `E: Send`. std only: `std::thread::scope`, `Arc`, `Mutex`, atomics, channels.',
    ],
    examples: [
      { input: 'map_with_concurrency(&[1, 2, 3, 4], 2, |x, _| Ok::<_, String>(x * 2))', output: 'Ok(vec![2, 4, 6, 8])' },
      { input: 'limit 2, five slow items', output: 'at most 2 calls ever run at the same time' },
      { input: 'one item returns Err("boom")', output: 'Err("boom") after the running calls finish' },
    ],
    hints: [
      '`thread::scope(|s| { .. })` lets the workers borrow `items` and `f` directly; the scope joins every thread before it returns, so no `Arc` and no `\'static` is needed.',
      'Start `limit.clamp(1, items.len().max(1))` workers. Each loops: `let i = next.fetch_add(1, SeqCst)`, stop when `i >= items.len()`, run `f(&items[i], i)`, store the result at index `i`.',
      'Results in a `Mutex<Vec<Option<R>>>` (or each worker collects `(i, r)` pairs and you merge after the scope); the first error in a `Mutex<Option<E>>` via `get_or_insert`, and workers check it before taking another index.',
      'After the scope, `into_inner()` on both mutexes moves the data out without cloning.',
    ],
    nuances: [
      '`thread::scope` is the whole trick: workers borrow `items`, `f` and the shared slots by reference, which is why the bounds are `T: Sync` and `F: Sync` (shared across threads) but only `R: Send` and `E: Send` (moved out of a worker). `thread::spawn` would demand `\'static` and force `Arc` everywhere.',
      'Order comes from the index, not from completion: `fetch_add` on an `AtomicUsize` hands each worker a unique slot with no lock, and the driver deliberately finishes small items last.',
      'Threads are not cancellable: a running `f` cannot be interrupted, so "fail fast" means workers stop taking new indices once an error is recorded, and the error is returned after the scope joins them. `get_or_insert` keeps the first error when two fail at once.',
      '`limit` of 0 must not deadlock or return an empty result, and more workers than items wastes threads; `clamp(1, items.len().max(1))` covers both, and an empty slice should spawn nothing and return `Ok(vec![])`.',
      '`lock().unwrap()` panics on a poisoned mutex, which here is fine: a panic inside `f` propagates out of `thread::scope` anyway. In a library you would `unwrap_or_else(PoisonError::into_inner)` or send results over an `mpsc` channel and avoid the mutexes entirely.',
      'This is a hand-written `par_iter().map().collect()`; say so, and that `rayon` is what you would use in production, with `Mutex<Vec<Option<R>>>` and the final `expect("every item was mapped")` as the places a reviewer will look.',
    ],
  },
  'debounce': {
    description: [
      'Write `debounce(f, wait_ms) -> Debounced<A>` where `f: impl Fn(A) + Send + Sync + \'static`. `call(&self, arg: A)` runs `f` only after `wait_ms` milliseconds of silence, with the last call\'s argument; `cancel(&self)` drops a pending call. `A: Send + \'static`.',
      'There is no event loop: a pending call is a thread that sleeps and then decides whether it is still the latest. The `debounce_demo` driver replays `["call", x]`, `["sleep", ms]` and `["cancel"]` steps against a recorder behind an `Arc<Mutex<Vec<i64>>>`. std only.',
    ],
    examples: [
      { input: 'd = debounce(log, 100); d.call(1); d.call(2); d.call(3); (sleep 150 ms)', output: 'log(3) runs once' },
      { input: 'd.call(1); d.cancel(); (sleep)', output: 'log never runs' },
    ],
    hints: [
      'You cannot kill a sleeping thread, so give every `call` and `cancel` a new generation number (`Arc<Mutex<u64>>` or `AtomicU64`); the timer thread sleeps, then fires only if its generation is still the current one.',
      '`thread::spawn(move || { thread::sleep(wait); if still_latest { f(arg) } })` with `f: Arc<dyn Fn(A) + Send + Sync>` cloned into the closure; `arg` moves in, so `A` needs no `Clone`.',
      'Lock the generation to read it, then release before calling `f`; a handler that calls `cancel` while you hold the lock would deadlock.',
      'Alternative without a thread per call: one worker thread and a `Condvar` with `wait_timeout` that each `call` resets.',
    ],
    nuances: [
      'Cancellation is cooperative: the sleeping thread wakes, compares its generation with the shared counter and does nothing if superseded. That replaces clearing a timer, and it is why `cancel` is a counter bump rather than a kill.',
      '`f` is stored as `Arc<dyn Fn(A) + Send + Sync>` because it is called from the timer thread, possibly while another thread is also calling it: `Fn` (not `FnMut`) and `Sync` are exactly what concurrent calls require. `A: Send + \'static` because the argument moves into the spawned closure.',
      '`call(&self)` rather than `&mut self`: the state sits behind `Arc<Mutex<..>>`, so the debouncer can be shared or cloned into other threads. Hold the guard only to bump and read the counter; never while running `f`.',
      'A spawned thread holds its own `Arc` clones and outlives the `Debounced`: dropping the debouncer with a call pending still fires it. Decide and say so: an `impl Drop` that bumps the generation gives drop-cancels semantics; a kept `JoinHandle` would let `Drop` wait.',
      '`thread::sleep` is "at least this long", so the driver leaves slack (60 ms for a 20 ms wait); if you compute a deadline, use `Instant` (monotonic), never `SystemTime`.',
      'Thread per call is fine for a demo and wrong at 10k calls a second; the single-worker `Condvar::wait_timeout` design has one thread, and a `Mutex<Option<A>>` holding the latest argument, taken with `take()` when it fires.',
    ],
  },
  'retry-with-backoff': {
    description: [
      'Write `retry(f, &options) -> Result<T, E>` where `f: impl FnMut() -> Result<T, E>` and `RetryOptions<E>` carries `retries: u32`, `base_ms: u64` and `should_retry: Option<Box<dyn Fn(&E) -> bool>>`. On an error, wait `base_ms * 2^attempt` milliseconds and try again, up to `retries` more times. Return the first `Ok`; after the last failure return that last `Err`, not a generic "gave up". When `should_retry` returns false, return the error at once.',
      'The `retry_demo` driver passes a closure that mutates a `calls` counter and fails with `"down <n>"` or `"fatal"`; it checks the call count, so the attempt arithmetic must be exact.',
    ],
    hints: [
      'A `loop` with `match f() { Ok(v) => return Ok(v), Err(e) => .. }` moves the error exactly once; recursion buys nothing here.',
      '`options.should_retry.as_ref().map_or(true, |keep| keep(&e))`: `None` means retry everything.',
      'Compute the delay from the attempt number with `1u64 << attempt.min(32)` or `checked_mul`, then `thread::sleep(Duration::from_millis(..))`; do not sleep after the final failure.',
      '`retries` counts attempts after the first: retries 2 means three calls.',
    ],
    nuances: [
      '`f` is `impl FnMut`, a generic parameter, because the caller\'s closure mutates its captures (the driver counts calls) and because a boxed closure would cost an allocation and an indirect call for nothing; `should_retry` is `Box<dyn Fn(&E) -> bool>` because it is stored in a struct and only borrows the error.',
      'The error moves out of the `Err(e)` arm and is either returned or dropped before the next attempt; no `E: Clone`, no `Option<E>` juggling, no `unwrap` on a "last error" slot.',
      '`base_ms * 2u64.pow(attempt)` overflows at large attempt counts: a panic in debug, a silent wrap to a tiny delay in release. Cap the exponent, use `saturating_mul`, or clamp to a maximum delay; `Duration` arithmetic itself is checked.',
      'The boundary off-by-one is the whole test: `retries` extra attempts after the first, no sleep after the last, and the real last error returned. A `for attempt in 0..=retries` with the sleep guarded by `attempt < retries` is the other clean shape.',
      '`thread::sleep` blocks the calling thread, which is right for a synchronous API; in a service you add jitter so clients do not retry in lockstep (std has no random source; hash `Instant::now()` nanos or take a `rand` dependency).',
      '`E` has no bound here, which lets the driver use `String`; a library version would bound `E: std::error::Error` or wrap attempts in its own error type while keeping the last error reachable through `source()`.',
    ],
  },
  'event-emitter': {
    description: [
      'Implement `Emitter<P>`: `on(&self, name: &str, handler: impl Fn(&P) + \'static) -> Unsubscribe` registers a handler and returns a `Box<dyn Fn()>` that removes it; `once` runs its handler one time; `emit(&self, name: &str, payload: &P)` calls every current handler in registration order. A handler that unsubscribes during `emit` must not break iteration of the others, and emitting a name with no handlers is a no-op.',
      'The methods take `&self`, so the state needs interior mutability. The `emitter_demo` driver registers closures that capture an `Rc<RefCell<Vec<Json>>>` recorder and, for `"self-off:<s>"`, call their own unsubscribe from inside the handler. Single-threaded by design: `Rc`, `RefCell`, no `Send`.',
    ],
    examples: [
      { input: 'e.on("x", a); e.once("x", b); e.emit("x", &1); e.emit("x", &2)', output: 'a(&1), b(&1), a(&2)' },
      { input: 'off = e.on("t", ..); off(); e.emit("t", &0)', output: 'nothing runs' },
    ],
    hints: [
      '`Rc<RefCell<Inner>>` with `handlers: HashMap<String, Vec<(usize, Rc<dyn Fn(&P)>)>>` and a counter for ids; closures have no equality, so the id is how you find one again.',
      'In `emit`, clone the `Vec` of `Rc` handlers for the name, drop the `RefCell` borrow, then iterate the clone; otherwise a handler calling `off()` hits `borrow_mut` on an already borrowed cell and panics.',
      'The unsubscribe closure captures `Rc::downgrade(&inner)`, the name and the id, and does `list.retain(|(i, _)| *i != id)` when it can `upgrade()`.',
      '`once` wraps the handler: call `off()` first, then the handler; the `off` must be an `Rc<dyn Fn()>` so both the wrapper and the returned `Unsubscribe` can hold it.',
    ],
    nuances: [
      'Re-entrancy is the real test: `RefCell` turns a handler that unsubscribes mid-emit into a runtime "already borrowed" panic unless `emit` copies the handler list and releases the borrow before calling anything. Cloning `Rc<dyn Fn>` handles is a refcount bump each, not a copy of the closures.',
      'Closures are not comparable, so a set of handlers does not work; a `Vec<(id, handler)>` keeps registration order (a `HashMap` would not) and `retain` by id is the removal.',
      'Reference cycles: the `once` wrapper stored inside the emitter captures `off`, which would capture the emitter; holding `Weak<RefCell<Inner>>` in the unsubscriber breaks the cycle, and an `off` called after the emitter is gone simply does nothing.',
      '`Rc` and `RefCell` are `!Send`/`!Sync`, so this emitter cannot cross threads. The threaded version is `Arc<Mutex<..>>` with `Fn(&P) + Send + Sync` handlers, and it must still release the lock before calling handlers or the first self-unsubscribe deadlocks.',
      'Payload by `&P`: one value, many handlers, no `Clone` bound on `P`; a handler that wants to keep it clones. `impl Fn(&P) + \'static` means handlers own what they capture, hence the driver\'s `Rc<RefCell<Vec>>` recorder.',
      '`on(&self)` with interior mutability lets the driver hold the emitter and a `Vec` of its unsubscribe closures at the same time; a `&mut self` API would make that borrow pattern impossible.',
    ],
  },
  'token-bucket': {
    description: [
      'Implement `TokenBucket::new(capacity: u64, refill_per_second: f64, now: impl Fn() -> u64 + \'static)` where `now` returns milliseconds, and `try_remove(&mut self, n: u64) -> bool` that removes `n` tokens if available. Tokens refill continuously at `refill_per_second`, never exceeding `capacity`, computed lazily from the clock on each call rather than by a timer thread.',
      'The clock is stored as `Box<dyn Fn() -> u64>`. The `bucket_demo` driver injects a clock backed by `Rc<Cell<u64>>` and moves it with `["at", ms]` steps, so no real time passes in the tests.',
    ],
    examples: [
      { input: 'capacity 3, refill 1/s: try_remove(1) four times at t = 0', output: 'true, true, true, false' },
      { input: 'then at t = 2000: try_remove(1) three times', output: 'true, true, false' },
    ],
    hints: [
      'Fields `tokens: f64` and `last_ms: u64`; in `new`, start full and read the clock once.',
      'A private `refill(&mut self)`: `let t = (self.now)(); tokens = (tokens + elapsed_seconds * rate).min(capacity as f64); last_ms = t`. Call it at the top of `try_remove`.',
      'Calling a closure stored in a field needs the parentheses: `(self.now)()`, or Rust looks for a method named `now`.',
      'Fractional tokens matter: at 1/s, 500 ms later there is half a token and a request for one still fails.',
    ],
    nuances: [
      'The injected clock is what makes the test deterministic: `Box<dyn Fn() -> u64>` built from `impl Fn() -> u64 + \'static`; in production you pass `move || start.elapsed().as_millis() as u64` from an `Instant`, which is monotonic, never `SystemTime`, which can jump backwards.',
      '`t.saturating_sub(self.last_ms)`: `u64` subtraction underflows if a clock ever goes backwards, and that is a panic in debug and a wrap to a huge refill in release.',
      '`tokens` is `f64` while `capacity` and `n` are `u64`; the casts (`as f64`) are explicit and the comparison is `tokens < n as f64`. Float accumulation drifts over millions of refills; integer micro-tokens (`tokens * 1_000_000` as `u64`) is the exact alternative.',
      '`try_remove(&mut self)` because refill mutates state, and `Box<dyn Fn() -> u64>` without `+ Send + Sync` makes the bucket `!Send` and `!Sync`; a limiter shared between request threads wants `Send + Sync` bounds on the clock and either a `Mutex` around the state or a CAS loop on packed atomics.',
      'Lazy refill means no timer thread, no `Arc`, no shutdown problem: the bucket is a plain value whose only side effect is reading the clock.',
      'Compare with a sliding-window log (a `VecDeque<Instant>` of recent timestamps) and a fixed window counter; the bucket allows bursts up to `capacity` and smooths to the rate, which is why it is the one APIs use.',
    ],
  },
  'flatten-object': {
    description: [
      'Write `flatten(obj: Json, separator: Option<String>) -> Json` that turns a nested object into a single-level `Json::Object` whose keys are the joined paths. Arrays count as objects with index keys. Leaves (scalars, `Null` and empty containers) are kept as values. The separator defaults to `"."`.',
      '`Json::Object` is a `Vec<(String, Json)>`, so the output keeps the input\'s key order; `Json::Array` is a `Vec<Json>`. Nested data of mixed kinds is why the function works on `Json` rather than a typed struct.',
    ],
    hints: [
      'A recursive helper `fn walk(value: &Json, prefix: &str, sep: &str, out: &mut Vec<(String, Json)>)`; closures cannot recurse, so make it a nested `fn`.',
      '`match value { Json::Object(kvs) if !kvs.is_empty() => .., Json::Array(items) if !items.is_empty() => .., leaf => out.push((prefix.to_string(), leaf.clone())) }`: the guards make an empty container fall into the leaf arm.',
      'Build the path with `format!("{prefix}{sep}{key}")` unless the prefix is empty; indices via `enumerate()` and `i.to_string()`.',
      '`separator.as_deref().unwrap_or(".")` gives a `&str` without allocating a default.',
    ],
    nuances: [
      'Enum dispatch replaces `typeof` checks: `Null` is its own variant, so there is no null-is-an-object trap, and the match is exhaustive, so a new `Json` kind would fail to compile rather than silently fall through.',
      '`Json::Object` is an ordered `Vec` of pairs, not a `HashMap`, so output order is the input order and tests comparing as JSON are stable; a `HashMap` here would scramble keys and force a sort.',
      'Ownership: `flatten` takes `obj: Json` by value; walking by `&Json` and `clone()`-ing the leaves is simple and cheap (leaves are scalars); consuming with `into_iter()` moves leaves out with no clone at all, at the cost of a less readable walk. Say which and why.',
      'Pass `&mut out` down the recursion rather than returning and concatenating a `Vec` per level; one allocation per key for the path string is unavoidable without a `String` builder you push to and truncate.',
      'Deeply nested input recurses once per level: the main thread has 8 MiB of stack and spawned threads 2 MiB, so an iterative walk with an explicit `Vec<(&Json, String)>` stack is the robust version.',
      'Arrays as index keys is a design choice to state out loud; the other reasonable answer (arrays are leaves) is a one-arm change in the match.',
    ],
  },
  'memoize-ttl': {
    description: [
      'Write `memoize(f, ttl_ms, now) -> Memoized<A, R>` where `f: impl FnMut(&A) -> R + \'static`, `now: impl Fn() -> u64 + \'static` returns milliseconds, `A: Hash + Eq` and `R: Clone`. `call(&mut self, arg: A) -> R` caches the result per argument for `ttl_ms`; after the TTL the next call recomputes. `clear(&mut self)` empties the cache.',
      'A function of several arguments is memoised on a tuple: the `memo_demo` driver memoises `|&(a, b): &(i64, i64)| a + b` with a counting closure and an `Rc<Cell<u64>>` clock, and checks both the results and how many times the adder ran.',
    ],
    examples: [
      { input: 'm = memoize(slow_add, 1000, clock); m.call((1, 2)); m.call((1, 2))', output: 'slow_add runs once' },
      { input: 'after 1001 ms: m.call((1, 2))', output: 'slow_add runs again' },
      { input: 'm.clear(); m.call((1, 2))', output: 'slow_add runs again' },
    ],
    hints: [
      '`cache: HashMap<A, (R, u64)>` mapping the argument to the value and its expiry; the argument itself is the key, no serialising.',
      '`if let Some((v, expires_at)) = self.cache.get(&arg) { if *expires_at > t { return v.clone(); } }` then compute `(self.f)(&arg)` and `insert(arg, (value.clone(), t + ttl_ms))`.',
      'The `get` borrow ends at the `return`, so the later `insert` compiles; `entry()` does not fit because computing the value borrows `self.f` while the entry borrows `self.cache`.',
      'Treat an expired entry as a miss and overwrite it; `clear` is `self.cache.clear()`.',
    ],
    nuances: [
      'The key is the argument, typed: `A: Hash + Eq` does soundly what serialising the argument list approximates. It also exposes the sharp edge: `f64` is neither `Eq` nor `Hash`, so a float argument needs a wrapper over its bits, and a struct key needs `#[derive(Hash, Eq, PartialEq)]`.',
      '`R: Clone` because `call` returns `R` by value and a hit must hand out a copy; returning `&R` would borrow `&mut self` for as long as the caller holds it and block `clear`. For large results, cache `Rc<R>` so a hit is a refcount bump.',
      '`f` is `Box<dyn FnMut(&A) -> R>`: `FnMut` because the driver\'s closure counts calls, which is also why `call` is `&mut self`; calling a field holding a closure needs `(self.f)(&arg)`.',
      '`call(&mut self, arg: A)` takes the argument by value so it can move into the map as the key with no clone, but the lookup must borrow it (`get(&arg)`) before the insert consumes it; the two-step get-then-insert shape is the borrow checker\'s preferred one here.',
      'Expired entries stay in the map until the same argument comes back: memory grows with distinct arguments. Mention a sweep on insert or a bounded size (this is where the LRU meets the TTL).',
      'Not thread-safe: `Box<dyn FnMut>` without `Send` and a plain `HashMap`. The shared version is `Mutex<HashMap>` with `Send + Sync` closures and a choice about the thundering herd: hold the lock across the compute, or let concurrent misses compute twice.',
    ],
  },
  'deep-equal': {
    description: [
      'Write `deep_equal(a: Json, b: Json) -> bool`: numbers by value (`Float(f64::NAN)` equals itself, and `Int(5)` equals `Float(5.0)`), arrays element-wise, objects key-wise regardless of key order. Different kinds or different key sets are not equal; a key that is present with a `Null` value differs from an absent key.',
      '`Json` derives `PartialEq`, but the derived `==` compares variants structurally: it calls NaN unequal to NaN, `Int(5)` unequal to `Float(5.0)`, and compares `Object` pairs in order. The `deep_equal_checks` driver covers exactly those three cases.',
    ],
    examples: [
      { input: 'deep_equal({"a": 1, "b": 2}, {"b": 2, "a": 1})', output: 'true' },
      { input: 'deep_equal({"a": 1}, {"a": 1, "b": null})', output: 'false' },
      { input: 'deep_equal(Json::Float(f64::NAN), Json::Float(f64::NAN))', output: 'true' },
    ],
    hints: [
      'A helper `fn eq(a: &Json, b: &Json) -> bool` with `match (a, b)` on the pair; recurse on references so nothing is cloned.',
      'Numbers: an arm `(Int(_) | Float(_), Int(_) | Float(_))` that compares via `as_f64()` with `x == y || (x.is_nan() && y.is_nan())`.',
      'Objects: `xs.len() == ys.len() && xs.iter().all(|(k, x)| b.get(k).map_or(false, |y| eq(x, y)))`; arrays: `zip` plus `all`.',
      'The catch-all arm `_ => a == b` covers `Null`, `Bool`, `Str`, and two different kinds (never equal).',
    ],
    nuances: [
      'Knowing why `#[derive(PartialEq)]` is wrong here is the point: derive is structural and variant-exact, so unifying `Int` and `Float` and treating NaN as equal to itself are deliberate deviations from IEEE and from the derived impl, and you should say so.',
      '`f64` is `PartialEq` only, never `Eq`, precisely because of NaN; `is_nan()` handles it, and `total_cmp` is the std tool when NaN must sort consistently. Say which zero you want: `0.0 == -0.0` is true in Rust as in IEEE.',
      '`Json::Object` is a `Vec<(String, Json)>`, so key-order independence is on you: same length plus every key of `a` found in `b`. `b.get(k)` is a linear scan, so this is quadratic per object; collect `HashMap<&str, &Json>` for large objects.',
      'Take `Json` by value because the harness does, but recurse on `&Json`; a version that clones subtrees to compare them is the transliteration a reviewer will flag.',
      'There are no cycles to guard against: `Json` is an owned tree, so the visited-pairs follow-up has no Rust equivalent here; with `Rc` graphs you would track `(Rc::as_ptr(a), Rc::as_ptr(b))` pairs in a `HashSet`.',
      'A key present with `Null` versus absent is the Rust face of the "present but empty" case; the length check catches it, and it is why "same key set" is part of the specification rather than "every key of a matches".',
    ],
  },
  'throttle': {
    description: [
      'Implement `Throttle::new(f, interval_ms, now)` where `f: impl Fn(A) + Send + Sync + \'static` and `now: impl Fn() -> u64 + Send + Sync + \'static` returns milliseconds. `call(&self, arg: A)` runs `f` at most once per interval: the first call runs immediately; calls during the interval are coalesced into one trailing call with the latest argument when the interval ends. `A: Send + \'static`.',
      'The injected clock decides; a timer thread is still needed for the trailing call. The `throttle_demo` driver builds `now` from an `Instant` and replays `["call", x]` and `["sleep", ms]` steps against a recorder behind `Arc<Mutex<Vec<i32>>>`.',
    ],
    examples: [
      { input: 't = Throttle::new(log, 100, clock); t.call(1); t.call(2); t.call(3); (sleep 150 ms)', output: 'log(1) immediately, log(3) at about 100 ms' },
      { input: 't.call(1); (sleep 25 ms); t.call(2) with interval 10', output: 'log(1), log(2): spaced calls all run' },
    ],
    hints: [
      'State behind `Arc<Mutex<State<A>>>`: `last: Option<u64>`, `pending: Option<A>`, `trailing: bool`.',
      'On `call`: if no `last` or `now - last >= interval` and no trailing thread is waiting, set `last` and run `f`; else store `pending = Some(arg)` and, if `!trailing`, spawn one thread that sleeps the remaining time.',
      'The timer thread locks, clears `trailing`, does `pending.take()`, sets `last`, drops the guard, then calls `f`.',
      '`interval_ms.saturating_sub(since)` for the remaining time; `u64` has no negative sentinel, which is what `Option<u64>` is for.',
    ],
    nuances: [
      'Two clocks, deliberately: the injected `now` decides whether a call is leading or must wait (testable, monotonic when built from `Instant::elapsed`), and `thread::sleep` only wakes the trailing thread, which re-reads `now` before running.',
      'Drop the `MutexGuard` (`drop(st)`) before calling `f`: holding the lock while running user code serialises every caller and deadlocks the moment `f` calls `call` again.',
      '`pending: Option<A>` with `take()` moves the latest argument out of the shared state into the trailing call with no `Clone` bound; a second call during the interval just overwrites `pending`, so exactly one trailing call fires with the newest argument.',
      '`f` and `now` are `Arc<dyn Fn + Send + Sync>` because the timer thread calls them while the caller\'s thread may call them too; `A: Send + \'static` because the pending argument crosses to that thread. Those bounds on `Throttle<A: Send + \'static>` are the type-level statement of the design.',
      'After the trailing call, `last` is set to that moment, so the next leading call waits a full interval; the second test (25 ms gaps at a 10 ms interval) checks that spaced calls still run immediately.',
      'Spawn-per-trailing is simple; the alternative is one long-lived worker and a `Condvar` with `wait_timeout`. Either way a dropped `Throttle` still fires its pending call unless `Drop` cancels it; say which you want.',
    ],
  },
  'async-queue': {
    description: [
      'Implement `TaskQueue::new(concurrency)`. `add(&self, task: impl FnOnce() -> Result<T, String> + Send + \'static) -> Receiver<Result<T, String>>` queues the task, runs at most `concurrency` tasks at once (each on its own thread) in FIFO order, and returns an `mpsc::Receiver` that yields the task\'s result once it has run. `on_idle(&self)` blocks until every added task has settled. A failing task reports its `Err` on its own receiver without stopping the queue.',
      'The `queue_demo` driver adds `["ok", value, ms]` and `["fail", message, ms]` tasks, measures peak concurrency, calls `on_idle`, then `recv()`s each receiver in add order. std only: `VecDeque`, `Mutex`, `Condvar`, `mpsc`, `thread`.',
    ],
    examples: [
      { input: 'q = TaskQueue::new(2); q.add(a); q.add(b); q.add(c)', output: 'a and b start now; c starts when one finishes' },
      { input: 'rx = q.add(|| Err("x".into())); q.on_idle(); rx.recv()', output: 'Ok(Err("x")): the task failed, the queue did not' },
    ],
    hints: [
      'Each task gets its own channel: `let (tx, rx) = mpsc::channel()`; wrap the task as `Box<dyn FnOnce() + Send>` that runs it and `tx.send(result)`, so the queue stores jobs of one type whatever `T` is.',
      '`Arc<(Mutex<Shared>, Condvar)>` with `pending: VecDeque<Box<dyn FnOnce() + Send>>` and `active: usize`; a `start_locked(&mut Shared, concurrency)` that pops and spawns while `active < concurrency`, called under the lock from `add` and from the end of every job.',
      '`on_idle`: `while st.active > 0 || !st.pending.is_empty() { st = idle.wait(st).unwrap(); }` and `notify_all()` whenever a job finishes.',
      'The job closure owns an `Arc` clone of the shared state so it can decrement `active` and start the next job when it is done.',
    ],
    nuances: [
      'The `Receiver` is the result handle: `recv()` blocks until the task has run and returns `Ok(result)`; `Err(RecvError)` means the sender was dropped without sending, which is what a panicking task looks like, and the driver reports it as "the task never reported". One channel per task is a oneshot by convention.',
      'Type erasure by closure: tasks have different `T`s, so the queue cannot store them typed; a `Box<dyn FnOnce() + Send>` that already owns its `Sender` makes `Shared` generic-free. `FnOnce` because a task runs once; boxed `FnOnce` has been callable since Rust 1.35.',
      '`Condvar` discipline: `wait` in a `while` loop over the predicate, never an `if`, because of spurious wakeups and because another waiter may have changed the state; `wait_while` is the std shortcut, and `notify_all` after every completion so `on_idle` and any other waiter both see it.',
      'Pop and spawn with the lock held (`start_locked`), so two jobs finishing at once cannot both start the same job or exceed `concurrency`; the task body itself runs outside the lock.',
      'A panicking task must still decrement `active` and notify, or `on_idle` waits forever: a small guard struct whose `Drop` does the bookkeeping, or `catch_unwind` around the task, is the production fix; `lock().unwrap()` would also panic on the poisoned mutex afterwards.',
      'Thread per job respects the bound and is simple; a fixed pool of `concurrency` workers pulling from the deque avoids spawn cost and is what a real queue does. Failures are just `Err` values travelling in the channel; the queue never inspects them.',
    ],
  },
  'deep-clone': {
    description: [
      'Implement `Value::deep_clone(&self) -> Value` for the given `Value` enum, whose containers are shared handles: `List(Rc<RefCell<Vec<Value>>>)` and `Map(Rc<RefCell<Vec<(String, Value)>>>)`, plus scalars and `Date(i64)`. Lists and maps are copied recursively; a handle that appears twice is copied once (the copies stay shared); a cycle points at the copy, not the original. Scalars and dates are returned as is.',
      'The `check` driver builds a value that contains itself and a shared sub-map, clones it, mutates the copy through `set`, and verifies independence, identity (`same`, which is `Rc::ptr_eq`) and that the `Date` survived; the JSON tests go through `Value::from_json`.',
    ],
    examples: [
      { input: 'a = map([("x", list([1, map([("y", 2)])]))]); b = a.deep_clone(); b.at("x").index(1).set("y", 3)', output: 'a.at("x").index(1).at("y") is still Int(2)' },
      { input: 'a.set("self", a.clone()); b = a.deep_clone()', output: 'b.at("self").same(&b) is true' },
      { input: 'a has the same map under "p" and "q"', output: 'b.at("p").same(&b.at("q")) and neither is the original' },
    ],
    hints: [
      'A helper `fn clone_with(&self, seen: &mut HashMap<usize, Value>) -> Value` where the key is the container\'s address: `Rc::as_ptr(items) as *const () as usize`.',
      'For a container: if `seen` has it, return the stored copy; else create an empty `Rc::new(RefCell::new(Vec::new()))`, insert it into `seen` first, then fill it from the children.',
      'Fill after registering: compute the copied children into a local `Vec`, then `*out.borrow_mut() = copied`.',
      'The catch-all arm `other => other.clone()`: the derived `Clone` is already a fresh copy of a scalar, a `String` or a `Date`.',
    ],
    nuances: [
      'Why a `Value` with `Rc<RefCell<..>>` rather than `Json`: `Json` is an owned tree, so `clone()` is already a deep copy and a cycle cannot exist; sharing and self-reference need handles (`Rc`), and mutating the copy in the driver needs `RefCell`. The price is a refcount per container and runtime borrow checks.',
      'Identity is the pointer: `Rc::ptr_eq` for `same`, `Rc::as_ptr(..) as usize` as the `seen` key. That key is only meaningful while the originals are alive, which `&self` guarantees for the duration of the clone.',
      'Register the copy before recursing: the self-pointer case finds the half-built copy in `seen` and clones its handle, which is exactly "a cycle points at the copy". Recursing first and inserting after is the infinite loop.',
      'Borrow the original (`items.borrow()`) only to read children, and write the copy with `borrow_mut()` only once the children are built; the original is never mutably borrowed, so a value that reaches itself never double-borrows.',
      '`Rc` makes this single-threaded (`!Send`); `Arc<Mutex<..>>` is the threaded variant. And `Rc` cycles leak: the driver\'s `a.set("self", a.clone())` is a leak on purpose, with `Weak` as the answer to who breaks it.',
      'The map is an ordered `Vec` of pairs for deterministic `to_json`, at the cost of linear lookup; `Date(i64)` is a plain value, so copying it is the derived `Clone`, the Rust shape of returning a primitive as is.',
    ],
  },
  'group-by': {
    description: [
      'Write `group_by<T, K: Hash + Eq>(items: Vec<T>, key_fn: impl Fn(&T) -> K) -> HashMap<K, Vec<T>>`: a map from key to the items with that key, in their original order within a group. Then write `top_per_category(orders: Vec<Order>) -> HashMap<String, String>`: for each category, the id of the order with the highest `total: f64`.',
      'Items are moved into their groups; nothing is cloned. The `group_by_parity` driver groups numbers by `"odd"`/`"even"` with `String` keys, and the tests pass orders as JSON objects through the given `FromJson` impl.',
    ],
    examples: [
      { input: 'group_by(vec![1, 2, 3, 4], |n| if n % 2 != 0 { "odd" } else { "even" })', output: '{"odd": [1, 3], "even": [2, 4]}' },
      { input: 'top_per_category of x:5 (a), x:9 (b), y:1 (c)', output: '{"x": "b", "y": "c"}' },
    ],
    hints: [
      '`out.entry(key_fn(&item)).or_default().push(item)` in a `for item in items` loop: one hash, no `contains_key` dance.',
      'Compute the key from `&item` first; the borrow ends before `item` moves into the `Vec`.',
      '`f64` is `PartialOrd` only, so `max_by_key` does not compile on totals; use `max_by(|a, b| a.total.total_cmp(&b.total))` or a fold with `>`.',
      '`group_by(orders, |o| o.category.clone())` then `into_iter().map(|(category, group)| ..).collect()`.',
    ],
    nuances: [
      'The entry API is the idiom and also the borrow-checker answer: `get_mut` then `insert` in an `if let`/`else` is the famous shape the checker rejects; `entry(k).or_default()` does one probe and hands back `&mut Vec<T>`.',
      'Items move: `Vec<T>` is consumed, each item is pushed by value, and `T` needs no `Clone`. The key is computed from a borrow that ends before the move; a key that borrows from the item (`&str` into a `String` field) cannot outlive it, which is why the closures return owned `String`s.',
      '`HashMap` iteration order is random: order within a group is preserved by the `Vec`, order of groups is not. The tests compare as JSON objects so it does not matter here; say that `BTreeMap` or `IndexMap` is the fix when a caller iterates.',
      '`f64` is not `Ord` because of NaN, so `max_by_key(|o| o.total)` is a compile error, not a runtime surprise; `total_cmp` orders NaN consistently, `partial_cmp(..).unwrap()` panics on it. Know that `max_by` returns the last maximum on ties and a fold with `>` the first.',
      '`o.category.clone()` in the key closure is correct, not lazy: the item is about to move into the group, so the key must own its string.',
      'The given `FromJson` impl shows `?` on `Result<_, String>` for field extraction; a struct the tests hand in or get back implements `FromJson`/`ToJson`, which is how typed Rust meets untyped test data.',
    ],
  },
  'parse-query-string': {
    description: [
      'Write `parse_query(qs: String) -> HashMap<String, QueryValue>` where `QueryValue` is `One(String)` or `Many(Vec<String>)`. The query string may start with `"?"`; repeated keys become `Many`, `"+"` means space, percent-encoding is decoded, and a key without `"="` gets an empty string. Values may contain `"="`.',
      'Write the percent decoder yourself (std only): a malformed escape such as `"%zz"` is kept literally rather than failing the whole parse. The given `ToJson` impl reports `One` as a string and `Many` as an array.',
    ],
    examples: [
      { input: 'parse_query("?a=1&b=two%20words&a=3&c")', output: '{"a": Many(["1", "3"]), "b": One("two words"), "c": One("")}' },
      { input: 'parse_query("q=a+b&eq=x=y")', output: '{"q": One("a b"), "eq": One("x=y")}' },
    ],
    hints: [
      '`qs.strip_prefix(\'?\').unwrap_or(&qs)`, then `split(\'&\').filter(|p| !p.is_empty())`, then `split_once(\'=\')` for the first `=` only.',
      'Upgrade One to Many by moving: `match out.remove(&key) { None => One(v), Some(One(first)) => Many(vec![first, v]), Some(Many(mut list)) => { list.push(v); Many(list) } }` then `insert`.',
      'Decode on bytes: walk `s.as_bytes()`, push `b\' \'` for `+`, parse `%XX` with `u8::from_str_radix(hex, 16)` into a `Vec<u8>`, then `String::from_utf8_lossy` once at the end.',
      '`bytes.get(i + 1..i + 3)` returns `None` near the end instead of panicking like `bytes[i + 1..i + 3]` would.',
    ],
    nuances: [
      'An enum models "a string or a list of strings" honestly; the One-to-Many upgrade is a `remove`, a `match` that moves the old value out, and an `insert`, with no clone and no `get_mut` borrow fight. `entry().and_modify()` is awkward here because the variant itself changes.',
      '`strip_prefix`, `split`, `split_once` all return `&str` slices of the input: zero allocation until `decode` produces the owned `String` that the map must own anyway.',
      'Percent-decoding is a byte operation: `%E2%9C%93` is one character in three escapes, so decoding into a `Vec<u8>` and validating UTF-8 once is the only correct order; decoding per escape into `char`s produces garbage. `from_utf8_lossy` substitutes U+FFFD; `String::from_utf8` would let you reject instead.',
      'Keeping a malformed `%` literally is a policy choice; a decoder that throws on bad input (the other language\'s default) fails the whole query for one bad byte. State the policy.',
      '`+` means space only in form encoding, not in path segments; a decoder shared with the route matcher must take that as a flag.',
      '`HashMap<String, QueryValue>` loses the order keys first appeared; `Vec<(String, QueryValue)>` or `IndexMap` keeps it when a caller cares. The signature takes `String` by value because the harness does; a library would take `&str`.',
    ],
  },
  'lfu-cache': {
    description: [
      'Implement `LfuCache::new(capacity)` with `get(&mut self, key: i32) -> i32` (the value or -1) and `set(&mut self, key: i32, value: i32)`: when over capacity, evict the least frequently used key, breaking ties by least recently used. The `run_lfu` driver replays `["set", k, v]` and `["get", k]` steps, including a cache of capacity 0.',
      'The textbook O(1) design is a linked hash set per frequency; the port stands in a `BTreeSet<(tick, key)>` per frequency ordered by a recency tick, which is O(log n) and needs no `Rc`. Either is acceptable if you can state the trade.',
    ],
    hints: [
      '`entries: HashMap<i32, Slot { value, freq, tick }>`, `buckets: HashMap<usize, BTreeSet<(u64, i32)>>`, `min_freq: usize`, and a `clock: u64` incremented on every touch so a larger tick means more recently used.',
      'A `touch(&mut self, key)`: remove `(tick, key)` from bucket `freq`, drop the bucket if empty and bump `min_freq` if it was that bucket, then `freq += 1`, new tick, insert into the next bucket.',
      'On a new key at capacity: `buckets.get_mut(&min_freq)` and `pop_first()` gives the least recent key in the least frequent bucket; remove it from `entries`. Then insert with `freq = 1` and set `min_freq = 1`.',
      'Return early from `set` when `capacity == 0`, and evict before inserting a new key, never on an update.',
    ],
    nuances: [
      'Inside `touch`, `self.entries.get_mut(&key)` and `self.buckets.get_mut(&slot.freq)` are two live `&mut` borrows of two different fields of `self`; the checker allows disjoint field borrows within one method body but not through two method calls that each take `&mut self`, which is why the bookkeeping is inlined against fields.',
      'The recency tick replaces insertion order: `BTreeSet<(u64, i32)>` orders by the tick first, `pop_first()` is the LRU within a frequency, and a strictly increasing `u64` clock means ties never happen. `u64` will not wrap in practice; say that you know it is a counter, not a time.',
      '`min_freq` is only meaningful while the cache is non-empty; it resets to 1 on every insert and increments only when the bucket you just emptied was the minimum. Empty buckets must be removed or a later `pop_first().unwrap()` on an empty set panics.',
      'Capacity 0 is in the tests: `set` must return before touching any bucket, and `get` must return -1 without side effects. `entries.len() >= capacity` is checked before inserting a new key; updating an existing key never evicts.',
      '`i32` keys and values are `Copy`, so none of the key-ownership questions from the generic `LruCache<K, V>` arise; -1 as the sentinel is the problem\'s contract, where a real API returns `Option<&V>` or `Option<V>`.',
      'The O(1) version is an arena of doubly linked nodes per frequency, the same technique as the LRU; `BTreeMap<usize, ..>` for the buckets would make `min_freq` derivable from `first_key_value()` instead of tracked by hand.',
    ],
  },
  'circular-buffer': {
    description: [
      'Implement `RingBuffer<T>::new(capacity)` over the given fixed `items: Vec<Option<T>>`: `push(&mut self, item: T) -> Option<T>` overwrites the oldest item when full and returns it (else `None`); `shift(&mut self) -> Option<T>` removes and returns the oldest; `len(&self)`; and `to_vec(&self) -> Vec<T>` oldest to newest, in a separate `impl<T: Clone>` block.',
      'The `ring_demo` driver stores `Json` items and replays `["push", x]`, `["shift"]`, `["toArray"]` and `["size"]` steps, recording each result.',
    ],
    examples: [
      { input: 'b = RingBuffer::new(3); b.push(1); b.push(2); b.push(3); b.push(4)', output: 'push(4) returns Some(1); to_vec() is [2, 3, 4]; len() is 3' },
      { input: 'capacity 2: push("a"); push("b"); shift(); push("c"); shift(); shift(); shift()', output: 'Some("a"), then Some("b"), Some("c"), None' },
    ],
    hints: [
      'Fields `start: usize` and `count: usize`; the live items are `count` slots from `start`, wrapping with `% capacity`.',
      '`shift`: `self.items[self.start].take()` moves the item out and leaves `None`; `push` when full: `self.items[self.start].replace(item)` swaps the new item in and returns the old.',
      '`to_vec`: `(0..self.count).filter_map(|i| self.items[(self.start + i) % self.capacity].clone()).collect()`.',
      'Guard `capacity == 0` before any `% capacity`, and check `count == 0` before `count -= 1`.',
    ],
    nuances: [
      '`Option::take` and `Option::replace` are the problem: they move a value out of a slot you only hold `&mut` to, leaving a valid `None` behind, so the buffer needs neither `T: Clone`, `T: Default` nor `unsafe` to hand items back by value.',
      '`to_vec` needs `T: Clone` because it copies out while the buffer keeps its items, hence the separate `impl<T: Clone>` block that leaves `push`/`shift` available for any `T`; an `iter(&self) -> impl Iterator<Item = &T>` is the lending alternative that needs no bound.',
      '`%` by zero panics, and `count -= 1` on zero panics in debug and wraps in release: a `capacity == 0` buffer and an empty `shift` are the two edge cases the arithmetic punishes. `(0..capacity).map(|_| None).collect()` builds the storage without `vec![None; n]`, which would need `T: Clone`.',
      '`push` returns the evicted item by value: ownership goes back to the caller, who decides to drop, log or re-queue it; a buffer that silently drops is the lesser API.',
      'Rust naming: `len()` not `size`, and clippy expects an `is_empty()` beside it; `to_vec` rather than `toArray`.',
      '`std::collections::VecDeque` is the std ring buffer (`push_back`/`pop_front`, growable); the exercise is the modular index arithmetic, after which you say you would use `VecDeque` plus a capacity check in production.',
    ],
  },
  'semver-compare': {
    description: [
      'Write `compare_versions(a: String, b: String) -> i32` returning -1, 0 or 1 for versions like `"1.2.10"` and `"1.2.9"`. Missing trailing parts count as 0 (`"1.0"` equals `"1.0.0"`). A pre-release suffix (`"1.0.0-beta"`) sorts before the release (`"1.0.0"`).',
      'Compute the answer as a `std::cmp::Ordering` and convert at the end; the `i32` is only the harness\'s contract.',
    ],
    examples: [
      { input: 'compare_versions("1.2.10", "1.2.9")', output: '1' },
      { input: 'compare_versions("1.0", "1.0.0")', output: '0' },
      { input: 'compare_versions("1.0.0-beta", "1.0.0")', output: '-1' },
    ],
    hints: [
      'A `parse(&str) -> (Vec<u64>, Option<&str>)`: `split_once(\'-\')` for the suffix, `split(\'.\')` and `parse::<u64>()` for the numbers.',
      '`(0..max_len).map(|i| x.get(i).copied().unwrap_or(0).cmp(&y.get(i).copied().unwrap_or(0))).find(|o| o.is_ne()).unwrap_or(Ordering::Equal)` pads with zeros and stops at the first difference.',
      '`match (pre_a, pre_b)` on the pair of `Option<&str>` gives the four pre-release cases; chain with `by_numbers.then(by_prerelease)`.',
      '`Ordering as i32` is -1, 0 or 1.',
    ],
    nuances: [
      '`Ordering` is the type Rust compares with, and `then` chains tie-breaks without nested ifs; `Ordering` is `#[repr(i8)]` with values -1, 0, 1, so `as i32` is the whole conversion to the harness\'s contract.',
      'Parse before comparing: `"10" < "9"` as strings is the classic bug, and `parse::<u64>()` makes the fix explicit. `unwrap_or(0)` on a bad part is a silent choice; a library returns `Result` from a `FromStr` impl for a `Version` type.',
      '`parse` returns the suffix as `Option<&str>` borrowed from the input: the elided lifetime ties it to the argument, and no `String` is allocated for it.',
      'Iterator adaptors over an index loop: `find(|o| o.is_ne())` short-circuits at the first differing part, and `get(i).copied().unwrap_or(0)` is the zero padding without resizing either `Vec`.',
      '`&str` comparison is bytewise, so `"beta" < "rc"` works but `"alpha.10" < "alpha.9"`; real semver splits the pre-release on `.` and compares numeric identifiers numerically, and ignores build metadata after `+`. Those are the follow-ups.',
      'Taking `String` by value is the harness\'s signature; borrow immediately (`parse(&a)`) and say a library would take `&str`.',
    ],
  },
  'resolve-dependencies': {
    description: [
      'Write `install_order(deps: HashMap<String, Vec<String>>) -> Result<Vec<String>, String>`: `deps` maps each package to the packages it depends on. Return an order in which every package comes after its dependencies, or `Err` with a message starting with `"cycle"` (for the tests, `"cycle: a -> b -> a"`). Among valid orders prefer alphabetical when there is a choice. A package that appears only as a dependency is still a node.',
      'The `install_order_or_error` driver returns the order as a `Json::Array` or the error message as a `Json::Str`.',
    ],
    examples: [
      { input: 'install_order({"app": ["lib", "util"], "lib": ["util"], "util": []})', output: 'Ok(["util", "lib", "app"])' },
      { input: 'install_order({"a": ["b"], "b": ["a"]})', output: 'Err("cycle: a -> b -> a")' },
    ],
    hints: [
      'Collect every name (keys and values) into a `BTreeSet<&str>`; build `indegree: HashMap<&str, usize>` and `dependents: HashMap<&str, Vec<&str>>` borrowing from `deps`.',
      'Kahn\'s algorithm with `ready: BTreeSet<&str>` and `while let Some(n) = ready.pop_first()`: the ordered set is the alphabetical tie-break.',
      'If `order.len() != nodes.len()` there is a cycle: a DFS with `HashMap<&str, bool>` (on the path / finished) and a `path: Vec<&str>` stack names it; the message is `path[at..]` closed with the repeated package.',
      'The DFS helper needs an explicit lifetime: `fn find_cycle<\'a>(n: &\'a str, deps: &\'a HashMap<..>, state: &mut HashMap<&\'a str, bool>, path: &mut Vec<&\'a str>)`.',
    ],
    nuances: [
      '`BTreeSet<&str>` for the ready set makes the tie-break a property of the data structure, and `pop_first()` is the sorted queue; a `HashMap` or `HashSet` here would give a different valid order on every run, which a test cannot pin down.',
      'Borrow the input: every working structure holds `&str` into `deps` (`String::as_str`), so names are cloned only once, into the result. The lifetimes work because `deps` outlives everything built from it inside the function.',
      'Nodes with no entry of their own (`util`) must get an indegree before counting edges, otherwise `indegree.get_mut(pkg).unwrap()` panics on the first edge into them; collecting keys and values into the node set first is what makes those unwraps sound.',
      '`Result<Vec<String>, String>` instead of a thrown error: the single `Err(format!("cycle: {}", cycle.join(" -> ")))` site needs no `?`; a library would return `enum ResolveError { Cycle(Vec<String>) }` with a `Display` impl so callers can match rather than parse.',
      'The DFS helper is the one place elision cannot help: `state` and `path` store `&\'a str` borrowed from `deps` across recursive calls, so the lifetime must be named to say they all come from the same place.',
      'Kahn\'s detects the cycle (leftover nodes) but cannot name it; the DFS only runs on failure. Recursion depth equals the longest dependency chain; an iterative DFS is the answer for very large graphs.',
    ],
  },
  'match-route': {
    description: [
      'Write `match_route(pattern: String, path: String) -> Option<Match>` where `Match { params: HashMap<String, String> }`. The pattern has literal segments, `:param` segments and an optional trailing `*` wildcard whose remainder is captured under `"*"`. Literal segments must match exactly, a trailing slash is ignored, and a path with extra segments does not match.',
      'The given `ToJson` impl reports a `Match` as `{"params": {...}}`; `None` is reported as null.',
    ],
    examples: [
      { input: 'match_route("/users/:id/posts/:postId", "/users/42/posts/7")', output: 'Some(Match { params: {"id": "42", "postId": "7"} })' },
      { input: 'match_route("/files/*", "/files/a/b.txt")', output: 'Some(Match { params: {"*": "a/b.txt"} })' },
      { input: 'match_route("/users/:id", "/users/42/extra")', output: 'None' },
    ],
    hints: [
      '`s.split(\'/\').filter(|part| !part.is_empty())` for both strings handles leading, trailing and doubled slashes at once.',
      'Walk the pattern with `enumerate()`; `let actual = given.get(i)?;` returns `None` when the path is shorter.',
      '`match p.strip_prefix(\':\') { Some(name) => { params.insert(name.to_string(), actual.clone()); } None if p != actual => return None, None => {} }`.',
      'A trailing `*` captures `given[i..].join("/")` and returns at once; otherwise require `given.len() == wanted.len()` at the end.',
    ],
    nuances: [
      '`Option<Match>` instead of a nullable object, and a named struct rather than a bare map: the `?` operator on `Option` inside the loop (`given.get(i)?`) is the early exit, and `derive(Debug, PartialEq)` on `Match` is what makes it testable.',
      '`strip_prefix(\':\')` returns `Option<&str>`, the parameter name without allocating; the three-way `match` with a guard (`None if p != actual => return None`) is the idiomatic shape for "param, mismatched literal, matched literal".',
      'Slicing out of range panics in Rust rather than returning empty: `given[i.min(given.len())..]` guards the wildcard case where the path is exactly the prefix (`/files/*` against `/files`).',
      '`filter(|part| !part.is_empty())` makes the trailing-slash rule fall out of segmentation, but it also treats `//` as one slash; say whether that is acceptable for your router.',
      'Collecting segments into `Vec<String>` is clear and allocates per segment; `Vec<&str>` borrowing from the two owned `String` parameters is the zero-copy version and is easy here because both inputs outlive the function body.',
      'No percent-decoding in this port: `/users/John%20Doe` arrives encoded. The byte-level decoder from the query-string problem is what you would reuse, with `+` left alone in paths.',
    ],
  },
  'set-in-immutable': {
    description: [
      'Implement `Value::set_in(&self, path: &[Key], value: Value) -> Value` for the given immutable `Value` enum, whose containers are `List(Rc<Vec<Value>>)` and `Map(Rc<Vec<(String, Value)>>)` and `Key` is `Name(String)` or `Index(usize)`. Return a new value with `value` at the path, without mutating `self`: only the containers along the path are copied; every untouched branch is shared (the same `Rc`). Missing intermediates are created (a `List` when the next key is an `Index`, else a `Map`), and a list grows with `Null`s up to an index past its end.',
      'The `check` driver verifies the new value, that the input is untouched, that an untouched sibling is the same `Rc` (`same`, which is `Rc::ptr_eq`), and that a list copy leaves its neighbours shared.',
    ],
    examples: [
      { input: 'input = map([("a", map([("b", 1)])), ("c", map([("d", 2)]))]); out = input.set_in(&[Name("a"), Name("b")], 9)', output: 'out.at("a").at("b") is 9; input is unchanged; out.at("c").same(&input.at("c"))' },
      { input: 'Value::Null.set_in(&[Name("xs"), Index(0)], "a")', output: '{"xs": ["a"]}' },
    ],
    hints: [
      '`let Some((head, rest)) = path.split_first() else { return value };` is the base case; recursion on `&[Key]` slices allocates nothing.',
      '`match (self, head)`: `(List(items), Index(i))` copies one level with `(**items).clone()`, resizes if needed, and sets `copy[i]` to the child; `(Map(pairs), Name(k))` finds the position or pushes a new pair.',
      'The two remaining arms are the mismatches: start from `Value::List(Rc::new(Vec::new()))` or `Value::Map(Rc::new(Vec::new()))` and call `set_in` again on it.',
      'A helper `child(current, rest, value)`: `value` itself when `rest` is empty, else `current.set_in(rest, value)`.',
    ],
    nuances: [
      'Persistence by `Rc` handles that are never mutated: `clone()` on an `Rc` is a refcount bump, so a new version shares every untouched subtree for free, and `(**items).clone()` copies exactly one level (a `Vec` whose elements are scalars or more `Rc` handles). That is structural sharing, and `Rc::ptr_eq` is how the driver proves it.',
      '`Rc::make_mut` is std\'s copy-on-write and the trap here: it mutates in place when the count is 1, which would alter the caller\'s value if they had moved it in. Taking `&self` and returning a fresh `Value` keeps the contract honest regardless of counts.',
      '`let ... else` (Rust 1.65) with `split_first()` expresses the base case in one line, and recursing on a `&[Key]` sub-slice costs no allocation; `Vec::resize(i + 1, Value::Null)` to grow a list requires `Value: Clone`, which the derive provides.',
      '`Key` as an enum lets `match (self, head)` decide create-a-List versus create-a-Map for a missing intermediate and replace a scalar that is in the way; the mismatch arms recurse on an empty container of the kind the key wants.',
      'No `RefCell` on purpose: the deep-clone port needs interior mutability to mutate the copy, this one never mutates, so there is nothing to borrow-check at runtime. Contrast the two when asked.',
      'The map is an ordered `Vec<(String, Value)>` with a linear `position()` lookup, which keeps `to_json` deterministic; a `HashMap` would make lookup O(1), the copy more expensive, and the output order random.',
    ],
  },
  'with-timeout-abort': {
    description: [
      'Using the given `CancelToken` (clones share it; `cancel` wakes every `wait`), write `sleep(ms, token: Option<&CancelToken>) -> Result<(), String>` that sleeps for `ms` or returns `Err("aborted")` as soon as the token is cancelled, and `with_timeout(run, ms) -> Result<T, String>` where `run: impl FnOnce(CancelToken) -> Result<T, String> + Send + \'static` runs on another thread. If it does not finish within `ms`, cancel the token and return `Err("timeout")`. Either way nothing is left running when `with_timeout` returns.',
      'Threads cannot be killed: cancellation is cooperative, so the callee must watch the token. The `timeout_demo` driver runs a token-aware `sleep` under a limit and checks that the inner sleep saw `"aborted"`; `sleep_at_least` checks that a plain `sleep(ms, None)` really waits.',
    ],
    examples: [
      { input: 'with_timeout(|token| sleep(1000, Some(&token)), 20)', output: 'Err("timeout") after about 20 ms; the inner sleep returned Err("aborted")' },
      { input: 'with_timeout(|_| Ok(1), 50)', output: 'Ok(1), without waiting 50 ms' },
    ],
    hints: [
      '`sleep` with a token is `token.wait(Duration::from_millis(ms))`: true means cancelled, so `Err("aborted")`; with `None`, `thread::sleep`.',
      'In `with_timeout`: `let (tx, rx) = mpsc::channel(); thread::spawn(move || { let _ = tx.send(run(theirs)); });` then `rx.recv_timeout(Duration::from_millis(ms))`.',
      '`Ok(result)` is the answer; `Err(RecvTimeoutError::Timeout)` means cancel the token, wait for the callee to stop (`rx.recv()` or join), and return `Err("timeout")`; `Err(Disconnected)` means the thread died without sending.',
      'The token is `Clone`: keep one, hand the other to `run`.',
    ],
    nuances: [
      'Cooperative cancellation is the whole model: a Rust thread cannot be aborted from outside, so `with_timeout` can only cancel the token and the callee decides when to notice. A `sleep` built on `thread::sleep` ignores the token and fails the first test; `Condvar::wait_timeout` is what makes a sleep interruptible.',
      'The token\'s `wait` is a textbook `Condvar` loop: `while !*cancelled` around `wait_timeout`, recomputing the remaining time from an `Instant` deadline, because `wait_timeout` can return early (spurious wakeups) and `Instant` is monotonic where `SystemTime` is not.',
      '`mpsc::channel` plus `recv_timeout` is the race between the work and the clock in std: `Ok` wins, `Timeout` cancels, `Disconnected` means the worker panicked and dropped its `Sender` without sending. No second timer thread is needed.',
      '"Nothing left running" is enforced after the timeout by `rx.recv()` (or joining the `JoinHandle`): the function returns only once the callee has actually stopped, which is the Rust shape of clearing the timer and removing the listener. The driver checks the inner `"aborted"` within 5 ms.',
      '`run: FnOnce(CancelToken) -> Result<T, String> + Send + \'static` and `T: Send + \'static` because the closure and its result cross a `thread::spawn` boundary; `thread::scope` cannot help here because the caller must return while the callee may still be winding down.',
      '`lock().unwrap()` inside the token panics if a thread panicked while holding the flag; for a shutdown flag `AtomicBool` plus a `Condvar` (or `unwrap_or_else(PoisonError::into_inner)`) is more robust, and a guard struct whose `Drop` cancels the token would make early returns and panics cancel too.',
    ],
  },
}
