import { javascript } from '@codemirror/lang-javascript'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { bracketIssues, syntaxDiagnostics } from './syntaxCheck.ts'

function stateOf(doc: string): EditorState {
  const state = EditorState.create({ doc, extensions: [javascript({ typescript: true })] })
  ensureSyntaxTree(state, doc.length, 5000)
  return state
}

const tree = (doc: string) => ensureSyntaxTree(stateOf(doc), doc.length, 5000)!

describe('bracketIssues', () => {
  it('is quiet for balanced code', () => {
    expect(bracketIssues(tree('function f(a: number[]): void {\n  g([a, { b: (1) }])\n}\n'))).toEqual([])
  })

  it('points at the opener that was never closed', () => {
    const [issue, ...rest] = bracketIssues(tree('foo(bar'))
    expect(rest).toEqual([])
    expect(issue).toMatchObject({ from: 3, to: 4, char: '(', kind: 'unclosed' })
    expect(issue.message).toContain('expected ")"')
  })

  it('blames only the inner bracket when an outer one closes over it', () => {
    const issues = bracketIssues(tree('const a = [1, (2, 3]\n'))
    expect(issues).toMatchObject([{ from: 14, char: '(', kind: 'unclosed' }])
  })

  it('marks both ends when a closer matches nothing that is open', () => {
    expect(bracketIssues(tree('x = (1 + 2]'))).toMatchObject([
      { from: 4, char: '(', kind: 'unclosed' },
      { from: 10, char: ']', kind: 'unexpected' },
    ])
  })

  it('does not let a stray closer far below adopt an unclosed opener', () => {
    const src = 'const a = [1, 2\nconst s = "(["\nfunction f(x: number) {\n  return x * 2]\n}\n'
    expect(bracketIssues(tree(src))).toMatchObject([
      { from: 10, char: '[', kind: 'unclosed' },
      { from: src.indexOf('2]') + 1, char: ']', kind: 'unexpected' },
    ])
  })

  it('flags a closer with nothing to close', () => {
    expect(bracketIssues(tree('x = 1)\n'))).toMatchObject([{ from: 5, char: ')', kind: 'unexpected' }])
  })

  it('ignores brackets inside strings, comments, templates and regexes', () => {
    const src = [
      'const s = "(["',
      "const t = '}'",
      '// ) stray in a comment',
      '/* { another */',
      'const u = `) ${s} (`',
      'const r = /\\(\\[/',
    ].join('\n')
    expect(bracketIssues(tree(src))).toEqual([])
  })
})

describe('syntaxDiagnostics', () => {
  it('returns nothing for valid TypeScript', () => {
    expect(syntaxDiagnostics(stateOf('export function twoSum(nums: number[], target: number): number[] {\n  return []\n}\n'))).toEqual([])
  })

  it('reports an unclosed brace once, at the brace', () => {
    const diags = syntaxDiagnostics(stateOf('if (x) {\n  y()\n'))
    expect(diags).toHaveLength(1)
    expect(diags[0]).toMatchObject({ from: 7, to: 8, severity: 'error' })
    expect(diags[0].message).toMatch(/"\{" is never closed/)
  })

  it('does not double-report a mismatched closer the parser also rejected', () => {
    const diags = syntaxDiagnostics(stateOf('x = (1 + 2]'))
    expect(diags.map((d) => d.message)).toEqual(['"(" is never closed; expected ")"', '"]" has nothing to close'])
  })

  it("folds the parser's missing-closer marker into the bracket it belongs to", () => {
    const src = 'const a = [1, 2\nconst b = 3\n'
    const diags = syntaxDiagnostics(stateOf(src))
    expect(diags).toHaveLength(1)
    expect(diags[0]).toMatchObject({ from: 10, to: 11 })
  })

  it('still reports parse errors that are not about brackets', () => {
    const diags = syntaxDiagnostics(stateOf('let = 5'))
    expect(diags).toHaveLength(1)
    expect(diags[0]).toMatchObject({ from: 4, to: 4, message: 'Syntax error here' })
  })

  it('tells a missing token at line end from a stray one mid-line', () => {
    expect(syntaxDiagnostics(stateOf('const a = 1 +\n')).map((d) => d.message)).toEqual(['Something is missing here'])
    expect(syntaxDiagnostics(stateOf('const a = 1 2\n')).map((d) => d.message)).toEqual(['Syntax error here'])
  })

  it('names a token the parser had to throw away', () => {
    const diags = syntaxDiagnostics(stateOf('const 5x = 1\n'))
    expect(diags.map((d) => d.message)).toEqual(['Unexpected "5"'])
  })
})
