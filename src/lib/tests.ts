import type { Language, TestCase } from '../types.ts'

/**
 * Test cases in the language-neutral form: a function name and JSON
 * arguments, so the same checks run against a TypeScript, Ruby or Java
 * solution. Content written as a TypeScript call expression
 * (`twoSum([2, 7], 9)`) is parsed into that form here; a call that cannot be
 * (closures, awaits: the practical track) stays a TypeScript-only `call`.
 */

/** `twoSum` → `two_sum`, `isValidBST` → `is_valid_bst`. Mirrored in the Ruby and Rust harnesses. */
export const snakeCase = (name: string): string =>
  name.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase()

/** `two_sum` → `twoSum`. Mirrored in the TypeScript and Java harnesses. */
export const camelCase = (name: string): string => name.replace(/_+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase())

/** The name a test's function has in a language's convention. */
export const fnNameFor = (fn: string, language: Language): string => (language === 'ruby' || language === 'rust' ? snakeCase(fn) : camelCase(fn))

class Parser {
  private i = 0
  private readonly s: string
  constructor(s: string) {
    this.s = s
  }

  value(): unknown {
    this.ws()
    const c = this.s[this.i]
    if (c === '[') return this.array()
    if (c === '{') return this.object()
    if (c === '"' || c === "'") return this.string()
    if (c === '-' || c === '+' || (c !== undefined && c >= '0' && c <= '9') || c === '.') return this.number()
    if (this.s.startsWith('true', this.i)) { this.i += 4; return true }
    if (this.s.startsWith('false', this.i)) { this.i += 5; return false }
    if (this.s.startsWith('null', this.i)) { this.i += 4; return null }
    if (this.s.startsWith('Infinity', this.i) || this.s.startsWith('NaN', this.i) || this.s.startsWith('undefined', this.i)) throw new Error('not JSON')
    throw new Error(`unexpected "${c ?? 'end'}" at ${this.i}`)
  }

  end(): void {
    this.ws()
    if (this.i !== this.s.length) throw new Error(`trailing input at ${this.i}`)
  }

  private ws(): void {
    while (this.i < this.s.length && /\s/.test(this.s[this.i]!)) this.i++
  }

  private array(): unknown[] {
    this.i++ // [
    const out: unknown[] = []
    for (;;) {
      this.ws()
      if (this.s[this.i] === ']') { this.i++; return out }
      out.push(this.value())
      this.ws()
      if (this.s[this.i] === ',') { this.i++; continue }
      if (this.s[this.i] === ']') { this.i++; return out }
      throw new Error(`expected , or ] at ${this.i}`)
    }
  }

  private object(): Record<string, unknown> {
    this.i++ // {
    const out: Record<string, unknown> = {}
    for (;;) {
      this.ws()
      if (this.s[this.i] === '}') { this.i++; return out }
      let key: string
      const c = this.s[this.i]
      if (c === '"' || c === "'") key = this.string()
      else {
        const m = /^[A-Za-z_$][\w$]*|^-?\d+/.exec(this.s.slice(this.i))
        if (!m) throw new Error(`bad key at ${this.i}`)
        key = m[0]
        this.i += m[0].length
      }
      this.ws()
      if (this.s[this.i] !== ':') throw new Error(`expected : at ${this.i}`)
      this.i++
      out[key] = this.value()
      this.ws()
      if (this.s[this.i] === ',') { this.i++; continue }
      if (this.s[this.i] === '}') { this.i++; return out }
      throw new Error(`expected , or } at ${this.i}`)
    }
  }

  private string(): string {
    const q = this.s[this.i++]!
    let out = ''
    for (;;) {
      const c = this.s[this.i++]
      if (c === undefined) throw new Error('unterminated string')
      if (c === q) return out
      if (c === '\\') {
        const e = this.s[this.i++]
        const simple: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0', '\\': '\\', '"': '"', "'": "'", '/': '/', '`': '`' }
        if (e === 'u') {
          const hex = this.s.slice(this.i, this.i + 4)
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new Error('bad \\u escape')
          out += String.fromCharCode(parseInt(hex, 16))
          this.i += 4
        } else if (e === 'x') {
          const hex = this.s.slice(this.i, this.i + 2)
          if (!/^[0-9a-fA-F]{2}$/.test(hex)) throw new Error('bad \\x escape')
          out += String.fromCharCode(parseInt(hex, 16))
          this.i += 2
        } else if (e !== undefined && e in simple) out += simple[e]
        else if (e !== undefined) out += e
        continue
      }
      out += c
    }
  }

  private number(): number {
    const m = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(this.s.slice(this.i))
    if (!m) throw new Error(`bad number at ${this.i}`)
    this.i += m[0].length
    const n = Number(m[0])
    if (!Number.isFinite(n)) throw new Error('bad number')
    return n
  }
}

/** Parse a JSON-ish literal (unquoted keys, single quotes and trailing commas allowed). Throws when it is not plain data. */
export function parseLiteral(src: string): unknown {
  const p = new Parser(src)
  const v = p.value()
  p.end()
  return v
}

/**
 * `twoSum([2, 7], 9)` → `{ fn: 'twoSum', args: [[2, 7], 9] }`, or null when
 * the call is not a plain function applied to plain data.
 */
export function parseCall(call: string): { fn: string; args: unknown[] } | null {
  const m = /^\s*([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)\s*;?\s*$/.exec(call)
  if (!m) return null
  const fn = m[1]!
  if (fn === 'await' || fn === 'new' || fn === 'typeof') return null
  try {
    const args = parseLiteral(`[${m[2]!}]`) as unknown[]
    return { fn, args }
  } catch {
    return null
  }
}

/** A test in the language-neutral form where that is possible; a `call` is kept only when it cannot be parsed. */
export function normaliseTest(t: TestCase): TestCase {
  if (typeof t.fn === 'string' && Array.isArray(t.args)) {
    const { call: _call, ...rest } = t
    return { ...rest, fn: t.fn, args: t.args }
  }
  if (typeof t.call === 'string') {
    const parsed = parseCall(t.call)
    if (parsed) {
      const { call: _call, ...rest } = t
      return { ...rest, fn: parsed.fn, args: parsed.args }
    }
  }
  return t
}

export const normaliseTests = (tests: TestCase[]): TestCase[] => tests.map(normaliseTest)

/** True when every test can run in any language (none is a TypeScript-only expression). */
export const languageNeutral = (tests: TestCase[]): boolean => tests.every((t) => typeof t.fn === 'string' && Array.isArray(t.args))

/** How a test is shown: `two_sum([2, 7], 9)` in Ruby and Rust, `twoSum([2, 7], 9)` elsewhere, or the raw call. */
export function testLabel(t: TestCase, language: Language = 'typescript'): string {
  if (t.name) return t.name
  if (typeof t.fn === 'string' && Array.isArray(t.args)) {
    const s = `${fnNameFor(t.fn, language)}(${t.args.map((a) => JSON.stringify(a)).join(', ')})`
    return s.length > 160 ? s.slice(0, 159) + '…' : s
  }
  return t.call ?? '(test)'
}
