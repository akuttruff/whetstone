import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { java } from '@codemirror/lang-java'
import { StreamLanguage } from '@codemirror/language'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import type { Extension } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxCheck } from '../lib/syntaxCheck.ts'
import type { Language } from '../types.ts'

const MODES: Record<Language, Extension[]> = {
  typescript: [javascript({ typescript: true })],
  ruby: [StreamLanguage.define(ruby)],
  java: [java()],
}

interface Props {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  height?: string
  language?: Language
}

export default function CodeEditor({ value, onChange, readOnly = false, height = '100%', language = 'typescript' }: Props) {
  // Live syntax feedback only where the candidate is typing; shown solutions
  // and templates are already known-good and the extra strip would be noise.
  // It reads the parse tree's error nodes, which the Ruby mode (a stream
  // tokenizer, not a parser) never produces, so it stays off there.
  const checked = !readOnly && language !== 'ruby'
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      height={height}
      theme={oneDark}
      extensions={checked ? [...MODES[language], syntaxCheck] : MODES[language]}
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, autocompletion: false }}
    />
  )
}
