import { useLiveQuery } from 'dexie-react-hooks'
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
  const result = useLiveQuery(async () => {
    const found = await db.settings.get('main')
    return found ?? null
  })

  async function saveSettings(updates: Partial<Settings>) {
    const current = (await db.settings.get('main')) ?? DEFAULT_SETTINGS
    await db.settings.put({ ...current, ...updates, id: 'main' })
  }

  return {
    settings: result ?? DEFAULT_SETTINGS,
    isLoading: result === undefined,
    saveSettings,
  }
}
