import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { availability } from './langs.ts'
import { normalise, runTests, sweepRuns } from './runner.ts'

const dir = path.join(os.tmpdir(), 'whetstone-runner-test')
const have = availability()

describe('runTests (TypeScript)', () => {
  it('passes a correct solution and reports per-test results', async () => {
    const r = await runTests(
      'export function add(a: number, b: number): number { return a + b }',
      [{ fn: 'add', args: [1, 2], expected: 3 }, { name: 'negatives', call: 'add(-1, -2)', expected: -3 }],
      { dir },
    )
    expect(r.ok).toBe(true)
    expect(r.passed).toBe(2)
    expect(r.results[0]!.name).toBe('add(1, 2)')
    expect(r.results[1]!.name).toBe('negatives')
  }, 20_000)

  it('reports failures with expected and actual', async () => {
    const r = await runTests('export const f = (x: number) => x * 3', [{ call: 'f(2)', expected: 4 }], { dir })
    expect(r.ok).toBe(false)
    expect(r.results[0]).toMatchObject({ pass: false, expected: '4', actual: '6' })
  }, 20_000)

  it('supports async calls, unordered comparison, console output and parameter properties', async () => {
    const code = `
export class Box { constructor(private readonly n: number) {} get(): number { return this.n } }
export async function later(xs: number[]): Promise<number[]> { console.log('hi', 1); await new Promise((r) => setTimeout(r, 5)); return xs.reverse() }
export function box(n: number): number { return new Box(n).get() }`
    const r = await runTests(code, [
      { call: 'later([1, 2, 3])', expected: [1, 2, 3], unordered: true },
      { fn: 'box', args: [7], expected: 7 },
    ], { dir })
    expect(r.ok).toBe(true)
    expect(r.output).toContain('hi 1')
  }, 20_000)

  it('finds a snake_case function name in camelCase and compares objects regardless of key order', async () => {
    const code = 'export function twoSum(a: number[]): { b: number; a: number } { return { b: a[1]!, a: a[0]! } }'
    const r = await runTests(code, [{ fn: 'two_sum', args: [[1, 2]], expected: { a: 1, b: 2 } }], { dir })
    expect(r.ok).toBe(true)
    expect(r.results[0]!.name).toBe('twoSum([1,2])')
  }, 20_000)

  it('turns a syntax error into a load error, not a crash', async () => {
    const r = await runTests('export function broken( {', [{ call: 'broken()', expected: 1 }], { dir })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/could not be loaded/)
  }, 20_000)

  it('catches a thrown error per test', async () => {
    const r = await runTests('export function boom(): number { throw new Error("nope") }', [{ call: 'boom()', expected: 1 }], { dir })
    expect(r.results[0]!.error).toBe('nope')
  }, 20_000)

  it('kills an infinite loop', async () => {
    const r = await runTests('export function spin(): number { for (;;) {} }', [{ call: 'spin()', expected: 1 }], { dir, timeoutMs: 1500 })
    expect(r.error).toMatch(/Timed out/)
  }, 20_000)

  it('stops a synchronous loop in one test and still reports the others', async () => {
    const code = 'export function spin(): number { for (;;) {} }\nexport function add(a: number, b: number): number { return a + b }'
    const r = await runTests(code, [{ fn: 'spin', args: [], expected: 1 }, { fn: 'add', args: [2, 3], expected: 5 }], { dir })
    expect(r.error).toBeUndefined()
    expect(r.results[0]!.error).toMatch(/timed out/)
    expect(r.results[1]).toMatchObject({ pass: true })
  }, 20_000)

  it('reports a test that runs out of heap without losing the rest', async () => {
    const code = 'export function hog(): number { const a: number[][] = []; for (;;) a.push(new Array(1e6).fill(1)) }\nexport const one = (): number => 1'
    const r = await runTests(code, [{ fn: 'hog', args: [], expected: 1 }, { fn: 'one', args: [], expected: 1 }], { dir })
    expect(r.error).toBeUndefined()
    expect(r.results[0]!.pass).toBe(false)
    expect(r.results[1]).toMatchObject({ pass: true })
  }, 20_000)

  it('keeps the results when the solution floods stdout past the capture cap', async () => {
    const code = 'process.stdout.write("x".repeat(3_000_000) + "\\n")\nexport const one = (): number => 1'
    const r = await runTests(code, [{ fn: 'one', args: [], expected: 1 }], { dir })
    expect(r.ok).toBe(true)
  }, 20_000)

  it('does not wait for, or leave behind, a process the solution started', async () => {
    const own = fs.mkdtempSync(path.join(os.tmpdir(), 'whetstone-grandchild-'))
    const pidFile = path.join(own, 'pid')
    const code = (tail: string): string => `import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const c = spawn('/bin/sleep', ['8'], { stdio: 'inherit' })
writeFileSync(${JSON.stringify(pidFile)}, String(c.pid))
${tail}`
    const alive = (pid: number): boolean => { try { process.kill(pid, 0); return true } catch { return false } }
    const gone = async (pid: number): Promise<boolean> => {
      for (let i = 0; i < 20 && alive(pid); i++) await new Promise((r) => setTimeout(r, 50))
      return !alive(pid)
    }
    try {
      // A run that finishes normally returns at once, not when the sleep ends.
      let t0 = Date.now()
      let r = await runTests(code('export const one = (): number => 1'), [{ fn: 'one', args: [], expected: 1 }], { dir: own, timeoutMs: 2000 })
      expect(r.ok).toBe(true)
      expect(Date.now() - t0).toBeLessThan(4000)
      expect(await gone(Number(fs.readFileSync(pidFile, 'utf8')))).toBe(true)
      // A run that times out returns at its timeout.
      t0 = Date.now()
      r = await runTests(code('for (;;) {}\nexport const one = (): number => 1'), [{ fn: 'one', args: [], expected: 1 }], { dir: own, timeoutMs: 2000 })
      expect(r.error).toMatch(/Timed out/)
      expect(Date.now() - t0).toBeLessThan(4000)
      expect(await gone(Number(fs.readFileSync(pidFile, 'utf8')))).toBe(true)
      expect(fs.readdirSync(own).filter((n) => n.startsWith('run-'))).toEqual([])
    } finally {
      fs.rmSync(own, { recursive: true, force: true })
    }
  }, 20_000)

  it('refuses TypeScript-only tests in another language', async () => {
    const r = await runTests('def f; end', [{ call: '(async () => f())()', expected: 1 }], { dir, language: 'ruby' })
    expect(r.error).toMatch(/only run against TypeScript/)
  })
})

describe('sweepRuns', () => {
  it('removes old run directories and nothing else', () => {
    const own = fs.mkdtempSync(path.join(os.tmpdir(), 'whetstone-sweep-'))
    try {
      for (const n of ['run-old', 'run-new', 'java-harness']) fs.mkdirSync(path.join(own, n))
      const hourAgo = new Date(Date.now() - 3_600_000)
      fs.utimesSync(path.join(own, 'run-old'), hourAgo, hourAgo)
      fs.utimesSync(path.join(own, 'java-harness'), hourAgo, hourAgo)
      expect(sweepRuns(own)).toBe(1)
      expect(fs.readdirSync(own).sort()).toEqual(['java-harness', 'run-new'])
      expect(sweepRuns(path.join(own, 'missing'))).toBe(0)
    } finally {
      fs.rmSync(own, { recursive: true, force: true })
    }
  })
})

describe('normalise', () => {
  it('sorts keys always and arrays only when unordered', () => {
    expect(JSON.stringify(normalise({ b: 1, a: [2, 1] }))).toBe('{"a":[2,1],"b":1}')
    expect(JSON.stringify(normalise({ b: 1, a: [2, 1] }, true))).toBe('{"a":[1,2],"b":1}')
    expect(normalise(undefined)).toBeNull()
  })
})

const LIST = { val: 1, next: { val: 2, next: { val: 3, next: null } } }
const REVERSED = { val: 3, next: { val: 2, next: { val: 1, next: null } } }

describe.skipIf(!have.ruby)('runTests (Ruby)', () => {
  it('calls snake_case methods with converted arguments and converts nodes both ways', async () => {
    const code = `
class ListNode
  attr_accessor :val, :next
  def initialize(val = 0, nxt = nil)
    @val = val
    @next = nxt
  end
end

def two_sum(nums, target)
  seen = {}
  nums.each_with_index do |x, i|
    return [seen[target - x], i] if seen.key?(target - x)
    seen[x] = i
  end
  []
end

def reverse_list(head)
  prev = nil
  while head
    nxt = head.next
    head.next = prev
    prev = head
    head = nxt
  end
  prev
end

def shout(s)
  puts "hi"
  s.upcase
end
`
    const r = await runTests(code, [
      { fn: 'twoSum', args: [[2, 7, 11, 15], 9], expected: [0, 1], unordered: true },
      { fn: 'reverseList', args: [LIST], expected: REVERSED },
      { fn: 'reverse_list', args: [null], expected: null },
      { fn: 'shout', args: ['ab'], expected: 'AB' },
    ], { dir, language: 'ruby' })
    expect(r.error).toBeUndefined()
    expect(r.results.map((t) => [t.name, t.pass])).toEqual([['two_sum([2,7,11,15], 9)', true], ['reverse_list({"val":1,"next":{"val":2,"next":{"val":3,"next":null}}})', true], ['reverse_list(null)', true], ['shout("ab")', true]])
    expect(r.output).toBe('hi\n')
  }, 30_000)

  it('accepts a result that shares an object without a cycle', async () => {
    const r = await runTests('class ListNode; attr_accessor :val, :next; def initialize(v = 0, n = nil); @val = v; @next = n; end; end\ndef pair; n = ListNode.new(1); [n, n]; end', [{ fn: 'pair', args: [], expected: [{ val: 1, next: null }, { val: 1, next: null }] }], { dir, language: 'ruby' })
    expect(r.results[0]).toMatchObject({ pass: true })
  }, 30_000)

  it('reports load errors, thrown errors, missing methods and timeouts', async () => {
    let r = await runTests('def f(\n', [{ fn: 'f', args: [], expected: 1 }], { dir, language: 'ruby' })
    expect(r.error).toMatch(/could not be loaded: SyntaxError/)
    r = await runTests('def boom; raise "nope"; end\ndef spin; loop {}; end', [
      { fn: 'boom', args: [], expected: 1 },
      { fn: 'missing', args: [], expected: 1 },
      { fn: 'spin', args: [], expected: 1 },
    ], { dir, language: 'ruby', timeoutMs: 12_000 })
    expect(r.results[0]!.error).toBe('nope')
    expect(r.results[1]!.error).toMatch(/no method named missing/)
    expect(r.results[2]!.error).toMatch(/timed out/)
  }, 30_000)

  it('caps captured output and keeps the results when stdout is flooded', async () => {
    const r = await runTests('def noisy; 50_000.times { puts "line" }; STDOUT.write("x" * 3_000_000); 1; end', [{ fn: 'noisy', args: [], expected: 1 }], { dir, language: 'ruby' })
    expect(r.ok).toBe(true)
    expect(r.output.length).toBeLessThanOrEqual(20_000)
  }, 30_000)
})

describe.skipIf(!have.java)('runTests (Java)', () => {
  it('coerces arguments to the method signature and converts results and nodes', async () => {
    const code = `
import java.util.*;

class ListNode {
  int val;
  ListNode next;
  ListNode() {}
  ListNode(int val) { this.val = val; }
}

class Solution {
  public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
      if (seen.containsKey(target - nums[i])) return new int[] { seen.get(target - nums[i]), i };
      seen.put(nums[i], i);
    }
    return new int[0];
  }
  public ListNode reverseList(ListNode head) {
    ListNode prev = null;
    while (head != null) { ListNode n = head.next; head.next = prev; prev = head; head = n; }
    return prev;
  }
  public List<List<Integer>> groups(List<List<Integer>> xs, char[][] grid, String s) {
    System.out.println("grid " + grid[0][1] + s);
    return xs;
  }
  public Map<String, Object> check(Map<Integer, List<Integer>> adj) {
    Map<String, Object> m = new HashMap<>();
    m.put("equal", adj.get(1).get(0) == 2);
    return m;
  }
  public double half(long n) { return n / 2.0; }
}
`
    const r = await runTests(code, [
      { fn: 'two_sum', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { fn: 'reverseList', args: [LIST], expected: REVERSED },
      { fn: 'groups', args: [[[1, 2], [3]], [['a', 'b']], 'x'], expected: [[1, 2], [3]] },
      { fn: 'check', args: [{ 1: [2, 4] }], expected: { equal: true } },
      { fn: 'half', args: [5], expected: 2.5 },
    ], { dir, language: 'java', timeoutMs: 20_000 })
    expect(r.error).toBeUndefined()
    expect(r.results.map((t) => [t.name, t.pass, t.actual])).toEqual([
      ['twoSum([2,7,11,15], 9)', true, '[0,1]'],
      ['reverseList({"val":1,"next":{"val":2,"next":{"val":3,"next":null}}})', true, '{"next":{"next":{"next":null,"val":1},"val":2},"val":3}'],
      ['groups([[1,2],[3]], [["a","b"]], "x")', true, '[[1,2],[3]]'],
      ['check({"1":[2,4]})', true, '{"equal":true}'],
      ['half(5)', true, '2.5'],
    ])
    expect(r.output).toBe('grid bx\n')
  }, 60_000)

  it('reports compile errors, thrown errors, missing methods and timeouts', async () => {
    let r = await runTests('class Solution { public int f() { return "x"; } }', [{ fn: 'f', args: [], expected: 1 }], { dir, language: 'java', timeoutMs: 20_000 })
    expect(r.error).toMatch(/could not be compiled/)
    expect(r.error).toMatch(/Solution\.java:1/)
    r = await runTests('class Solution { public int boom() { throw new IllegalStateException("nope"); } public int spin() { while (true) {} } }', [
      { fn: 'boom', args: [], expected: 1 },
      { fn: 'missing', args: [], expected: 1 },
      { fn: 'spin', args: [], expected: 1 },
    ], { dir, language: 'java', timeoutMs: 20_000 })
    expect(r.results[0]!.error).toBe('IllegalStateException: nope')
    expect(r.results[1]!.error).toMatch(/no method named missing/)
    expect(r.results[2]!.error).toMatch(/timed out/)
  }, 60_000)

  it('gives each test a fresh Solution and stops after a test that will not stop', async () => {
    const code = 'class Solution { int n = 0; public int next() { return ++n; } public int spin() { while (true) {} } public int one() { return 1; } }'
    const r = await runTests(code, [
      { fn: 'next', args: [], expected: 1 },
      { fn: 'next', args: [], expected: 1 },
      { fn: 'spin', args: [], expected: 1 },
      { fn: 'one', args: [], expected: 1 },
    ], { dir, language: 'java', timeoutMs: 20_000 })
    expect(r.results.slice(0, 2).map((t) => t.pass)).toEqual([true, true])
    expect(r.results[2]!.error).toMatch(/timed out/)
    expect(r.results[3]!.error).toBe('not run')
  }, 60_000)

  it('caps captured output', async () => {
    const r = await runTests('class Solution { public int noisy() { for (int i = 0; i < 200_000; i++) System.out.println("line " + i); return 1; } }', [{ fn: 'noisy', args: [], expected: 1 }], { dir, language: 'java', timeoutMs: 20_000 })
    expect(r.ok).toBe(true)
    expect(r.output.length).toBeLessThanOrEqual(20_000)
  }, 60_000)
})

describe.skipIf(!have.rust)('runTests (Rust)', () => {
  it('builds arguments from the parameter types and converts results and nodes', async () => {
    const code = `
use std::collections::HashMap;

pub struct ListNode { pub val: i32, pub next: Option<Box<ListNode>> }

pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
    let mut seen: HashMap<i32, i32> = HashMap::new();
    for (i, &n) in nums.iter().enumerate() {
        if let Some(&j) = seen.get(&(target - n)) { return vec![j, i as i32]; }
        seen.insert(n, i as i32);
    }
    vec![]
}

pub fn reverse_list(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    let mut prev = None;
    let mut cur = head;
    while let Some(mut node) = cur {
        cur = node.next.take();
        node.next = prev;
        prev = Some(node);
    }
    prev
}

pub fn groups(xs: Vec<Vec<i32>>, grid: Vec<Vec<char>>, s: String) -> Vec<Vec<i32>> {
    println!("grid {}{}", grid[0][1], s);
    xs
}

pub fn check(adj: HashMap<i32, Vec<i32>>) -> HashMap<String, bool> {
    HashMap::from([("equal".to_string(), adj[&1][0] == 2)])
}

pub fn half(n: i64) -> f64 { n as f64 / 2.0 }

pub fn pair(a: Option<String>, b: (i32, bool)) -> (Option<String>, i32, bool) { (a, b.0, b.1) }
`
    const r = await runTests(code, [
      { fn: 'twoSum', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { fn: 'reverseList', args: [LIST], expected: REVERSED },
      { fn: 'groups', args: [[[1, 2], [3]], [['a', 'b']], 'x'], expected: [[1, 2], [3]] },
      { fn: 'check', args: [{ 1: [2, 4] }], expected: { equal: true } },
      { fn: 'half', args: [5], expected: 2.5 },
      { fn: 'pair', args: [null, [3, true]], expected: [null, 3, true] },
    ], { dir, language: 'rust', timeoutMs: 30_000 })
    expect(r.error).toBeUndefined()
    expect(r.results.map((t) => [t.name, t.pass, t.actual])).toEqual([
      ['two_sum([2,7,11,15], 9)', true, '[0,1]'],
      ['reverse_list({"val":1,"next":{"val":2,"next":{"val":3,"next":null}}})', true, '{"next":{"next":{"next":null,"val":1},"val":2},"val":3}'],
      ['groups([[1,2],[3]], [["a","b"]], "x")', true, '[[1,2],[3]]'],
      ['check({"1":[2,4]})', true, '{"equal":true}'],
      ['half(5)', true, '2.5'],
      ['pair(null, [3,true])', true, '[null,3,true]'],
    ])
    expect(r.output).toBe('grid bx')
  }, 60_000)

  it('reports compile errors with the editor line, panics, missing functions, bad arguments and timeouts', async () => {
    let r = await runTests('pub fn f() -> i32 {\n    "x"\n}', [{ fn: 'f', args: [], expected: 1 }], { dir, language: 'rust', timeoutMs: 30_000 })
    expect(r.error).toMatch(/could not be compiled/)
    expect(r.error).toMatch(/--> line 2:5/)
    expect(r.error).not.toMatch(/rustc --explain/)
    r = await runTests('pub fn boom(i: usize) -> i32 { let v = vec![1]; v[i] }\npub fn spin() -> i32 { loop {} }\npub fn one() -> i32 { 1 }', [
      { fn: 'boom', args: [3], expected: 1 },
      { fn: 'missing', args: [], expected: 1 },
      { fn: 'one', args: ['x'], expected: 1 },
      { fn: 'spin', args: [], expected: 1 },
      { fn: 'one', args: [], expected: 1 },
    ], { dir, language: 'rust', timeoutMs: 30_000 })
    expect(r.results[0]!.error).toBe('panicked at line 1: index out of bounds: the len is 1 but the index is 3')
    expect(r.results[1]!.error).toMatch(/no function named missing/)
    expect(r.results[2]!.error).toMatch(/takes 0 argument/)
    expect(r.results[3]!.error).toMatch(/timed out/)
    expect(r.results[4]!.error).toBe('not run')
  }, 60_000)

  it('refuses a file with its own main', async () => {
    const r = await runTests('fn main() {}\npub fn one() -> i32 { 1 }', [{ fn: 'one', args: [], expected: 1 }], { dir, language: 'rust' })
    expect(r.error).toMatch(/fn main/)
  })

  it('caps captured output', async () => {
    const r = await runTests('pub fn noisy() -> i32 { for i in 0..200_000 { println!("line {}", i); } 1 }', [{ fn: 'noisy', args: [], expected: 1 }], { dir, language: 'rust', timeoutMs: 30_000 })
    expect(r.ok).toBe(true)
    expect(r.output.length).toBeLessThanOrEqual(20_000)
  }, 60_000)
})
