import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import type { Settings } from '../types'

const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  userName: '',
  companyName: '',
  standardHours: 8,
  reducedDay: null,
  reducedHours: null,
  workDays: [1, 2, 3, 4, 5],
  setupComplete: false,
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const found = await db.settings.get('main')
      setSettings(found ?? null)
    } catch {
      // Fallback: check old localStorage key from Setup
      try {
        const stored = localStorage.getItem('segnaore_settings')
        if (stored) {
          const parsed = JSON.parse(stored) as Settings
          setSettings(parsed)
          // Migrate to new storage
          try { await db.settings.put(parsed) } catch { /* ignore */ }
        } else {
          setSettings(null)
        }
      } catch {
        setSettings(null)
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  async function saveSettings(updates: Partial<Settings>) {
    const current = (await db.settings.get('main').catch(() => undefined)) ?? DEFAULT_SETTINGS
    const updated = { ...current, ...updates, id: 'main' } as Settings
    await db.settings.put(updated)
    setSettings(updated)
  }

  return { settings: settings ?? DEFAULT_SETTINGS, isLoading, saveSettings, reload }
}
