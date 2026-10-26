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
  let mode: Extension[]
  if (language === 'java') mode = [(await import('@codemirror/lang-java')).java()]
  else {
    const { StreamLanguage } = await import('@codemirror/language')
    mode = [StreamLanguage.define(language === 'rust' ? (await import('@codemirror/legacy-modes/mode/rust')).rust : (await import('@codemirror/legacy-modes/mode/ruby')).ruby)]
  }
  cache[language] = mode
  return mode
}

/** Stream tokenizers, not parsers: they never produce the error nodes the syntax check reads. */
const STREAM_MODE: Partial<Record<Language, true>> = { ruby: true, rust: true }

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
  // It reads the parse tree's error nodes, which the Ruby and Rust modes
  // (stream tokenizers, not parsers) never produce, so it stays off there.
  const checked = !readOnly && !STREAM_MODE[language]
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
