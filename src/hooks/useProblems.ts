import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.ts'
import { BUILTIN_PROBLEMS } from '../data/index.ts'
import type { Problem } from '../types.ts'

/** Built-in problems from the bundle plus generated variants from the server, as one list. */
export default function useProblems() {
  const [generated, setGenerated] = useState<Problem[]>([])
  const refresh = useCallback((): Promise<void> => api.generated().then(setGenerated).catch(() => {}), [])
  useEffect(() => { void refresh() }, [refresh])

  const all = useMemo(() => [...BUILTIN_PROBLEMS, ...generated], [generated])
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all])

  const add = useCallback((p: Problem): void => setGenerated((g) => [...g, p]), [])
  /** A generated problem changed on the server (a port was added): swap it in place. */
  const upsert = useCallback((p: Problem): void => setGenerated((g) => (g.some((q) => q.id === p.id) ? g.map((q) => (q.id === p.id ? p : q)) : [...g, p])), [])
  const remove = useCallback(async (id: string): Promise<void> => {
    await api.deleteProblem(id)
    setGenerated((g) => g.filter((p) => p.id !== id))
  }, [])

  return { all, byId, generated, add, upsert, remove, refresh }
}
