import { Suspense, lazy } from 'react'
import type { Language } from '../types.ts'

const Inner = lazy(() => import('./CodeEditorInner.tsx'))

interface Props {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  height?: string
  language?: Language
}

/**
 * The code editor, loaded on first use: CodeMirror is the largest thing in
 * the bundle and the list screen does not need it. Until it arrives the
 * text shows as plain monospace, so nothing jumps.
 */
export default function CodeEditor(props: Props) {
  return (
    <Suspense fallback={<pre className="editor-fallback" style={{ height: props.height === 'auto' ? undefined : props.height }}>{props.value}</pre>}>
      <Inner {...props} />
    </Suspense>
  )
}
