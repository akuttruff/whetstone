import type { Port } from '../types.ts'

/**
 * The second half of the practical problems in Rust (std only). Promises
 * become threads, channels and Condvars, AbortSignal becomes a small
 * CancelToken, dynamic data travels as the harness's Json enum (or a Value
 * enum of Rc handles where identity matters), and each file carries the same
 * test driver the TypeScript version has (see practical-drivers.ts), so the
 * same tests run here. Drivers are free snake_case functions; a struct that
 * the tests pass in or get back implements whetstone's FromJson/ToJson.
 */
export const RUST_PRACTICAL_MORE: Record<string, Port> = {
  'throttle': {
    starter: `use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>), with as_str(), as_i64(),
// as_f64(), as_array() and get(key) helpers. The driver uses it for its mixed-type script.
use whetstone::Json;

/// A throttled callable: the first call runs f immediately; calls during the
/// interval are coalesced into one trailing call (with the latest argument) when
/// the interval ends. now returns milliseconds; a timer thread is still needed
/// for the trailing call.
pub struct Throttle<A: Send + 'static> {
    f: Arc<dyn Fn(A) + Send + Sync>,
    interval_ms: u64,
    now: Arc<dyn Fn() -> u64 + Send + Sync>,
    // your fields
}

impl<A: Send + 'static> Throttle<A> {
    pub fn new(f: impl Fn(A) + Send + Sync + 'static, interval_ms: u64, now: impl Fn() -> u64 + Send + Sync + 'static) -> Self {
        Throttle { f: Arc::new(f), interval_ms, now: Arc::new(now) }
    }

    pub fn call(&self, arg: A) {
        // your code
        (self.f)(arg);
    }
}

/// Test driver. Leave as is. Replays ["call", x] and ["sleep", ms] steps
/// against a throttled recorder and returns what got through.
pub fn throttle_demo(script: Vec<Vec<Json>>, interval_ms: u64) -> Vec<i32> {
    let calls = Arc::new(Mutex::new(Vec::new()));
    let sink = Arc::clone(&calls);
    let start = Instant::now();
    let t = Throttle::new(move |x: i32| sink.lock().unwrap().push(x), interval_ms, move || start.elapsed().as_millis() as u64);
    for step in &script {
        let n = step.get(1).and_then(Json::as_i64).unwrap_or(0);
        if step[0].as_str() == Some("call") { t.call(n as i32); } else { thread::sleep(Duration::from_millis(n as u64)); }
    }
    let out = calls.lock().unwrap().clone();
    out
}
`,
    solution: `use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>), with as_str(), as_i64(),
// as_f64(), as_array() and get(key) helpers. The driver uses it for its mixed-type script.
use whetstone::Json;

/// A throttled callable: the first call runs f immediately; calls during the
/// interval are coalesced into one trailing call (with the latest argument) when
/// the interval ends. now returns milliseconds; a timer thread is still needed
/// for the trailing call.
pub struct Throttle<A: Send + 'static> {
    f: Arc<dyn Fn(A) + Send + Sync>,
    interval_ms: u64,
    now: Arc<dyn Fn() -> u64 + Send + Sync>,
    state: Arc<Mutex<State<A>>>,
}

struct State<A> {
    /// When f last ran, in the clock's milliseconds.
    last: Option<u64>,
    /// The latest argument waiting for the trailing call.
    pending: Option<A>,
    /// Whether a timer thread is already waiting to flush.
    trailing: bool,
}

impl<A: Send + 'static> Throttle<A> {
    pub fn new(f: impl Fn(A) + Send + Sync + 'static, interval_ms: u64, now: impl Fn() -> u64 + Send + Sync + 'static) -> Self {
        let state = State { last: None, pending: None, trailing: false };
        Throttle { f: Arc::new(f), interval_ms, now: Arc::new(now), state: Arc::new(Mutex::new(state)) }
    }

    pub fn call(&self, arg: A) {
        let t = (self.now)();
        let mut st = self.state.lock().unwrap();
        let since = st.last.map(|last| t.saturating_sub(last));
        if since.map_or(true, |s| s >= self.interval_ms) && !st.trailing {
            st.last = Some(t);
            drop(st);
            (self.f)(arg);
            return;
        }
        st.pending = Some(arg);
        if !st.trailing {
            st.trailing = true;
            let wait = self.interval_ms.saturating_sub(since.unwrap_or(0));
            let (f, now, state) = (Arc::clone(&self.f), Arc::clone(&self.now), Arc::clone(&self.state));
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(wait));
                let mut st = state.lock().unwrap();
                st.trailing = false;
                if let Some(arg) = st.pending.take() {
                    st.last = Some(now());
                    drop(st);
                    f(arg);
                }
            });
        }
    }
}

/// Test driver. Leave as is. Replays ["call", x] and ["sleep", ms] steps
/// against a throttled recorder and returns what got through.
pub fn throttle_demo(script: Vec<Vec<Json>>, interval_ms: u64) -> Vec<i32> {
    let calls = Arc::new(Mutex::new(Vec::new()));
    let sink = Arc::clone(&calls);
    let start = Instant::now();
    let t = Throttle::new(move |x: i32| sink.lock().unwrap().push(x), interval_ms, move || start.elapsed().as_millis() as u64);
    for step in &script {
        let n = step.get(1).and_then(Json::as_i64).unwrap_or(0);
        if step[0].as_str() == Some("call") { t.call(n as i32); } else { thread::sleep(Duration::from_millis(n as u64)); }
    }
    let out = calls.lock().unwrap().clone();
    out
}
`,
  },
  'async-queue': {
    starter: `use std::collections::VecDeque;
use std::sync::mpsc::{self, Receiver};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::Duration;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>), with as_str(), as_i64(),
// as_f64(), as_array() and get(key) helpers. The driver uses it for its mixed-type tasks.
use whetstone::Json;

/// A task queue running at most concurrency tasks at once (each on its own
/// thread) in FIFO order. add returns a Receiver that yields the task's
/// result once it has run (the promise); on_idle blocks until every added
/// task has settled. A failing task reports its Err on its own receiver
/// without stopping the queue.
pub struct TaskQueue {
    concurrency: usize,
    // your fields
}

impl TaskQueue {
    pub fn new(concurrency: usize) -> Self {
        TaskQueue { concurrency }
    }

    pub fn add<T: Send + 'static>(&self, task: impl FnOnce() -> Result<T, String> + Send + 'static) -> Receiver<Result<T, String>> {
        // your code
        let (tx, rx) = mpsc::channel();
        let _ = tx.send(task());
        rx
    }

    pub fn on_idle(&self) {
        // your code
    }
}

/// Test driver. Leave as is. Adds tasks ["ok", value, ms] (return value after
/// ms) and ["fail", message, ms] (fail after ms), waits for idle, and returns
/// [each task's outcome in add order ("error:<message>" for a failure), peak
/// concurrency].
pub fn queue_demo(concurrency: usize, tasks: Vec<Vec<Json>>) -> (Vec<Json>, usize) {
    let q = TaskQueue::new(concurrency);
    let gauge = Arc::new(Mutex::new((0usize, 0usize))); // (active, peak)
    let mut outcomes = Vec::new();
    for t in &tasks {
        let failing = t[0].as_str() == Some("fail");
        let value = t[1].clone();
        let ms = t[2].as_i64().unwrap_or(0) as u64;
        let gauge = Arc::clone(&gauge);
        outcomes.push(q.add(move || {
            { let mut g = gauge.lock().unwrap(); g.0 += 1; g.1 = g.1.max(g.0); }
            thread::sleep(Duration::from_millis(ms));
            gauge.lock().unwrap().0 -= 1;
            if failing { Err(value.as_str().map(|s| s.to_string()).unwrap_or_else(|| value.to_string())) } else { Ok(value) }
        }));
    }
    q.on_idle();
    let results = outcomes.iter().map(|rx| match rx.recv() {
        Ok(Ok(v)) => v,
        Ok(Err(e)) => Json::Str(format!("error:{}", e)),
        Err(_) => Json::Str("error:the task never reported".to_string()),
    }).collect();
    let peak = gauge.lock().unwrap().1;
    (results, peak)
}
`,
    solution: `use std::collections::VecDeque;
use std::sync::mpsc::{self, Receiver};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::Duration;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>), with as_str(), as_i64(),
// as_f64(), as_array() and get(key) helpers. The driver uses it for its mixed-type tasks.
use whetstone::Json;

/// A task queue running at most concurrency tasks at once (each on its own
/// thread) in FIFO order. add returns a Receiver that yields the task's
/// result once it has run (the promise); on_idle blocks until every added
/// task has settled. A failing task reports its Err on its own receiver
/// without stopping the queue.
pub struct TaskQueue {
    concurrency: usize,
    shared: Arc<(Mutex<Shared>, Condvar)>,
}

struct Shared {
    /// Jobs not yet started, oldest first. A job runs its task and reports the result.
    pending: VecDeque<Box<dyn FnOnce() + Send>>,
    active: usize,
}

impl TaskQueue {
    pub fn new(concurrency: usize) -> Self {
        let shared = Shared { pending: VecDeque::new(), active: 0 };
        TaskQueue { concurrency, shared: Arc::new((Mutex::new(shared), Condvar::new())) }
    }

    pub fn add<T: Send + 'static>(&self, task: impl FnOnce() -> Result<T, String> + Send + 'static) -> Receiver<Result<T, String>> {
        let (tx, rx) = mpsc::channel();
        let shared = Arc::clone(&self.shared);
        let concurrency = self.concurrency;
        let job = Box::new(move || {
            let _ = tx.send(task());
            let (lock, idle) = &*shared;
            let mut st = lock.lock().unwrap();
            st.active -= 1;
            Self::start_locked(&mut st, concurrency);
            idle.notify_all();
        });
        let mut st = self.shared.0.lock().unwrap();
        st.pending.push_back(job);
        Self::start_locked(&mut st, self.concurrency);
        rx
    }

    pub fn on_idle(&self) {
        let (lock, idle) = &*self.shared;
        let mut st = lock.lock().unwrap();
        while st.active > 0 || !st.pending.is_empty() {
            st = idle.wait(st).unwrap();
        }
    }

    /// Start pending jobs while there is room. Call with the lock held.
    fn start_locked(st: &mut Shared, concurrency: usize) {
        while st.active < concurrency {
            match st.pending.pop_front() {
                Some(job) => {
                    st.active += 1;
                    thread::spawn(job);
                }
                None => break,
            }
        }
    }
}

/// Test driver. Leave as is. Adds tasks ["ok", value, ms] (return value after
/// ms) and ["fail", message, ms] (fail after ms), waits for idle, and returns
/// [each task's outcome in add order ("error:<message>" for a failure), peak
/// concurrency].
pub fn queue_demo(concurrency: usize, tasks: Vec<Vec<Json>>) -> (Vec<Json>, usize) {
    let q = TaskQueue::new(concurrency);
    let gauge = Arc::new(Mutex::new((0usize, 0usize))); // (active, peak)
    let mut outcomes = Vec::new();
    for t in &tasks {
        let failing = t[0].as_str() == Some("fail");
        let value = t[1].clone();
        let ms = t[2].as_i64().unwrap_or(0) as u64;
        let gauge = Arc::clone(&gauge);
        outcomes.push(q.add(move || {
            { let mut g = gauge.lock().unwrap(); g.0 += 1; g.1 = g.1.max(g.0); }
            thread::sleep(Duration::from_millis(ms));
            gauge.lock().unwrap().0 -= 1;
            if failing { Err(value.as_str().map(|s| s.to_string()).unwrap_or_else(|| value.to_string())) } else { Ok(value) }
        }));
    }
    q.on_idle();
    let results = outcomes.iter().map(|rx| match rx.recv() {
        Ok(Ok(v)) => v,
        Ok(Err(e)) => Json::Str(format!("error:{}", e)),
        Err(_) => Json::Str("error:the task never reported".to_string()),
    }).collect();
    let peak = gauge.lock().unwrap().1;
    (results, peak)
}
`,
  },
  'deep-clone': {
    starter: `use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>). The plain tests arrive
// as Json and are converted to Value below.
use whetstone::Json;

/// A dynamic value with the shape of a JavaScript object graph. Containers are
/// shared handles (Rc<RefCell<..>>), so a value can hold the same list twice,
/// or itself; same tells identity apart from equality.
#[derive(Clone, Debug)]
pub enum Value {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(String),
    /// A timestamp in milliseconds, like a Date.
    Date(i64),
    List(Rc<RefCell<Vec<Value>>>),
    Map(Rc<RefCell<Vec<(String, Value)>>>),
}

impl Value {
    /// A deep copy: lists and maps are copied recursively, a handle that
    /// appears twice is copied once (the copies stay shared), and a cycle
    /// points at the copy, not the original. Other values are returned as is.
    pub fn deep_clone(&self) -> Value {
        // your code
        self.clone()
    }
}

// ── Given: constructors, accessors and JSON conversions. Leave as is. ──

impl Value {
    pub fn list(items: Vec<Value>) -> Value { Value::List(Rc::new(RefCell::new(items))) }

    pub fn map(pairs: Vec<(&str, Value)>) -> Value {
        Value::Map(Rc::new(RefCell::new(pairs.into_iter().map(|(k, v)| (k.to_string(), v)).collect())))
    }

    /// True when both are the same container (not merely equal).
    pub fn same(&self, other: &Value) -> bool {
        match (self, other) {
            (Value::List(a), Value::List(b)) => Rc::ptr_eq(a, b),
            (Value::Map(a), Value::Map(b)) => Rc::ptr_eq(a, b),
            _ => false,
        }
    }

    /// The value under a key of a map (Null when absent or not a map).
    pub fn at(&self, key: &str) -> Value {
        match self {
            Value::Map(m) => m.borrow().iter().find(|(k, _)| k == key).map(|(_, v)| v.clone()).unwrap_or(Value::Null),
            _ => Value::Null,
        }
    }

    /// The value at an index of a list (Null when out of range or not a list).
    pub fn index(&self, i: usize) -> Value {
        match self {
            Value::List(l) => l.borrow().get(i).cloned().unwrap_or(Value::Null),
            _ => Value::Null,
        }
    }

    /// Sets a key of a map in place.
    pub fn set(&self, key: &str, value: Value) {
        if let Value::Map(m) = self {
            let mut pairs = m.borrow_mut();
            match pairs.iter().position(|(k, _)| k == key) {
                Some(i) => pairs[i].1 = value,
                None => pairs.push((key.to_string(), value)),
            }
        }
    }

    pub fn as_i64(&self) -> Option<i64> {
        if let Value::Int(n) = self { Some(*n) } else { None }
    }

    pub fn from_json(j: &Json) -> Value {
        match j {
            Json::Null => Value::Null,
            Json::Bool(b) => Value::Bool(*b),
            Json::Int(n) => Value::Int(*n),
            Json::Float(f) => Value::Float(*f),
            Json::Str(s) => Value::Str(s.clone()),
            Json::Array(items) => Value::list(items.iter().map(Value::from_json).collect()),
            Json::Object(kvs) => Value::Map(Rc::new(RefCell::new(kvs.iter().map(|(k, v)| (k.clone(), Value::from_json(v))).collect()))),
        }
    }

    /// Back to JSON (for acyclic values; a Date becomes its milliseconds).
    pub fn to_json(&self) -> Json {
        match self {
            Value::Null => Json::Null,
            Value::Bool(b) => Json::Bool(*b),
            Value::Int(n) => Json::Int(*n),
            Value::Float(f) => Json::Float(*f),
            Value::Str(s) => Json::Str(s.clone()),
            Value::Date(ms) => Json::Int(*ms),
            Value::List(l) => Json::Array(l.borrow().iter().map(Value::to_json).collect()),
            Value::Map(m) => Json::Object(m.borrow().iter().map(|(k, v)| (k.clone(), v.to_json())).collect()),
        }
    }
}

/// Test driver. Leave as is: the JSON tests go through Value.
pub fn deep_clone(value: Json) -> Json {
    Value::from_json(&value).deep_clone().to_json()
}

/// Test driver. Leave as is: independence, a cycle, shared references, a Date
/// and fresh containers along the way all survive the copy.
pub fn check() -> Vec<bool> {
    let inner = Value::map(vec![("y", Value::Int(2))]);
    let x = Value::list(vec![Value::Int(1), inner.clone()]);
    let shared = Value::map(vec![("s", Value::Int(1))]);
    let a = Value::map(vec![("x", x.clone()), ("d", Value::Date(5)), ("p", shared.clone()), ("q", shared.clone())]);
    a.set("self", a.clone());
    let b = a.deep_clone();
    b.at("x").index(1).set("y", Value::Int(3));
    vec![
        inner.at("y").as_i64() == Some(2),
        b.at("self").same(&b),
        b.at("p").same(&b.at("q")) && !b.at("p").same(&shared),
        matches!(b.at("d"), Value::Date(5)),
        !b.at("x").same(&x) && !b.at("x").index(1).same(&inner) && b.at("x").index(1).at("y").as_i64() == Some(3),
    ]
}
`,
    solution: `use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>). The plain tests arrive
// as Json and are converted to Value below.
use whetstone::Json;

/// A dynamic value with the shape of a JavaScript object graph. Containers are
/// shared handles (Rc<RefCell<..>>), so a value can hold the same list twice,
/// or itself; same tells identity apart from equality.
#[derive(Clone, Debug)]
pub enum Value {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(String),
    /// A timestamp in milliseconds, like a Date.
    Date(i64),
    List(Rc<RefCell<Vec<Value>>>),
    Map(Rc<RefCell<Vec<(String, Value)>>>),
}

impl Value {
    /// A deep copy: lists and maps are copied recursively, a handle that
    /// appears twice is copied once (the copies stay shared), and a cycle
    /// points at the copy, not the original. Other values are returned as is.
    pub fn deep_clone(&self) -> Value {
        self.clone_with(&mut HashMap::new())
    }

    /// seen maps each original container (by address) to its copy, so a
    /// handle met again, including the one being copied, reuses the copy.
    fn clone_with(&self, seen: &mut HashMap<usize, Value>) -> Value {
        match self {
            Value::List(items) => {
                let id = Rc::as_ptr(items) as *const () as usize;
                if let Some(hit) = seen.get(&id) { return hit.clone(); }
                let out = Rc::new(RefCell::new(Vec::new()));
                seen.insert(id, Value::List(Rc::clone(&out)));
                let copied: Vec<Value> = items.borrow().iter().map(|v| v.clone_with(seen)).collect();
                *out.borrow_mut() = copied;
                Value::List(out)
            }
            Value::Map(pairs) => {
                let id = Rc::as_ptr(pairs) as *const () as usize;
                if let Some(hit) = seen.get(&id) { return hit.clone(); }
                let out = Rc::new(RefCell::new(Vec::new()));
                seen.insert(id, Value::Map(Rc::clone(&out)));
                let copied: Vec<(String, Value)> = pairs.borrow().iter().map(|(k, v)| (k.clone(), v.clone_with(seen))).collect();
                *out.borrow_mut() = copied;
                Value::Map(out)
            }
            // Scalars and dates are plain values: a clone is already a fresh copy.
            other => other.clone(),
        }
    }
}

// ── Given: constructors, accessors and JSON conversions. Leave as is. ──

impl Value {
    pub fn list(items: Vec<Value>) -> Value { Value::List(Rc::new(RefCell::new(items))) }

    pub fn map(pairs: Vec<(&str, Value)>) -> Value {
        Value::Map(Rc::new(RefCell::new(pairs.into_iter().map(|(k, v)| (k.to_string(), v)).collect())))
    }

    /// True when both are the same container (not merely equal).
    pub fn same(&self, other: &Value) -> bool {
        match (self, other) {
            (Value::List(a), Value::List(b)) => Rc::ptr_eq(a, b),
            (Value::Map(a), Value::Map(b)) => Rc::ptr_eq(a, b),
            _ => false,
        }
    }

    /// The value under a key of a map (Null when absent or not a map).
    pub fn at(&self, key: &str) -> Value {
        match self {
            Value::Map(m) => m.borrow().iter().find(|(k, _)| k == key).map(|(_, v)| v.clone()).unwrap_or(Value::Null),
            _ => Value::Null,
        }
    }

    /// The value at an index of a list (Null when out of range or not a list).
    pub fn index(&self, i: usize) -> Value {
        match self {
            Value::List(l) => l.borrow().get(i).cloned().unwrap_or(Value::Null),
            _ => Value::Null,
        }
    }

    /// Sets a key of a map in place.
    pub fn set(&self, key: &str, value: Value) {
        if let Value::Map(m) = self {
            let mut pairs = m.borrow_mut();
            match pairs.iter().position(|(k, _)| k == key) {
                Some(i) => pairs[i].1 = value,
                None => pairs.push((key.to_string(), value)),
            }
        }
    }

    pub fn as_i64(&self) -> Option<i64> {
        if let Value::Int(n) = self { Some(*n) } else { None }
    }

    pub fn from_json(j: &Json) -> Value {
        match j {
            Json::Null => Value::Null,
            Json::Bool(b) => Value::Bool(*b),
            Json::Int(n) => Value::Int(*n),
            Json::Float(f) => Value::Float(*f),
            Json::Str(s) => Value::Str(s.clone()),
            Json::Array(items) => Value::list(items.iter().map(Value::from_json).collect()),
            Json::Object(kvs) => Value::Map(Rc::new(RefCell::new(kvs.iter().map(|(k, v)| (k.clone(), Value::from_json(v))).collect()))),
        }
    }

    /// Back to JSON (for acyclic values; a Date becomes its milliseconds).
    pub fn to_json(&self) -> Json {
        match self {
            Value::Null => Json::Null,
            Value::Bool(b) => Json::Bool(*b),
            Value::Int(n) => Json::Int(*n),
            Value::Float(f) => Json::Float(*f),
            Value::Str(s) => Json::Str(s.clone()),
            Value::Date(ms) => Json::Int(*ms),
            Value::List(l) => Json::Array(l.borrow().iter().map(Value::to_json).collect()),
            Value::Map(m) => Json::Object(m.borrow().iter().map(|(k, v)| (k.clone(), v.to_json())).collect()),
        }
    }
}

/// Test driver. Leave as is: the JSON tests go through Value.
pub fn deep_clone(value: Json) -> Json {
    Value::from_json(&value).deep_clone().to_json()
}

/// Test driver. Leave as is: independence, a cycle, shared references, a Date
/// and fresh containers along the way all survive the copy.
pub fn check() -> Vec<bool> {
    let inner = Value::map(vec![("y", Value::Int(2))]);
    let x = Value::list(vec![Value::Int(1), inner.clone()]);
    let shared = Value::map(vec![("s", Value::Int(1))]);
    let a = Value::map(vec![("x", x.clone()), ("d", Value::Date(5)), ("p", shared.clone()), ("q", shared.clone())]);
    a.set("self", a.clone());
    let b = a.deep_clone();
    b.at("x").index(1).set("y", Value::Int(3));
    vec![
        inner.at("y").as_i64() == Some(2),
        b.at("self").same(&b),
        b.at("p").same(&b.at("q")) && !b.at("p").same(&shared),
        matches!(b.at("d"), Value::Date(5)),
        !b.at("x").same(&x) && !b.at("x").index(1).same(&inner) && b.at("x").index(1).at("y").as_i64() == Some(3),
    ]
}
`,
  },
  'group-by': {
    starter: `use std::collections::HashMap;
use std::hash::Hash;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>). The tests pass orders
// as JSON objects, which the FromJson impl below turns into Orders.
use whetstone::Json;

/// A map from key to the items with that key; items keep their order within a group.
pub fn group_by<T, K: Hash + Eq>(items: Vec<T>, key_fn: impl Fn(&T) -> K) -> HashMap<K, Vec<T>> {
    // your code
    HashMap::new()
}

pub struct Order {
    pub id: String,
    pub category: String,
    pub total: f64,
}

/// For each category, the id of the order with the highest total.
pub fn top_per_category(orders: Vec<Order>) -> HashMap<String, String> {
    // your code
    HashMap::new()
}

/// Test driver. Leave as is: lets the tests pass orders as JSON objects.
impl whetstone::FromJson for Order {
    fn from_json(v: &Json) -> Result<Self, String> {
        Ok(Order { id: whetstone::field(v, "id")?, category: whetstone::field(v, "category")?, total: whetstone::field(v, "total")? })
    }
}

/// Test driver. Leave as is: groups numbers by parity with group_by.
pub fn group_by_parity(nums: Vec<i64>) -> HashMap<String, Vec<i64>> {
    group_by(nums, |n| if n % 2 != 0 { "odd".to_string() } else { "even".to_string() })
}
`,
    solution: `use std::collections::HashMap;
use std::hash::Hash;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>). The tests pass orders
// as JSON objects, which the FromJson impl below turns into Orders.
use whetstone::Json;

/// A map from key to the items with that key; items keep their order within a group.
pub fn group_by<T, K: Hash + Eq>(items: Vec<T>, key_fn: impl Fn(&T) -> K) -> HashMap<K, Vec<T>> {
    let mut out: HashMap<K, Vec<T>> = HashMap::new();
    for item in items {
        out.entry(key_fn(&item)).or_default().push(item);
    }
    out
}

pub struct Order {
    pub id: String,
    pub category: String,
    pub total: f64,
}

/// For each category, the id of the order with the highest total.
pub fn top_per_category(orders: Vec<Order>) -> HashMap<String, String> {
    group_by(orders, |o| o.category.clone())
        .into_iter()
        .map(|(category, group)| {
            // The first order with the highest total; groups are never empty.
            let best = group.iter().fold(&group[0], |best, o| if o.total > best.total { o } else { best });
            (category, best.id.clone())
        })
        .collect()
}

/// Test driver. Leave as is: lets the tests pass orders as JSON objects.
impl whetstone::FromJson for Order {
    fn from_json(v: &Json) -> Result<Self, String> {
        Ok(Order { id: whetstone::field(v, "id")?, category: whetstone::field(v, "category")?, total: whetstone::field(v, "total")? })
    }
}

/// Test driver. Leave as is: groups numbers by parity with group_by.
pub fn group_by_parity(nums: Vec<i64>) -> HashMap<String, Vec<i64>> {
    group_by(nums, |n| if n % 2 != 0 { "odd".to_string() } else { "even".to_string() })
}
`,
  },
  'parse-query-string': {
    starter: `use std::collections::HashMap;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>); ToJson is how a value
// of your own type is reported to the tests.
use whetstone::{Json, ToJson};

/// A query value: one string, or several when the key repeats.
#[derive(Clone, Debug, PartialEq)]
pub enum QueryValue {
    One(String),
    Many(Vec<String>),
}

/// Turn a query string (with or without a leading "?") into a map. Repeated
/// keys become Many, "+" means space, percent-encoding is decoded, and a key
/// without "=" gets an empty string.
pub fn parse_query(qs: String) -> HashMap<String, QueryValue> {
    // your code
    HashMap::new()
}

/// Test driver. Leave as is: One is reported as a string, Many as an array.
impl ToJson for QueryValue {
    fn to_json(&self) -> Result<Json, String> {
        match self {
            QueryValue::One(s) => Ok(Json::Str(s.clone())),
            QueryValue::Many(list) => Ok(Json::Array(list.iter().map(|s| Json::Str(s.clone())).collect())),
        }
    }
}
`,
    solution: `use std::collections::HashMap;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>); ToJson is how a value
// of your own type is reported to the tests.
use whetstone::{Json, ToJson};

/// A query value: one string, or several when the key repeats.
#[derive(Clone, Debug, PartialEq)]
pub enum QueryValue {
    One(String),
    Many(Vec<String>),
}

/// Turn a query string (with or without a leading "?") into a map. Repeated
/// keys become Many, "+" means space, percent-encoding is decoded, and a key
/// without "=" gets an empty string.
pub fn parse_query(qs: String) -> HashMap<String, QueryValue> {
    let mut out = HashMap::new();
    let body = qs.strip_prefix('?').unwrap_or(&qs);
    for part in body.split('&').filter(|p| !p.is_empty()) {
        let (key, value) = match part.split_once('=') {
            Some((k, v)) => (decode(k), decode(v)),
            None => (decode(part), String::new()),
        };
        let next = match out.remove(&key) {
            None => QueryValue::One(value),
            Some(QueryValue::One(first)) => QueryValue::Many(vec![first, value]),
            Some(QueryValue::Many(mut list)) => {
                list.push(value);
                QueryValue::Many(list)
            }
        };
        out.insert(key, next);
    }
    out
}

/// "+" becomes a space and each %XX escape its byte; a malformed escape is kept as is.
fn decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'+' => out.push(b' '),
            b'%' => {
                let byte = bytes.get(i + 1..i + 3).and_then(|hex| std::str::from_utf8(hex).ok()).and_then(|hex| u8::from_str_radix(hex, 16).ok());
                match byte {
                    Some(b) => {
                        out.push(b);
                        i += 2;
                    }
                    None => out.push(b'%'),
                }
            }
            b => out.push(b),
        }
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Test driver. Leave as is: One is reported as a string, Many as an array.
impl ToJson for QueryValue {
    fn to_json(&self) -> Result<Json, String> {
        match self {
            QueryValue::One(s) => Ok(Json::Str(s.clone())),
            QueryValue::Many(list) => Ok(Json::Array(list.iter().map(|s| Json::Str(s.clone())).collect())),
        }
    }
}
`,
  },
  'lfu-cache': {
    starter: `use std::collections::{BTreeSet, HashMap};
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>), with as_str(), as_i64(),
// as_f64(), as_array() and get(key) helpers. The driver uses it for its mixed-type ops.
use whetstone::Json;

/// An LFU cache: get returns the value or -1; set inserts or updates; when
/// over capacity, evict the least frequently used key, breaking ties by least
/// recently used. Both O(1) with a linked hash set per frequency (here a
/// BTreeSet ordered by recency stands in, O(log n)).
pub struct LfuCache {
    capacity: usize,
    // your fields
}

impl LfuCache {
    pub fn new(capacity: usize) -> Self {
        LfuCache { capacity }
    }

    pub fn get(&mut self, key: i32) -> i32 {
        // your code
        -1
    }

    pub fn set(&mut self, key: i32, value: i32) {
        // your code
    }
}

/// Test driver. Leave as is. Replays ["set", k, v] (recording null) and
/// ["get", k] (recording the result) steps.
pub fn run_lfu(capacity: usize, ops: Vec<Vec<Json>>) -> Vec<Option<i32>> {
    let mut cache = LfuCache::new(capacity);
    ops.iter()
        .map(|op| {
            let key = op[1].as_i64().unwrap_or(0) as i32;
            if op[0].as_str() == Some("set") {
                cache.set(key, op[2].as_i64().unwrap_or(0) as i32);
                None
            } else {
                Some(cache.get(key))
            }
        })
        .collect()
}
`,
    solution: `use std::collections::{BTreeSet, HashMap};
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>), with as_str(), as_i64(),
// as_f64(), as_array() and get(key) helpers. The driver uses it for its mixed-type ops.
use whetstone::Json;

/// An LFU cache: get returns the value or -1; set inserts or updates; when
/// over capacity, evict the least frequently used key, breaking ties by least
/// recently used. Both O(1) with a linked hash set per frequency (here a
/// BTreeSet ordered by recency stands in, O(log n)).
pub struct LfuCache {
    capacity: usize,
    entries: HashMap<i32, Slot>,
    /// Frequency -> (recency tick, key), least recently used first.
    buckets: HashMap<usize, BTreeSet<(u64, i32)>>,
    /// The lowest frequency with a non-empty bucket (meaningless while empty).
    min_freq: usize,
    /// Counts touches, so a larger tick means used more recently.
    clock: u64,
}

struct Slot {
    value: i32,
    freq: usize,
    tick: u64,
}

impl LfuCache {
    pub fn new(capacity: usize) -> Self {
        LfuCache { capacity, entries: HashMap::new(), buckets: HashMap::new(), min_freq: 0, clock: 0 }
    }

    pub fn get(&mut self, key: i32) -> i32 {
        if !self.entries.contains_key(&key) { return -1; }
        self.touch(key);
        self.entries[&key].value
    }

    pub fn set(&mut self, key: i32, value: i32) {
        if self.capacity == 0 { return; }
        if let Some(slot) = self.entries.get_mut(&key) {
            slot.value = value;
            self.touch(key);
            return;
        }
        if self.entries.len() >= self.capacity {
            let bucket = self.buckets.get_mut(&self.min_freq).unwrap();
            let (_, victim) = bucket.pop_first().unwrap();
            if bucket.is_empty() { self.buckets.remove(&self.min_freq); }
            self.entries.remove(&victim);
        }
        self.clock += 1;
        self.entries.insert(key, Slot { value, freq: 1, tick: self.clock });
        self.buckets.entry(1).or_default().insert((self.clock, key));
        self.min_freq = 1;
    }

    /// Count one more use of a present key: move it up a bucket, as the newest there.
    fn touch(&mut self, key: i32) {
        let slot = self.entries.get_mut(&key).unwrap();
        let bucket = self.buckets.get_mut(&slot.freq).unwrap();
        bucket.remove(&(slot.tick, key));
        if bucket.is_empty() {
            self.buckets.remove(&slot.freq);
            if self.min_freq == slot.freq { self.min_freq += 1; }
        }
        slot.freq += 1;
        self.clock += 1;
        slot.tick = self.clock;
        self.buckets.entry(slot.freq).or_default().insert((slot.tick, key));
    }
}

/// Test driver. Leave as is. Replays ["set", k, v] (recording null) and
/// ["get", k] (recording the result) steps.
pub fn run_lfu(capacity: usize, ops: Vec<Vec<Json>>) -> Vec<Option<i32>> {
    let mut cache = LfuCache::new(capacity);
    ops.iter()
        .map(|op| {
            let key = op[1].as_i64().unwrap_or(0) as i32;
            if op[0].as_str() == Some("set") {
                cache.set(key, op[2].as_i64().unwrap_or(0) as i32);
                None
            } else {
                Some(cache.get(key))
            }
        })
        .collect()
}
`,
  },
  'circular-buffer': {
    starter: `// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>), with as_str(), as_i64(),
// as_f64(), as_array() and get(key) helpers. The driver stores Json items and records mixed results.
use whetstone::Json;

/// A ring buffer: push overwrites the oldest item when full and returns it
/// (else None); shift removes and returns the oldest; to_vec lists oldest
/// to newest; len is the count.
pub struct RingBuffer<T> {
    capacity: usize,
    /// Fixed storage, one slot per unit of capacity.
    items: Vec<Option<T>>,
    // your fields
}

impl<T> RingBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        RingBuffer { capacity, items: (0..capacity).map(|_| None).collect() }
    }

    pub fn len(&self) -> usize {
        // your code
        0
    }

    pub fn push(&mut self, item: T) -> Option<T> {
        // your code
        None
    }

    pub fn shift(&mut self) -> Option<T> {
        // your code
        None
    }
}

impl<T: Clone> RingBuffer<T> {
    pub fn to_vec(&self) -> Vec<T> {
        // your code
        Vec::new()
    }
}

/// Test driver. Leave as is. Replays ["push", x] (records what was evicted),
/// ["shift"], ["toArray"] and ["size"] steps, recording each result.
pub fn ring_demo(capacity: usize, ops: Vec<Vec<Json>>) -> Vec<Json> {
    let mut buffer = RingBuffer::new(capacity);
    ops.iter()
        .map(|op| match op[0].as_str() {
            Some("push") => buffer.push(op[1].clone()).unwrap_or(Json::Null),
            Some("shift") => buffer.shift().unwrap_or(Json::Null),
            Some("toArray") => Json::Array(buffer.to_vec()),
            _ => Json::Int(buffer.len() as i64),
        })
        .collect()
}
`,
    solution: `// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>), with as_str(), as_i64(),
// as_f64(), as_array() and get(key) helpers. The driver stores Json items and records mixed results.
use whetstone::Json;

/// A ring buffer: push overwrites the oldest item when full and returns it
/// (else None); shift removes and returns the oldest; to_vec lists oldest
/// to newest; len is the count.
pub struct RingBuffer<T> {
    capacity: usize,
    /// Fixed storage; the live items are the count slots from start, wrapping around.
    items: Vec<Option<T>>,
    start: usize,
    count: usize,
}

impl<T> RingBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        RingBuffer { capacity, items: (0..capacity).map(|_| None).collect(), start: 0, count: 0 }
    }

    pub fn len(&self) -> usize {
        self.count
    }

    pub fn push(&mut self, item: T) -> Option<T> {
        if self.capacity == 0 { return Some(item); }
        if self.count == self.capacity {
            let evicted = self.items[self.start].replace(item);
            self.start = (self.start + 1) % self.capacity;
            return evicted;
        }
        let end = (self.start + self.count) % self.capacity;
        self.items[end] = Some(item);
        self.count += 1;
        None
    }

    pub fn shift(&mut self) -> Option<T> {
        if self.count == 0 { return None; }
        let item = self.items[self.start].take();
        self.start = (self.start + 1) % self.capacity;
        self.count -= 1;
        item
    }
}

impl<T: Clone> RingBuffer<T> {
    pub fn to_vec(&self) -> Vec<T> {
        (0..self.count).filter_map(|i| self.items[(self.start + i) % self.capacity].clone()).collect()
    }
}

/// Test driver. Leave as is. Replays ["push", x] (records what was evicted),
/// ["shift"], ["toArray"] and ["size"] steps, recording each result.
pub fn ring_demo(capacity: usize, ops: Vec<Vec<Json>>) -> Vec<Json> {
    let mut buffer = RingBuffer::new(capacity);
    ops.iter()
        .map(|op| match op[0].as_str() {
            Some("push") => buffer.push(op[1].clone()).unwrap_or(Json::Null),
            Some("shift") => buffer.shift().unwrap_or(Json::Null),
            Some("toArray") => Json::Array(buffer.to_vec()),
            _ => Json::Int(buffer.len() as i64),
        })
        .collect()
}
`,
  },
  'semver-compare': {
    starter: `use std::cmp::Ordering;

/// -1, 0 or 1 for versions like "1.2.10" and "1.2.9". Missing trailing parts
/// count as 0 ("1.0" equals "1.0.0"). A pre-release suffix ("1.0.0-beta")
/// sorts before the release.
pub fn compare_versions(a: String, b: String) -> i32 {
    // your code
    0
}
`,
    solution: `use std::cmp::Ordering;

/// -1, 0 or 1 for versions like "1.2.10" and "1.2.9". Missing trailing parts
/// count as 0 ("1.0" equals "1.0.0"). A pre-release suffix ("1.0.0-beta")
/// sorts before the release.
pub fn compare_versions(a: String, b: String) -> i32 {
    let (nums_a, pre_a) = parse(&a);
    let (nums_b, pre_b) = parse(&b);
    let len = nums_a.len().max(nums_b.len());
    let by_numbers = (0..len)
        .map(|i| nums_a.get(i).copied().unwrap_or(0).cmp(&nums_b.get(i).copied().unwrap_or(0)))
        .find(|o| o.is_ne())
        .unwrap_or(Ordering::Equal);
    // Same numbers: a release (no suffix) is newer than any pre-release of it.
    let by_prerelease = match (pre_a, pre_b) {
        (None, None) => Ordering::Equal,
        (None, Some(_)) => Ordering::Greater,
        (Some(_), None) => Ordering::Less,
        (Some(x), Some(y)) => x.cmp(y),
    };
    by_numbers.then(by_prerelease) as i32
}

/// The dotted numeric parts and the pre-release suffix after "-", if any.
fn parse(version: &str) -> (Vec<u64>, Option<&str>) {
    let (main, pre) = match version.split_once('-') {
        Some((main, pre)) => (main, Some(pre)),
        None => (version, None),
    };
    (main.split('.').map(|part| part.parse().unwrap_or(0)).collect(), pre)
}
`,
  },
  'resolve-dependencies': {
    starter: `use std::collections::{BTreeSet, HashMap};
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>). The driver returns one
// because its result is either an array or an error string.
use whetstone::Json;

/// deps maps each package to the packages it depends on. Return an install
/// order where every package comes after its dependencies, or Err with a
/// message starting with "cycle" when there is one. Among valid orders, prefer
/// alphabetical when there is a choice.
pub fn install_order(deps: HashMap<String, Vec<String>>) -> Result<Vec<String>, String> {
    // your code
    Ok(Vec::new())
}

/// Test driver. Leave as is: the order, or the error message when there is a cycle.
pub fn install_order_or_error(deps: HashMap<String, Vec<String>>) -> Json {
    match install_order(deps) {
        Ok(order) => Json::Array(order.into_iter().map(Json::Str).collect()),
        Err(message) => Json::Str(message),
    }
}
`,
    solution: `use std::collections::{BTreeSet, HashMap};
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>). The driver returns one
// because its result is either an array or an error string.
use whetstone::Json;

/// deps maps each package to the packages it depends on. Return an install
/// order where every package comes after its dependencies, or Err with a
/// message starting with "cycle" when there is one. Among valid orders, prefer
/// alphabetical when there is a choice.
pub fn install_order(deps: HashMap<String, Vec<String>>) -> Result<Vec<String>, String> {
    // Every name mentioned is a node, whether or not it has its own entry.
    let mut nodes: BTreeSet<&str> = deps.keys().map(String::as_str).collect();
    for list in deps.values() {
        nodes.extend(list.iter().map(String::as_str));
    }
    let mut indegree: HashMap<&str, usize> = nodes.iter().map(|&n| (n, 0)).collect();
    let mut dependents: HashMap<&str, Vec<&str>> = HashMap::new();
    for (pkg, list) in &deps {
        for dep in list {
            *indegree.get_mut(pkg.as_str()).unwrap() += 1;
            dependents.entry(dep.as_str()).or_default().push(pkg.as_str());
        }
    }
    // Kahn's algorithm; the ready set is ordered, so ties go alphabetically.
    let mut ready: BTreeSet<&str> = nodes.iter().copied().filter(|n| indegree[n] == 0).collect();
    let mut order = Vec::new();
    while let Some(n) = ready.pop_first() {
        order.push(n.to_string());
        for &m in dependents.get(n).map(Vec::as_slice).unwrap_or(&[]) {
            let left = indegree.get_mut(m).unwrap();
            *left -= 1;
            if *left == 0 { ready.insert(m); }
        }
    }
    if order.len() == nodes.len() { return Ok(order); }
    // Some packages never became ready: walk the graph to name a cycle.
    let mut state: HashMap<&str, bool> = HashMap::new(); // true = on the current path, false = finished
    let mut path = Vec::new();
    for &n in &nodes {
        if !state.contains_key(n) {
            if let Some(cycle) = find_cycle(n, &deps, &mut state, &mut path) {
                return Err(format!("cycle: {}", cycle.join(" -> ")));
            }
        }
    }
    Err("cycle".to_string())
}

/// Depth-first from n: the first cycle found, closed with its starting package.
fn find_cycle<'a>(n: &'a str, deps: &'a HashMap<String, Vec<String>>, state: &mut HashMap<&'a str, bool>, path: &mut Vec<&'a str>) -> Option<Vec<&'a str>> {
    state.insert(n, true);
    path.push(n);
    for dep in deps.get(n).map(Vec::as_slice).unwrap_or(&[]) {
        match state.get(dep.as_str()) {
            Some(true) => {
                let at = path.iter().position(|p| *p == dep.as_str()).unwrap_or(0);
                let mut cycle = path[at..].to_vec();
                cycle.push(dep.as_str());
                return Some(cycle);
            }
            Some(false) => {}
            None => {
                if let Some(cycle) = find_cycle(dep.as_str(), deps, state, path) { return Some(cycle); }
            }
        }
    }
    path.pop();
    state.insert(n, false);
    None
}

/// Test driver. Leave as is: the order, or the error message when there is a cycle.
pub fn install_order_or_error(deps: HashMap<String, Vec<String>>) -> Json {
    match install_order(deps) {
        Ok(order) => Json::Array(order.into_iter().map(Json::Str).collect()),
        Err(message) => Json::Str(message),
    }
}
`,
  },
  'match-route': {
    starter: `use std::collections::HashMap;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>); ToJson is how a value
// of your own type is reported to the tests.
use whetstone::{Json, ToJson};

/// A successful match: the captured params (the wildcard's remainder under "*").
#[derive(Debug, PartialEq)]
pub struct Match {
    pub params: HashMap<String, String>,
}

/// The pattern has literal segments, :param segments and an optional
/// trailing * wildcard. Some(Match) on a match, None otherwise. Literal
/// segments must match exactly; a trailing slash is ignored.
pub fn match_route(pattern: String, path: String) -> Option<Match> {
    // your code
    None
}

/// Test driver. Leave as is: a Match is reported to the tests as {"params": {...}}.
impl ToJson for Match {
    fn to_json(&self) -> Result<Json, String> {
        Ok(Json::Object(vec![("params".to_string(), self.params.to_json()?)]))
    }
}
`,
    solution: `use std::collections::HashMap;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>); ToJson is how a value
// of your own type is reported to the tests.
use whetstone::{Json, ToJson};

/// A successful match: the captured params (the wildcard's remainder under "*").
#[derive(Debug, PartialEq)]
pub struct Match {
    pub params: HashMap<String, String>,
}

/// The pattern has literal segments, :param segments and an optional
/// trailing * wildcard. Some(Match) on a match, None otherwise. Literal
/// segments must match exactly; a trailing slash is ignored.
pub fn match_route(pattern: String, path: String) -> Option<Match> {
    let segments = |s: &str| s.split('/').filter(|part| !part.is_empty()).map(str::to_string).collect::<Vec<_>>();
    let wanted = segments(&pattern);
    let given = segments(&path);
    let mut params = HashMap::new();
    for (i, p) in wanted.iter().enumerate() {
        if p == "*" && i == wanted.len() - 1 {
            params.insert("*".to_string(), given[i.min(given.len())..].join("/"));
            return Some(Match { params });
        }
        let actual = given.get(i)?;
        match p.strip_prefix(':') {
            Some(name) => {
                params.insert(name.to_string(), actual.clone());
            }
            None if p != actual => return None,
            None => {}
        }
    }
    if given.len() == wanted.len() { Some(Match { params }) } else { None }
}

/// Test driver. Leave as is: a Match is reported to the tests as {"params": {...}}.
impl ToJson for Match {
    fn to_json(&self) -> Result<Json, String> {
        Ok(Json::Object(vec![("params".to_string(), self.params.to_json()?)]))
    }
}
`,
  },
  'set-in-immutable': {
    starter: `use std::rc::Rc;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>). The plain tests arrive
// as Json and are converted to Value and Key below.
use whetstone::Json;

/// A step along a path: a map key or a list index.
#[derive(Clone, Debug, PartialEq)]
pub enum Key {
    Name(String),
    Index(usize),
}

/// An immutable dynamic value. Containers are Rc handles that are never
/// mutated, so a new version can share every branch it did not touch;
/// same tells sharing apart from equality.
#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(String),
    List(Rc<Vec<Value>>),
    Map(Rc<Vec<(String, Value)>>),
}

impl Value {
    /// A new value with value at path, without mutating self. Only the
    /// containers along the path are copied; untouched branches are shared.
    /// Missing intermediates are created (a List when the next key is an
    /// Index, else a Map), and a List grows with Nulls up to an index past
    /// its end.
    pub fn set_in(&self, path: &[Key], value: Value) -> Value {
        // your code
        self.clone()
    }
}

// ── Given: constructors, accessors and JSON conversions. Leave as is. ──

impl Value {
    pub fn list(items: Vec<Value>) -> Value { Value::List(Rc::new(items)) }

    pub fn map(pairs: Vec<(&str, Value)>) -> Value {
        Value::Map(Rc::new(pairs.into_iter().map(|(k, v)| (k.to_string(), v)).collect()))
    }

    /// True when both are the same container (shared), not merely equal.
    pub fn same(&self, other: &Value) -> bool {
        match (self, other) {
            (Value::List(a), Value::List(b)) => Rc::ptr_eq(a, b),
            (Value::Map(a), Value::Map(b)) => Rc::ptr_eq(a, b),
            _ => false,
        }
    }

    /// The value under a key of a map (Null when absent or not a map).
    pub fn at(&self, key: &str) -> Value {
        match self {
            Value::Map(pairs) => pairs.iter().find(|(k, _)| k == key).map(|(_, v)| v.clone()).unwrap_or(Value::Null),
            _ => Value::Null,
        }
    }

    /// The value at an index of a list (Null when out of range or not a list).
    pub fn index(&self, i: usize) -> Value {
        match self {
            Value::List(items) => items.get(i).cloned().unwrap_or(Value::Null),
            _ => Value::Null,
        }
    }

    pub fn as_i64(&self) -> Option<i64> {
        if let Value::Int(n) = self { Some(*n) } else { None }
    }

    pub fn from_json(j: &Json) -> Value {
        match j {
            Json::Null => Value::Null,
            Json::Bool(b) => Value::Bool(*b),
            Json::Int(n) => Value::Int(*n),
            Json::Float(f) => Value::Float(*f),
            Json::Str(s) => Value::Str(s.clone()),
            Json::Array(items) => Value::list(items.iter().map(Value::from_json).collect()),
            Json::Object(kvs) => Value::Map(Rc::new(kvs.iter().map(|(k, v)| (k.clone(), Value::from_json(v))).collect())),
        }
    }

    pub fn to_json(&self) -> Json {
        match self {
            Value::Null => Json::Null,
            Value::Bool(b) => Json::Bool(*b),
            Value::Int(n) => Json::Int(*n),
            Value::Float(f) => Json::Float(*f),
            Value::Str(s) => Json::Str(s.clone()),
            Value::List(items) => Json::Array(items.iter().map(Value::to_json).collect()),
            Value::Map(pairs) => Json::Object(pairs.iter().map(|(k, v)| (k.clone(), v.to_json())).collect()),
        }
    }
}

impl Key {
    /// A JSON number is an Index, anything else a Name.
    pub fn from_json(j: &Json) -> Key {
        match j.as_i64() {
            Some(i) if i >= 0 => Key::Index(i as usize),
            _ => Key::Name(j.as_str().map(|s| s.to_string()).unwrap_or_else(|| j.to_string())),
        }
    }
}

/// Test driver. Leave as is: the JSON tests go through Value and Key.
pub fn set_in(obj: Json, path: Vec<Json>, value: Json) -> Json {
    let keys: Vec<Key> = path.iter().map(Key::from_json).collect();
    Value::from_json(&obj).set_in(&keys, Value::from_json(&value)).to_json()
}

/// Test driver. Leave as is: the new value is there, the input is untouched,
/// an untouched branch is shared, a list copy works and its neighbours are shared.
pub fn check() -> Vec<bool> {
    let a = Value::map(vec![("b", Value::Int(1))]);
    let c = Value::map(vec![("d", Value::Int(2))]);
    let list = Value::list(vec![Value::Int(1), Value::Int(2), Value::Int(3)]);
    let input = Value::map(vec![("a", a.clone()), ("c", c.clone()), ("list", list.clone())]);
    let out = input.set_in(&[Key::Name("a".to_string()), Key::Name("b".to_string())], Value::Int(9));
    let out2 = input.set_in(&[Key::Name("list".to_string()), Key::Index(1)], Value::Int(20));
    vec![
        out.at("a").at("b").as_i64() == Some(9),
        input.at("a").at("b").as_i64() == Some(1),
        out.at("c").same(&c),
        matches!(out2.at("list"), Value::List(_)) && out2.at("list").index(1).as_i64() == Some(20) && list.index(1).as_i64() == Some(2),
        out2.at("a").same(&a),
    ]
}
`,
    solution: `use std::rc::Rc;
// whetstone::Json is the harness's JSON value: Null, Bool(bool), Int(i64), Float(f64),
// Str(String), Array(Vec<Json>) or Object(Vec<(String, Json)>). The plain tests arrive
// as Json and are converted to Value and Key below.
use whetstone::Json;

/// A step along a path: a map key or a list index.
#[derive(Clone, Debug, PartialEq)]
pub enum Key {
    Name(String),
    Index(usize),
}

/// An immutable dynamic value. Containers are Rc handles that are never
/// mutated, so a new version can share every branch it did not touch;
/// same tells sharing apart from equality.
#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(String),
    List(Rc<Vec<Value>>),
    Map(Rc<Vec<(String, Value)>>),
}

impl Value {
    /// A new value with value at path, without mutating self. Only the
    /// containers along the path are copied; untouched branches are shared.
    /// Missing intermediates are created (a List when the next key is an
    /// Index, else a Map), and a List grows with Nulls up to an index past
    /// its end.
    pub fn set_in(&self, path: &[Key], value: Value) -> Value {
        let Some((head, rest)) = path.split_first() else { return value };
        match (self, head) {
            (Value::List(items), Key::Index(i)) => {
                let mut copy = (**items).clone();
                if copy.len() <= *i { copy.resize(*i + 1, Value::Null); }
                copy[*i] = Self::child(&copy[*i], rest, value);
                Value::List(Rc::new(copy))
            }
            (Value::Map(pairs), Key::Name(k)) => {
                let mut copy = (**pairs).clone();
                match copy.iter().position(|(name, _)| name == k) {
                    Some(at) => copy[at].1 = Self::child(&copy[at].1, rest, value),
                    None => copy.push((k.clone(), Self::child(&Value::Null, rest, value))),
                }
                Value::Map(Rc::new(copy))
            }
            // The key does not fit this value (a missing intermediate, or a
            // scalar in the way): start from an empty container of the kind it wants.
            (_, Key::Index(_)) => Value::List(Rc::new(Vec::new())).set_in(path, value),
            (_, Key::Name(_)) => Value::Map(Rc::new(Vec::new())).set_in(path, value),
        }
    }

    /// The new content of a slot: value itself at the end of the path, else
    /// the slot's current value with the rest of the path set in it.
    fn child(current: &Value, rest: &[Key], value: Value) -> Value {
        if rest.is_empty() { value } else { current.set_in(rest, value) }
    }
}

// ── Given: constructors, accessors and JSON conversions. Leave as is. ──

impl Value {
    pub fn list(items: Vec<Value>) -> Value { Value::List(Rc::new(items)) }

    pub fn map(pairs: Vec<(&str, Value)>) -> Value {
        Value::Map(Rc::new(pairs.into_iter().map(|(k, v)| (k.to_string(), v)).collect()))
    }

    /// True when both are the same container (shared), not merely equal.
    pub fn same(&self, other: &Value) -> bool {
        match (self, other) {
            (Value::List(a), Value::List(b)) => Rc::ptr_eq(a, b),
            (Value::Map(a), Value::Map(b)) => Rc::ptr_eq(a, b),
            _ => false,
        }
    }

    /// The value under a key of a map (Null when absent or not a map).
    pub fn at(&self, key: &str) -> Value {
        match self {
            Value::Map(pairs) => pairs.iter().find(|(k, _)| k == key).map(|(_, v)| v.clone()).unwrap_or(Value::Null),
            _ => Value::Null,
        }
    }

    /// The value at an index of a list (Null when out of range or not a list).
    pub fn index(&self, i: usize) -> Value {
        match self {
            Value::List(items) => items.get(i).cloned().unwrap_or(Value::Null),
            _ => Value::Null,
        }
    }

    pub fn as_i64(&self) -> Option<i64> {
        if let Value::Int(n) = self { Some(*n) } else { None }
    }

    pub fn from_json(j: &Json) -> Value {
        match j {
            Json::Null => Value::Null,
            Json::Bool(b) => Value::Bool(*b),
            Json::Int(n) => Value::Int(*n),
            Json::Float(f) => Value::Float(*f),
            Json::Str(s) => Value::Str(s.clone()),
            Json::Array(items) => Value::list(items.iter().map(Value::from_json).collect()),
            Json::Object(kvs) => Value::Map(Rc::new(kvs.iter().map(|(k, v)| (k.clone(), Value::from_json(v))).collect())),
        }
    }

    pub fn to_json(&self) -> Json {
        match self {
            Value::Null => Json::Null,
            Value::Bool(b) => Json::Bool(*b),
            Value::Int(n) => Json::Int(*n),
            Value::Float(f) => Json::Float(*f),
            Value::Str(s) => Json::Str(s.clone()),
            Value::List(items) => Json::Array(items.iter().map(Value::to_json).collect()),
            Value::Map(pairs) => Json::Object(pairs.iter().map(|(k, v)| (k.clone(), v.to_json())).collect()),
        }
    }
}

impl Key {
    /// A JSON number is an Index, anything else a Name.
    pub fn from_json(j: &Json) -> Key {
        match j.as_i64() {
            Some(i) if i >= 0 => Key::Index(i as usize),
            _ => Key::Name(j.as_str().map(|s| s.to_string()).unwrap_or_else(|| j.to_string())),
        }
    }
}

/// Test driver. Leave as is: the JSON tests go through Value and Key.
pub fn set_in(obj: Json, path: Vec<Json>, value: Json) -> Json {
    let keys: Vec<Key> = path.iter().map(Key::from_json).collect();
    Value::from_json(&obj).set_in(&keys, Value::from_json(&value)).to_json()
}

/// Test driver. Leave as is: the new value is there, the input is untouched,
/// an untouched branch is shared, a list copy works and its neighbours are shared.
pub fn check() -> Vec<bool> {
    let a = Value::map(vec![("b", Value::Int(1))]);
    let c = Value::map(vec![("d", Value::Int(2))]);
    let list = Value::list(vec![Value::Int(1), Value::Int(2), Value::Int(3)]);
    let input = Value::map(vec![("a", a.clone()), ("c", c.clone()), ("list", list.clone())]);
    let out = input.set_in(&[Key::Name("a".to_string()), Key::Name("b".to_string())], Value::Int(9));
    let out2 = input.set_in(&[Key::Name("list".to_string()), Key::Index(1)], Value::Int(20));
    vec![
        out.at("a").at("b").as_i64() == Some(9),
        input.at("a").at("b").as_i64() == Some(1),
        out.at("c").same(&c),
        matches!(out2.at("list"), Value::List(_)) && out2.at("list").index(1).as_i64() == Some(20) && list.index(1).as_i64() == Some(2),
        out2.at("a").same(&a),
    ]
}
`,
  },
  'with-timeout-abort': {
    starter: `use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::{Duration, Instant};

/// A cancellation token, the stand-in for AbortSignal here. Given: clones
/// share the token, and cancel wakes every wait.
#[derive(Clone, Default)]
pub struct CancelToken {
    inner: Arc<(Mutex<bool>, Condvar)>,
}

impl CancelToken {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_cancelled(&self) -> bool {
        *self.inner.0.lock().unwrap()
    }

    pub fn cancel(&self) {
        let (flag, wake) = &*self.inner;
        *flag.lock().unwrap() = true;
        wake.notify_all();
    }

    /// Block for up to timeout; true if cancelled before then.
    pub fn wait(&self, timeout: Duration) -> bool {
        let (flag, wake) = &*self.inner;
        let deadline = Instant::now() + timeout;
        let mut cancelled = flag.lock().unwrap();
        while !*cancelled {
            let now = Instant::now();
            if now >= deadline { break; }
            cancelled = wake.wait_timeout(cancelled, deadline - now).unwrap().0;
        }
        *cancelled
    }
}

/// Sleep for ms, or return Err("aborted") as soon as the token is cancelled.
pub fn sleep(ms: u64, token: Option<&CancelToken>) -> Result<(), String> {
    // your code
    thread::sleep(Duration::from_millis(ms));
    Ok(())
}

/// Run the function (given a token) on another thread. If it does not finish
/// within ms, cancel the token and return Err("timeout"). Either way nothing is
/// left running when this returns.
pub fn with_timeout<T: Send + 'static>(run: impl FnOnce(CancelToken) -> Result<T, String> + Send + 'static, ms: u64) -> Result<T, String> {
    // your code
    run(CancelToken::new())
}

/// Test driver. Leave as is. Runs a sleep of run_ms under a limit of limit_ms:
/// returns ["timeout", <what the inner sleep failed with>] when the limit
/// wins, or ["ok", null] when the run completes in time.
pub fn timeout_demo(run_ms: u64, limit_ms: u64) -> (String, Option<String>) {
    let inner: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    let seen = Arc::clone(&inner);
    let result = with_timeout(move |token| sleep(run_ms, Some(&token)).map_err(|e| { *seen.lock().unwrap() = Some(e.clone()); e }), limit_ms);
    let outcome = match result {
        Ok(()) => "ok".to_string(),
        Err(e) => { thread::sleep(Duration::from_millis(5)); e }
    };
    let inner_error = inner.lock().unwrap().clone();
    (outcome, inner_error)
}

/// Test driver. Leave as is: a plain sleep really waits.
pub fn sleep_at_least(ms: u64) -> bool {
    let started = Instant::now();
    let _ = sleep(ms, None);
    started.elapsed() >= Duration::from_millis(ms.saturating_sub(2))
}
`,
    solution: `use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::{Duration, Instant};

/// A cancellation token, the stand-in for AbortSignal here. Given: clones
/// share the token, and cancel wakes every wait.
#[derive(Clone, Default)]
pub struct CancelToken {
    inner: Arc<(Mutex<bool>, Condvar)>,
}

impl CancelToken {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_cancelled(&self) -> bool {
        *self.inner.0.lock().unwrap()
    }

    pub fn cancel(&self) {
        let (flag, wake) = &*self.inner;
        *flag.lock().unwrap() = true;
        wake.notify_all();
    }

    /// Block for up to timeout; true if cancelled before then.
    pub fn wait(&self, timeout: Duration) -> bool {
        let (flag, wake) = &*self.inner;
        let deadline = Instant::now() + timeout;
        let mut cancelled = flag.lock().unwrap();
        while !*cancelled {
            let now = Instant::now();
            if now >= deadline { break; }
            cancelled = wake.wait_timeout(cancelled, deadline - now).unwrap().0;
        }
        *cancelled
    }
}

/// Sleep for ms, or return Err("aborted") as soon as the token is cancelled.
pub fn sleep(ms: u64, token: Option<&CancelToken>) -> Result<(), String> {
    match token {
        None => {
            thread::sleep(Duration::from_millis(ms));
            Ok(())
        }
        Some(t) if t.wait(Duration::from_millis(ms)) => Err("aborted".to_string()),
        Some(_) => Ok(()),
    }
}

/// Run the function (given a token) on another thread. If it does not finish
/// within ms, cancel the token and return Err("timeout"). Either way nothing is
/// left running when this returns.
pub fn with_timeout<T: Send + 'static>(run: impl FnOnce(CancelToken) -> Result<T, String> + Send + 'static, ms: u64) -> Result<T, String> {
    let token = CancelToken::new();
    let theirs = token.clone();
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        let _ = tx.send(run(theirs));
    });
    match rx.recv_timeout(Duration::from_millis(ms)) {
        Ok(result) => result,
        Err(RecvTimeoutError::Timeout) => {
            token.cancel();
            let _ = rx.recv(); // let the callee stop; its own error is not the result
            Err("timeout".to_string())
        }
        Err(RecvTimeoutError::Disconnected) => Err("the run ended without a result".to_string()),
    }
}

/// Test driver. Leave as is. Runs a sleep of run_ms under a limit of limit_ms:
/// returns ["timeout", <what the inner sleep failed with>] when the limit
/// wins, or ["ok", null] when the run completes in time.
pub fn timeout_demo(run_ms: u64, limit_ms: u64) -> (String, Option<String>) {
    let inner: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    let seen = Arc::clone(&inner);
    let result = with_timeout(move |token| sleep(run_ms, Some(&token)).map_err(|e| { *seen.lock().unwrap() = Some(e.clone()); e }), limit_ms);
    let outcome = match result {
        Ok(()) => "ok".to_string(),
        Err(e) => { thread::sleep(Duration::from_millis(5)); e }
    };
    let inner_error = inner.lock().unwrap().clone();
    (outcome, inner_error)
}

/// Test driver. Leave as is: a plain sleep really waits.
pub fn sleep_at_least(ms: u64) -> bool {
    let started = Instant::now();
    let _ = sleep(ms, None);
    started.elapsed() >= Duration::from_millis(ms.saturating_sub(2))
}
`,
  },
}
