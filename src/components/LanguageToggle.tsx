import { LANGUAGES } from '../types.ts'
import type { Language } from '../types.ts'

/** The language coding problems are attempted in, next to the title. A setting, so the phone and the desktop agree. */
export default function LanguageToggle({ value, onChange }: { value: Language; onChange: (l: Language) => void }) {
  return (
    <div className="lang-toggle" role="radiogroup" aria-label="Language">
      {LANGUAGES.map((l) => (
        <button key={l.id} role="radio" aria-checked={l.id === value} className={l.id === value ? 'active' : ''} onClick={() => onChange(l.id)} title={`Attempt coding problems in ${l.label}`}>
          {l.short}
        </button>
      ))}
    </div>
  )
}
