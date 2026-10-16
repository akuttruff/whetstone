import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxCheck } from '../lib/syntaxCheck.ts'

const ts = [javascript({ typescript: true })]
// Live syntax feedback only where the candidate is typing; shown solutions
// and templates are already known-good and the extra strip would be noise.
const tsChecked = [...ts, syntaxCheck]

export default function CodeEditor({ value, onChange, readOnly = false, height = '100%' }: { value: string; onChange?: (v: string) => void; readOnly?: boolean; height?: string }) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      height={height}
      theme={oneDark}
      extensions={readOnly ? ts : tsChecked}
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, autocompletion: false }}
    />
  )
}
