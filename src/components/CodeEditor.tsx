import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

const ts = [javascript({ typescript: true })]

export default function CodeEditor({ value, onChange, readOnly = false, height = '100%' }: { value: string; onChange?: (v: string) => void; readOnly?: boolean; height?: string }) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      height={height}
      theme={oneDark}
      extensions={ts}
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, autocompletion: false }}
    />
  )
}
