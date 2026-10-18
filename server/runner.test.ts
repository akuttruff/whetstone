import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { availability } from './langs.ts'
import { normalise, runTests } from './runner.ts'

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

  it('refuses TypeScript-only tests in another language', async () => {
    const r = await runTests('def f; end', [{ call: '(async () => f())()', expected: 1 }], { dir, language: 'ruby' })
    expect(r.error).toMatch(/only run against TypeScript/)
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
})
