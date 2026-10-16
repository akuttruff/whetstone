import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'
import { linter, forEachDiagnostic, type Diagnostic } from '@codemirror/lint'
import { RangeSetBuilder, type EditorState, type Extension } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, showPanel, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import type { Tree } from '@lezer/common'

/**
 * Live syntax feedback for the code editor.
 *
 * Two layers, both driven by the parse tree CodeMirror already keeps:
 *  - unmatched brackets are coloured in place (red on the offending
 *    character), since "which paren did I forget" is the question a
 *    candidate actually has mid-problem;
 *  - every other parse error gets a lint underline, and the first problem
 *    is spelled out in a one-line strip under the code so it reads on a
 *    phone, where there is no hover tooltip.
 */

const CLOSER: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
const OPENER: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

export type BracketKind = 'unclosed' | 'unexpected'

export interface BracketIssue {
  from: number
  to: number
  char: string
  kind: BracketKind
  message: string
}

interface Analysis {
  brackets: BracketIssue[]
  /** Positions of the parser's zero-width "a closer should be here" markers that an unclosed bracket already explains. */
  explained: Set<number>
}

interface Frame {
  open: { char: string; from: number }[]
  holes: number[]
}

/**
 * Pairs brackets the way the parser nested them: an opener may only be closed
 * by a sibling token. That is what keeps a stray `]` three lines down from
 * "closing" an array literal the parser already gave up on, and it means
 * brackets inside strings, comments, regexes and template text never count,
 * since those are not tokens at all.
 */
function analyze(tree: Tree): Analysis {
  const brackets: BracketIssue[] = []
  const explained = new Set<number>()
  const frames: Frame[] = [{ open: [], holes: [] }]
  const top = (): Frame => frames[frames.length - 1]
  tree.iterate({
    enter(node) {
      const name = node.name
      if (name in CLOSER) {
        top().open.push({ char: name, from: node.from })
        return false
      }
      if (name in OPENER) {
        const open = top().open
        if (open.length > 0 && open[open.length - 1].char === OPENER[name]) {
          open.pop()
        } else {
          brackets.push({ from: node.from, to: node.to, char: name, kind: 'unexpected', message: `"${name}" has nothing to close` })
        }
        return false
      }
      if (node.type.isError && node.from === node.to) {
        top().holes.push(node.from)
        return false
      }
      frames.push({ open: [], holes: [] })
      return true
    },
    leave() {
      const frame = frames.pop()!
      for (const open of frame.open) brackets.push(unclosed(open))
      if (frame.open.length > 0) for (const hole of frame.holes) explained.add(hole)
    },
  })
  brackets.sort((a, b) => a.from - b.from)
  return { brackets, explained }
}

function unclosed(open: { char: string; from: number }): BracketIssue {
  return { from: open.from, to: open.from + 1, char: open.char, kind: 'unclosed', message: `"${open.char}" is never closed; expected "${CLOSER[open.char]}"` }
}

/** The brackets that do not pair up, in document order. */
export function bracketIssues(tree: Tree): BracketIssue[] {
  return analyze(tree).brackets
}

const MAX_TOKEN_SHOWN = 24

/**
 * Lint diagnostics for the whole document: one per bracket issue, plus one per
 * parse error the brackets do not already explain. The parser's own zero-width
 * "missing closer" marker inside an unclosed node is folded into that bracket's
 * diagnostic instead of being reported twice.
 */
export function syntaxDiagnostics(state: EditorState): Diagnostic[] {
  const tree = ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state)
  const { brackets, explained } = analyze(tree)
  const out: Diagnostic[] = brackets.map((b) => ({ from: b.from, to: b.to, severity: 'error', message: b.message }))
  const stray = brackets.filter((b) => b.kind === 'unexpected').map((b) => b.from)

  tree.iterate({
    enter(node) {
      if (!node.type.isError) return
      if (node.from === node.to) {
        if (explained.has(node.from)) return
        // The parser recovers by pretending a token was there. At the end of
        // a line that is literally what happened; mid-line the next token is
        // the odd one out, but naming it would be guessing at the fix.
        const line = state.doc.lineAt(node.from)
        const atLineEnd = state.doc.sliceString(node.from, line.to).trim() === ''
        out.push({ from: node.from, to: node.to, severity: 'error', message: atLineEnd ? 'Something is missing here' : 'Syntax error here' })
        return
      }
      // The parser wraps a token it had to discard; when that token is a stray
      // bracket the bracket's own diagnostic already says so.
      if (stray.some((pos) => pos >= node.from && pos < node.to)) return
      let text = state.doc.sliceString(node.from, node.to).trim()
      if (text.length > MAX_TOKEN_SHOWN) text = text.slice(0, MAX_TOKEN_SHOWN) + '…'
      out.push({ from: node.from, to: node.to, severity: 'error', message: text ? `Unexpected "${text}"` : 'Syntax error' })
    },
  })
  return out.sort((a, b) => a.from - b.from)
}

const marks: Record<BracketKind, Decoration> = {
  unclosed: Decoration.mark({ class: 'cm-bracket-bad cm-bracket-unclosed' }),
  unexpected: Decoration.mark({ class: 'cm-bracket-bad cm-bracket-unexpected' }),
}

function bracketDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const issue of bracketIssues(syntaxTree(state))) builder.add(issue.from, issue.to, marks[issue.kind])
  return builder.finish()
}

const bracketColours = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = bracketDecorations(view.state)
    }
    update(update: ViewUpdate): void {
      if (update.docChanged || syntaxTree(update.state) !== syntaxTree(update.startState)) this.decorations = bracketDecorations(update.state)
    }
  },
  { decorations: (v) => v.decorations },
)

/** "Line 4: "(" is never closed" — the first problem, or nothing when the code parses. */
export function statusLine(state: EditorState): string {
  let first: Diagnostic | null = null
  let count = 0
  forEachDiagnostic(state, (d) => {
    count++
    first ??= d
  })
  if (!first) return ''
  const { number } = state.doc.lineAt((first as Diagnostic).from)
  const more = count > 1 ? ` (+${count - 1} more)` : ''
  return `Line ${number}: ${(first as Diagnostic).message}${more}`
}

const statusPanel = showPanel.of((view) => {
  const dom = document.createElement('div')
  dom.className = 'cm-syntax-status'
  const apply = (state: EditorState): void => {
    const text = statusLine(state)
    dom.textContent = text
    dom.style.display = text ? '' : 'none'
  }
  apply(view.state)
  return { dom, update: (u) => apply(u.state) }
})

const theme = EditorView.baseTheme({
  '.cm-bracket-bad': { color: '#ff7b7b', fontWeight: '700', borderRadius: '2px', backgroundColor: 'rgba(217, 123, 123, 0.18)' },
  '.cm-bracket-unclosed': { textDecoration: 'underline', textDecorationStyle: 'wavy', textUnderlineOffset: '2px' },
  '.cm-bracket-unexpected': { textDecoration: 'line-through' },
  '.cm-syntax-status': {
    padding: '3px 10px',
    fontSize: '12px',
    fontFamily: 'inherit',
    color: '#ff9b9b',
    backgroundColor: 'rgba(217, 123, 123, 0.12)',
    borderTop: '1px solid rgba(217, 123, 123, 0.3)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '.cm-panels-bottom': { borderTop: 'none' },
})

/** Everything the editor needs: coloured brackets, lint underlines, the status strip. */
export const syntaxCheck: Extension = [bracketColours, linter((view) => syntaxDiagnostics(view.state), { delay: 200 }), statusPanel, theme]
