import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.ts'
import { BUILTIN_PROBLEMS, withPorts } from '../data/index.ts'
import type { PortTables } from '../data/index.ts'
import { loadPorts } from '../data/ports.ts'
import type { Language, Problem } from '../types.ts'

/**
 * Built-in problems from the bundle plus generated variants from the server,
 * as one list, with the Ruby or Java ports attached once that language is
 * selected (they are fetched as their own chunk on first use).
 */
export default function useProblems(language: Language) {
  const [generated, setGenerated] = useState<Problem[]>([])
  const [ports, setPorts] = useState<PortTables>({})
  const refresh = useCallback((): Promise<void> => api.generated().then(setGenerated).catch(() => {}), [])
  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (language === 'typescript' || ports[language]) return
    let cancelled = false
    void loadPorts(language).then((table) => { if (!cancelled) setPorts((p) => ({ ...p, [language]: table })) })
    return () => { cancelled = true }
  }, [language, ports])

  const all = useMemo(() => withPorts([...BUILTIN_PROBLEMS, ...generated], ports), [generated, ports])
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all])
  /** False while the selected language's ports are still arriving. */
  const ready = language === 'typescript' || Boolean(ports[language])

  const add = useCallback((p: Problem): void => setGenerated((g) => [...g, p]), [])
  /** A generated problem changed on the server (a port was added): swap it in place. */
  const upsert = useCallback((p: Problem): void => setGenerated((g) => (g.some((q) => q.id === p.id) ? g.map((q) => (q.id === p.id ? p : q)) : [...g, p])), [])
  const remove = useCallback(async (id: string): Promise<void> => {
    await api.deleteProblem(id)
    setGenerated((g) => g.filter((p) => p.id !== id))
  }, [])

  return { all, byId, generated, ready, add, upsert, remove, refresh }
}
