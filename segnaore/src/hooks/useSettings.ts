import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import type { Settings } from '../types'

const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  userName: '',
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
      setSettings(found ?? null)
    } catch {
      setSettings(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function saveSettings(updates: Partial<Settings>) {
    const current = (await db.settings.get('main')) ?? DEFAULT_SETTINGS
    const updated = { ...current, ...updates, id: 'main' }
    await db.settings.put(updated)
    setSettings(updated)
  }

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
    saveSettings,
  }
}
