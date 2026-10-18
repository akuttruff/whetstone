import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import { toast } from 'sonner'
import { api } from '../lib/api.ts'
import { LANGUAGES } from '../types.ts'
import type { Language, ModelOption, PublicSettings, Settings } from '../types.ts'

interface Props {
  open: boolean
  settings: PublicSettings
  onClose: () => void
  onSave: (patch: Partial<Settings>) => Promise<unknown>
}

export default function SettingsSheet({ open, settings, onClose, onSave }: Props) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl)
  const [model, setModel] = useState(settings.model)
  const [apiKey, setApiKey] = useState('')
  const [autoDelayS, setAutoDelayS] = useState(settings.autoDelayS)
  const [thinking, setThinking] = useState(settings.thinking)
  const [showTechniques, setShowTechniques] = useState(settings.showTechniques)
  const [models, setModels] = useState<ModelOption[]>([])
  const [languages, setLanguages] = useState<Record<Language, boolean> | null>(null)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Opening the sheet starts from the saved settings (state adjusted during render).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setBaseUrl(settings.baseUrl)
      setModel(settings.model)
      setApiKey('')
      setAutoDelayS(settings.autoDelayS)
      setThinking(settings.thinking)
      setShowTechniques(settings.showTechniques)
    }
  }
  useEffect(() => {
    if (!open) return
    void api.models().then((r) => { setModels(r.models); setModelsError(r.error) })
    void api.languages().then(setLanguages).catch(() => {})
  }, [open])

  const save = async (): Promise<void> => {
    setBusy(true)
    try {
      const patch: Partial<Settings> = { baseUrl, model, autoDelayS, thinking, showTechniques }
      if (apiKey) patch.apiKey = apiKey
      await onSave(patch)
      const r = await api.models()
      setModels(r.models)
      setModelsError(r.error)
      if (r.error) toast.warning(`Saved, but: ${r.error}`)
      else toast.success(`Connected: ${r.models.length} model${r.models.length === 1 ? '' : 's'} listed`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className="sheet" aria-describedby={undefined}>
          <div className="sheet-handle" />
          <Drawer.Title className="sheet-title">Settings</Drawer.Title>
          <div className="sheet-body">
            <label className="field">
              <span>Model server (OpenAI-compatible)</span>
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://127.0.0.1:8000/v1" autoCapitalize="off" autoCorrect="off" />
              <small>oMLX is :8000; LM Studio is :1234 and needs a token.</small>
            </label>
            <label className="field">
              <span>Model</span>
              <input value={model} onChange={(e) => setModel(e.target.value)} list="models" autoCapitalize="off" autoCorrect="off" />
              <datalist id="models">{models.map((m) => <option key={m.id} value={m.id} />)}</datalist>
              <small>{modelsError ? modelsError : models.length ? `${models.length} available: ${models.slice(0, 4).map((m) => m.id).join(', ')}${models.length > 4 ? '…' : ''}` : ''}</small>
            </label>
            <label className="field">
              <span>API token {settings.hasApiKey && <em>(set)</em>}</span>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={settings.hasApiKey ? 'leave blank to keep' : 'none needed for oMLX'} type="password" />
            </label>
            <label className="field">
              <span>Auto review after {autoDelayS} s of quiet</span>
              <input type="range" min={3} max={30} value={autoDelayS} onChange={(e) => setAutoDelayS(Number(e.target.value))} />
            </label>
            <label className="field row">
              <input type="checkbox" checked={thinking} onChange={(e) => setThinking(e.target.checked)} />
              <span>Let the model think first (slower, sometimes sharper)</span>
            </label>
            <div className="field">
              <span>Languages on this machine</span>
              <small className="field-hint">
                {languages
                  ? LANGUAGES.map((l) => `${l.label}: ${languages[l.id] ? 'ready' : l.id === 'ruby' ? 'not installed (brew install ruby)' : 'not installed (brew install openjdk)'}`).join(' · ')
                  : 'Checking…'}
                {' '}The toggle next to the title picks the language; code in a missing one can be written and reviewed but not run.
              </small>
            </div>
            <label className="field row">
              <input type="checkbox" checked={showTechniques} onChange={(e) => setShowTechniques(e.target.checked)} />
              <span>
                Show the techniques each problem uses
                <small className="field-hint">Turn off to practise like a real interview, where nobody names the pattern for you.</small>
              </span>
            </label>
          </div>
          <div className="sheet-actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save & test'}</button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
