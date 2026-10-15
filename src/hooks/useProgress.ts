import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.ts'
import type { Progress } from '../types.ts'

const EMPTY: Progress = { patterns: [], latest: {} }

export default function useProgress() {
  const [progress, setProgress] = useState<Progress>(EMPTY)
  const refresh = useCallback((): Promise<void> => api.progress().then(setProgress).catch(() => {}), [])
  useEffect(() => { void refresh() }, [refresh])
  return { progress, refresh }
}
