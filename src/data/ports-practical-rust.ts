import type { Port } from '../types.ts'
import { RUST_PRACTICAL_MORE } from './ports-practical-rust-more.ts'

/**
 * The practical problems in Rust. Promises become threads (std only: spawn,
 * scope, Arc, Mutex, atomics), callbacks become boxed or generic closures,
 * injected clocks become `Fn() -> u64`, and each file carries the same test
 * driver the TypeScript version has (see practical-drivers.ts), so the same
 * tests run here. Dynamic test data (scripts mixing strings and numbers,
 * nested objects) arrives as the harness's `whetstone::Json`. Function names
 * are the snake_case form of the TypeScript names.
 */

export const RUST_PRACTICAL_BASE: Record<string, Port> = {
  'lru-cache': {
    starter: `use std::collections::HashMap;
use std::hash::Hash;
// Json is the harness's plain JSON value (Null, Bool, Int, Float, Str, Array, Object):
// the test scripts mix strings and numbers, so they arrive as Json, not a typed Vec.
use whetstone::Json;

/// A fixed-capacity cache: get marks a key most recently used; set evicts the least
/// recently used entry once over capacity. Both O(1).
pub struct LruCache<K, V> {
    capacity: usize,
    // your fields (then drop this marker, which only keeps K and V in use)
    _marker: std::marker::PhantomData<(K, V)>,
}

impl<K: Hash + Eq + Clone, V> LruCache<K, V> {
    pub fn new(capacity: usize) -> Self {
        LruCache { capacity, _marker: std::marker::PhantomData }
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        // your code
        None
    }

    pub fn set(&mut self, key: K, value: V) {
        // your code
    }
}

/// Test driver. Leave as is.
pub fn run_lru(capacity: usize, ops: Vec<Vec<Json>>) -> Vec<Option<i64>> {
    let mut c: LruCache<i64, i64> = LruCache::new(capacity);
    ops.iter()
        .map(|op| {
            let key = op[1].as_i64().unwrap_or(0);
            if op[0].as_str() == Some("set") {
                c.set(key, op.get(2).and_then(Json::as_i64).unwrap_or(0));
                None
            } else {
                c.get(&key).copied()
            }
        })
        .collect()
}
`,
    solution: `use std::collections::HashMap;
use std::hash::Hash;
use whetstone::Json;

struct Node<K, V> {
    key: K,
    value: V,
    prev: Option<usize>, // towards the most recently used end
    next: Option<usize>, // towards the least recently used end
}

/// A fixed-capacity cache: get marks a key most recently used; set evicts the least
/// recently used entry once over capacity. Both O(1): a hash map from key to a slot in
/// an arena that holds a doubly linked recency list (no Rc<RefCell<..>> needed).
pub struct LruCache<K, V> {
    capacity: usize,
    slots: HashMap<K, usize>, // key -> index in nodes
    nodes: Vec<Node<K, V>>,
    head: Option<usize>, // most recently used
    tail: Option<usize>, // least recently used
}

impl<K: Hash + Eq + Clone, V> LruCache<K, V> {
    pub fn new(capacity: usize) -> Self {
        LruCache { capacity, slots: HashMap::new(), nodes: Vec::new(), head: None, tail: None }
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        let i = *self.slots.get(key)?;
        self.unlink(i);
        self.push_front(i); // move to most recent
        Some(&self.nodes[i].value)
    }

    pub fn set(&mut self, key: K, value: V) {
        if self.capacity == 0 {
            return;
        }
        if let Some(&i) = self.slots.get(&key) {
            self.nodes[i].value = value;
            self.unlink(i);
            self.push_front(i);
            return;
        }
        let node = Node { key: key.clone(), value, prev: None, next: None };
        let i = if self.slots.len() == self.capacity {
            let evicted = self.tail.expect("a full cache has a least recently used entry");
            self.unlink(evicted);
            self.slots.remove(&self.nodes[evicted].key);
            self.nodes[evicted] = node; // reuse the evicted slot
            evicted
        } else {
            self.nodes.push(node);
            self.nodes.len() - 1
        };
        self.slots.insert(key, i);
        self.push_front(i);
    }

    fn unlink(&mut self, i: usize) {
        let (prev, next) = (self.nodes[i].prev, self.nodes[i].next);
        match prev {
            Some(p) => self.nodes[p].next = next,
            None => self.head = next,
        }
        match next {
            Some(n) => self.nodes[n].prev = prev,
            None => self.tail = prev,
        }
        self.nodes[i].prev = None;
        self.nodes[i].next = None;
    }

    fn push_front(&mut self, i: usize) {
        self.nodes[i].next = self.head;
        match self.head {
            Some(h) => self.nodes[h].prev = Some(i),
            None => self.tail = Some(i),
        }
        self.head = Some(i);
    }
}

/// Test driver. Leave as is.
pub fn run_lru(capacity: usize, ops: Vec<Vec<Json>>) -> Vec<Option<i64>> {
    let mut c: LruCache<i64, i64> = LruCache::new(capacity);
    ops.iter()
        .map(|op| {
            let key = op[1].as_i64().unwrap_or(0);
            if op[0].as_str() == Some("set") {
                c.set(key, op.get(2).and_then(Json::as_i64).unwrap_or(0));
                None
            } else {
                c.get(&key).copied()
            }
        })
        .collect()
}
`,
  },
  'promise-pool': {
    starter: `use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

/// Apply f to every item with at most limit calls running at once (on threads),
/// returning the results in the original order. If any call fails, return that error
/// once the others have finished. Hint: std::thread::scope lets workers borrow items.
pub fn map_with_concurrency<T, R, E, F>(items: &[T], limit: usize, f: F) -> Result<Vec<R>, E>
where
    T: Sync,
    R: Send,
    E: Send,
    F: Fn(&T, usize) -> Result<R, E> + Sync,
{
    // your code
    Ok(Vec::new())
}

/// Test driver. Leave as is. The function sleeps a little (longer for smaller items, so
/// completion order differs from input order), doubles the item, and fails with "boom"
/// on fail_on. Returns [results, peak concurrency, error message].
pub fn pool_demo(items: Vec<i32>, limit: usize, fail_on: Option<i32>) -> (Option<Vec<i32>>, usize, Option<String>) {
    let active = AtomicUsize::new(0);
    let peak = AtomicUsize::new(0);
    let f = |x: &i32, _index: usize| -> Result<i32, String> {
        let now = active.fetch_add(1, Ordering::SeqCst) + 1;
        peak.fetch_max(now, Ordering::SeqCst);
        thread::sleep(Duration::from_millis((12 - x * 2).max(0) as u64));
        active.fetch_sub(1, Ordering::SeqCst);
        if Some(*x) == fail_on {
            return Err("boom".to_string());
        }
        Ok(x * 2)
    };
    match map_with_concurrency(&items, limit, f) {
        Ok(results) => (Some(results), peak.load(Ordering::SeqCst), None),
        Err(e) => (None, peak.load(Ordering::SeqCst), Some(e)),
    }
}
`,
    solution: `use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

/// Apply f to every item with at most limit calls running at once (on threads),
/// returning the results in the original order. If any call fails, return that error
/// once the others have finished.
pub fn map_with_concurrency<T, R, E, F>(items: &[T], limit: usize, f: F) -> Result<Vec<R>, E>
where
    T: Sync,
    R: Send,
    E: Send,
    F: Fn(&T, usize) -> Result<R, E> + Sync,
{
    let next = AtomicUsize::new(0); // the shared index the workers pull from
    let results: Mutex<Vec<Option<R>>> = Mutex::new((0..items.len()).map(|_| None).collect());
    let error: Mutex<Option<E>> = Mutex::new(None);
    let workers = limit.clamp(1, items.len().max(1));
    thread::scope(|s| {
        for _ in 0..workers {
            s.spawn(|| loop {
                let i = next.fetch_add(1, Ordering::SeqCst);
                if i >= items.len() || error.lock().unwrap().is_some() {
                    return;
                }
                match f(&items[i], i) {
                    Ok(r) => results.lock().unwrap()[i] = Some(r),
                    Err(e) => {
                        error.lock().unwrap().get_or_insert(e); // the first failure wins
                        return;
                    }
                }
            });
        }
    }); // the scope joins every worker
    if let Some(e) = error.into_inner().unwrap() {
        return Err(e);
    }
    Ok(results.into_inner().unwrap().into_iter().map(|r| r.expect("every item was mapped")).collect())
}

/// Test driver. Leave as is.
pub fn pool_demo(items: Vec<i32>, limit: usize, fail_on: Option<i32>) -> (Option<Vec<i32>>, usize, Option<String>) {
    let active = AtomicUsize::new(0);
    let peak = AtomicUsize::new(0);
    let f = |x: &i32, _index: usize| -> Result<i32, String> {
        let now = active.fetch_add(1, Ordering::SeqCst) + 1;
        peak.fetch_max(now, Ordering::SeqCst);
        thread::sleep(Duration::from_millis((12 - x * 2).max(0) as u64));
        active.fetch_sub(1, Ordering::SeqCst);
        if Some(*x) == fail_on {
            return Err("boom".to_string());
        }
        Ok(x * 2)
    };
    match map_with_concurrency(&items, limit, f) {
        Ok(results) => (Some(results), peak.load(Ordering::SeqCst), None),
        Err(e) => (None, peak.load(Ordering::SeqCst), Some(e)),
    }
}
`,
  },
  'debounce': {
    starter: `use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
// Json is the harness's plain JSON value (Null, Bool, Int, Float, Str, Array, Object):
// the script mixes strings and numbers, so it arrives as Json, not a typed Vec.
use whetstone::Json;

/// A debounced callable: call(arg) runs f only after wait_ms of silence, with the last
/// call's argument; cancel drops a pending call.
pub struct Debounced<A> {
    f: Arc<dyn Fn(A) + Send + Sync>,
    wait: Duration,
    // your fields
}

impl<A: Send + 'static> Debounced<A> {
    pub fn call(&self, arg: A) {
        // your code
    }

    pub fn cancel(&self) {
        // your code
    }
}

/// Call f only after wait_ms of silence; the last call's argument wins.
pub fn debounce<A: Send + 'static>(f: impl Fn(A) + Send + Sync + 'static, wait_ms: u64) -> Debounced<A> {
    // your fields
    Debounced { f: Arc::new(f), wait: Duration::from_millis(wait_ms) }
}

/// Test driver. Leave as is. Replays ["call", x], ["sleep", ms] and ["cancel"] steps
/// against a debounced recorder and returns what got through.
pub fn debounce_demo(script: Vec<Vec<Json>>, wait_ms: u64) -> Vec<i64> {
    let calls = Arc::new(Mutex::new(Vec::new()));
    let recorder = Arc::clone(&calls);
    let d = debounce(move |x: i64| recorder.lock().unwrap().push(x), wait_ms);
    for step in &script {
        let arg = step.get(1).and_then(Json::as_i64).unwrap_or(0);
        match step[0].as_str() {
            Some("call") => d.call(arg),
            Some("sleep") => thread::sleep(Duration::from_millis(arg as u64)),
            _ => d.cancel(),
        }
    }
    let seen = calls.lock().unwrap().clone();
    seen
}
`,
    solution: `use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use whetstone::Json;

/// A debounced callable: call(arg) runs f only after wait_ms of silence, with the last
/// call's argument; cancel drops a pending call.
pub struct Debounced<A> {
    f: Arc<dyn Fn(A) + Send + Sync>,
    wait: Duration,
    generation: Arc<Mutex<u64>>, // every call or cancel starts a new generation; only the latest fires
}

impl<A: Send + 'static> Debounced<A> {
    pub fn call(&self, arg: A) {
        let mine = {
            let mut g = self.generation.lock().unwrap();
            *g += 1;
            *g
        };
        let (f, generation, wait) = (Arc::clone(&self.f), Arc::clone(&self.generation), self.wait);
        thread::spawn(move || {
            thread::sleep(wait);
            let still_latest = *generation.lock().unwrap() == mine; // a later call or cancel supersedes this one
            if still_latest {
                f(arg);
            }
        });
    }

    pub fn cancel(&self) {
        *self.generation.lock().unwrap() += 1;
    }
}

/// Call f only after wait_ms of silence; the last call's argument wins.
pub fn debounce<A: Send + 'static>(f: impl Fn(A) + Send + Sync + 'static, wait_ms: u64) -> Debounced<A> {
    Debounced { f: Arc::new(f), wait: Duration::from_millis(wait_ms), generation: Arc::new(Mutex::new(0)) }
}

/// Test driver. Leave as is.
pub fn debounce_demo(script: Vec<Vec<Json>>, wait_ms: u64) -> Vec<i64> {
    let calls = Arc::new(Mutex::new(Vec::new()));
    let recorder = Arc::clone(&calls);
    let d = debounce(move |x: i64| recorder.lock().unwrap().push(x), wait_ms);
    for step in &script {
        let arg = step.get(1).and_then(Json::as_i64).unwrap_or(0);
        match step[0].as_str() {
            Some("call") => d.call(arg),
            Some("sleep") => thread::sleep(Duration::from_millis(arg as u64)),
            _ => d.cancel(),
        }
    }
    let seen = calls.lock().unwrap().clone();
    seen
}
`,
  },
  'retry-with-backoff': {
    starter: `use std::thread;
use std::time::Duration;

/// Up to retries more attempts, waiting base_ms * 2^attempt between them; should_retry
/// can stop early for errors that are not transient (None retries everything).
pub struct RetryOptions<E> {
    pub retries: u32,
    pub base_ms: u64,
    pub should_retry: Option<Box<dyn Fn(&E) -> bool>>,
}

/// Call f; on an error wait base_ms * 2^attempt before trying again, up to retries more
/// times. Return the first success; after the last failure return the last error.
pub fn retry<T, E>(mut f: impl FnMut() -> Result<T, E>, options: &RetryOptions<E>) -> Result<T, E> {
    // your code
    f()
}

/// Test driver. Leave as is. The function fails fail_times times with "down <n>" (or
/// always with "fatal" when fatal is set, which should_retry refuses to retry), then
/// returns "ok". Returns [result, calls, error].
pub fn retry_demo(fail_times: i32, retries: u32, base_ms: u64, fatal: bool) -> (Option<String>, i32, Option<String>) {
    let mut calls = 0;
    let f = || -> Result<String, String> {
        calls += 1;
        if fatal {
            return Err("fatal".to_string());
        }
        if calls <= fail_times {
            return Err(format!("down {}", calls));
        }
        Ok("ok".to_string())
    };
    let options = RetryOptions { retries, base_ms, should_retry: Some(Box::new(|e: &String| e != "fatal")) };
    match retry(f, &options) {
        Ok(r) => (Some(r), calls, None),
        Err(e) => (None, calls, Some(e)),
    }
}
`,
    solution: `use std::thread;
use std::time::Duration;

/// Up to retries more attempts, waiting base_ms * 2^attempt between them; should_retry
/// can stop early for errors that are not transient (None retries everything).
pub struct RetryOptions<E> {
    pub retries: u32,
    pub base_ms: u64,
    pub should_retry: Option<Box<dyn Fn(&E) -> bool>>,
}

/// Call f; on an error wait base_ms * 2^attempt before trying again, up to retries more
/// times. Return the first success; after the last failure return the last error.
pub fn retry<T, E>(mut f: impl FnMut() -> Result<T, E>, options: &RetryOptions<E>) -> Result<T, E> {
    let mut attempt = 0;
    loop {
        match f() {
            Ok(value) => return Ok(value),
            Err(e) => {
                let retryable = options.should_retry.as_ref().map_or(true, |keep| keep(&e));
                if attempt >= options.retries || !retryable {
                    return Err(e); // the real last error, not a generic "gave up"
                }
                thread::sleep(Duration::from_millis(options.base_ms * (1u64 << attempt.min(32))));
                attempt += 1;
            }
        }
    }
}

/// Test driver. Leave as is.
pub fn retry_demo(fail_times: i32, retries: u32, base_ms: u64, fatal: bool) -> (Option<String>, i32, Option<String>) {
    let mut calls = 0;
    let f = || -> Result<String, String> {
        calls += 1;
        if fatal {
            return Err("fatal".to_string());
        }
        if calls <= fail_times {
            return Err(format!("down {}", calls));
        }
        Ok("ok".to_string())
    };
    let options = RetryOptions { retries, base_ms, should_retry: Some(Box::new(|e: &String| e != "fatal")) };
    match retry(f, &options) {
        Ok(r) => (Some(r), calls, None),
        Err(e) => (None, calls, Some(e)),
    }
}
`,
  },
  'event-emitter': {
    starter: `use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::{Rc, Weak};
// Json is the harness's plain JSON value (Null, Bool, Int, Float, Str, Array, Object):
// the script and the payloads mix kinds, so they arrive as Json, not a typed Vec.
use whetstone::Json;

/// What on and once return: call it to unsubscribe.
pub type Unsubscribe = Box<dyn Fn()>;

/// on(name, handler) returns an unsubscribe closure; once runs the handler one time;
/// emit calls every current handler in registration order. A handler that unsubscribes
/// during emit must not break iteration of the others.
pub struct Emitter<P> {
    // your fields (then drop this marker, which only keeps P in use)
    _marker: std::marker::PhantomData<P>,
}

impl<P: 'static> Emitter<P> {
    pub fn new() -> Self {
        Emitter { _marker: std::marker::PhantomData }
    }

    pub fn on(&self, name: &str, handler: impl Fn(&P) + 'static) -> Unsubscribe {
        // your code
        Box::new(|| {})
    }

    pub fn once(&self, name: &str, handler: impl Fn(&P) + 'static) -> Unsubscribe {
        // your code
        Box::new(|| {})
    }

    pub fn emit(&self, name: &str, payload: &P) {
        // your code
    }
}

/// Test driver. Leave as is. Replays ["on"|"once", name, spec], ["emit", name, payload]
/// and ["off", n] (unsubscribe the n-th registration) steps. Specs: "record" pushes the
/// payload, "record10" pushes payload * 10, "record:<s>" pushes s, "self-off:<s>" pushes
/// s then unsubscribes itself.
pub fn emitter_demo(script: Vec<Vec<Json>>) -> Vec<Json> {
    let e: Emitter<Json> = Emitter::new();
    let seen = Rc::new(RefCell::new(Vec::new()));
    let mut offs: Vec<Rc<dyn Fn()>> = Vec::new();
    for step in &script {
        let op = step[0].as_str().unwrap_or("");
        if op == "on" || op == "once" {
            let name = step[1].as_str().unwrap_or("");
            let spec = step[2].as_str().unwrap_or("").to_string();
            let seen = Rc::clone(&seen);
            let own_off: Rc<RefCell<Option<Rc<dyn Fn()>>>> = Rc::new(RefCell::new(None)); // this handler's unsubscribe, filled in below
            let self_off = Rc::clone(&own_off);
            let h = move |p: &Json| {
                if spec == "record" {
                    seen.borrow_mut().push(p.clone());
                } else if spec == "record10" {
                    seen.borrow_mut().push(Json::Int(p.as_i64().unwrap_or(0) * 10));
                } else if let Some(s) = spec.strip_prefix("record:") {
                    seen.borrow_mut().push(Json::Str(s.to_string()));
                } else if let Some(s) = spec.strip_prefix("self-off:") {
                    seen.borrow_mut().push(Json::Str(s.to_string()));
                    if let Some(off) = self_off.borrow().as_ref() {
                        off();
                    }
                }
            };
            let off: Rc<dyn Fn()> = Rc::from(if op == "on" { e.on(name, h) } else { e.once(name, h) });
            *own_off.borrow_mut() = Some(Rc::clone(&off));
            offs.push(off);
        } else if op == "emit" {
            e.emit(step[1].as_str().unwrap_or(""), step.get(2).unwrap_or(&Json::Null));
        } else {
            offs[step[1].as_i64().unwrap_or(0) as usize]();
        }
    }
    let out = seen.borrow().clone();
    out
}
`,
    solution: `use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::{Rc, Weak};
use whetstone::Json;

/// What on and once return: call it to unsubscribe.
pub type Unsubscribe = Box<dyn Fn()>;

type Handler<P> = Rc<dyn Fn(&P)>;

struct Inner<P> {
    next_id: usize,
    handlers: HashMap<String, Vec<(usize, Handler<P>)>>, // per event, in registration order
}

/// on(name, handler) returns an unsubscribe closure; once runs the handler one time;
/// emit calls every current handler in registration order. A handler that unsubscribes
/// during emit must not break iteration of the others.
pub struct Emitter<P> {
    inner: Rc<RefCell<Inner<P>>>, // shared (weakly) with the unsubscribe closures
}

impl<P: 'static> Emitter<P> {
    pub fn new() -> Self {
        Emitter { inner: Rc::new(RefCell::new(Inner { next_id: 0, handlers: HashMap::new() })) }
    }

    pub fn on(&self, name: &str, handler: impl Fn(&P) + 'static) -> Unsubscribe {
        let id = self.next_id();
        self.add(name, id, Rc::new(handler));
        let off = self.unsubscriber(name, id);
        Box::new(move || off())
    }

    pub fn once(&self, name: &str, handler: impl Fn(&P) + 'static) -> Unsubscribe {
        let id = self.next_id();
        let off = self.unsubscriber(name, id);
        let off_inside = Rc::clone(&off);
        self.add(name, id, Rc::new(move |payload: &P| {
            off_inside(); // unsubscribe first, so a handler that emits again cannot re-enter
            handler(payload);
        }));
        Box::new(move || off())
    }

    pub fn emit(&self, name: &str, payload: &P) {
        // Call a copy of the list, so a handler may unsubscribe itself or others mid-emit.
        let current: Vec<Handler<P>> = self
            .inner
            .borrow()
            .handlers
            .get(name)
            .map(|list| list.iter().map(|(_, h)| Rc::clone(h)).collect())
            .unwrap_or_default();
        for h in current {
            h(payload);
        }
    }

    fn next_id(&self) -> usize {
        let mut inner = self.inner.borrow_mut();
        inner.next_id += 1;
        inner.next_id
    }

    fn add(&self, name: &str, id: usize, handler: Handler<P>) {
        self.inner.borrow_mut().handlers.entry(name.to_string()).or_default().push((id, handler));
    }

    /// A closure removing registration id from name. It holds the emitter weakly, so a
    /// once handler stored inside the emitter does not keep the emitter alive.
    fn unsubscriber(&self, name: &str, id: usize) -> Rc<dyn Fn()> {
        let weak: Weak<RefCell<Inner<P>>> = Rc::downgrade(&self.inner);
        let name = name.to_string();
        Rc::new(move || {
            if let Some(inner) = weak.upgrade() {
                if let Some(list) = inner.borrow_mut().handlers.get_mut(&name) {
                    list.retain(|(i, _)| *i != id);
                }
            }
        })
    }
}

/// Test driver. Leave as is.
pub fn emitter_demo(script: Vec<Vec<Json>>) -> Vec<Json> {
    let e: Emitter<Json> = Emitter::new();
    let seen = Rc::new(RefCell::new(Vec::new()));
    let mut offs: Vec<Rc<dyn Fn()>> = Vec::new();
    for step in &script {
        let op = step[0].as_str().unwrap_or("");
        if op == "on" || op == "once" {
            let name = step[1].as_str().unwrap_or("");
            let spec = step[2].as_str().unwrap_or("").to_string();
            let seen = Rc::clone(&seen);
            let own_off: Rc<RefCell<Option<Rc<dyn Fn()>>>> = Rc::new(RefCell::new(None)); // this handler's unsubscribe, filled in below
            let self_off = Rc::clone(&own_off);
            let h = move |p: &Json| {
                if spec == "record" {
                    seen.borrow_mut().push(p.clone());
                } else if spec == "record10" {
                    seen.borrow_mut().push(Json::Int(p.as_i64().unwrap_or(0) * 10));
                } else if let Some(s) = spec.strip_prefix("record:") {
                    seen.borrow_mut().push(Json::Str(s.to_string()));
                } else if let Some(s) = spec.strip_prefix("self-off:") {
                    seen.borrow_mut().push(Json::Str(s.to_string()));
                    if let Some(off) = self_off.borrow().as_ref() {
                        off();
                    }
                }
            };
            let off: Rc<dyn Fn()> = Rc::from(if op == "on" { e.on(name, h) } else { e.once(name, h) });
            *own_off.borrow_mut() = Some(Rc::clone(&off));
            offs.push(off);
        } else if op == "emit" {
            e.emit(step[1].as_str().unwrap_or(""), step.get(2).unwrap_or(&Json::Null));
        } else {
            offs[step[1].as_i64().unwrap_or(0) as usize]();
        }
    }
    let out = seen.borrow().clone();
    out
}
`,
  },
  'token-bucket': {
    starter: `use std::cell::Cell;
use std::rc::Rc;
// Json is the harness's plain JSON value (Null, Bool, Int, Float, Str, Array, Object):
// the script mixes strings and numbers, so it arrives as Json, not a typed Vec.
use whetstone::Json;

/// A token bucket with an injected clock (now returns milliseconds). try_remove(n) takes
/// n tokens if available. Tokens refill continuously at refill_per_second up to capacity,
/// computed lazily from the clock rather than by a timer.
pub struct TokenBucket {
    capacity: u64,
    refill_per_second: f64,
    now: Box<dyn Fn() -> u64>,
    // your fields
}

impl TokenBucket {
    pub fn new(capacity: u64, refill_per_second: f64, now: impl Fn() -> u64 + 'static) -> Self {
        // your fields
        TokenBucket { capacity, refill_per_second, now: Box::new(now) }
    }

    pub fn try_remove(&mut self, n: u64) -> bool {
        // your code
        false
    }
}

/// Test driver. Leave as is. ["take", n] records try_remove(n); ["at", ms] moves the clock.
pub fn bucket_demo(capacity: u64, refill_per_second: f64, script: Vec<Vec<Json>>) -> Vec<bool> {
    let t = Rc::new(Cell::new(0u64));
    let clock = Rc::clone(&t);
    let mut b = TokenBucket::new(capacity, refill_per_second, move || clock.get());
    let mut out = Vec::new();
    for step in &script {
        let n = step.get(1).and_then(Json::as_i64).unwrap_or(0) as u64;
        if step[0].as_str() == Some("take") {
            out.push(b.try_remove(n));
        } else {
            t.set(n);
        }
    }
    out
}
`,
    solution: `use std::cell::Cell;
use std::rc::Rc;
use whetstone::Json;

/// A token bucket with an injected clock (now returns milliseconds). try_remove(n) takes
/// n tokens if available. Tokens refill continuously at refill_per_second up to capacity,
/// computed lazily from the clock rather than by a timer.
pub struct TokenBucket {
    capacity: u64,
    refill_per_second: f64,
    now: Box<dyn Fn() -> u64>,
    tokens: f64, // fractional: at 1/s, 500 ms later there is half a token
    last_ms: u64,
}

impl TokenBucket {
    pub fn new(capacity: u64, refill_per_second: f64, now: impl Fn() -> u64 + 'static) -> Self {
        let last_ms = now();
        TokenBucket { capacity, refill_per_second, now: Box::new(now), tokens: capacity as f64, last_ms }
    }

    fn refill(&mut self) {
        let t = (self.now)();
        let elapsed = t.saturating_sub(self.last_ms) as f64 / 1000.0;
        self.tokens = (self.tokens + elapsed * self.refill_per_second).min(self.capacity as f64);
        self.last_ms = t;
    }

    pub fn try_remove(&mut self, n: u64) -> bool {
        self.refill();
        if self.tokens < n as f64 {
            return false;
        }
        self.tokens -= n as f64;
        true
    }
}

/// Test driver. Leave as is.
pub fn bucket_demo(capacity: u64, refill_per_second: f64, script: Vec<Vec<Json>>) -> Vec<bool> {
    let t = Rc::new(Cell::new(0u64));
    let clock = Rc::clone(&t);
    let mut b = TokenBucket::new(capacity, refill_per_second, move || clock.get());
    let mut out = Vec::new();
    for step in &script {
        let n = step.get(1).and_then(Json::as_i64).unwrap_or(0) as u64;
        if step[0].as_str() == Some("take") {
            out.push(b.try_remove(n));
        } else {
            t.set(n);
        }
    }
    out
}
`,
  },
  'flatten-object': {
    starter: `// Json is the harness's plain JSON value (Null, Bool, Int, Float, Str, Array, Object):
// a nested object of mixed kinds arrives as Json, and the flat result goes back as one.
use whetstone::Json;

/// Turn a nested object into a single-level one whose keys are the joined paths. Arrays
/// count as objects with index keys. Leaves (scalars, null, empty containers) are kept
/// as values. The separator defaults to ".".
pub fn flatten(obj: Json, separator: Option<String>) -> Json {
    // your code
    Json::Object(Vec::new())
}
`,
    solution: `use whetstone::Json;

/// Turn a nested object into a single-level one whose keys are the joined paths. Arrays
/// count as objects with index keys. Leaves (scalars, null, empty containers) are kept
/// as values. The separator defaults to ".".
pub fn flatten(obj: Json, separator: Option<String>) -> Json {
    let sep = separator.unwrap_or_else(|| ".".to_string());
    let mut out = Vec::new();
    walk(&obj, "", &sep, &mut out);
    Json::Object(out)
}

/// Writes every leaf under value into out, keyed by its path from prefix.
fn walk(value: &Json, prefix: &str, sep: &str, out: &mut Vec<(String, Json)>) {
    let join = |key: &str| if prefix.is_empty() { key.to_string() } else { format!("{}{}{}", prefix, sep, key) };
    match value {
        Json::Object(kvs) if !kvs.is_empty() => {
            for (k, v) in kvs {
                walk(v, &join(k), sep, out);
            }
        }
        Json::Array(items) if !items.is_empty() => {
            for (i, v) in items.iter().enumerate() {
                walk(v, &join(&i.to_string()), sep, out);
            }
        }
        leaf => out.push((prefix.to_string(), leaf.clone())), // scalars, null and empty containers
    }
}
`,
  },
  'memoize-ttl': {
    starter: `use std::cell::Cell;
use std::collections::HashMap;
use std::hash::Hash;
use std::rc::Rc;
// Json is the harness's plain JSON value (Null, Bool, Int, Float, Str, Array, Object):
// the script mixes strings and numbers, so it arrives as Json, not a typed Vec.
use whetstone::Json;

/// A memoised function: call caches f's result per argument for ttl_ms milliseconds (now
/// returns milliseconds); clear empties the cache.
pub struct Memoized<A, R> {
    f: Box<dyn FnMut(&A) -> R>,
    ttl_ms: u64,
    now: Box<dyn Fn() -> u64>,
    // your fields
}

impl<A: Hash + Eq, R: Clone> Memoized<A, R> {
    pub fn call(&mut self, arg: A) -> R {
        // your code
        (self.f)(&arg)
    }

    pub fn clear(&mut self) {
        // your code
    }
}

/// Cache f's results per argument for ttl_ms.
pub fn memoize<A, R>(f: impl FnMut(&A) -> R + 'static, ttl_ms: u64, now: impl Fn() -> u64 + 'static) -> Memoized<A, R> {
    // your fields
    Memoized { f: Box::new(f), ttl_ms, now: Box::new(now) }
}

/// Test driver. Leave as is. Memoises a counting adder (its argument is the pair (a, b))
/// with an injected clock: ["call", a, b] records the result, ["at", ms] moves the clock,
/// ["clear"] clears. Returns [results, underlying calls].
pub fn memo_demo(script: Vec<Vec<Json>>, ttl_ms: u64) -> (Vec<i64>, u32) {
    let t = Rc::new(Cell::new(0u64));
    let calls = Rc::new(Cell::new(0u32));
    let (clock, counter) = (Rc::clone(&t), Rc::clone(&calls));
    let mut m = memoize(
        move |&(a, b): &(i64, i64)| {
            counter.set(counter.get() + 1);
            a + b
        },
        ttl_ms,
        move || clock.get(),
    );
    let mut results = Vec::new();
    for step in &script {
        let num = |i: usize| step.get(i).and_then(Json::as_i64).unwrap_or(0);
        match step[0].as_str() {
            Some("call") => results.push(m.call((num(1), num(2)))),
            Some("at") => t.set(num(1) as u64),
            _ => m.clear(),
        }
    }
    (results, calls.get())
}
`,
    solution: `use std::cell::Cell;
use std::collections::HashMap;
use std::hash::Hash;
use std::rc::Rc;
use whetstone::Json;

/// A memoised function: call caches f's result per argument for ttl_ms milliseconds (now
/// returns milliseconds); clear empties the cache.
pub struct Memoized<A, R> {
    f: Box<dyn FnMut(&A) -> R>,
    ttl_ms: u64,
    now: Box<dyn Fn() -> u64>,
    cache: HashMap<A, (R, u64)>, // argument -> (value, expires at)
}

impl<A: Hash + Eq, R: Clone> Memoized<A, R> {
    pub fn call(&mut self, arg: A) -> R {
        let t = (self.now)();
        if let Some((value, expires_at)) = self.cache.get(&arg) {
            if *expires_at > t {
                return value.clone();
            }
        }
        let value = (self.f)(&arg); // a miss or an expired entry: recompute
        self.cache.insert(arg, (value.clone(), t + self.ttl_ms));
        value
    }

    pub fn clear(&mut self) {
        self.cache.clear();
    }
}

/// Cache f's results per argument for ttl_ms.
pub fn memoize<A, R>(f: impl FnMut(&A) -> R + 'static, ttl_ms: u64, now: impl Fn() -> u64 + 'static) -> Memoized<A, R> {
    Memoized { f: Box::new(f), ttl_ms, now: Box::new(now), cache: HashMap::new() }
}

/// Test driver. Leave as is.
pub fn memo_demo(script: Vec<Vec<Json>>, ttl_ms: u64) -> (Vec<i64>, u32) {
    let t = Rc::new(Cell::new(0u64));
    let calls = Rc::new(Cell::new(0u32));
    let (clock, counter) = (Rc::clone(&t), Rc::clone(&calls));
    let mut m = memoize(
        move |&(a, b): &(i64, i64)| {
            counter.set(counter.get() + 1);
            a + b
        },
        ttl_ms,
        move || clock.get(),
    );
    let mut results = Vec::new();
    for step in &script {
        let num = |i: usize| step.get(i).and_then(Json::as_i64).unwrap_or(0);
        match step[0].as_str() {
            Some("call") => results.push(m.call((num(1), num(2)))),
            Some("at") => t.set(num(1) as u64),
            _ => m.clear(),
        }
    }
    (results, calls.get())
}
`,
  },
  'deep-equal': {
    starter: `// Json is the harness's plain JSON value (Null, Bool, Int, Float, Str, Array, Object):
// values of any shape arrive as Json.
use whetstone::Json;

/// Structural equality: numbers by value (NaN equals NaN, and an integer equals the same
/// number as a float), arrays element-wise, objects key-wise regardless of key order.
/// Different kinds or different key sets are not equal.
pub fn deep_equal(a: Json, b: Json) -> bool {
    // your code (Json's derived == is close, but it calls NaN unequal to NaN, 5 unequal
    // to 5.0, and compares objects in key order)
    a == b
}

/// Test driver. Leave as is. The cases the JSON tests cannot express: NaN against NaN, 5
/// against 5.0 (one number in JavaScript, two Json variants here), and a key that is
/// present with a null value.
pub fn deep_equal_checks() -> Vec<bool> {
    let with_null = Json::Object(vec![("a".to_string(), Json::Int(1)), ("b".to_string(), Json::Null)]);
    vec![
        deep_equal(Json::Float(f64::NAN), Json::Float(f64::NAN)),
        deep_equal(Json::Int(5), Json::Float(5.0)),
        deep_equal(Json::Object(vec![("a".to_string(), Json::Int(1))]), with_null),
    ]
}
`,
    solution: `use whetstone::Json;

/// Structural equality: numbers by value (NaN equals NaN, and an integer equals the same
/// number as a float), arrays element-wise, objects key-wise regardless of key order.
/// Different kinds or different key sets are not equal.
pub fn deep_equal(a: Json, b: Json) -> bool {
    eq(&a, &b)
}

fn eq(a: &Json, b: &Json) -> bool {
    match (a, b) {
        (Json::Int(_) | Json::Float(_), Json::Int(_) | Json::Float(_)) => {
            let (x, y) = (a.as_f64().unwrap_or(f64::NAN), b.as_f64().unwrap_or(f64::NAN));
            x == y || (x.is_nan() && y.is_nan())
        }
        (Json::Array(xs), Json::Array(ys)) => xs.len() == ys.len() && xs.iter().zip(ys).all(|(x, y)| eq(x, y)),
        (Json::Object(xs), Json::Object(ys)) => {
            // Same key set (sizes match and every key of a is in b), each value deep-equal.
            xs.len() == ys.len() && xs.iter().all(|(k, x)| b.get(k).map_or(false, |y| eq(x, y)))
        }
        _ => a == b, // Null, Bool and Str by value; two different kinds are never equal
    }
}

/// Test driver. Leave as is.
pub fn deep_equal_checks() -> Vec<bool> {
    let with_null = Json::Object(vec![("a".to_string(), Json::Int(1)), ("b".to_string(), Json::Null)]);
    vec![
        deep_equal(Json::Float(f64::NAN), Json::Float(f64::NAN)),
        deep_equal(Json::Int(5), Json::Float(5.0)),
        deep_equal(Json::Object(vec![("a".to_string(), Json::Int(1))]), with_null),
    ]
}
`,
  },
}

/** The practical problems in Rust (see ports-practical-rust-more.ts for the second half). */
export const RUST_PRACTICAL: Record<string, Port> = { ...RUST_PRACTICAL_BASE, ...RUST_PRACTICAL_MORE }
