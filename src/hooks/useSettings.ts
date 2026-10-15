import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.ts'
import { DEFAULT_SETTINGS } from '../types.ts'
import type { PublicSettings, Settings } from '../types.ts'

const FALLBACK: PublicSettings = { ...DEFAULT_SETTINGS, hasApiKey: false }

export default function useSettings() {
  const [settings, setSettings] = useState<PublicSettings>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    void api.settings().then(setSettings).catch(() => {}).finally(() => setLoaded(true))
  }, [])
  const save = useCallback(async (patch: Partial<Settings>): Promise<PublicSettings> => {
    const next = await api.saveSettings(patch)
    setSettings(next)
    return next
  }, [])
  return { settings, loaded, save }
}
