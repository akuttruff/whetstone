import { useEffect, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import type { Extension } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxCheck } from '../lib/syntaxCheck.ts'
import type { Language } from '../types.ts'

const TS: Extension[] = [javascript({ typescript: true })]
const cache: Partial<Record<Language, Extension[]>> = { typescript: TS }

/** The language mode, fetched as its own chunk the first time that language is used. */
async function modeFor(language: Language): Promise<Extension[]> {
  if (cache[language]) return cache[language]!
  const mode = language === 'java'
    ? [(await import('@codemirror/lang-java')).java()]
    : [(await import('@codemirror/language')).StreamLanguage.define((await import('@codemirror/legacy-modes/mode/ruby')).ruby)]
  cache[language] = mode
  return mode
}

interface Props {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  height?: string
  language?: Language
}

export default function CodeEditorInner({ value, onChange, readOnly = false, height = '100%', language = 'typescript' }: Props) {
  const [mode, setMode] = useState<Extension[]>(() => cache[language] ?? [])
  useEffect(() => {
    let cancelled = false
    void modeFor(language).then((m) => { if (!cancelled) setMode(m) })
    return () => { cancelled = true }
  }, [language])
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
      extensions={checked ? [...mode, syntaxCheck] : mode}
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, autocompletion: false }}
    />
  )
}
