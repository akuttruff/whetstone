import { useCallback, useEffect, useMemo, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import ProblemList from './components/ProblemList.tsx'
import ProblemScreen from './components/ProblemScreen.tsx'
import ProgressCard from './components/ProgressCard.tsx'
import SettingsSheet from './components/SettingsSheet.tsx'
import TrackTabs from './components/TrackTabs.tsx'
import useMediaQuery from './hooks/useMediaQuery.ts'
import useProblems from './hooks/useProblems.ts'
import useProgress from './hooks/useProgress.ts'
import useSettings from './hooks/useSettings.ts'
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
      <TrackTabs value={track} counts={counts} onChange={(t) => { setTrack(t); if (!wide) setSelectedId(null) }} />
      <div className="scroll">
        <p className="blurb">{TRACKS.find((t) => t.id === track)?.blurb}</p>
        <ProgressCard progress={progress} track={track} />
        <ProblemList problems={inTrack} selectedId={selectedId} progress={progress} onSelect={select} onDelete={(p) => void onDelete(p)} />
      </div>
    </div>
  )

  const detail = selected ? (
    <ProblemScreen
      key={selected.id}
      problem={selected}
      settings={settings}
      wide={wide}
      onBack={() => setSelectedId(null)}
      onAutoChange={onAutoChange}
      onVariant={onVariant}
      onReviewed={onReviewed}
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
      ) : selected ? (
        <main className="main">{detail}</main>
      ) : (
        list
      )}
      <SettingsSheet open={settingsOpen} settings={settings} onClose={() => setSettingsOpen(false)} onSave={save} />
      <Toaster position="top-center" theme="dark" richColors closeButton duration={5000} />
    </div>
  )
}
