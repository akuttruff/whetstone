import { useCallback, useEffect, useMemo, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import ProblemList from './components/ProblemList.tsx'
import ProblemScreen from './components/ProblemScreen.tsx'
import PrimerScreen from './components/PrimerScreen.tsx'
import ProgressCard from './components/ProgressCard.tsx'
import LanguageToggle from './components/LanguageToggle.tsx'
import SettingsSheet from './components/SettingsSheet.tsx'
import TrackTabs from './components/TrackTabs.tsx'
import useMediaQuery from './hooks/useMediaQuery.ts'
import useProblems from './hooks/useProblems.ts'
import useProgress from './hooks/useProgress.ts'
import useSettings from './hooks/useSettings.ts'
import { primerFor } from './data/primers.ts'
import { api } from './lib/api.ts'
import { LANGUAGE_LABEL, TRACKS } from './types.ts'
import type { Language, Problem, Track } from './types.ts'
import './App.css'

const TRACK_KEY = 'whetstone:track'
const SELECTED_KEY = 'whetstone:selected'

function remembered<T extends string>(key: string, ok: (v: string) => boolean): T | null {
  try {
    const v = localStorage.getItem(key)
    return v && ok(v) ? (v as T) : null
  } catch {
    return null
  }
}
function remember(key: string, v: string | null): void {
  try {
    if (v === null) localStorage.removeItem(key)
    else localStorage.setItem(key, v)
  } catch { /* private mode */ }
}

export default function App() {
  const wide = useMediaQuery('(min-width: 900px)')
  const { settings, save } = useSettings()
  const problems = useProblems()
  const { progress, refresh: refreshProgress } = useProgress()
  const [track, setTrack] = useState<Track>(() => remembered<Track>(TRACK_KEY, (v) => TRACKS.some((t) => t.id === v)) ?? 'coding')
  const [selectedId, setSelectedId] = useState<string | null>(() => remembered(SELECTED_KEY, () => true))
  const [settingsOpen, setSettingsOpen] = useState(false)
  /** A topic whose primer is open instead of a problem, in the track it belongs to. */
  const [primerOpen, setPrimerOpen] = useState<{ track: Track; topic: string } | null>(null)
  /** Which languages the server machine can actually run; a missing toolchain is a warning, not a block. */
  const [available, setAvailable] = useState<Record<Language, boolean> | null>(null)
  useEffect(() => {
    void api.languages().then(setAvailable).catch(() => {})
  }, [])
  const language = settings.language

  const selected = selectedId ? problems.byId.get(selectedId) ?? null : null
  const inTrack = useMemo(() => problems.all.filter((p) => p.track === track), [problems.all, track])
  const counts = useMemo(() => {
    const c = Object.fromEntries(TRACKS.map((t) => [t.id, 0])) as Record<Track, number>
    for (const p of problems.all) c[p.track]++
    return c
  }, [problems.all])

  useEffect(() => remember(TRACK_KEY, track), [track])
  useEffect(() => remember(SELECTED_KEY, selectedId), [selectedId])

  const select = (id: string | null): void => {
    setPrimerOpen(null)
    setSelectedId(id)
    if (id) {
      const p = problems.byId.get(id)
      if (p && p.track !== track) setTrack(p.track)
    }
  }

  const onVariant = (p: Problem): void => {
    problems.add(p)
    setSelectedId(p.id)
  }

  /** The list names the tab's track; a problem names its own, which may differ from the tab on a wide screen. */
  const openPrimer = (track: Track, topic: string): void => {
    setTrack(track)
    setPrimerOpen({ track, topic })
  }
  const primer = primerOpen ? primerFor(primerOpen.track, primerOpen.topic) ?? null : null
  const primerProblems = primer ? problems.all.filter((p) => p.track === primer.track && p.topic === primer.topic) : []

  const onDelete = async (p: Problem): Promise<void> => {
    if (!window.confirm(`Delete "${p.title}"?`)) return
    await problems.remove(p.id)
    if (selectedId === p.id) setSelectedId(p.parentId ?? null)
    toast.success('Deleted')
  }

  const onAutoChange = (auto: boolean): void => {
    void save({ autoFeedback: auto }).catch((err: Error) => toast.error(err.message))
  }
  const onLanguage = (l: Language): void => {
    if (l === language) return
    void save({ language: l }).catch((err: Error) => toast.error(err.message))
    if (available && !available[l]) toast.warning(`${LANGUAGE_LABEL[l]} is not installed on the machine running Whetstone, so code can be written but not run. See Settings for what to install.`, { duration: 8000 })
  }
  const onPorted = (p: Problem): void => { problems.upsert(p) }
  const onReviewed = useCallback((): void => { void refreshProgress() }, [refreshProgress])

  const list = (
    <div className="list-screen">
      <header className="top">
        <h1 className="brand">Whetstone</h1>
        <LanguageToggle value={language} onChange={onLanguage} />
        <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
          <SettingsIcon size={20} />
        </button>
      </header>
      <TrackTabs value={track} counts={counts} onChange={(t) => { setTrack(t); setPrimerOpen(null); if (!wide) setSelectedId(null) }} />
      <div className="scroll">
        <p className="blurb">{TRACKS.find((t) => t.id === track)?.blurb}</p>
        <ProgressCard progress={progress} track={track} />
        <ProblemList problems={inTrack} selectedId={primerOpen ? null : selectedId} progress={progress} onSelect={select} onDelete={(p) => void onDelete(p)} onPrimer={(topic) => openPrimer(track, topic)} primerTopic={primerOpen?.topic ?? null} language={language} />
      </div>
    </div>
  )

  const detail = primer ? (
    <PrimerScreen
      key={primer.topic}
      primer={primer}
      count={primerProblems.length}
      wide={wide}
      language={language}
      onBack={() => setPrimerOpen(null)}
      onStart={() => {
        const first = primerProblems[0]
        setPrimerOpen(null)
        if (first) setSelectedId(first.id)
      }}
    />
  ) : selected ? (
    <ProblemScreen
      key={selected.id}
      problem={selected}
      settings={settings}
      wide={wide}
      onBack={() => setSelectedId(null)}
      onAutoChange={onAutoChange}
      onVariant={onVariant}
      onPorted={onPorted}
      onReviewed={onReviewed}
      onPrimer={(topic) => openPrimer(selected.track, topic)}
    />
  ) : (
    <div className="empty-detail">
      <p>Pick a problem.</p>
    </div>
  )

  return (
    <div className={`app${wide ? ' wide' : ''}`}>
      {wide ? (
        <>
          <aside className="side">{list}</aside>
          <main className="main">{detail}</main>
        </>
      ) : selected || primer ? (
        <main className="main">{detail}</main>
      ) : (
        list
      )}
      <SettingsSheet open={settingsOpen} settings={settings} onClose={() => setSettingsOpen(false)} onSave={save} />
      <Toaster position="top-center" theme="dark" richColors closeButton duration={5000} />
    </div>
  )
}
