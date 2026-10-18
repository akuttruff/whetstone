import type { Port } from '../types.ts'

/**
 * The practical problems in Java. Promises become CompletableFutures and
 * executors, AbortSignal becomes a small CancelToken, and each file carries
 * the same test driver the TypeScript version has (see
 * practical-drivers.ts), so the same tests run here. Drivers live on
 * `class Solution`; the classes under test are top-level non-public classes.
 */

const IMPORTS = `import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;

`

export const JAVA_PRACTICAL: Record<string, Port> = {
  'lru-cache': {
    starter: IMPORTS + `/** A fixed-capacity cache: get marks a key most recently used; set evicts the least recently used entry once over capacity. Both O(1). */
class LRUCache<K, V> {
  private final int capacity;

  LRUCache(int capacity) {
    this.capacity = capacity;
    // your fields
  }

  public V get(K key) {
    // your code
    return null;
  }

  public void set(K key, V value) {
    // your code
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Integer[] runLru(int capacity, List<List<Object>> ops) {
    LRUCache<Integer, Integer> c = new LRUCache<>(capacity);
    Integer[] out = new Integer[ops.size()];
    for (int i = 0; i < ops.size(); i++) {
      List<Object> op = ops.get(i);
      if (op.get(0).equals("set")) { c.set((Integer) op.get(1), (Integer) op.get(2)); out[i] = null; }
      else out[i] = c.get((Integer) op.get(1));
    }
    return out;
  }
}
`,
    solution: IMPORTS + `class LRUCache<K, V> {
  private final int capacity;
  private final LinkedHashMap<K, V> items = new LinkedHashMap<>(); // insertion order: oldest first

  LRUCache(int capacity) {
    this.capacity = capacity;
  }

  public V get(K key) {
    if (!items.containsKey(key)) return null;
    V value = items.remove(key);
    items.put(key, value); // move to most recent
    return value;
  }

  public void set(K key, V value) {
    items.remove(key);
    items.put(key, value);
    if (items.size() > capacity) items.remove(items.keySet().iterator().next());
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Integer[] runLru(int capacity, List<List<Object>> ops) {
    LRUCache<Integer, Integer> c = new LRUCache<>(capacity);
    Integer[] out = new Integer[ops.size()];
    for (int i = 0; i < ops.size(); i++) {
      List<Object> op = ops.get(i);
      if (op.get(0).equals("set")) { c.set((Integer) op.get(1), (Integer) op.get(2)); out[i] = null; }
      else out[i] = c.get((Integer) op.get(1));
    }
    return out;
  }
}
`,
  },
  'promise-pool': {
    starter: IMPORTS + `class Pool {
  /**
   * Apply fn to every item with at most \`limit\` calls running at once (on threads),
   * returning the results in the original order. If any call throws, throw that
   * exception after the others have finished.
   */
  public static <T, R> List<R> mapWithConcurrency(List<T> items, int limit, BiFunction<T, Integer, R> fn) throws Exception {
    // your code
    return new ArrayList<>();
  }
}

class Solution {
  /**
   * Test driver. Leave as is. The function sleeps a little (longer for smaller items,
   * so completion order differs from input order), doubles the item, and throws
   * "boom" on failOn. Returns [results, peak concurrency, error message].
   */
  public Object[] poolDemo(List<Integer> items, int limit, Integer failOn) {
    int[] active = { 0 };
    int[] peak = { 0 };
    BiFunction<Integer, Integer, Integer> fn = (x, i) -> {
      synchronized (active) { active[0]++; peak[0] = Math.max(peak[0], active[0]); }
      try { Thread.sleep(12 - x * 2); } catch (InterruptedException e) { throw new RuntimeException(e); }
      synchronized (active) { active[0]--; }
      if (failOn != null && x.equals(failOn)) throw new RuntimeException("boom");
      return x * 2;
    };
    try {
      return new Object[] { Pool.mapWithConcurrency(items, limit, fn), peak[0], null };
    } catch (Exception e) {
      return new Object[] { null, peak[0], e.getMessage() };
    }
  }
}
`,
    solution: IMPORTS + `class Pool {
  public static <T, R> List<R> mapWithConcurrency(List<T> items, int limit, BiFunction<T, Integer, R> fn) throws Exception {
    List<R> results = new ArrayList<>(Collections.nCopies(items.size(), (R) null));
    int[] next = { 0 };
    Exception[] error = { null };
    Runnable worker = () -> {
      for (;;) {
        int i;
        synchronized (next) { i = next[0]++; }
        if (i >= items.size() || error[0] != null) return;
        try {
          R r = fn.apply(items.get(i), i);
          synchronized (results) { results.set(i, r); }
        } catch (Exception e) {
          synchronized (error) { if (error[0] == null) error[0] = e; }
          return;
        }
      }
    };
    int n = Math.max(1, Math.min(limit, items.size()));
    List<Thread> workers = new ArrayList<>();
    for (int i = 0; i < n; i++) { Thread t = new Thread(worker); t.start(); workers.add(t); }
    for (Thread t : workers) t.join();
    if (error[0] != null) throw error[0];
    return results;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Object[] poolDemo(List<Integer> items, int limit, Integer failOn) {
    int[] active = { 0 };
    int[] peak = { 0 };
    BiFunction<Integer, Integer, Integer> fn = (x, i) -> {
      synchronized (active) { active[0]++; peak[0] = Math.max(peak[0], active[0]); }
      try { Thread.sleep(12 - x * 2); } catch (InterruptedException e) { throw new RuntimeException(e); }
      synchronized (active) { active[0]--; }
      if (failOn != null && x.equals(failOn)) throw new RuntimeException("boom");
      return x * 2;
    };
    try {
      return new Object[] { Pool.mapWithConcurrency(items, limit, fn), peak[0], null };
    } catch (Exception e) {
      return new Object[] { null, peak[0], e.getMessage() };
    }
  }
}
`,
  },
  'debounce': {
    starter: IMPORTS + `/** A debounced callable: call(arg) runs fn only after waitMs of silence, with the last call's argument; cancel drops a pending call. */
class Debounced<A> {
  private final Consumer<A> fn;
  private final long waitMs;

  Debounced(Consumer<A> fn, long waitMs) {
    this.fn = fn;
    this.waitMs = waitMs;
    // your fields
  }

  public void call(A arg) {
    // your code
  }

  public void cancel() {
    // your code
  }
}

class Solution {
  /**
   * Test driver. Leave as is. Replays ["call", x], ["sleep", ms] and ["cancel"] steps
   * against a debounced recorder and returns what got through.
   */
  public List<Integer> debounceDemo(List<List<Object>> script, long waitMs) throws InterruptedException {
    List<Integer> calls = Collections.synchronizedList(new ArrayList<>());
    Debounced<Integer> d = new Debounced<>(calls::add, waitMs);
    for (List<Object> step : script) {
      String op = (String) step.get(0);
      if (op.equals("call")) d.call((Integer) step.get(1));
      else if (op.equals("sleep")) Thread.sleep((Integer) step.get(1));
      else d.cancel();
    }
    return new ArrayList<>(calls);
  }
}
`,
    solution: IMPORTS + `class Debounced<A> {
  private final Consumer<A> fn;
  private final long waitMs;
  private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor(r -> { Thread t = new Thread(r); t.setDaemon(true); return t; });
  private ScheduledFuture<?> pending;

  Debounced(Consumer<A> fn, long waitMs) {
    this.fn = fn;
    this.waitMs = waitMs;
  }

  public synchronized void call(A arg) {
    if (pending != null) pending.cancel(false);
    pending = timer.schedule(() -> {
      synchronized (this) { pending = null; }
      fn.accept(arg);
    }, waitMs, TimeUnit.MILLISECONDS);
  }

  public synchronized void cancel() {
    if (pending != null) pending.cancel(false);
    pending = null;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public List<Integer> debounceDemo(List<List<Object>> script, long waitMs) throws InterruptedException {
    List<Integer> calls = Collections.synchronizedList(new ArrayList<>());
    Debounced<Integer> d = new Debounced<>(calls::add, waitMs);
    for (List<Object> step : script) {
      String op = (String) step.get(0);
      if (op.equals("call")) d.call((Integer) step.get(1));
      else if (op.equals("sleep")) Thread.sleep((Integer) step.get(1));
      else d.cancel();
    }
    return new ArrayList<>(calls);
  }
}
`,
  },
  'retry-with-backoff': {
    starter: IMPORTS + `class RetryOptions {
  int retries;
  long baseMs;
  Predicate<Exception> shouldRetry; // null means retry everything
  RetryOptions(int retries, long baseMs, Predicate<Exception> shouldRetry) { this.retries = retries; this.baseMs = baseMs; this.shouldRetry = shouldRetry; }
}

class Retry {
  /**
   * Call fn; on an exception wait baseMs * 2^attempt before trying again, up to
   * retries more times. Return the first success; after the last failure throw the
   * last exception. shouldRetry can stop early for non-transient errors.
   */
  public static <T> T retry(Callable<T> fn, RetryOptions options) throws Exception {
    // your code
    return fn.call();
  }
}

class Solution {
  /**
   * Test driver. Leave as is. The function fails failTimes times with "down <n>"
   * (or always with "fatal" when fatal is set, which shouldRetry refuses to retry),
   * then returns "ok". Returns [result, calls, error].
   */
  public Object[] retryDemo(int failTimes, int retries, long baseMs, boolean fatal) {
    int[] calls = { 0 };
    Callable<String> fn = () -> {
      calls[0]++;
      if (fatal) throw new RuntimeException("fatal");
      if (calls[0] <= failTimes) throw new RuntimeException("down " + calls[0]);
      return "ok";
    };
    try {
      String r = Retry.retry(fn, new RetryOptions(retries, baseMs, e -> !"fatal".equals(e.getMessage())));
      return new Object[] { r, calls[0], null };
    } catch (Exception e) {
      return new Object[] { null, calls[0], e.getMessage() };
    }
  }
}
`,
    solution: IMPORTS + `class RetryOptions {
  int retries;
  long baseMs;
  Predicate<Exception> shouldRetry; // null means retry everything
  RetryOptions(int retries, long baseMs, Predicate<Exception> shouldRetry) { this.retries = retries; this.baseMs = baseMs; this.shouldRetry = shouldRetry; }
}

class Retry {
  public static <T> T retry(Callable<T> fn, RetryOptions options) throws Exception {
    Exception last = null;
    for (int attempt = 0; attempt <= options.retries; attempt++) {
      try {
        return fn.call();
      } catch (Exception e) {
        last = e;
        if (attempt == options.retries || (options.shouldRetry != null && !options.shouldRetry.test(e))) break;
        Thread.sleep(options.baseMs * (1L << attempt));
      }
    }
    throw last;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Object[] retryDemo(int failTimes, int retries, long baseMs, boolean fatal) {
    int[] calls = { 0 };
    Callable<String> fn = () -> {
      calls[0]++;
      if (fatal) throw new RuntimeException("fatal");
      if (calls[0] <= failTimes) throw new RuntimeException("down " + calls[0]);
      return "ok";
    };
    try {
      String r = Retry.retry(fn, new RetryOptions(retries, baseMs, e -> !"fatal".equals(e.getMessage())));
      return new Object[] { r, calls[0], null };
    } catch (Exception e) {
      return new Object[] { null, calls[0], e.getMessage() };
    }
  }
}
`,
  },
  'event-emitter': {
    starter: IMPORTS + `/**
 * on(name, handler) returns a Runnable that unsubscribes; once runs the handler one
 * time; emit calls every current handler in registration order. A handler that
 * unsubscribes during emit must not break iteration of the others.
 */
class Emitter {
  public Runnable on(String name, Consumer<Object> handler) {
    // your code
    return () -> {};
  }

  public Runnable once(String name, Consumer<Object> handler) {
    // your code
    return () -> {};
  }

  public void emit(String name, Object payload) {
    // your code
  }
}

class Solution {
  /**
   * Test driver. Leave as is. Replays ["on"|"once", name, spec], ["emit", name, payload]
   * and ["off", n] (unsubscribe the n-th registration) steps. Specs: "record" pushes
   * the payload, "record10" pushes payload * 10, "record:<s>" pushes s, "self-off:<s>"
   * pushes s then unsubscribes itself.
   */
  public List<Object> emitterDemo(List<List<Object>> script) {
    Emitter e = new Emitter();
    List<Object> seen = new ArrayList<>();
    List<Runnable> offs = new ArrayList<>();
    for (List<Object> step : script) {
      String op = (String) step.get(0);
      if (op.equals("on") || op.equals("once")) {
        String spec = (String) step.get(2);
        Runnable[] self = { null };
        Consumer<Object> h = p -> {
          if (spec.equals("record")) seen.add(p);
          else if (spec.equals("record10")) seen.add((Integer) p * 10);
          else if (spec.startsWith("record:")) seen.add(spec.substring(7));
          else if (spec.startsWith("self-off:")) { seen.add(spec.substring(9)); self[0].run(); }
        };
        Runnable off = op.equals("on") ? e.on((String) step.get(1), h) : e.once((String) step.get(1), h);
        self[0] = off;
        offs.add(off);
      } else if (op.equals("emit")) e.emit((String) step.get(1), step.get(2));
      else offs.get((Integer) step.get(1)).run();
    }
    return seen;
  }
}
`,
    solution: IMPORTS + `class Emitter {
  private final Map<String, List<Consumer<Object>>> handlers = new HashMap<>();

  public Runnable on(String name, Consumer<Object> handler) {
    List<Consumer<Object>> list = handlers.computeIfAbsent(name, k -> new ArrayList<>());
    list.add(handler);
    return () -> list.remove(handler);
  }

  public Runnable once(String name, Consumer<Object> handler) {
    Runnable[] off = { null };
    off[0] = on(name, payload -> {
      off[0].run();
      handler.accept(payload);
    });
    return off[0];
  }

  public void emit(String name, Object payload) {
    List<Consumer<Object>> list = handlers.get(name);
    if (list == null) return;
    for (Consumer<Object> h : new ArrayList<>(list)) h.accept(payload); // iterate a copy so handlers may unsubscribe
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public List<Object> emitterDemo(List<List<Object>> script) {
    Emitter e = new Emitter();
    List<Object> seen = new ArrayList<>();
    List<Runnable> offs = new ArrayList<>();
    for (List<Object> step : script) {
      String op = (String) step.get(0);
      if (op.equals("on") || op.equals("once")) {
        String spec = (String) step.get(2);
        Runnable[] self = { null };
        Consumer<Object> h = p -> {
          if (spec.equals("record")) seen.add(p);
          else if (spec.equals("record10")) seen.add((Integer) p * 10);
          else if (spec.startsWith("record:")) seen.add(spec.substring(7));
          else if (spec.startsWith("self-off:")) { seen.add(spec.substring(9)); self[0].run(); }
        };
        Runnable off = op.equals("on") ? e.on((String) step.get(1), h) : e.once((String) step.get(1), h);
        self[0] = off;
        offs.add(off);
      } else if (op.equals("emit")) e.emit((String) step.get(1), step.get(2));
      else offs.get((Integer) step.get(1)).run();
    }
    return seen;
  }
}
`,
  },
  'token-bucket': {
    starter: IMPORTS + `/**
 * A token bucket with an injected clock (now returns milliseconds). tryRemove(n)
 * takes n tokens if available. Tokens refill continuously at refillPerSecond up to
 * capacity, computed lazily from the clock rather than by a timer.
 */
class TokenBucket {
  private final int capacity;
  private final double refillPerSecond;
  private final LongSupplier now;

  TokenBucket(int capacity, double refillPerSecond, LongSupplier now) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.now = now;
    // your fields
  }

  public boolean tryRemove(int n) {
    // your code
    return false;
  }
}

class Solution {
  /** Test driver. Leave as is. ["take", n] records tryRemove(n); ["at", ms] moves the clock. */
  public List<Boolean> bucketDemo(int capacity, double refillPerSecond, List<List<Object>> script) {
    long[] t = { 0 };
    TokenBucket b = new TokenBucket(capacity, refillPerSecond, () -> t[0]);
    List<Boolean> out = new ArrayList<>();
    for (List<Object> step : script) {
      if (step.get(0).equals("take")) out.add(b.tryRemove((Integer) step.get(1)));
      else t[0] = ((Number) step.get(1)).longValue();
    }
    return out;
  }
}
`,
    solution: IMPORTS + `class TokenBucket {
  private final int capacity;
  private final double refillPerSecond;
  private final LongSupplier now;
  private double tokens;
  private long lastMs;

  TokenBucket(int capacity, double refillPerSecond, LongSupplier now) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.now = now;
    this.tokens = capacity;
    this.lastMs = now.getAsLong();
  }

  private void refill() {
    long t = now.getAsLong();
    double elapsed = Math.max(0, t - lastMs) / 1000.0;
    tokens = Math.min(capacity, tokens + elapsed * refillPerSecond);
    lastMs = t;
  }

  public boolean tryRemove(int n) {
    refill();
    if (tokens < n) return false;
    tokens -= n;
    return true;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public List<Boolean> bucketDemo(int capacity, double refillPerSecond, List<List<Object>> script) {
    long[] t = { 0 };
    TokenBucket b = new TokenBucket(capacity, refillPerSecond, () -> t[0]);
    List<Boolean> out = new ArrayList<>();
    for (List<Object> step : script) {
      if (step.get(0).equals("take")) out.add(b.tryRemove((Integer) step.get(1)));
      else t[0] = ((Number) step.get(1)).longValue();
    }
    return out;
  }
}
`,
  },
  'flatten-object': {
    starter: IMPORTS + `class Solution {
  /**
   * Turn nested maps into a single-level map whose keys are the joined paths. Lists
   * count as maps with index keys. Leaves (scalars, null, empty containers) are kept
   * as values.
   */
  public Map<String, Object> flatten(Map<String, Object> obj, String separator) {
    // your code
    return new LinkedHashMap<>();
  }

  public Map<String, Object> flatten(Map<String, Object> obj) {
    return flatten(obj, ".");
  }
}
`,
    solution: IMPORTS + `class Solution {
  public Map<String, Object> flatten(Map<String, Object> obj, String separator) {
    Map<String, Object> out = new LinkedHashMap<>();
    walk(obj, "", separator, out);
    return out;
  }

  public Map<String, Object> flatten(Map<String, Object> obj) {
    return flatten(obj, ".");
  }

  @SuppressWarnings("unchecked")
  private void walk(Object value, String prefix, String separator, Map<String, Object> out) {
    if (value instanceof Map && !((Map<?, ?>) value).isEmpty()) {
      for (Map.Entry<String, Object> e : ((Map<String, Object>) value).entrySet()) {
        walk(e.getValue(), prefix.isEmpty() ? e.getKey() : prefix + separator + e.getKey(), separator, out);
      }
    } else if (value instanceof List && !((List<?>) value).isEmpty()) {
      List<Object> list = (List<Object>) value;
      for (int i = 0; i < list.size(); i++) walk(list.get(i), prefix.isEmpty() ? String.valueOf(i) : prefix + separator + i, separator, out);
    } else {
      out.put(prefix, value);
    }
  }
}
`,
  },
  'memoize-ttl': {
    starter: IMPORTS + `/** A memoised function: apply caches fn's result per argument for ttlMs milliseconds (now returns milliseconds); clear empties the cache. */
class Memoized<A, R> {
  private final Function<A, R> fn;
  private final long ttlMs;
  private final LongSupplier now;

  Memoized(Function<A, R> fn, long ttlMs, LongSupplier now) {
    this.fn = fn;
    this.ttlMs = ttlMs;
    this.now = now;
    // your fields
  }

  public R apply(A arg) {
    // your code
    return fn.apply(arg);
  }

  public void clear() {
    // your code
  }
}

class Solution {
  /**
   * Test driver. Leave as is. Memoises a counting adder (its argument is the pair
   * [a, b]) with an injected clock: ["call", a, b] records the result, ["at", ms]
   * moves the clock, ["clear"] clears. Returns [results, underlying calls].
   */
  public Object[] memoDemo(List<List<Object>> script, long ttlMs) {
    long[] t = { 0 };
    int[] calls = { 0 };
    Memoized<List<Integer>, Integer> m = new Memoized<>(ab -> { calls[0]++; return ab.get(0) + ab.get(1); }, ttlMs, () -> t[0]);
    List<Integer> results = new ArrayList<>();
    for (List<Object> step : script) {
      String op = (String) step.get(0);
      if (op.equals("call")) results.add(m.apply(List.of((Integer) step.get(1), (Integer) step.get(2))));
      else if (op.equals("at")) t[0] = ((Number) step.get(1)).longValue();
      else m.clear();
    }
    return new Object[] { results, calls[0] };
  }
}
`,
    solution: IMPORTS + `class Memoized<A, R> {
  private final Function<A, R> fn;
  private final long ttlMs;
  private final LongSupplier now;
  private final Map<A, Object[]> cache = new HashMap<>(); // arg -> {value, expiresAt}

  Memoized(Function<A, R> fn, long ttlMs, LongSupplier now) {
    this.fn = fn;
    this.ttlMs = ttlMs;
    this.now = now;
  }

  @SuppressWarnings("unchecked")
  public R apply(A arg) {
    long t = now.getAsLong();
    Object[] hit = cache.get(arg);
    if (hit != null && (Long) hit[1] > t) return (R) hit[0];
    R value = fn.apply(arg);
    cache.put(arg, new Object[] { value, t + ttlMs });
    return value;
  }

  public void clear() {
    cache.clear();
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Object[] memoDemo(List<List<Object>> script, long ttlMs) {
    long[] t = { 0 };
    int[] calls = { 0 };
    Memoized<List<Integer>, Integer> m = new Memoized<>(ab -> { calls[0]++; return ab.get(0) + ab.get(1); }, ttlMs, () -> t[0]);
    List<Integer> results = new ArrayList<>();
    for (List<Object> step : script) {
      String op = (String) step.get(0);
      if (op.equals("call")) results.add(m.apply(List.of((Integer) step.get(1), (Integer) step.get(2))));
      else if (op.equals("at")) t[0] = ((Number) step.get(1)).longValue();
      else m.clear();
    }
    return new Object[] { results, calls[0] };
  }
}
`,
  },
  'deep-equal': {
    starter: IMPORTS + `class Solution {
  /**
   * Structural equality: numbers by value (NaN equals NaN), lists element-wise, maps
   * key-wise regardless of key order, Dates by instant. Different types or different
   * key sets are not equal.
   */
  public boolean deepEqual(Object a, Object b) {
    // your code
    return Objects.equals(a, b);
  }

  /** Test driver. Leave as is. The cases JSON cannot express: NaN against NaN, two equal Dates, and a key that is present with a null value. */
  public boolean[] deepEqualChecks() {
    Map<String, Object> withNull = new HashMap<>();
    withNull.put("a", 1);
    withNull.put("b", null);
    return new boolean[] { deepEqual(Double.NaN, Double.NaN), deepEqual(new Date(5), new Date(5)), deepEqual(Map.of("a", 1), withNull) };
  }
}
`,
    solution: IMPORTS + `class Solution {
  public boolean deepEqual(Object a, Object b) {
    if (a == b) return true;
    if (a == null || b == null) return false;
    if (a instanceof Number && b instanceof Number) {
      double x = ((Number) a).doubleValue();
      double y = ((Number) b).doubleValue();
      return (Double.isNaN(x) && Double.isNaN(y)) || x == y;
    }
    if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && ((Date) a).getTime() == ((Date) b).getTime();
    if (a instanceof List && b instanceof List) {
      List<?> la = (List<?>) a;
      List<?> lb = (List<?>) b;
      if (la.size() != lb.size()) return false;
      for (int i = 0; i < la.size(); i++) if (!deepEqual(la.get(i), lb.get(i))) return false;
      return true;
    }
    if (a instanceof Map && b instanceof Map) {
      Map<?, ?> ma = (Map<?, ?>) a;
      Map<?, ?> mb = (Map<?, ?>) b;
      if (ma.size() != mb.size()) return false;
      for (Map.Entry<?, ?> e : ma.entrySet()) {
        if (!mb.containsKey(e.getKey()) || !deepEqual(e.getValue(), mb.get(e.getKey()))) return false;
      }
      return true;
    }
    if (a instanceof List || b instanceof List || a instanceof Map || b instanceof Map) return false;
    return a.equals(b);
  }

  /** Test driver. Leave as is. */
  public boolean[] deepEqualChecks() {
    Map<String, Object> withNull = new HashMap<>();
    withNull.put("a", 1);
    withNull.put("b", null);
    return new boolean[] { deepEqual(Double.NaN, Double.NaN), deepEqual(new Date(5), new Date(5)), deepEqual(Map.of("a", 1), withNull) };
  }
}
`,
  },
  'throttle': {
    starter: IMPORTS + `/**
 * A throttled callable: the first call runs fn immediately; calls during the
 * interval are coalesced into one trailing call (with the latest argument) when the
 * interval ends. now returns milliseconds; a scheduled timer is still needed for
 * the trailing call.
 */
class Throttled<A> {
  private final Consumer<A> fn;
  private final long intervalMs;
  private final LongSupplier now;

  Throttled(Consumer<A> fn, long intervalMs, LongSupplier now) {
    this.fn = fn;
    this.intervalMs = intervalMs;
    this.now = now;
    // your fields
  }

  public void call(A arg) {
    // your code
    fn.accept(arg);
  }
}

class Solution {
  /** Test driver. Leave as is. Replays ["call", x] and ["sleep", ms] steps against a throttled recorder and returns what got through. */
  public List<Integer> throttleDemo(List<List<Object>> script, long intervalMs) throws InterruptedException {
    List<Integer> calls = Collections.synchronizedList(new ArrayList<>());
    Throttled<Integer> t = new Throttled<>(calls::add, intervalMs, System::currentTimeMillis);
    for (List<Object> step : script) {
      if (step.get(0).equals("call")) t.call((Integer) step.get(1));
      else Thread.sleep((Integer) step.get(1));
    }
    return new ArrayList<>(calls);
  }
}
`,
    solution: IMPORTS + `class Throttled<A> {
  private final Consumer<A> fn;
  private final long intervalMs;
  private final LongSupplier now;
  private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor(r -> { Thread t = new Thread(r); t.setDaemon(true); return t; });
  private long last = Long.MIN_VALUE / 2;
  private A pending;
  private boolean hasPending;
  private ScheduledFuture<?> trailing;

  Throttled(Consumer<A> fn, long intervalMs, LongSupplier now) {
    this.fn = fn;
    this.intervalMs = intervalMs;
    this.now = now;
  }

  public synchronized void call(A arg) {
    long t = now.getAsLong();
    if (t - last >= intervalMs && trailing == null) {
      last = t;
      fn.accept(arg);
    } else {
      pending = arg;
      hasPending = true;
      if (trailing == null) trailing = timer.schedule(this::flush, Math.max(0, intervalMs - (t - last)), TimeUnit.MILLISECONDS);
    }
  }

  private void flush() {
    A arg;
    synchronized (this) {
      trailing = null;
      if (!hasPending) return;
      arg = pending;
      hasPending = false;
      pending = null;
      last = now.getAsLong();
    }
    fn.accept(arg);
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public List<Integer> throttleDemo(List<List<Object>> script, long intervalMs) throws InterruptedException {
    List<Integer> calls = Collections.synchronizedList(new ArrayList<>());
    Throttled<Integer> t = new Throttled<>(calls::add, intervalMs, System::currentTimeMillis);
    for (List<Object> step : script) {
      if (step.get(0).equals("call")) t.call((Integer) step.get(1));
      else Thread.sleep((Integer) step.get(1));
    }
    return new ArrayList<>(calls);
  }
}
`,
  },
  'async-queue': {
    starter: IMPORTS + `/**
 * A task queue running at most \`concurrency\` tasks at once (on threads) in FIFO
 * order. add returns a CompletableFuture of the task's result; onIdle blocks until
 * every added task has settled. A failing task completes its own future
 * exceptionally without stopping the queue.
 */
class TaskQueue {
  private final int concurrency;

  TaskQueue(int concurrency) {
    this.concurrency = concurrency;
    // your fields
  }

  public <T> CompletableFuture<T> add(Callable<T> task) {
    // your code
    try { return CompletableFuture.completedFuture(task.call()); }
    catch (Exception e) { return CompletableFuture.failedFuture(e); }
  }

  public void onIdle() throws InterruptedException {
    // your code
  }
}

class Solution {
  /**
   * Test driver. Leave as is. Adds tasks ["ok", value, ms] (return value after ms) and
   * ["fail", message, ms] (throw after ms), waits for idle, and returns [each task's
   * outcome in add order ("error:<message>" for a failure), peak concurrency].
   */
  public Object[] queueDemo(int concurrency, List<List<Object>> tasks) throws Exception {
    TaskQueue q = new TaskQueue(concurrency);
    int[] active = { 0 };
    int[] peak = { 0 };
    List<CompletableFuture<Object>> futures = new ArrayList<>();
    for (List<Object> t : tasks) {
      String kind = (String) t.get(0);
      Object value = t.get(1);
      int ms = (Integer) t.get(2);
      futures.add(q.add(() -> {
        synchronized (active) { active[0]++; peak[0] = Math.max(peak[0], active[0]); }
        Thread.sleep(ms);
        synchronized (active) { active[0]--; }
        if (kind.equals("fail")) throw new RuntimeException(String.valueOf(value));
        return value;
      }));
    }
    q.onIdle();
    List<Object> outcomes = new ArrayList<>();
    for (CompletableFuture<Object> f : futures) {
      try { outcomes.add(f.get()); }
      catch (ExecutionException e) { outcomes.add("error:" + e.getCause().getMessage()); }
    }
    return new Object[] { outcomes, peak[0] };
  }
}
`,
    solution: IMPORTS + `class TaskQueue {
  private final int concurrency;
  private final Deque<Runnable> pending = new ArrayDeque<>();
  private int active = 0;

  TaskQueue(int concurrency) {
    this.concurrency = concurrency;
  }

  public <T> CompletableFuture<T> add(Callable<T> task) {
    CompletableFuture<T> future = new CompletableFuture<>();
    synchronized (this) {
      pending.add(() -> {
        try { future.complete(task.call()); }
        catch (Exception e) { future.completeExceptionally(e); }
        finally {
          synchronized (TaskQueue.this) {
            active--;
            startLocked();
            TaskQueue.this.notifyAll();
          }
        }
      });
      startLocked();
    }
    return future;
  }

  public synchronized void onIdle() throws InterruptedException {
    while (active > 0 || !pending.isEmpty()) wait();
  }

  /** Start tasks while there is room; call with the lock held. */
  private void startLocked() {
    while (active < concurrency && !pending.isEmpty()) {
      Runnable job = pending.poll();
      active++;
      Thread t = new Thread(job);
      t.setDaemon(true);
      t.start();
    }
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Object[] queueDemo(int concurrency, List<List<Object>> tasks) throws Exception {
    TaskQueue q = new TaskQueue(concurrency);
    int[] active = { 0 };
    int[] peak = { 0 };
    List<CompletableFuture<Object>> futures = new ArrayList<>();
    for (List<Object> t : tasks) {
      String kind = (String) t.get(0);
      Object value = t.get(1);
      int ms = (Integer) t.get(2);
      futures.add(q.add(() -> {
        synchronized (active) { active[0]++; peak[0] = Math.max(peak[0], active[0]); }
        Thread.sleep(ms);
        synchronized (active) { active[0]--; }
        if (kind.equals("fail")) throw new RuntimeException(String.valueOf(value));
        return value;
      }));
    }
    q.onIdle();
    List<Object> outcomes = new ArrayList<>();
    for (CompletableFuture<Object> f : futures) {
      try { outcomes.add(f.get()); }
      catch (ExecutionException e) { outcomes.add("error:" + e.getCause().getMessage()); }
    }
    return new Object[] { outcomes, peak[0] };
  }
}
`,
  },
  'deep-clone': {
    starter: IMPORTS + `class Solution {
  /**
   * Copy maps, lists, Dates and Sets recursively, preserving shared references and
   * handling cycles (a cloned cycle points at the clone, not the original). Other
   * values are returned as is.
   */
  public Object deepClone(Object value) {
    // your code
    return value;
  }

  /** Test driver. Leave as is: structure, independence, shared references, a cycle, a Date and a Set all survive the copy. */
  @SuppressWarnings("unchecked")
  public boolean[] check() {
    Map<String, Object> inner = new HashMap<>(Map.of("y", 2));
    Map<String, Object> a = new HashMap<>();
    a.put("x", new ArrayList<>(List.of(1, inner)));
    a.put("d", new Date(5));
    List<Integer> element = new ArrayList<>(List.of(1));
    a.put("s", new LinkedHashSet<>(List.of(element)));
    a.put("self", a);
    Map<String, Object> shared = new HashMap<>(Map.of("s", 1));
    a.put("p", shared);
    a.put("q", shared);
    Map<String, Object> b = (Map<String, Object>) deepClone(a);
    ((Map<String, Object>) ((List<Object>) b.get("x")).get(1)).put("y", 3);
    Object bElement = ((Set<Object>) b.get("s")).iterator().next();
    return new boolean[] {
      inner.get("y").equals(2),
      b.get("self") == b,
      b.get("p") == b.get("q") && b.get("p") != shared,
      b.get("d") instanceof Date && ((Date) b.get("d")).getTime() == 5 && b.get("d") != a.get("d"),
      b.get("s") instanceof Set && b.get("s") != a.get("s") && bElement.equals(element) && bElement != element,
    };
  }
}
`,
    solution: IMPORTS + `class Solution {
  public Object deepClone(Object value) {
    return clone(value, new IdentityHashMap<>());
  }

  @SuppressWarnings("unchecked")
  private Object clone(Object value, IdentityHashMap<Object, Object> seen) {
    if (value == null) return null;
    if (seen.containsKey(value)) return seen.get(value);
    if (value instanceof Date) return new Date(((Date) value).getTime());
    if (value instanceof List) {
      List<Object> out = new ArrayList<>();
      seen.put(value, out);
      for (Object v : (List<Object>) value) out.add(clone(v, seen));
      return out;
    }
    if (value instanceof Set) {
      Set<Object> out = new LinkedHashSet<>();
      seen.put(value, out);
      for (Object v : (Set<Object>) value) out.add(clone(v, seen));
      return out;
    }
    if (value instanceof Map) {
      Map<Object, Object> out = new LinkedHashMap<>();
      seen.put(value, out);
      for (Map.Entry<Object, Object> e : ((Map<Object, Object>) value).entrySet()) out.put(clone(e.getKey(), seen), clone(e.getValue(), seen));
      return out;
    }
    return value;
  }

  /** Test driver. Leave as is. */
  @SuppressWarnings("unchecked")
  public boolean[] check() {
    Map<String, Object> inner = new HashMap<>(Map.of("y", 2));
    Map<String, Object> a = new HashMap<>();
    a.put("x", new ArrayList<>(List.of(1, inner)));
    a.put("d", new Date(5));
    List<Integer> element = new ArrayList<>(List.of(1));
    a.put("s", new LinkedHashSet<>(List.of(element)));
    a.put("self", a);
    Map<String, Object> shared = new HashMap<>(Map.of("s", 1));
    a.put("p", shared);
    a.put("q", shared);
    Map<String, Object> b = (Map<String, Object>) deepClone(a);
    ((Map<String, Object>) ((List<Object>) b.get("x")).get(1)).put("y", 3);
    Object bElement = ((Set<Object>) b.get("s")).iterator().next();
    return new boolean[] {
      inner.get("y").equals(2),
      b.get("self") == b,
      b.get("p") == b.get("q") && b.get("p") != shared,
      b.get("d") instanceof Date && ((Date) b.get("d")).getTime() == 5 && b.get("d") != a.get("d"),
      b.get("s") instanceof Set && b.get("s") != a.get("s") && bElement.equals(element) && bElement != element,
    };
  }
}
`,
  },
  'group-by': {
    starter: IMPORTS + `class Order {
  String id;
  String category;
  double total;
  Order() {}
}

class Solution {
  /** A map from key to the items with that key, preserving order. */
  public <T, K> Map<K, List<T>> groupBy(List<T> items, Function<T, K> keyFn) {
    // your code
    return new LinkedHashMap<>();
  }

  /** For each category, the id of the order with the highest total. */
  public Map<String, String> topPerCategory(List<Order> orders) {
    // your code
    return new LinkedHashMap<>();
  }

  /** Test driver. Leave as is: groups numbers by parity with groupBy. */
  public Map<String, List<Integer>> groupByParity(List<Integer> nums) {
    return groupBy(nums, n -> n % 2 != 0 ? "odd" : "even");
  }
}
`,
    solution: IMPORTS + `class Order {
  String id;
  String category;
  double total;
  Order() {}
}

class Solution {
  public <T, K> Map<K, List<T>> groupBy(List<T> items, Function<T, K> keyFn) {
    Map<K, List<T>> out = new LinkedHashMap<>();
    for (T item : items) out.computeIfAbsent(keyFn.apply(item), k -> new ArrayList<>()).add(item);
    return out;
  }

  public Map<String, String> topPerCategory(List<Order> orders) {
    Map<String, String> out = new LinkedHashMap<>();
    for (Map.Entry<String, List<Order>> e : groupBy(orders, o -> o.category).entrySet()) {
      Order best = e.getValue().get(0);
      for (Order o : e.getValue()) if (o.total > best.total) best = o;
      out.put(e.getKey(), best.id);
    }
    return out;
  }

  /** Test driver. Leave as is: groups numbers by parity with groupBy. */
  public Map<String, List<Integer>> groupByParity(List<Integer> nums) {
    return groupBy(nums, n -> n % 2 != 0 ? "odd" : "even");
  }
}
`,
  },
  'parse-query-string': {
    starter: IMPORTS + `import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

class Solution {
  /**
   * Turn a query string (with or without a leading "?") into a map. Repeated keys
   * become lists, "+" means space, percent-encoding is decoded, and a key without
   * "=" gets an empty string.
   */
  public Map<String, Object> parseQuery(String qs) {
    // your code
    return new LinkedHashMap<>();
  }
}
`,
    solution: IMPORTS + `import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

class Solution {
  @SuppressWarnings("unchecked")
  public Map<String, Object> parseQuery(String qs) {
    Map<String, Object> out = new LinkedHashMap<>();
    String body = qs.startsWith("?") ? qs.substring(1) : qs;
    if (body.isEmpty()) return out;
    for (String part : body.split("&")) {
      if (part.isEmpty()) continue;
      int eq = part.indexOf('=');
      String key = decode(eq == -1 ? part : part.substring(0, eq));
      String value = decode(eq == -1 ? "" : part.substring(eq + 1));
      Object prev = out.get(key);
      if (prev == null) out.put(key, value);
      else if (prev instanceof List) ((List<String>) prev).add(value);
      else out.put(key, new ArrayList<>(List.of((String) prev, value)));
    }
    return out;
  }

  private String decode(String s) {
    try { return URLDecoder.decode(s, StandardCharsets.UTF_8); }
    catch (IllegalArgumentException e) { return s; }
  }
}
`,
  },
  'lfu-cache': {
    starter: IMPORTS + `/** An LFU cache: get returns the value or -1; set inserts or updates; when over capacity evict the least frequently used key, breaking ties by least recently used. Both O(1). */
class LFUCache {
  private final int capacity;

  LFUCache(int capacity) {
    this.capacity = capacity;
    // your fields
  }

  public int get(int key) {
    // your code
    return -1;
  }

  public void set(int key, int value) {
    // your code
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Integer[] runLfu(int capacity, List<List<Object>> ops) {
    LFUCache c = new LFUCache(capacity);
    Integer[] out = new Integer[ops.size()];
    for (int i = 0; i < ops.size(); i++) {
      List<Object> op = ops.get(i);
      if (op.get(0).equals("set")) { c.set((Integer) op.get(1), (Integer) op.get(2)); out[i] = null; }
      else out[i] = c.get((Integer) op.get(1));
    }
    return out;
  }
}
`,
    solution: IMPORTS + `class LFUCache {
  private final int capacity;
  private final Map<Integer, int[]> entries = new HashMap<>(); // key -> {value, freq}
  private final Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>(); // freq -> keys, oldest first
  private int minFreq = 0;

  LFUCache(int capacity) {
    this.capacity = capacity;
  }

  private void touch(int key) {
    int[] e = entries.get(key);
    LinkedHashSet<Integer> bucket = buckets.get(e[1]);
    bucket.remove(key);
    if (bucket.isEmpty()) {
      buckets.remove(e[1]);
      if (minFreq == e[1]) minFreq++;
    }
    e[1]++;
    buckets.computeIfAbsent(e[1], f -> new LinkedHashSet<>()).add(key);
  }

  public int get(int key) {
    if (!entries.containsKey(key)) return -1;
    touch(key);
    return entries.get(key)[0];
  }

  public void set(int key, int value) {
    if (capacity <= 0) return;
    int[] e = entries.get(key);
    if (e != null) {
      e[0] = value;
      touch(key);
      return;
    }
    if (entries.size() >= capacity) {
      LinkedHashSet<Integer> bucket = buckets.get(minFreq);
      int victim = bucket.iterator().next();
      bucket.remove(victim);
      if (bucket.isEmpty()) buckets.remove(minFreq);
      entries.remove(victim);
    }
    entries.put(key, new int[] { value, 1 });
    buckets.computeIfAbsent(1, f -> new LinkedHashSet<>()).add(key);
    minFreq = 1;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public Integer[] runLfu(int capacity, List<List<Object>> ops) {
    LFUCache c = new LFUCache(capacity);
    Integer[] out = new Integer[ops.size()];
    for (int i = 0; i < ops.size(); i++) {
      List<Object> op = ops.get(i);
      if (op.get(0).equals("set")) { c.set((Integer) op.get(1), (Integer) op.get(2)); out[i] = null; }
      else out[i] = c.get((Integer) op.get(1));
    }
    return out;
  }
}
`,
  },
  'circular-buffer': {
    starter: IMPORTS + `/** A ring buffer: push overwrites the oldest when full and returns it (else null); shift removes and returns the oldest; toList lists oldest to newest; size is the count. */
class RingBuffer<T> {
  private final int capacity;

  RingBuffer(int capacity) {
    this.capacity = capacity;
    // your fields
  }

  public int size() {
    // your code
    return 0;
  }

  public T push(T item) {
    // your code
    return null;
  }

  public T shift() {
    // your code
    return null;
  }

  public List<T> toList() {
    // your code
    return new ArrayList<>();
  }
}

class Solution {
  /** Test driver. Leave as is. Replays ["push", x] (records what was evicted), ["shift"], ["toArray"] and ["size"] steps, recording each result. */
  public List<Object> ringDemo(int capacity, List<List<Object>> ops) {
    RingBuffer<Object> b = new RingBuffer<>(capacity);
    List<Object> out = new ArrayList<>();
    for (List<Object> op : ops) {
      String kind = (String) op.get(0);
      if (kind.equals("push")) out.add(b.push(op.get(1)));
      else if (kind.equals("shift")) out.add(b.shift());
      else if (kind.equals("toArray")) out.add(b.toList());
      else out.add(b.size());
    }
    return out;
  }
}
`,
    solution: IMPORTS + `class RingBuffer<T> {
  private final int capacity;
  private final Object[] items;
  private int start = 0;
  private int count = 0;

  RingBuffer(int capacity) {
    this.capacity = capacity;
    this.items = new Object[capacity];
  }

  public int size() {
    return count;
  }

  @SuppressWarnings("unchecked")
  public T push(T item) {
    if (count == capacity) {
      T evicted = (T) items[start];
      items[start] = item;
      start = (start + 1) % capacity;
      return evicted;
    }
    items[(start + count) % capacity] = item;
    count++;
    return null;
  }

  @SuppressWarnings("unchecked")
  public T shift() {
    if (count == 0) return null;
    T item = (T) items[start];
    items[start] = null;
    start = (start + 1) % capacity;
    count--;
    return item;
  }

  @SuppressWarnings("unchecked")
  public List<T> toList() {
    List<T> out = new ArrayList<>();
    for (int i = 0; i < count; i++) out.add((T) items[(start + i) % capacity]);
    return out;
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public List<Object> ringDemo(int capacity, List<List<Object>> ops) {
    RingBuffer<Object> b = new RingBuffer<>(capacity);
    List<Object> out = new ArrayList<>();
    for (List<Object> op : ops) {
      String kind = (String) op.get(0);
      if (kind.equals("push")) out.add(b.push(op.get(1)));
      else if (kind.equals("shift")) out.add(b.shift());
      else if (kind.equals("toArray")) out.add(b.toList());
      else out.add(b.size());
    }
    return out;
  }
}
`,
  },
  'semver-compare': {
    starter: IMPORTS + `class Solution {
  /**
   * -1, 0 or 1 for versions like "1.2.10" and "1.2.9". Missing trailing parts count as
   * 0 ("1.0" equals "1.0.0"). A pre-release suffix ("1.0.0-beta") sorts before the
   * release.
   */
  public int compareVersions(String a, String b) {
    // your code
    return 0;
  }
}
`,
    solution: IMPORTS + `class Solution {
  public int compareVersions(String a, String b) {
    String[] pa = a.split("-", 2);
    String[] pb = b.split("-", 2);
    String[] na = pa[0].split("\\\\.");
    String[] nb = pb[0].split("\\\\.");
    int len = Math.max(na.length, nb.length);
    for (int i = 0; i < len; i++) {
      int x = i < na.length ? Integer.parseInt(na[i]) : 0;
      int y = i < nb.length ? Integer.parseInt(nb[i]) : 0;
      if (x != y) return x < y ? -1 : 1;
    }
    String preA = pa.length > 1 ? pa[1] : null;
    String preB = pb.length > 1 ? pb[1] : null;
    if (Objects.equals(preA, preB)) return 0;
    if (preA == null) return 1;
    if (preB == null) return -1;
    return preA.compareTo(preB) < 0 ? -1 : 1;
  }
}
`,
  },
  'resolve-dependencies': {
    starter: IMPORTS + `class Solution {
  /**
   * deps maps each package to the packages it depends on. Return an install order
   * where every package comes after its dependencies; throw an exception whose
   * message starts with "cycle" when there is one. Among valid orders, prefer
   * alphabetical when there is a choice.
   */
  public List<String> installOrder(Map<String, List<String>> deps) {
    // your code
    return new ArrayList<>();
  }

  /** Test driver. Leave as is: the order, or the error message when there is a cycle. */
  public Object installOrderOrError(Map<String, List<String>> deps) {
    try { return installOrder(deps); }
    catch (RuntimeException e) { return e.getMessage(); }
  }
}
`,
    solution: IMPORTS + `class Solution {
  public List<String> installOrder(Map<String, List<String>> deps) {
    Set<String> nodes = new TreeSet<>(deps.keySet());
    for (List<String> list : deps.values()) nodes.addAll(list);
    Map<String, Integer> indeg = new HashMap<>();
    Map<String, List<String>> dependents = new HashMap<>();
    for (String n : nodes) indeg.put(n, 0);
    for (Map.Entry<String, List<String>> e : deps.entrySet()) {
      for (String d : e.getValue()) {
        indeg.merge(e.getKey(), 1, Integer::sum);
        dependents.computeIfAbsent(d, k -> new ArrayList<>()).add(e.getKey());
      }
    }
    PriorityQueue<String> ready = new PriorityQueue<>();
    for (String n : nodes) if (indeg.get(n) == 0) ready.add(n);
    List<String> out = new ArrayList<>();
    while (!ready.isEmpty()) {
      String n = ready.poll();
      out.add(n);
      for (String m : dependents.getOrDefault(n, List.of())) {
        if (indeg.merge(m, -1, Integer::sum) == 0) ready.add(m);
      }
    }
    if (out.size() == nodes.size()) return out;
    // Find a cycle for the message.
    Map<String, Integer> state = new HashMap<>();
    for (String n : nodes) {
      if (state.containsKey(n)) continue;
      List<String> cycle = dfs(n, deps, state, new ArrayList<>());
      if (cycle != null) throw new RuntimeException("cycle: " + String.join(" -> ", cycle));
    }
    throw new RuntimeException("cycle");
  }

  private List<String> dfs(String n, Map<String, List<String>> deps, Map<String, Integer> state, List<String> path) {
    state.put(n, 1);
    path.add(n);
    for (String d : deps.getOrDefault(n, List.of())) {
      if (Integer.valueOf(1).equals(state.get(d))) {
        List<String> cycle = new ArrayList<>(path.subList(path.indexOf(d), path.size()));
        cycle.add(d);
        return cycle;
      }
      if (!state.containsKey(d)) {
        List<String> found = dfs(d, deps, state, path);
        if (found != null) return found;
      }
    }
    path.remove(path.size() - 1);
    state.put(n, 2);
    return null;
  }

  /** Test driver. Leave as is: the order, or the error message when there is a cycle. */
  public Object installOrderOrError(Map<String, List<String>> deps) {
    try { return installOrder(deps); }
    catch (RuntimeException e) { return e.getMessage(); }
  }
}
`,
  },
  'match-route': {
    starter: IMPORTS + `import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

class Solution {
  /**
   * The pattern has literal segments, :param segments and an optional trailing "*"
   * wildcard. Return {"params": {...}} on a match (the wildcard's remainder under
   * "*"), or null. Literal segments must match exactly; a trailing slash is ignored.
   */
  public Map<String, Map<String, String>> matchRoute(String pattern, String path) {
    // your code
    return null;
  }
}
`,
    solution: IMPORTS + `import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

class Solution {
  public Map<String, Map<String, String>> matchRoute(String pattern, String path) {
    List<String> ps = segments(pattern);
    List<String> xs = segments(path);
    Map<String, String> params = new LinkedHashMap<>();
    for (int i = 0; i < ps.size(); i++) {
      String p = ps.get(i);
      if (p.equals("*") && i == ps.size() - 1) {
        List<String> rest = new ArrayList<>();
        for (String x : xs.subList(i, xs.size())) rest.add(decode(x));
        params.put("*", String.join("/", rest));
        return Map.of("params", params);
      }
      if (i >= xs.size()) return null;
      if (p.startsWith(":")) params.put(p.substring(1), decode(xs.get(i)));
      else if (!p.equals(xs.get(i))) return null;
    }
    return xs.size() == ps.size() ? Map.of("params", params) : null;
  }

  private List<String> segments(String s) {
    List<String> out = new ArrayList<>();
    for (String part : s.split("/")) if (!part.isEmpty()) out.add(part);
    return out;
  }

  private String decode(String s) {
    return URLDecoder.decode(s.replace("+", "%2B"), StandardCharsets.UTF_8);
  }
}
`,
  },
  'set-in-immutable': {
    starter: IMPORTS + `class Solution {
  /**
   * Return a new object with the value at path (a list of keys: Strings for maps,
   * Integers for lists) replaced, without mutating the input. Only containers along
   * the path are copied; untouched branches are shared. Missing intermediates are
   * created (lists for integer keys).
   */
  public Object setIn(Object obj, List<Object> path, Object value) {
    // your code
    return obj;
  }

  /** Test driver. Leave as is. */
  @SuppressWarnings("unchecked")
  public boolean[] check() {
    Map<String, Object> a = new HashMap<>(Map.of("b", 1));
    Map<String, Object> c = new HashMap<>(Map.of("d", 2));
    List<Object> list = new ArrayList<>(List.of(1, 2, 3));
    Map<String, Object> input = new HashMap<>();
    input.put("a", a);
    input.put("c", c);
    input.put("list", list);
    Map<String, Object> out = (Map<String, Object>) setIn(input, List.of("a", "b"), 9);
    Map<String, Object> out2 = (Map<String, Object>) setIn(input, List.of("list", 1), 20);
    return new boolean[] {
      ((Map<String, Object>) out.get("a")).get("b").equals(9),
      a.get("b").equals(1),
      out.get("c") == c,
      out2.get("list") instanceof List && ((List<Object>) out2.get("list")).get(1).equals(20) && list.get(1).equals(2),
      out2.get("a") == a,
    };
  }
}
`,
    solution: IMPORTS + `class Solution {
  @SuppressWarnings("unchecked")
  public Object setIn(Object obj, List<Object> path, Object value) {
    if (path.isEmpty()) return value;
    Object head = path.get(0);
    List<Object> rest = path.subList(1, path.size());
    Object current = null;
    if (obj instanceof Map) current = ((Map<Object, Object>) obj).get(head);
    else if (obj instanceof List && (Integer) head < ((List<Object>) obj).size()) current = ((List<Object>) obj).get((Integer) head);
    Object nextBase = current instanceof Map || current instanceof List ? current : (!rest.isEmpty() && rest.get(0) instanceof Integer ? new ArrayList<>() : new LinkedHashMap<>());
    Object child = rest.isEmpty() ? value : setIn(nextBase, rest, value);
    if (obj instanceof List) {
      List<Object> copy = new ArrayList<>((List<Object>) obj);
      int i = (Integer) head;
      while (copy.size() <= i) copy.add(null);
      copy.set(i, child);
      return copy;
    }
    Map<Object, Object> copy = new LinkedHashMap<>((Map<Object, Object>) obj);
    copy.put(head, child);
    return copy;
  }

  /** Test driver. Leave as is. */
  @SuppressWarnings("unchecked")
  public boolean[] check() {
    Map<String, Object> a = new HashMap<>(Map.of("b", 1));
    Map<String, Object> c = new HashMap<>(Map.of("d", 2));
    List<Object> list = new ArrayList<>(List.of(1, 2, 3));
    Map<String, Object> input = new HashMap<>();
    input.put("a", a);
    input.put("c", c);
    input.put("list", list);
    Map<String, Object> out = (Map<String, Object>) setIn(input, List.of("a", "b"), 9);
    Map<String, Object> out2 = (Map<String, Object>) setIn(input, List.of("list", 1), 20);
    return new boolean[] {
      ((Map<String, Object>) out.get("a")).get("b").equals(9),
      a.get("b").equals(1),
      out.get("c") == c,
      out2.get("list") instanceof List && ((List<Object>) out2.get("list")).get(1).equals(20) && list.get(1).equals(2),
      out2.get("a") == a,
    };
  }
}
`,
  },
  'with-timeout-abort': {
    starter: IMPORTS + `/** A cancellation token, Java's stand-in for AbortSignal here. Given. */
class CancelToken {
  private boolean cancelled = false;

  public synchronized boolean isCancelled() { return cancelled; }

  public synchronized void cancel() {
    cancelled = true;
    notifyAll();
  }

  /** Block for up to ms milliseconds; true if cancelled before then. */
  public synchronized boolean await(long ms) throws InterruptedException {
    long deadline = System.nanoTime() + ms * 1_000_000L;
    while (!cancelled) {
      long left = (deadline - System.nanoTime()) / 1_000_000L;
      if (left <= 0) break;
      wait(left);
    }
    return cancelled;
  }
}

class Timeouts {
  /** Sleep for ms, or throw an exception with message "aborted" as soon as the token is cancelled. */
  public static void sleep(long ms, CancelToken token) throws Exception {
    // your code
    Thread.sleep(ms);
  }

  /**
   * Run the function (given a token) on another thread. If it does not finish within
   * ms, cancel the token and throw an exception with message "timeout". Either way
   * nothing is left running.
   */
  public static <T> T withTimeout(Function<CancelToken, T> run, long ms) throws Exception {
    // your code
    return run.apply(new CancelToken());
  }
}

class Solution {
  /**
   * Test driver. Leave as is. Runs a sleep of runMs under a limit of limitMs: returns
   * ["timeout", <what the inner sleep threw>] when the limit wins, or ["ok", null]
   * when the run completes in time.
   */
  public String[] timeoutDemo(long runMs, long limitMs) throws InterruptedException {
    String[] inner = { null };
    try {
      Timeouts.withTimeout(token -> {
        try { Timeouts.sleep(runMs, token); }
        catch (Exception e) { inner[0] = e.getMessage(); throw new RuntimeException(e); }
        return null;
      }, limitMs);
      return new String[] { "ok", inner[0] };
    } catch (Exception e) {
      Thread.sleep(5);
      return new String[] { e.getMessage(), inner[0] };
    }
  }

  /** Test driver. Leave as is: a plain sleep really waits. */
  public boolean sleepAtLeast(long ms) throws Exception {
    long t = System.nanoTime();
    Timeouts.sleep(ms, null);
    return (System.nanoTime() - t) / 1_000_000L >= ms - 2;
  }
}
`,
    solution: IMPORTS + `/** A cancellation token, Java's stand-in for AbortSignal here. Given. */
class CancelToken {
  private boolean cancelled = false;

  public synchronized boolean isCancelled() { return cancelled; }

  public synchronized void cancel() {
    cancelled = true;
    notifyAll();
  }

  /** Block for up to ms milliseconds; true if cancelled before then. */
  public synchronized boolean await(long ms) throws InterruptedException {
    long deadline = System.nanoTime() + ms * 1_000_000L;
    while (!cancelled) {
      long left = (deadline - System.nanoTime()) / 1_000_000L;
      if (left <= 0) break;
      wait(left);
    }
    return cancelled;
  }
}

class Timeouts {
  public static void sleep(long ms, CancelToken token) throws Exception {
    if (token == null) { Thread.sleep(ms); return; }
    if (token.isCancelled() || token.await(ms)) throw new Exception("aborted");
  }

  public static <T> T withTimeout(Function<CancelToken, T> run, long ms) throws Exception {
    CancelToken token = new CancelToken();
    ExecutorService ex = Executors.newSingleThreadExecutor(r -> { Thread t = new Thread(r); t.setDaemon(true); return t; });
    Future<T> future = ex.submit(() -> run.apply(token));
    try {
      return future.get(ms, TimeUnit.MILLISECONDS);
    } catch (TimeoutException e) {
      token.cancel();
      try { future.get(); } catch (Exception ignored) { } // let the callee stop; its own error is not the result
      throw new Exception("timeout");
    } catch (ExecutionException e) {
      Throwable cause = e.getCause();
      throw cause instanceof Exception ? (Exception) cause : new Exception(cause);
    } finally {
      ex.shutdownNow();
    }
  }
}

class Solution {
  /** Test driver. Leave as is. */
  public String[] timeoutDemo(long runMs, long limitMs) throws InterruptedException {
    String[] inner = { null };
    try {
      Timeouts.withTimeout(token -> {
        try { Timeouts.sleep(runMs, token); }
        catch (Exception e) { inner[0] = e.getMessage(); throw new RuntimeException(e); }
        return null;
      }, limitMs);
      return new String[] { "ok", inner[0] };
    } catch (Exception e) {
      Thread.sleep(5);
      return new String[] { e.getMessage(), inner[0] };
    }
  }

  /** Test driver. Leave as is: a plain sleep really waits. */
  public boolean sleepAtLeast(long ms) throws Exception {
    long t = System.nanoTime();
    Timeouts.sleep(ms, null);
    return (System.nanoTime() - t) / 1_000_000L >= ms - 2;
  }
}
`,
  },
}
