import type { Port } from '../types.ts'
import { withNotes } from './notes.ts'
import { RUBY_PRACTICAL_NOTES } from './practical-nuances-ruby.ts'

/**
 * The practical problems in Ruby. Promises become threads, AbortSignal
 * becomes a small CancelToken, and each file carries the same test driver
 * the TypeScript version has (see practical-drivers.ts), so the same tests
 * run here. Function names are the snake_case form of the TypeScript names.
 */

const RUBY_PRACTICAL_CODE: Record<string, Port> = {
  'lru-cache': {
    starter: `# A fixed-capacity cache: get marks a key most recently used; set evicts the
# least recently used entry once over capacity. Both O(1).
class LRUCache
  def initialize(capacity)
    @capacity = capacity
    # your fields
  end

  def get(key)
    # your code
    nil
  end

  def set(key, value)
    # your code
  end
end

# Test driver. Leave as is.
def run_lru(capacity, ops)
  c = LRUCache.new(capacity)
  ops.map { |op, k, v| op == 'set' ? (c.set(k, v); nil) : c.get(k) }
end
`,
    solution: `class LRUCache
  def initialize(capacity)
    @capacity = capacity
    @items = {} # Ruby hashes keep insertion order: oldest first
  end

  def get(key)
    return nil unless @items.key?(key)
    value = @items.delete(key)
    @items[key] = value # move to most recent
    value
  end

  def set(key, value)
    @items.delete(key)
    @items[key] = value
    @items.shift if @items.size > @capacity # the oldest entry, in O(1); keys.first would build every key
  end
end

# Test driver. Leave as is.
def run_lru(capacity, ops)
  c = LRUCache.new(capacity)
  ops.map { |op, k, v| op == 'set' ? (c.set(k, v); nil) : c.get(k) }
end
`,
  },
  'promise-pool': {
    starter: `# Apply the block to every item with at most \`limit\` running at once (on
# threads), returning the results in the original order. If any call raises,
# raise that error after the others have been joined.
def map_with_concurrency(items, limit, &fn)
  # your code
  []
end

# Test driver. Leave as is. The block sleeps a little (longer for smaller
# items, so completion order differs from input order), doubles the item,
# and raises "boom" on fail_on. Returns [results, peak concurrency, error].
def pool_demo(items, limit, fail_on)
  mutex = Mutex.new
  active = 0
  peak = 0
  fn = lambda do |x, _i|
    mutex.synchronize { active += 1; peak = [peak, active].max }
    sleep((12 - x * 2) / 1000.0)
    mutex.synchronize { active -= 1 }
    raise 'boom' if x == fail_on
    x * 2
  end
  [map_with_concurrency(items, limit, &fn), peak, nil]
rescue => e
  [nil, peak, e.message]
end
`,
    solution: `def map_with_concurrency(items, limit, &fn)
  results = Array.new(items.length)
  next_index = 0
  mutex = Mutex.new
  error = nil
  worker = lambda do
    loop do
      i = mutex.synchronize { next_index += 1; next_index - 1 }
      break if i >= items.length || error
      begin
        results[i] = fn.call(items[i], i)
      rescue => e
        mutex.synchronize { error ||= e }
        break
      end
    end
  end
  workers = Array.new([1, [limit, items.length].min].max) { Thread.new(&worker) }
  workers.each(&:join)
  raise error if error
  results
end

# Test driver. Leave as is.
def pool_demo(items, limit, fail_on)
  mutex = Mutex.new
  active = 0
  peak = 0
  fn = lambda do |x, _i|
    mutex.synchronize { active += 1; peak = [peak, active].max }
    sleep((12 - x * 2) / 1000.0)
    mutex.synchronize { active -= 1 }
    raise 'boom' if x == fail_on
    x * 2
  end
  [map_with_concurrency(items, limit, &fn), peak, nil]
rescue => e
  [nil, peak, e.message]
end
`,
  },
  'debounce': {
    starter: `# A debounced callable: call(*args) runs the block only after wait_ms of
# silence, with the last call's args; cancel drops a pending call.
class Debounced
  def initialize(wait_ms, &fn)
    @wait_ms = wait_ms
    @fn = fn
    # your fields
  end

  def call(*args)
    # your code
  end

  def cancel
    # your code
  end
end

def debounce(wait_ms, &fn)
  Debounced.new(wait_ms, &fn)
end

# Test driver. Leave as is. Replays ["call", x], ["sleep", ms] and ["cancel"]
# steps against a debounced recorder and returns what got through.
def debounce_demo(script, wait_ms)
  calls = []
  d = debounce(wait_ms) { |x| calls << x }
  script.each do |op, arg|
    case op
    when 'call' then d.call(arg)
    when 'sleep' then sleep(arg / 1000.0)
    else d.cancel
    end
  end
  calls
end
`,
    solution: `class Debounced
  def initialize(wait_ms, &fn)
    @wait_ms = wait_ms
    @fn = fn
    @mutex = Mutex.new
    @generation = 0 # each call starts a new generation; only the latest fires
  end

  def call(*args)
    gen = @mutex.synchronize { @generation += 1 }
    Thread.new do
      sleep(@wait_ms / 1000.0)
      fire = @mutex.synchronize { gen == @generation }
      @fn.call(*args) if fire
    end
  end

  def cancel
    @mutex.synchronize { @generation += 1 }
  end
end

def debounce(wait_ms, &fn)
  Debounced.new(wait_ms, &fn)
end

# Test driver. Leave as is.
def debounce_demo(script, wait_ms)
  calls = []
  d = debounce(wait_ms) { |x| calls << x }
  script.each do |op, arg|
    case op
    when 'call' then d.call(arg)
    when 'sleep' then sleep(arg / 1000.0)
    else d.cancel
    end
  end
  calls
end
`,
  },
  'retry-with-backoff': {
    starter: `# Call the block; on an error wait base_ms * 2**attempt before trying again,
# up to \`retries\` more times. Return the first success; after the last
# failure raise the last error. should_retry (error -> bool) can stop early.
def with_retry(retries:, base_ms:, should_retry: nil)
  # your code
  yield
end

# Test driver. Leave as is. The block fails fail_times times with "down <n>"
# (or always with "fatal" when fatal is set, which should_retry refuses to
# retry), then returns "ok". Returns [result, calls, error].
def retry_demo(fail_times, retries, base_ms, fatal)
  calls = 0
  result = with_retry(retries: retries, base_ms: base_ms, should_retry: ->(e) { e.message != 'fatal' }) do
    calls += 1
    raise 'fatal' if fatal
    raise "down #{calls}" if calls <= fail_times
    'ok'
  end
  [result, calls, nil]
rescue => e
  [nil, calls, e.message]
end
`,
    solution: `def with_retry(retries:, base_ms:, should_retry: nil)
  last_error = nil
  (0..retries).each do |attempt|
    begin
      return yield
    rescue => e
      last_error = e
      break if attempt == retries || (should_retry && !should_retry.call(e))
      sleep(base_ms * (2**attempt) / 1000.0)
    end
  end
  raise last_error
end

# Test driver. Leave as is.
def retry_demo(fail_times, retries, base_ms, fatal)
  calls = 0
  result = with_retry(retries: retries, base_ms: base_ms, should_retry: ->(e) { e.message != 'fatal' }) do
    calls += 1
    raise 'fatal' if fatal
    raise "down #{calls}" if calls <= fail_times
    'ok'
  end
  [result, calls, nil]
rescue => e
  [nil, calls, e.message]
end
`,
  },
  'event-emitter': {
    starter: `# on(name) { |payload| } returns a lambda that unsubscribes; once runs the
# handler one time; emit calls every current handler in registration order.
# A handler that unsubscribes during emit must not break the others.
class Emitter
  def initialize
    # your fields
  end

  def on(name, &handler)
    # your code
    -> {}
  end

  def once(name, &handler)
    # your code
    -> {}
  end

  def emit(name, payload)
    # your code
  end
end

# Test driver. Leave as is. Replays ["on"|"once", name, spec], ["emit", name,
# payload] and ["off", n] (unsubscribe the n-th registration) steps. Specs:
# "record" pushes the payload, "record10" pushes payload * 10, "record:<s>"
# pushes s, "self-off:<s>" pushes s then unsubscribes itself.
def emitter_demo(script)
  e = Emitter.new
  seen = []
  offs = []
  script.each do |op, a, b|
    case op
    when 'on', 'once'
      self_off = nil
      handler = lambda do |p|
        case b
        when 'record' then seen << p
        when 'record10' then seen << p * 10
        when /^record:/ then seen << b[7..]
        when /^self-off:/ then seen << b[9..]; self_off.call
        end
      end
      off = op == 'on' ? e.on(a, &handler) : e.once(a, &handler)
      self_off = off
      offs << off
    when 'emit' then e.emit(a, b)
    when 'off' then offs[a].call
    end
  end
  seen
end
`,
    solution: `class Emitter
  def initialize
    @handlers = Hash.new { |h, k| h[k] = [] }
  end

  def on(name, &handler)
    @handlers[name] << handler
    -> { @handlers[name].delete(handler) }
  end

  def once(name, &handler)
    off = nil
    off = on(name) do |payload|
      off.call
      handler.call(payload)
    end
    off
  end

  def emit(name, payload)
    @handlers[name].dup.each { |h| h.call(payload) } # iterate a copy so handlers may unsubscribe
  end
end

# Test driver. Leave as is.
def emitter_demo(script)
  e = Emitter.new
  seen = []
  offs = []
  script.each do |op, a, b|
    case op
    when 'on', 'once'
      self_off = nil
      handler = lambda do |p|
        case b
        when 'record' then seen << p
        when 'record10' then seen << p * 10
        when /^record:/ then seen << b[7..]
        when /^self-off:/ then seen << b[9..]; self_off.call
        end
      end
      off = op == 'on' ? e.on(a, &handler) : e.once(a, &handler)
      self_off = off
      offs << off
    when 'emit' then e.emit(a, b)
    when 'off' then offs[a].call
    end
  end
  seen
end
`,
  },
  'token-bucket': {
    starter: `# A token bucket with an injected clock (now returns milliseconds).
# try_remove(n) takes n tokens if available. Tokens refill continuously at
# refill_per_second up to capacity, computed lazily from the clock.
class TokenBucket
  def initialize(capacity, refill_per_second, now = -> { (Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000).to_i })
    @capacity = capacity
    @refill_per_second = refill_per_second
    @now = now
    # your fields
  end

  def try_remove(n = 1)
    # your code
    false
  end
end

# Test driver. Leave as is. ["take", n] records try_remove(n); ["at", ms]
# moves the clock.
def bucket_demo(capacity, refill_per_second, script)
  t = 0
  b = TokenBucket.new(capacity, refill_per_second, -> { t })
  out = []
  script.each do |op, n|
    if op == 'take'
      out << b.try_remove(n)
    else
      t = n
    end
  end
  out
end
`,
    solution: `class TokenBucket
  def initialize(capacity, refill_per_second, now = -> { (Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000).to_i })
    @capacity = capacity
    @refill_per_second = refill_per_second
    @now = now
    @tokens = capacity.to_f
    @last_ms = now.call
  end

  def try_remove(n = 1)
    refill
    return false if @tokens < n
    @tokens -= n
    true
  end

  private

  def refill
    t = @now.call
    elapsed = [0, t - @last_ms].max / 1000.0
    @tokens = [@capacity, @tokens + elapsed * @refill_per_second].min
    @last_ms = t
  end
end

# Test driver. Leave as is.
def bucket_demo(capacity, refill_per_second, script)
  t = 0
  b = TokenBucket.new(capacity, refill_per_second, -> { t })
  out = []
  script.each do |op, n|
    if op == 'take'
      out << b.try_remove(n)
    else
      t = n
    end
  end
  out
end
`,
  },
  'flatten-object': {
    starter: `# Turn nested hashes into a single-level hash whose keys are the joined
# paths. Arrays count as hashes with index keys. Leaves (scalars, nil, empty
# containers) are kept as values.
def flatten(obj, separator = '.')
  # your code
  {}
end
`,
    solution: `def flatten(obj, separator = '.')
  out = {}
  walk = lambda do |value, prefix|
    container = value.is_a?(Hash) || value.is_a?(Array)
    if container && !value.empty?
      pairs = value.is_a?(Hash) ? value : value.each_with_index.map { |v, i| [i, v] }
      pairs.each { |k, v| walk.call(v, prefix.empty? ? k.to_s : "#{prefix}#{separator}#{k}") }
    else
      out[prefix] = value
    end
  end
  walk.call(obj, '')
  out
end
`,
  },
  'memoize-ttl': {
    starter: `# A memoised callable: call(*args) caches the block's result per argument
# list for ttl_ms milliseconds (now returns milliseconds); clear empties it.
class Memoized
  def initialize(ttl_ms, now, &fn)
    @ttl_ms = ttl_ms
    @now = now
    @fn = fn
    # your fields
  end

  def call(*args)
    # your code
    @fn.call(*args)
  end

  def clear
    # your code
  end
end

def memoize(ttl_ms, now = -> { (Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000).to_i }, &fn)
  Memoized.new(ttl_ms, now, &fn)
end

# Test driver. Leave as is. Memoises a counting adder with an injected clock:
# ["call", a, b] records the result, ["at", ms] moves the clock, ["clear"]
# clears. Returns [results, underlying calls].
def memo_demo(script, ttl_ms)
  t = 0
  calls = 0
  m = memoize(ttl_ms, -> { t }) { |a, b| calls += 1; a + b }
  results = []
  script.each do |op, a, b|
    case op
    when 'call' then results << m.call(a, b)
    when 'at' then t = a
    else m.clear
    end
  end
  [results, calls]
end
`,
    solution: `class Memoized
  def initialize(ttl_ms, now, &fn)
    @ttl_ms = ttl_ms
    @now = now
    @fn = fn
    @cache = {} # args => [value, expires_at]
  end

  def call(*args)
    t = @now.call
    hit = @cache[args]
    return hit[0] if hit && hit[1] > t
    value = @fn.call(*args)
    @cache[args] = [value, t + @ttl_ms]
    value
  end

  def clear
    @cache.clear
  end
end

def memoize(ttl_ms, now = -> { (Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000).to_i }, &fn)
  Memoized.new(ttl_ms, now, &fn)
end

# Test driver. Leave as is.
def memo_demo(script, ttl_ms)
  t = 0
  calls = 0
  m = memoize(ttl_ms, -> { t }) { |a, b| calls += 1; a + b }
  results = []
  script.each do |op, a, b|
    case op
    when 'call' then results << m.call(a, b)
    when 'at' then t = a
    else m.clear
    end
  end
  [results, calls]
end
`,
  },
  'deep-equal': {
    starter: `# Structural equality: scalars by value (NaN equals NaN), arrays element-wise,
# hashes key-wise regardless of key order, Times by instant. Different types
# or different key sets are not equal.
def deep_equal(a, b)
  # your code
  a == b
end

# Test driver. Leave as is. The cases JSON cannot express: NaN against NaN,
# two equal Times, and a key that is present with a nil value.
def deep_equal_checks
  [deep_equal(Float::NAN, Float::NAN), deep_equal(Time.at(5), Time.at(5)), deep_equal({ 'a' => 1 }, { 'a' => 1, 'b' => nil })]
end
`,
    solution: `def deep_equal(a, b)
  return true if a.equal?(b)
  return true if a.is_a?(Float) && b.is_a?(Float) && a.nan? && b.nan?
  return a.to_r == b.to_r if a.is_a?(Time) && b.is_a?(Time)
  return false if a.is_a?(Time) || b.is_a?(Time)
  if a.is_a?(Array) && b.is_a?(Array)
    return a.length == b.length && a.each_with_index.all? { |v, i| deep_equal(v, b[i]) }
  end
  if a.is_a?(Hash) && b.is_a?(Hash)
    return false if a.size != b.size
    return a.all? { |k, v| b.key?(k) && deep_equal(v, b[k]) }
  end
  return false if a.is_a?(Array) || b.is_a?(Array) || a.is_a?(Hash) || b.is_a?(Hash)
  a == b
end

# Test driver. Leave as is.
def deep_equal_checks
  [deep_equal(Float::NAN, Float::NAN), deep_equal(Time.at(5), Time.at(5)), deep_equal({ 'a' => 1 }, { 'a' => 1, 'b' => nil })]
end
`,
  },
  'throttle': {
    starter: `# A throttled callable: the first call runs the block immediately; calls
# during the interval are coalesced into one trailing call (with the latest
# args) when the interval ends. now returns milliseconds; a timer thread is
# still needed for the trailing call.
class Throttled
  def initialize(interval_ms, now, &fn)
    @interval_ms = interval_ms
    @now = now
    @fn = fn
    # your fields
  end

  def call(*args)
    # your code
    @fn.call(*args)
  end
end

def throttle(interval_ms, now = -> { (Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000).to_i }, &fn)
  Throttled.new(interval_ms, now, &fn)
end

# Test driver. Leave as is. Replays ["call", x] and ["sleep", ms] steps
# against a throttled recorder and returns what got through.
def throttle_demo(script, interval_ms)
  calls = []
  t = throttle(interval_ms) { |x| calls << x }
  script.each do |op, arg|
    op == 'call' ? t.call(arg) : sleep(arg / 1000.0)
  end
  calls
end
`,
    solution: `class Throttled
  def initialize(interval_ms, now, &fn)
    @interval_ms = interval_ms
    @now = now
    @fn = fn
    @mutex = Mutex.new
    @last = -Float::INFINITY
    @pending = nil
    @timer = nil
  end

  def call(*args)
    fire = false
    @mutex.synchronize do
      t = @now.call
      if t - @last >= @interval_ms && @timer.nil?
        @last = t
        fire = true
      else
        @pending = args
        @timer ||= Thread.new do
          sleep([0, @interval_ms - (t - @last)].max / 1000.0)
          flush
        end
      end
    end
    # Outside the lock, like flush: a handler that calls back into the throttle would otherwise deadlock (Mutex is not reentrant).
    @fn.call(*args) if fire
  end

  private

  def flush
    args = nil
    @mutex.synchronize do
      @timer = nil
      args = @pending
      @pending = nil
      @last = @now.call if args
    end
    @fn.call(*args) if args
  end
end

def throttle(interval_ms, now = -> { (Process.clock_gettime(Process::CLOCK_MONOTONIC) * 1000).to_i }, &fn)
  Throttled.new(interval_ms, now, &fn)
end

# Test driver. Leave as is.
def throttle_demo(script, interval_ms)
  calls = []
  t = throttle(interval_ms) { |x| calls << x }
  script.each do |op, arg|
    op == 'call' ? t.call(arg) : sleep(arg / 1000.0)
  end
  calls
end
`,
  },
  'async-queue': {
    starter: `# A task queue running at most \`concurrency\` tasks at once (on threads) in
# FIFO order. add { ... } returns a Handle whose value blocks until the task
# settles (re-raising its error); on_idle blocks until every added task has
# settled. A failing task must not stop the queue.
class TaskQueue
  # A settled-later value, like a promise. Given; use it from add.
  class Handle
    def initialize
      @mutex = Mutex.new
      @cv = ConditionVariable.new
      @done = false
    end

    def settle(value, error)
      @mutex.synchronize do
        @value = value
        @error = error
        @done = true
        @cv.broadcast
      end
    end

    def value
      @mutex.synchronize { @cv.wait(@mutex) until @done }
      raise @error if @error
      @value
    end
  end

  def initialize(concurrency)
    @concurrency = concurrency
    # your fields
  end

  def add(&task)
    # your code
    handle = Handle.new
    handle.settle(task.call, nil)
    handle
  end

  def on_idle
    # your code
  end
end

# Test driver. Leave as is. Adds tasks ["ok", value, ms] (return value after
# ms) and ["fail", message, ms] (raise after ms), waits for idle, and returns
# [each task's outcome in add order ("error:<message>" for a failure), peak
# concurrency].
def queue_demo(concurrency, tasks)
  q = TaskQueue.new(concurrency)
  mutex = Mutex.new
  active = 0
  peak = 0
  handles = tasks.map do |kind, value, ms|
    q.add do
      mutex.synchronize { active += 1; peak = [peak, active].max }
      sleep(ms / 1000.0)
      mutex.synchronize { active -= 1 }
      raise value.to_s if kind == 'fail'
      value
    end
  end
  q.on_idle
  outcomes = handles.map do |h|
    begin
      h.value
    rescue => e
      "error:#{e.message}"
    end
  end
  [outcomes, peak]
end
`,
    solution: `class TaskQueue
  # A settled-later value, like a promise. Given; use it from add.
  class Handle
    def initialize
      @mutex = Mutex.new
      @cv = ConditionVariable.new
      @done = false
    end

    def settle(value, error)
      @mutex.synchronize do
        @value = value
        @error = error
        @done = true
        @cv.broadcast
      end
    end

    def value
      @mutex.synchronize { @cv.wait(@mutex) until @done }
      raise @error if @error
      @value
    end
  end

  def initialize(concurrency)
    @concurrency = concurrency
    @pending = []
    @active = 0
    @mutex = Mutex.new
    @idle = ConditionVariable.new
  end

  def add(&task)
    handle = Handle.new
    @mutex.synchronize do
      @pending << [task, handle]
      start_locked
    end
    handle
  end

  def on_idle
    @mutex.synchronize { @idle.wait(@mutex) until @active.zero? && @pending.empty? }
  end

  private

  # Start workers while there is room; call with @mutex held.
  def start_locked
    while @active < @concurrency && !@pending.empty?
      task, handle = @pending.shift
      @active += 1
      Thread.new do
        begin
          handle.settle(task.call, nil)
        rescue => e
          handle.settle(nil, e)
        ensure
          @mutex.synchronize do
            @active -= 1
            start_locked
            @idle.broadcast if @active.zero? && @pending.empty?
          end
        end
      end
    end
  end
end

# Test driver. Leave as is.
def queue_demo(concurrency, tasks)
  q = TaskQueue.new(concurrency)
  mutex = Mutex.new
  active = 0
  peak = 0
  handles = tasks.map do |kind, value, ms|
    q.add do
      mutex.synchronize { active += 1; peak = [peak, active].max }
      sleep(ms / 1000.0)
      mutex.synchronize { active -= 1 }
      raise value.to_s if kind == 'fail'
      value
    end
  end
  q.on_idle
  outcomes = handles.map do |h|
    begin
      h.value
    rescue => e
      "error:#{e.message}"
    end
  end
  [outcomes, peak]
end
`,
  },
  'deep-clone': {
    starter: `require 'set'

# Copy hashes, arrays, Times and Sets recursively, preserving shared references
# and handling cycles (a cloned cycle points at the clone). Scalars are
# returned as is.
def deep_clone(value, seen = {})
  # your code
  value
end

# Test driver. Leave as is: structure, independence, shared references, a
# cycle, a Time and a Set all survive the copy.
def check
  a = { 'x' => [1, { 'y' => 2 }], 'd' => Time.at(5), 's' => Set[[1]] }
  a['self'] = a
  shared = { 's' => 1 }
  a['p'] = shared
  a['q'] = shared
  b = deep_clone(a)
  b['x'][1]['y'] = 3
  inner = a['s'].first
  [
    a['x'][1]['y'] == 2,
    b['self'].equal?(b),
    b['p'].equal?(b['q']) && !b['p'].equal?(shared),
    b['d'].is_a?(Time) && b['d'] == Time.at(5) && !b['d'].equal?(a['d']),
    b['s'].is_a?(Set) && !b['s'].equal?(a['s']) && b['s'].first == inner && !b['s'].first.equal?(inner),
  ]
end
`,
    solution: `require 'set'

def deep_clone(value, seen = {})
  return value unless value.is_a?(Hash) || value.is_a?(Array) || value.is_a?(Time) || value.is_a?(Set)
  return seen[value.object_id] if seen.key?(value.object_id)
  return value.dup if value.is_a?(Time)
  if value.is_a?(Array)
    out = []
    seen[value.object_id] = out
    value.each { |v| out << deep_clone(v, seen) }
    return out
  end
  if value.is_a?(Set)
    out = Set.new
    seen[value.object_id] = out
    value.each { |v| out << deep_clone(v, seen) }
    return out
  end
  out = {}
  seen[value.object_id] = out
  value.each { |k, v| out[deep_clone(k, seen)] = deep_clone(v, seen) }
  out
end

# Test driver. Leave as is.
def check
  a = { 'x' => [1, { 'y' => 2 }], 'd' => Time.at(5), 's' => Set[[1]] }
  a['self'] = a
  shared = { 's' => 1 }
  a['p'] = shared
  a['q'] = shared
  b = deep_clone(a)
  b['x'][1]['y'] = 3
  inner = a['s'].first
  [
    a['x'][1]['y'] == 2,
    b['self'].equal?(b),
    b['p'].equal?(b['q']) && !b['p'].equal?(shared),
    b['d'].is_a?(Time) && b['d'] == Time.at(5) && !b['d'].equal?(a['d']),
    b['s'].is_a?(Set) && !b['s'].equal?(a['s']) && b['s'].first == inner && !b['s'].first.equal?(inner),
  ]
end
`,
  },
  'group-by': {
    starter: `# group_by(items) { |item| key } returns a hash from key to the items with
# that key, in order. Then top_per_category(orders): for each category, the id
# of the order with the highest total. An order is a hash with 'id',
# 'category' and 'total'.
def group_by(items, &key_fn)
  # your code
  {}
end

def top_per_category(orders)
  # your code
  {}
end

# Test driver. Leave as is: groups numbers by parity with group_by.
def group_by_parity(nums)
  group_by(nums) { |n| n.odd? ? 'odd' : 'even' }
end
`,
    solution: `def group_by(items, &key_fn)
  out = {}
  items.each do |item|
    (out[key_fn.call(item)] ||= []) << item
  end
  out
end

def top_per_category(orders)
  group_by(orders) { |o| o['category'] }.transform_values { |list| list.max_by { |o| o['total'] }['id'] }
end

# Test driver. Leave as is: groups numbers by parity with group_by.
def group_by_parity(nums)
  group_by(nums) { |n| n.odd? ? 'odd' : 'even' }
end
`,
  },
  'parse-query-string': {
    starter: `require 'uri'

# Turn a query string (with or without a leading "?") into a hash. Repeated
# keys become arrays, "+" means space, percent-encoding is decoded, and a key
# without "=" gets an empty string.
def parse_query(qs)
  # your code
  {}
end
`,
    solution: `require 'uri'

def parse_query(qs)
  out = {}
  decode = lambda do |s|
    URI.decode_www_form_component(s)
  rescue ArgumentError
    s
  end
  body = qs.start_with?('?') ? qs[1..] : qs
  return out if body.empty?
  body.split('&').each do |part|
    next if part.empty?
    key, value = part.split('=', 2)
    key = decode.call(key)
    value = decode.call(value || '')
    prev = out[key]
    if prev.nil?
      out[key] = value
    elsif prev.is_a?(Array)
      prev << value
    else
      out[key] = [prev, value]
    end
  end
  out
end
`,
  },
  'lfu-cache': {
    starter: `# An LFU cache: get returns the value or -1; set inserts or updates; when
# over capacity evict the least frequently used key, breaking ties by least
# recently used. Both O(1).
class LFUCache
  def initialize(capacity)
    @capacity = capacity
    # your fields
  end

  def get(key)
    # your code
    -1
  end

  def set(key, value)
    # your code
  end
end

# Test driver. Leave as is.
def run_lfu(capacity, ops)
  c = LFUCache.new(capacity)
  ops.map { |op, k, v| op == 'set' ? (c.set(k, v); nil) : c.get(k) }
end
`,
    solution: `class LFUCache
  def initialize(capacity)
    @capacity = capacity
    @entries = {} # key => [value, freq]
    @buckets = Hash.new { |h, f| h[f] = {} } # freq => ordered hash of keys (insertion order = recency)
    @min_freq = 0
  end

  def get(key)
    return -1 unless @entries.key?(key)
    touch(key)
    @entries[key][0]
  end

  def set(key, value)
    return if @capacity <= 0
    if @entries.key?(key)
      @entries[key][0] = value
      touch(key)
      return
    end
    if @entries.size >= @capacity
      bucket = @buckets[@min_freq]
      victim = bucket.each_key.first # the oldest in the bucket, without building every key
      bucket.delete(victim)
      @buckets.delete(@min_freq) if bucket.empty?
      @entries.delete(victim)
    end
    @entries[key] = [value, 1]
    @buckets[1][key] = true
    @min_freq = 1
  end

  private

  def touch(key)
    entry = @entries[key]
    freq = entry[1]
    bucket = @buckets[freq]
    bucket.delete(key)
    if bucket.empty?
      @buckets.delete(freq)
      @min_freq += 1 if @min_freq == freq
    end
    entry[1] += 1
    @buckets[entry[1]][key] = true
  end
end

# Test driver. Leave as is.
def run_lfu(capacity, ops)
  c = LFUCache.new(capacity)
  ops.map { |op, k, v| op == 'set' ? (c.set(k, v); nil) : c.get(k) }
end
`,
  },
  'circular-buffer': {
    starter: `# A ring buffer: push overwrites the oldest when full and returns it (else
# nil); shift removes and returns the oldest; to_a lists oldest to newest;
# size is the count.
class RingBuffer
  def initialize(capacity)
    @capacity = capacity
    # your fields
  end

  def size
    # your code
    0
  end

  def push(item)
    # your code
    nil
  end

  def shift
    # your code
    nil
  end

  def to_a
    # your code
    []
  end
end

# Test driver. Leave as is. Replays ["push", x] (records what was evicted),
# ["shift"], ["toArray"] and ["size"] steps, recording each result.
def ring_demo(capacity, ops)
  b = RingBuffer.new(capacity)
  ops.map do |op, x|
    case op
    when 'push' then b.push(x)
    when 'shift' then b.shift
    when 'toArray' then b.to_a
    else b.size
    end
  end
end
`,
    solution: `class RingBuffer
  def initialize(capacity)
    @capacity = capacity
    @items = Array.new(capacity)
    @start = 0
    @count = 0
  end

  def size
    @count
  end

  def push(item)
    if @count == @capacity
      evicted = @items[@start]
      @items[@start] = item
      @start = (@start + 1) % @capacity
      return evicted
    end
    @items[(@start + @count) % @capacity] = item
    @count += 1
    nil
  end

  def shift
    return nil if @count.zero?
    item = @items[@start]
    @items[@start] = nil
    @start = (@start + 1) % @capacity
    @count -= 1
    item
  end

  def to_a
    Array.new(@count) { |i| @items[(@start + i) % @capacity] }
  end
end

# Test driver. Leave as is.
def ring_demo(capacity, ops)
  b = RingBuffer.new(capacity)
  ops.map do |op, x|
    case op
    when 'push' then b.push(x)
    when 'shift' then b.shift
    when 'toArray' then b.to_a
    else b.size
    end
  end
end
`,
  },
  'semver-compare': {
    starter: `# -1, 0 or 1 for versions like "1.2.10" and "1.2.9". Missing trailing parts
# count as 0 ("1.0" equals "1.0.0"). A pre-release suffix ("1.0.0-beta")
# sorts before the release.
def compare_versions(a, b)
  # your code
  0
end
`,
    solution: `def compare_versions(a, b)
  parse = lambda do |v|
    main, pre = v.split('-', 2)
    [main.split('.').map(&:to_i), pre]
  end
  nums_a, pre_a = parse.call(a)
  nums_b, pre_b = parse.call(b)
  [nums_a.length, nums_b.length].max.times do |i|
    x = nums_a[i] || 0
    y = nums_b[i] || 0
    return x < y ? -1 : 1 if x != y
  end
  return 0 if pre_a == pre_b
  return 1 if pre_a.nil?
  return -1 if pre_b.nil?
  pre_a < pre_b ? -1 : 1
end
`,
  },
  'resolve-dependencies': {
    starter: `# deps maps each package to the packages it depends on. Return an install
# order where every package comes after its dependencies; raise an error
# whose message starts with "cycle" when there is one. Among valid orders,
# prefer alphabetical when there is a choice.
def install_order(deps)
  # your code
  []
end

# Test driver. Leave as is: the order, or the error message when there is a cycle.
def install_order_or_error(deps)
  install_order(deps)
rescue => e
  e.message
end
`,
    solution: `require 'set'

def install_order(deps)
  nodes = Set.new(deps.keys)
  deps.each_value { |list| list.each { |d| nodes << d } }
  indeg = Hash.new(0)
  dependents = Hash.new { |h, k| h[k] = [] }
  nodes.each { |n| indeg[n] = 0 }
  deps.each do |pkg, list|
    list.each do |d|
      indeg[pkg] += 1
      dependents[d] << pkg
    end
  end
  ready = nodes.select { |n| indeg[n].zero? }.sort
  out = []
  until ready.empty?
    n = ready.shift
    out << n
    dependents[n].each do |m|
      indeg[m] -= 1
      if indeg[m].zero?
        ready << m
        ready.sort!
      end
    end
  end
  return out if out.length == nodes.size

  # Find a cycle for the message.
  state = {}
  path = []
  dfs = lambda do |n|
    state[n] = :active
    path << n
    (deps[n] || []).each do |d|
      return path[path.index(d)..] + [d] if state[d] == :active
      if !state.key?(d)
        found = dfs.call(d)
        return found if found
      end
    end
    path.pop
    state[n] = :done
    nil
  end
  nodes.sort.each do |n|
    next if state.key?(n)
    cycle = dfs.call(n)
    raise "cycle: #{cycle.join(' -> ')}" if cycle
  end
  raise 'cycle'
end

# Test driver. Leave as is: the order, or the error message when there is a cycle.
def install_order_or_error(deps)
  install_order(deps)
rescue => e
  e.message
end
`,
  },
  'match-route': {
    starter: `# The pattern has literal segments, :param segments and an optional trailing
# "*" wildcard. Return { 'params' => {...} } on a match (the wildcard's
# remainder under "*"), or nil. Literal segments must match exactly; a
# trailing slash is ignored.
def match_route(pattern, path)
  # your code
  nil
end
`,
    solution: `def match_route(pattern, path)
  segs = ->(s) { s.split('/').reject(&:empty?) }
  decode = ->(s) { s.gsub(/%([0-9A-Fa-f]{2})/) { $1.hex.chr } }
  ps = segs.call(pattern)
  xs = segs.call(path)
  params = {}
  ps.each_with_index do |p, i|
    if p == '*' && i == ps.length - 1
      params['*'] = xs[i..].map(&decode).join('/')
      return { 'params' => params }
    end
    return nil if i >= xs.length
    if p.start_with?(':')
      params[p[1..]] = decode.call(xs[i])
    elsif p != xs[i]
      return nil
    end
  end
  xs.length == ps.length ? { 'params' => params } : nil
end
`,
  },
  'set-in-immutable': {
    starter: `# Return a new object with the value at path (an array of keys) replaced,
# without mutating the input. Only containers along the path are copied;
# untouched branches are shared. Missing intermediates are created (arrays
# for integer keys).
def set_in(obj, path, value)
  # your code
  obj
end

# Test driver. Leave as is.
def check
  input = { 'a' => { 'b' => 1 }, 'c' => { 'd' => 2 }, 'list' => [1, 2, 3] }
  out = set_in(input, ['a', 'b'], 9)
  out2 = set_in(input, ['list', 1], 20)
  [
    out['a']['b'] == 9,
    input['a']['b'] == 1,
    out['c'].equal?(input['c']),
    out2['list'].is_a?(Array) && out2['list'][1] == 20 && input['list'][1] == 2,
    out2['a'].equal?(input['a']),
  ]
end
`,
    solution: `def set_in(obj, path, value)
  return value if path.empty?
  head, *rest = path
  current = obj.is_a?(Hash) || obj.is_a?(Array) ? obj[head] : nil
  next_base = current.is_a?(Hash) || current.is_a?(Array) ? current : (rest.first.is_a?(Integer) ? [] : {})
  child = rest.empty? ? value : set_in(next_base, rest, value)
  copy = obj.dup
  copy[head] = child
  copy
end

# Test driver. Leave as is.
def check
  input = { 'a' => { 'b' => 1 }, 'c' => { 'd' => 2 }, 'list' => [1, 2, 3] }
  out = set_in(input, ['a', 'b'], 9)
  out2 = set_in(input, ['list', 1], 20)
  [
    out['a']['b'] == 9,
    input['a']['b'] == 1,
    out['c'].equal?(input['c']),
    out2['list'].is_a?(Array) && out2['list'][1] == 20 && input['list'][1] == 2,
    out2['a'].equal?(input['a']),
  ]
end
`,
  },
  'with-timeout-abort': {
    starter: `# A cancellation token, Ruby's stand-in for AbortSignal. Given.
class CancelToken
  def initialize
    @mutex = Mutex.new
    @cv = ConditionVariable.new
    @cancelled = false
  end

  def cancelled?
    @mutex.synchronize { @cancelled }
  end

  def cancel
    @mutex.synchronize do
      @cancelled = true
      @cv.broadcast
    end
  end

  # Block for up to ms milliseconds; true if cancelled before then.
  def wait(ms)
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + ms / 1000.0
    @mutex.synchronize do
      until @cancelled
        left = deadline - Process.clock_gettime(Process::CLOCK_MONOTONIC)
        break if left <= 0
        @cv.wait(@mutex, left)
      end
      @cancelled
    end
  end
end

# Sleep for ms, or raise "aborted" as soon as the token is cancelled.
def sleep_ms(ms, token = nil)
  # your code
  sleep(ms / 1000.0)
end

# Run the block (given a token) on a thread. If it does not finish within ms,
# cancel the token and raise "timeout". Either way nothing is left running.
def with_timeout(ms, &run)
  # your code
  run.call(CancelToken.new)
end

# Test driver. Leave as is. Runs a sleep of run_ms under a limit of limit_ms:
# returns ["timeout", <what the inner sleep raised>] when the limit wins, or
# ["ok", nil] when the run completes in time.
def timeout_demo(run_ms, limit_ms)
  inner = nil
  with_timeout(limit_ms) do |token|
    begin
      sleep_ms(run_ms, token)
    rescue => e
      inner = e.message
      raise
    end
  end
  ['ok', inner]
rescue => e
  sleep(0.005)
  [e.message, inner]
end

# Test driver. Leave as is: a plain sleep really waits.
def sleep_at_least(ms)
  t = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  sleep_ms(ms)
  (Process.clock_gettime(Process::CLOCK_MONOTONIC) - t) * 1000 >= ms - 2
end
`,
    solution: `# A cancellation token, Ruby's stand-in for AbortSignal. Given.
class CancelToken
  def initialize
    @mutex = Mutex.new
    @cv = ConditionVariable.new
    @cancelled = false
  end

  def cancelled?
    @mutex.synchronize { @cancelled }
  end

  def cancel
    @mutex.synchronize do
      @cancelled = true
      @cv.broadcast
    end
  end

  # Block for up to ms milliseconds; true if cancelled before then.
  def wait(ms)
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + ms / 1000.0
    @mutex.synchronize do
      until @cancelled
        left = deadline - Process.clock_gettime(Process::CLOCK_MONOTONIC)
        break if left <= 0
        @cv.wait(@mutex, left)
      end
      @cancelled
    end
  end
end

def sleep_ms(ms, token = nil)
  return sleep(ms / 1000.0) if token.nil?
  raise 'aborted' if token.cancelled?
  raise 'aborted' if token.wait(ms)
end

def with_timeout(ms, &run)
  token = CancelToken.new
  thread = Thread.new { run.call(token) }
  thread.report_on_exception = false
  if thread.join(ms / 1000.0).nil?
    token.cancel
    begin
      # The callee should stop promptly once cancelled; one that ignores the token must not hang the caller forever.
      thread.join(ms / 1000.0) || thread.kill
    rescue StandardError
      # its own error is not the result; the timeout is
    end
    raise 'timeout'
  end
  thread.value
end

# Test driver. Leave as is.
def timeout_demo(run_ms, limit_ms)
  inner = nil
  with_timeout(limit_ms) do |token|
    begin
      sleep_ms(run_ms, token)
    rescue => e
      inner = e.message
      raise
    end
  end
  ['ok', inner]
rescue => e
  sleep(0.005)
  [e.message, inner]
end

# Test driver. Leave as is: a plain sleep really waits.
def sleep_at_least(ms)
  t = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  sleep_ms(ms)
  (Process.clock_gettime(Process::CLOCK_MONOTONIC) - t) * 1000 >= ms - 2
end
`,
  },
}

/** Each port with its Ruby statement, hints and nuances. */
export const RUBY_PRACTICAL: Record<string, Port> = withNotes(RUBY_PRACTICAL_CODE, RUBY_PRACTICAL_NOTES)
