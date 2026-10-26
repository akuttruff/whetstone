import { snakeCase } from '../src/lib/tests.ts'

/**
 * The Rust harness, in two parts.
 *
 * The library below (crate `whetstone`) never changes, so runner.ts compiles
 * it once per server into an rlib. It holds a small JSON type, the FromJson
 * and ToJson conversions for the standard types a solution uses (integers,
 * floats, bool, char, String, Vec, Option, Box, Rc<RefCell<..>>, HashMap,
 * tuples…), a Callable trait that lets a plain `fn` be called with JSON
 * arguments by type inference, and the test loop: each test on its own
 * thread with a deadline, panics caught and reported with their line, the
 * raw outcome per test written to the result file. Comparison with the
 * expected values happens in runner.ts, as for every language.
 *
 * Rust has no reflection, so the per-run glue (`rustMain`) is generated: the
 * candidate's code is the top of main.rs, and a module appended under it
 * maps each tested function name to a call of the snake_case function of
 * that name (qualified with super::, so a candidate's `run` or `main`-like
 * name is never shadowed by the glue's own items). The types come from the function's own signature, so a
 * parameter declared `Vec<i32>` receives a Vec<i32>. A `struct ListNode` or
 * `struct TreeNode` defined in the solution (fields val/next or
 * val/left/right, as on LeetCode) gets JSON conversions generated for it,
 * whatever the field types.
 *
 * Output is not captured in-process (that needs an unstable API): the
 * runner reads the child's stdout instead.
 */
export const RUST_HARNESS = (resultFile: string, perTestMs: number): string => String.raw`
//! Whetstone's Rust test harness. Compiled once per server as crate "whetstone".
use std::cell::{Cell, RefCell};
use std::collections::{BTreeMap, BTreeSet, BinaryHeap, HashMap, HashSet, VecDeque};
use std::fmt::Write as _;
use std::hash::Hash;
use std::panic::{self, AssertUnwindSafe};
use std::rc::Rc;
use std::sync::{mpsc, Arc, Mutex};
use std::time::{Duration, Instant};

pub const RESULT_FILE: &str = "${resultFile}";
pub const PER_TEST_MS: u64 = ${perTestMs};
/// Conversions deeper than this are reported as a cycle instead of overflowing the stack.
const MAX_DEPTH: usize = 20_000;
const STACK_BYTES: usize = 256 << 20;

// ── JSON ─────────────────────────────────────────────────────────────────

/// A plain JSON value. Objects keep their key order.
#[derive(Clone, Debug, PartialEq)]
pub enum Json {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(String),
    Array(Vec<Json>),
    Object(Vec<(String, Json)>),
}

impl Json {
    pub fn parse(s: &str) -> Result<Json, String> {
        let mut p = Parser { s: s.as_bytes(), i: 0 };
        let v = p.value()?;
        p.ws();
        if p.i != p.s.len() { return Err(format!("trailing JSON at {}", p.i)); }
        Ok(v)
    }

    /// The value under a key of an object; None for a missing key or a non-object.
    pub fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Json::Object(kvs) => kvs.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    pub fn is_null(&self) -> bool { matches!(self, Json::Null) }

    pub fn as_str(&self) -> Option<&str> { if let Json::Str(s) = self { Some(s) } else { None } }

    pub fn as_array(&self) -> Option<&[Json]> { if let Json::Array(a) = self { Some(a) } else { None } }

    pub fn as_f64(&self) -> Option<f64> {
        match self { Json::Int(n) => Some(*n as f64), Json::Float(f) => Some(*f), _ => None }
    }

    pub fn as_i64(&self) -> Option<i64> {
        match self {
            Json::Int(n) => Some(*n),
            Json::Float(f) if f.fract() == 0.0 && f.abs() < 9.0e15 => Some(*f as i64),
            _ => None,
        }
    }

    /// What kind of value this is, for error messages.
    pub fn kind(&self) -> &'static str {
        match self {
            Json::Null => "null", Json::Bool(_) => "a boolean", Json::Int(_) => "an integer", Json::Float(_) => "a number",
            Json::Str(_) => "a string", Json::Array(_) => "an array", Json::Object(_) => "an object",
        }
    }

    /// The JSON text, cut short for an error message.
    pub fn short(&self) -> String {
        let s = self.to_string();
        if s.chars().count() > 80 { let cut: String = s.chars().take(79).collect(); cut + "…" } else { s }
    }

    pub fn to_string(&self) -> String {
        let mut out = String::new();
        self.write(&mut out);
        out
    }

    fn write(&self, out: &mut String) {
        match self {
            Json::Null => out.push_str("null"),
            Json::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
            Json::Int(n) => { let _ = write!(out, "{}", n); }
            Json::Float(f) => {
                if !f.is_finite() { out.push_str("null"); }
                else if f.fract() == 0.0 && f.abs() < 1e15 { let _ = write!(out, "{}", *f as i64); }
                else { let _ = write!(out, "{}", f); }
            }
            Json::Str(s) => write_str(s, out),
            Json::Array(a) => {
                out.push('[');
                for (i, v) in a.iter().enumerate() { if i > 0 { out.push(','); } v.write(out); }
                out.push(']');
            }
            Json::Object(kvs) => {
                out.push('{');
                for (i, (k, v)) in kvs.iter().enumerate() {
                    if i > 0 { out.push(','); }
                    write_str(k, out);
                    out.push(':');
                    v.write(out);
                }
                out.push('}');
            }
        }
    }
}

fn write_str(s: &str, out: &mut String) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => { let _ = write!(out, "\\u{:04x}", c as u32); }
            c => out.push(c),
        }
    }
    out.push('"');
}

struct Parser<'a> { s: &'a [u8], i: usize }

impl<'a> Parser<'a> {
    fn ws(&mut self) { while self.i < self.s.len() && matches!(self.s[self.i], b' ' | b'\n' | b'\r' | b'\t') { self.i += 1; } }

    fn peek(&self) -> Option<u8> { self.s.get(self.i).copied() }

    fn expect(&mut self, c: u8) -> Result<(), String> {
        if self.peek() == Some(c) { self.i += 1; Ok(()) } else { Err(format!("expected '{}' at {}", c as char, self.i)) }
    }

    fn value(&mut self) -> Result<Json, String> {
        self.ws();
        match self.peek() {
            None => Err("unexpected end of JSON".into()),
            Some(b'{') => {
                self.i += 1;
                let mut kvs = Vec::new();
                self.ws();
                if self.peek() == Some(b'}') { self.i += 1; return Ok(Json::Object(kvs)); }
                loop {
                    self.ws();
                    let k = self.string()?;
                    self.ws();
                    self.expect(b':')?;
                    let v = self.value()?;
                    kvs.push((k, v));
                    self.ws();
                    match self.peek() {
                        Some(b',') => { self.i += 1; }
                        Some(b'}') => { self.i += 1; return Ok(Json::Object(kvs)); }
                        _ => return Err(format!("expected ',' or '}}' at {}", self.i)),
                    }
                }
            }
            Some(b'[') => {
                self.i += 1;
                let mut items = Vec::new();
                self.ws();
                if self.peek() == Some(b']') { self.i += 1; return Ok(Json::Array(items)); }
                loop {
                    items.push(self.value()?);
                    self.ws();
                    match self.peek() {
                        Some(b',') => { self.i += 1; }
                        Some(b']') => { self.i += 1; return Ok(Json::Array(items)); }
                        _ => return Err(format!("expected ',' or ']' at {}", self.i)),
                    }
                }
            }
            Some(b'"') => Ok(Json::Str(self.string()?)),
            Some(b't') if self.s[self.i..].starts_with(b"true") => { self.i += 4; Ok(Json::Bool(true)) }
            Some(b'f') if self.s[self.i..].starts_with(b"false") => { self.i += 5; Ok(Json::Bool(false)) }
            Some(b'n') if self.s[self.i..].starts_with(b"null") => { self.i += 4; Ok(Json::Null) }
            Some(_) => {
                let start = self.i;
                while self.i < self.s.len() && matches!(self.s[self.i], b'+' | b'-' | b'0'..=b'9' | b'.' | b'e' | b'E') { self.i += 1; }
                let text = std::str::from_utf8(&self.s[start..self.i]).map_err(|e| e.to_string())?;
                if text.is_empty() { return Err(format!("unexpected character at {}", start)); }
                if !text.contains(['.', 'e', 'E']) {
                    if let Ok(n) = text.parse::<i64>() { return Ok(Json::Int(n)); }
                }
                text.parse::<f64>().map(Json::Float).map_err(|_| format!("bad number {:?}", text))
            }
        }
    }

    fn string(&mut self) -> Result<String, String> {
        self.expect(b'"')?;
        let mut out = String::new();
        loop {
            let start = self.i;
            while self.i < self.s.len() && self.s[self.i] != b'"' && self.s[self.i] != b'\\' { self.i += 1; }
            out.push_str(std::str::from_utf8(&self.s[start..self.i]).map_err(|e| e.to_string())?);
            match self.peek() {
                None => return Err("unterminated string".into()),
                Some(b'"') => { self.i += 1; return Ok(out); }
                _ => {
                    self.i += 1; // the backslash
                    let e = self.peek().ok_or("unterminated escape")?;
                    self.i += 1;
                    match e {
                        b'n' => out.push('\n'), b't' => out.push('\t'), b'r' => out.push('\r'),
                        b'b' => out.push('\u{8}'), b'f' => out.push('\u{c}'),
                        b'u' => {
                            let mut cp = self.hex4()?;
                            if (0xD800..0xDC00).contains(&cp) && self.s[self.i..].starts_with(b"\\u") {
                                self.i += 2;
                                let lo = self.hex4()?;
                                cp = 0x10000 + ((cp - 0xD800) << 10) + (lo.wrapping_sub(0xDC00) & 0x3FF);
                            }
                            out.push(char::from_u32(cp).unwrap_or('\u{FFFD}'));
                        }
                        c => out.push(c as char),
                    }
                }
            }
        }
    }

    fn hex4(&mut self) -> Result<u32, String> {
        let hex = self.s.get(self.i..self.i + 4).ok_or("bad \\u escape")?;
        self.i += 4;
        u32::from_str_radix(std::str::from_utf8(hex).map_err(|e| e.to_string())?, 16).map_err(|e| e.to_string())
    }
}

// ── conversions ──────────────────────────────────────────────────────────

/// Built from a JSON argument. Implemented for the standard types; the glue adds ListNode and TreeNode.
pub trait FromJson: Sized {
    fn from_json(v: &Json) -> Result<Self, String>;
}

/// Turned into JSON for the result. Implemented for the standard types; the glue adds ListNode and TreeNode.
pub trait ToJson {
    fn to_json(&self) -> Result<Json, String>;
}

/// A map key: JSON object keys are strings, so keys are parsed and printed.
pub trait JsonKey: Sized {
    fn from_key(k: &str) -> Result<Self, String>;
    fn to_key(&self) -> String;
}

thread_local! { static DEPTH: Cell<usize> = const { Cell::new(0) }; }

/// Runs f one level deeper, failing instead of overflowing the stack on a cycle.
fn nested<T>(f: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    let d = DEPTH.with(|d| { let n = d.get() + 1; d.set(n); n });
    let out = if d > MAX_DEPTH { Err("result is a cyclic structure (or nested far too deep)".to_string()) } else { f() };
    DEPTH.with(|d| d.set(d.get() - 1));
    out
}

macro_rules! int_impls {
    ($($t:ty),*) => {$(
        impl FromJson for $t {
            fn from_json(v: &Json) -> Result<Self, String> {
                let n = v.as_i64().ok_or_else(|| format!("expected an integer, got {}", v.kind()))?;
                <$t>::try_from(n).map_err(|_| format!("{} does not fit in {}", n, stringify!($t)))
            }
        }
        impl ToJson for $t {
            fn to_json(&self) -> Result<Json, String> {
                i64::try_from(*self).map(Json::Int).map_err(|_| format!("{} does not fit in a JSON integer", self))
            }
        }
        impl JsonKey for $t {
            fn from_key(k: &str) -> Result<Self, String> { k.parse::<$t>().map_err(|_| format!("key {:?} is not an integer", k)) }
            fn to_key(&self) -> String { self.to_string() }
        }
    )*};
}
int_impls!(i8, i16, i32, i64, isize, u8, u16, u32, u64, usize);

macro_rules! float_impls {
    ($($t:ty),*) => {$(
        impl FromJson for $t {
            fn from_json(v: &Json) -> Result<Self, String> {
                v.as_f64().map(|f| f as $t).ok_or_else(|| format!("expected a number, got {}", v.kind()))
            }
        }
        impl ToJson for $t {
            fn to_json(&self) -> Result<Json, String> {
                let f = *self as f64;
                if f.is_finite() { Ok(Json::Float(f)) } else { Err("result is not a finite number".into()) }
            }
        }
    )*};
}
float_impls!(f32, f64);

impl FromJson for bool {
    fn from_json(v: &Json) -> Result<Self, String> {
        if let Json::Bool(b) = v { Ok(*b) } else { Err(format!("expected a boolean, got {}", v.kind())) }
    }
}
impl ToJson for bool { fn to_json(&self) -> Result<Json, String> { Ok(Json::Bool(*self)) } }
impl JsonKey for bool {
    fn from_key(k: &str) -> Result<Self, String> { k.parse::<bool>().map_err(|_| format!("key {:?} is not a boolean", k)) }
    fn to_key(&self) -> String { self.to_string() }
}

impl FromJson for char {
    fn from_json(v: &Json) -> Result<Self, String> {
        let s = v.as_str().ok_or_else(|| format!("expected a one-character string, got {}", v.kind()))?;
        let mut it = s.chars();
        match (it.next(), it.next()) {
            (Some(c), None) => Ok(c),
            _ => Err(format!("expected a one-character string, got {:?}", s)),
        }
    }
}
impl ToJson for char { fn to_json(&self) -> Result<Json, String> { Ok(Json::Str(self.to_string())) } }
impl JsonKey for char {
    fn from_key(k: &str) -> Result<Self, String> { char::from_json(&Json::Str(k.to_string())) }
    fn to_key(&self) -> String { self.to_string() }
}

impl FromJson for String {
    fn from_json(v: &Json) -> Result<Self, String> {
        match v {
            Json::Str(s) => Ok(s.clone()),
            Json::Null => Err("expected a string, got null".into()),
            other => Ok(other.to_string()),
        }
    }
}
impl ToJson for String { fn to_json(&self) -> Result<Json, String> { Ok(Json::Str(self.clone())) } }
impl ToJson for str { fn to_json(&self) -> Result<Json, String> { Ok(Json::Str(self.to_string())) } }
impl JsonKey for String {
    fn from_key(k: &str) -> Result<Self, String> { Ok(k.to_string()) }
    fn to_key(&self) -> String { self.clone() }
}

impl FromJson for Json { fn from_json(v: &Json) -> Result<Self, String> { Ok(v.clone()) } }
impl ToJson for Json { fn to_json(&self) -> Result<Json, String> { Ok(self.clone()) } }

impl ToJson for () { fn to_json(&self) -> Result<Json, String> { Ok(Json::Null) } }

impl<T: ToJson + ?Sized> ToJson for &T { fn to_json(&self) -> Result<Json, String> { (**self).to_json() } }
impl<T: ToJson + ?Sized> ToJson for &mut T { fn to_json(&self) -> Result<Json, String> { (**self).to_json() } }

fn array_of<T: FromJson>(v: &Json) -> Result<Vec<T>, String> {
    let items = v.as_array().ok_or_else(|| format!("expected an array, got {}", v.kind()))?;
    items.iter().enumerate().map(|(i, x)| T::from_json(x).map_err(|e| format!("element {}: {}", i, e))).collect()
}

fn json_array<'a, T: ToJson + 'a>(items: impl IntoIterator<Item = &'a T>) -> Result<Json, String> {
    nested(|| items.into_iter().map(ToJson::to_json).collect::<Result<Vec<_>, _>>().map(Json::Array))
}

impl<T: FromJson> FromJson for Vec<T> { fn from_json(v: &Json) -> Result<Self, String> { array_of(v) } }
impl<T: ToJson> ToJson for Vec<T> { fn to_json(&self) -> Result<Json, String> { json_array(self.iter()) } }
impl<T: ToJson> ToJson for [T] { fn to_json(&self) -> Result<Json, String> { json_array(self.iter()) } }
impl<T: FromJson, const N: usize> FromJson for [T; N] {
    fn from_json(v: &Json) -> Result<Self, String> {
        let items: Vec<T> = array_of(v)?;
        let n = items.len();
        items.try_into().map_err(|_| format!("expected an array of {} elements, got {}", N, n))
    }
}
impl<T: ToJson, const N: usize> ToJson for [T; N] { fn to_json(&self) -> Result<Json, String> { json_array(self.iter()) } }
impl<T: FromJson> FromJson for VecDeque<T> { fn from_json(v: &Json) -> Result<Self, String> { array_of(v).map(VecDeque::from) } }
impl<T: ToJson> ToJson for VecDeque<T> { fn to_json(&self) -> Result<Json, String> { json_array(self.iter()) } }
impl<T: FromJson + Hash + Eq> FromJson for HashSet<T> { fn from_json(v: &Json) -> Result<Self, String> { array_of(v).map(|xs: Vec<T>| xs.into_iter().collect()) } }
impl<T: ToJson> ToJson for HashSet<T> { fn to_json(&self) -> Result<Json, String> { json_array(self.iter()) } }
impl<T: FromJson + Ord> FromJson for BTreeSet<T> { fn from_json(v: &Json) -> Result<Self, String> { array_of(v).map(|xs: Vec<T>| xs.into_iter().collect()) } }
impl<T: ToJson> ToJson for BTreeSet<T> { fn to_json(&self) -> Result<Json, String> { json_array(self.iter()) } }
impl<T: FromJson + Ord> FromJson for BinaryHeap<T> { fn from_json(v: &Json) -> Result<Self, String> { array_of(v).map(|xs: Vec<T>| xs.into_iter().collect()) } }
impl<T: ToJson + Ord + Clone> ToJson for BinaryHeap<T> { fn to_json(&self) -> Result<Json, String> { json_array(self.clone().into_sorted_vec().iter()) } }

impl<T: FromJson> FromJson for Option<T> {
    fn from_json(v: &Json) -> Result<Self, String> { if v.is_null() { Ok(None) } else { T::from_json(v).map(Some) } }
}
impl<T: ToJson> ToJson for Option<T> {
    fn to_json(&self) -> Result<Json, String> { match self { None => Ok(Json::Null), Some(x) => nested(|| x.to_json()) } }
}

impl<T: FromJson> FromJson for Box<T> { fn from_json(v: &Json) -> Result<Self, String> { nested(|| T::from_json(v)).map(Box::new) } }
impl<T: ToJson + ?Sized> ToJson for Box<T> { fn to_json(&self) -> Result<Json, String> { nested(|| (**self).to_json()) } }
impl<T: FromJson> FromJson for Rc<T> { fn from_json(v: &Json) -> Result<Self, String> { nested(|| T::from_json(v)).map(Rc::new) } }
impl<T: ToJson + ?Sized> ToJson for Rc<T> { fn to_json(&self) -> Result<Json, String> { nested(|| (**self).to_json()) } }
impl<T: FromJson> FromJson for Arc<T> { fn from_json(v: &Json) -> Result<Self, String> { nested(|| T::from_json(v)).map(Arc::new) } }
impl<T: ToJson + ?Sized> ToJson for Arc<T> { fn to_json(&self) -> Result<Json, String> { nested(|| (**self).to_json()) } }
impl<T: FromJson> FromJson for RefCell<T> { fn from_json(v: &Json) -> Result<Self, String> { T::from_json(v).map(RefCell::new) } }
impl<T: ToJson> ToJson for RefCell<T> {
    fn to_json(&self) -> Result<Json, String> { self.try_borrow().map_err(|_| "result is mutably borrowed".to_string())?.to_json() }
}
impl<T: FromJson> FromJson for Cell<T> { fn from_json(v: &Json) -> Result<Self, String> { T::from_json(v).map(Cell::new) } }
impl<T: ToJson + Copy> ToJson for Cell<T> { fn to_json(&self) -> Result<Json, String> { self.get().to_json() } }
impl<T: FromJson> FromJson for Mutex<T> { fn from_json(v: &Json) -> Result<Self, String> { T::from_json(v).map(Mutex::new) } }
impl<T: ToJson> ToJson for Mutex<T> {
    fn to_json(&self) -> Result<Json, String> { self.lock().map_err(|_| "result's lock is poisoned".to_string())?.to_json() }
}

impl<T: ToJson, E: std::fmt::Display> ToJson for Result<T, E> {
    fn to_json(&self) -> Result<Json, String> {
        match self { Ok(v) => v.to_json(), Err(e) => Err(format!("returned Err({})", e)) }
    }
}

fn map_of<K: JsonKey, V: FromJson>(v: &Json) -> Result<Vec<(K, V)>, String> {
    match v {
        Json::Object(kvs) => kvs.iter().map(|(k, x)| Ok((K::from_key(k)?, V::from_json(x).map_err(|e| format!("key {:?}: {}", k, e))?))).collect(),
        other => Err(format!("expected an object, got {}", other.kind())),
    }
}

fn json_object<'a, K: JsonKey + 'a, V: ToJson + 'a>(items: impl IntoIterator<Item = (&'a K, &'a V)>) -> Result<Json, String> {
    nested(|| items.into_iter().map(|(k, v)| Ok((k.to_key(), v.to_json()?))).collect::<Result<Vec<_>, String>>().map(Json::Object))
}

impl<K: JsonKey + Hash + Eq, V: FromJson> FromJson for HashMap<K, V> { fn from_json(v: &Json) -> Result<Self, String> { map_of(v).map(|kvs| kvs.into_iter().collect()) } }
impl<K: JsonKey, V: ToJson> ToJson for HashMap<K, V> { fn to_json(&self) -> Result<Json, String> { json_object(self.iter()) } }
impl<K: JsonKey + Ord, V: FromJson> FromJson for BTreeMap<K, V> { fn from_json(v: &Json) -> Result<Self, String> { map_of(v).map(|kvs| kvs.into_iter().collect()) } }
impl<K: JsonKey, V: ToJson> ToJson for BTreeMap<K, V> { fn to_json(&self) -> Result<Json, String> { json_object(self.iter()) } }

macro_rules! tuple_impls {
    ($n:expr; $($T:ident $i:tt),+) => {
        impl<$($T: FromJson),+> FromJson for ($($T,)+) {
            fn from_json(v: &Json) -> Result<Self, String> {
                let items = v.as_array().ok_or_else(|| format!("expected an array of {}, got {}", $n, v.kind()))?;
                if items.len() != $n { return Err(format!("expected an array of {} elements, got {}", $n, items.len())); }
                Ok(($($T::from_json(&items[$i]).map_err(|e| format!("element {}: {}", $i, e))?,)+))
            }
        }
        impl<$($T: ToJson),+> ToJson for ($($T,)+) {
            fn to_json(&self) -> Result<Json, String> {
                nested(|| Ok(Json::Array(vec![$(self.$i.to_json()?),+])))
            }
        }
    };
}
tuple_impls!(1; A 0);
tuple_impls!(2; A 0, B 1);
tuple_impls!(3; A 0, B 1, C 2);
tuple_impls!(4; A 0, B 1, C 2, D 3);
tuple_impls!(5; A 0, B 1, C 2, D 3, E 4);
tuple_impls!(6; A 0, B 1, C 2, D 3, E 4, F 5);

/// A struct field from a JSON object: a missing key counts as null (so an Option field may be left out).
pub fn field<T: FromJson>(v: &Json, name: &str) -> Result<T, String> {
    if !matches!(v, Json::Object(_)) { return Err(format!("expected an object with a {:?} field, got {}", name, v.kind())); }
    T::from_json(v.get(name).unwrap_or(&Json::Null)).map_err(|e| format!("field {:?}: {}", name, e))
}

// ── calling a function with JSON arguments ───────────────────────────────

/// Implemented for any fn (or closure) whose parameters are FromJson and whose
/// result is ToJson. Args is the parameter tuple, inferred from the function.
pub trait Callable<Args> {
    fn call_json(&self, args: &[Json]) -> Result<Json, String>;
}

macro_rules! callable_impls {
    ($n:expr; $($T:ident $a:ident $i:tt),*) => {
        impl<Fun, Ret $(, $T)*> Callable<($($T,)*)> for Fun
        where Fun: Fn($($T),*) -> Ret, Ret: ToJson $(, $T: FromJson)*
        {
            fn call_json(&self, args: &[Json]) -> Result<Json, String> {
                if args.len() > $n { return Err(format!("the function takes {} argument(s) but the test passes {}", $n, args.len())); }
                // Missing trailing arguments are null, so a trailing Option<T> parameter is optional (a test may call flatten(obj) and flatten(obj, "/")).
                let padded: Vec<Json> = args.iter().cloned().chain(std::iter::repeat(Json::Null)).take($n).collect();
                let args = &padded[..];
                $(let $a: $T = FromJson::from_json(&args[$i]).map_err(|e| format!("argument {} ({}) does not fit the parameter type: {}", $i + 1, args[$i].short(), e))?;)*
                self($($a),*).to_json()
            }
        }
    };
}
callable_impls!(0;);
callable_impls!(1; A a 0);
callable_impls!(2; A a 0, B b 1);
callable_impls!(3; A a 0, B b 1, C c 2);
callable_impls!(4; A a 0, B b 1, C c 2, D d 3);
callable_impls!(5; A a 0, B b 1, C c 2, D d 3, E e 4);
callable_impls!(6; A a 0, B b 1, C c 2, D d 3, E e 4, F f 5);

/// Call f with JSON arguments converted to its parameter types; the result as JSON.
pub fn call<Args, F: Callable<Args>>(f: F, args: &[Json]) -> Result<Json, String> {
    f.call_json(args)
}

// ── the test loop ────────────────────────────────────────────────────────

static LAST_PANIC: Mutex<Option<String>> = Mutex::new(None);

fn panic_text(payload: &(dyn std::any::Any + Send)) -> String {
    if let Some(s) = payload.downcast_ref::<&str>() { return s.to_string(); }
    if let Some(s) = payload.downcast_ref::<String>() { return s.clone(); }
    "panic".to_string()
}

/// Runs every test in tests.json through dispatch (the generated match on
/// the function name) and writes the raw outcomes to the result file.
pub fn main<D>(dispatch: D)
where D: Fn(&str, &[Json]) -> Option<Result<Json, String>> + Send + Sync + 'static
{
    panic::set_hook(Box::new(|info| {
        let msg = panic_text(info.payload());
        let text = match info.location() {
            Some(loc) if loc.file().ends_with("main.rs") => format!("panicked at line {}: {}", loc.line(), msg),
            Some(loc) => format!("panicked at {}:{}: {}", loc.file(), loc.line(), msg),
            None => format!("panicked: {}", msg),
        };
        if let Ok(mut slot) = LAST_PANIC.lock() { *slot = Some(text); }
    }));

    let text = std::fs::read_to_string("tests.json").unwrap_or_else(|e| { eprintln!("harness: cannot read tests.json: {}", e); std::process::exit(2) });
    let tests = match Json::parse(&text) { Ok(Json::Array(a)) => a, other => { eprintln!("harness: bad tests.json: {:?}", other); std::process::exit(2) } };
    let dispatch = Arc::new(dispatch);
    let mut results = Vec::new();
    for t in tests {
        let name = t.get("name").cloned().unwrap_or(Json::Null);
        let fn_name = t.get("fn").and_then(Json::as_str).unwrap_or("").to_string();
        let args: Vec<Json> = t.get("args").and_then(Json::as_array).map(|a| a.to_vec()).unwrap_or_default();
        let started = Instant::now();
        let (tx, rx) = mpsc::channel();
        let d = Arc::clone(&dispatch);
        let (f, a) = (fn_name.clone(), args);
        if let Ok(mut slot) = LAST_PANIC.lock() { *slot = None; }
        let spawned = std::thread::Builder::new().name("test".into()).stack_size(STACK_BYTES).spawn(move || {
            let outcome = panic::catch_unwind(AssertUnwindSafe(|| d(&f, &a)));
            let _ = tx.send(outcome);
        });
        let mut entry = vec![("name".to_string(), name)];
        let mut stuck = false;
        let outcome = match spawned {
            Err(e) => Err(format!("could not start the test thread: {}", e)),
            Ok(_) => match rx.recv_timeout(Duration::from_millis(PER_TEST_MS)) {
                Ok(Ok(Some(Ok(v)))) => Ok(v),
                Ok(Ok(Some(Err(e)))) => Err(e),
                Ok(Ok(None)) => Err(format!("no function named {} is defined (looked for {})", fn_name, snake(&fn_name))),
                Ok(Err(payload)) => Err(LAST_PANIC.lock().ok().and_then(|s| s.clone()).unwrap_or_else(|| panic_text(&*payload))),
                Err(_) => { stuck = true; Err(format!("test timed out after {} ms", PER_TEST_MS)) }
            },
        };
        match outcome {
            Ok(v) => entry.push(("actual".to_string(), v)),
            Err(e) => entry.push(("error".to_string(), Json::Str(e))),
        }
        entry.push(("ms".to_string(), Json::Int(started.elapsed().as_millis() as i64)));
        results.push(Json::Object(entry));
        // A test still running cannot be stopped, so the runner reports the rest as not run.
        if stuck { break; }
    }
    let result = Json::Object(vec![("results".to_string(), Json::Array(results)), ("output".to_string(), Json::Str(String::new()))]);
    if let Err(e) = std::fs::write(RESULT_FILE, result.to_string()) { eprintln!("harness: cannot write {}: {}", RESULT_FILE, e); std::process::exit(2) }
    std::process::exit(0)
}

/// twoSum → two_sum (for the error message when a function is missing).
pub fn snake(name: &str) -> String {
    let cs: Vec<char> = name.chars().collect();
    let mut out = String::new();
    for (i, &c) in cs.iter().enumerate() {
        if c.is_ascii_uppercase() {
            let after_lower = i > 0 && (cs[i - 1].is_ascii_lowercase() || cs[i - 1].is_ascii_digit());
            let acronym_end = i > 0 && cs[i - 1].is_ascii_uppercase() && cs.get(i + 1).is_some_and(|n| n.is_ascii_lowercase());
            if after_lower || acronym_end { out.push('_'); }
            out.push(c.to_ascii_lowercase());
        } else {
            out.push(c);
        }
    }
    out
}
`

const hasStruct = (code: string, name: string): boolean => new RegExp(`\\bstruct\\s+${name}\\b`).test(code)

/** True when the candidate's file defines its own entry point, which would clash with the harness's. */
export const definesMain = (code: string): boolean => /\bfn\s+main\s*\(/.test(code)

/**
 * The per-run main.rs: the candidate's code, then the generated glue that
 * maps each tested function name to the snake_case function of that name
 * and, when the file defines ListNode or TreeNode, their JSON conversions.
 * The code goes first so rustc's line numbers match the editor.
 */
export function rustMain(code: string, fns: string[]): string {
  // Only functions the file defines are wired up: a missing one is reported per
  // test by the harness ("no function named …"), not as a compile error.
  const defined = (fn: string): boolean => new RegExp(`\\bfn\\s+${snakeCase(fn)}\\s*[<(]`).test(code)
  const arms = [...new Set(fns)].filter(defined).map((fn) => `            ${JSON.stringify(fn)} => Some(whetstone::call(super::${snakeCase(fn)}, args)),`).join('\n')
  const node = (name: string, fields: string[]): string =>
    `    impl FromJson for super::${name} {\n` +
    `        fn from_json(v: &Json) -> Result<Self, String> {\n` +
    `            Ok(super::${name} { ${fields.map((f) => `${f}: whetstone::field(v, "${f}")?`).join(', ')} })\n` +
    `        }\n    }\n` +
    `    impl ToJson for super::${name} {\n` +
    `        fn to_json(&self) -> Result<Json, String> {\n` +
    `            Ok(Json::Object(vec![${fields.map((f) => `("${f}".to_string(), self.${f}.to_json()?)`).join(', ')}]))\n` +
    `        }\n    }\n`
  return (
    code.trimEnd() +
    '\n\n// ── Whetstone test harness (generated; your code is above) ──────────────\n' +
    'mod __whetstone {\n' +
    '    #![allow(unused_imports, dead_code, unused_variables, non_snake_case, unreachable_patterns)]\n' +
    '    use super::*;\n' +
    '    use whetstone::{FromJson, Json, ToJson};\n' +
    '    pub fn __main() {\n' +
    '        whetstone::main(|name: &str, args: &[Json]| match name {\n' +
    `${arms}\n` +
    '            _ => None,\n' +
    '        })\n' +
    '    }\n' +
    (hasStruct(code, 'ListNode') ? node('ListNode', ['val', 'next']) : '') +
    (hasStruct(code, 'TreeNode') ? node('TreeNode', ['val', 'left', 'right']) : '') +
    '}\n' +
    'fn main() { __whetstone::__main() }\n'
  )
}
