import { useCallback, useEffect, useMemo, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import ProblemList from './components/ProblemList.tsx'
import ProblemScreen from './components/ProblemScreen.tsx'
import PrimerScreen from './components/PrimerScreen.tsx'
import ProgressCard from './components/ProgressCard.tsx'
import SettingsSheet from './components/SettingsSheet.tsx'
import TrackTabs from './components/TrackTabs.tsx'
import useMediaQuery from './hooks/useMediaQuery.ts'
import useProblems from './hooks/useProblems.ts'
import useProgress from './hooks/useProgress.ts'
import useSettings from './hooks/useSettings.ts'
import { primerFor } from './data/primers.ts'
import { TRACKS } from './types.ts'
import type { Problem, Track } from './types.ts'
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
  /** A topic whose primer is open instead of a problem. */
  const [primerTopic, setPrimerTopic] = useState<string | null>(null)

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
    setPrimerTopic(null)
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

  const openPrimer = (topic: string): void => {
    const p = problems.all.find((q) => q.topic === topic && q.track === (selected?.track ?? track))
    if (p) setTrack(p.track)
    setPrimerTopic(topic)
  }
  const primer = primerTopic ? primerFor(selected?.track ?? track, primerTopic) ?? null : null
  const primerCount = primer ? inTrack.filter((p) => p.topic === primer.topic).length : 0

  const onDelete = async (p: Problem): Promise<void> => {
    if (!window.confirm(`Delete "${p.title}"?`)) return
    await problems.remove(p.id)
    if (selectedId === p.id) setSelectedId(p.parentId ?? null)
    toast.success('Deleted')
  }

  const onAutoChange = (auto: boolean): void => {
    void save({ autoFeedback: auto }).catch((err: Error) => toast.error(err.message))
  }
  const onReviewed = useCallback((): void => { void refreshProgress() }, [refreshProgress])

  const list = (
    <div className="list-screen">
      <header className="top">
        <h1 className="brand">Whetstone</h1>
        <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
          <SettingsIcon size={20} />
        </button>
      </header>
      <TrackTabs value={track} counts={counts} onChange={(t) => { setTrack(t); setPrimerTopic(null); if (!wide) setSelectedId(null) }} />
      <div className="scroll">
        <p className="blurb">{TRACKS.find((t) => t.id === track)?.blurb}</p>
        <ProgressCard progress={progress} track={track} />
        <ProblemList problems={inTrack} selectedId={primerTopic ? null : selectedId} progress={progress} onSelect={select} onDelete={(p) => void onDelete(p)} onPrimer={openPrimer} primerTopic={primerTopic} />
      </div>
    </div>
  )

  const detail = primer ? (
    <PrimerScreen
      key={primer.topic}
      primer={primer}
      count={primerCount}
      wide={wide}
      onBack={() => setPrimerTopic(null)}
      onStart={() => {
        const first = inTrack.find((p) => p.topic === primer.topic)
        setPrimerTopic(null)
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
      onReviewed={onReviewed}
      onPrimer={openPrimer}
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
