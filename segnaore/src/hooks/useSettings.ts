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
      await db.open()
      const found = await db.settings.get('main')
      if (found) {
        setSettings(found)
        setIsLoading(false)
        return
      }
    } catch {
      // IndexedDB failed
    }
    // Fallback: check localStorage
    try {
      const stored = localStorage.getItem('segnaore_settings')
      if (stored) {
        const parsed = JSON.parse(stored) as Settings
        setSettings(parsed)
        // Try to migrate to IndexedDB
        try {
          await db.open()
          await db.settings.put(parsed)
        } catch { /* ignore */ }
      } else {
        setSettings(null)
      }
    } catch {
      setSettings(null)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function saveSettings(updates: Partial<Settings>) {
    const current = (await db.settings.get('main').catch(() => null)) ?? DEFAULT_SETTINGS
    const updated = { ...current, ...updates, id: 'main' } as Settings
    try {
      await db.settings.put(updated)
    } catch {
      localStorage.setItem('segnaore_settings', JSON.stringify(updated))
    }
    setSettings(updated)
  }

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
    saveSettings,
  }
}
