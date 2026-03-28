import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { WorkEntry } from '../types'
import { calcWorkedMinutes, calcNightMinutes } from '../utils/time'

export function useWorkEntry(date: string) {
  const entry = useLiveQuery(() => db.workEntries.where('date').equals(date).first(), [date])

  async function saveEntry(data: Omit<WorkEntry, 'id' | 'workedMinutes' | 'nightMinutes'>) {
    const workedMinutes = calcWorkedMinutes(data.startTime, data.endTime, data.breakMinutes)
    const nightMinutes =
      data.nightStartTime && data.nightEndTime
        ? calcNightMinutes(data.nightStartTime, data.nightEndTime)
        : undefined

    const existing = await db.workEntries.where('date').equals(data.date).first()
    if (existing) {
      await db.workEntries.update(existing.id!, { ...data, workedMinutes, nightMinutes })
    } else {
      await db.workEntries.add({ ...data, workedMinutes, nightMinutes })
    }
  }

  async function deleteEntry(date: string) {
    const existing = await db.workEntries.where('date').equals(date).first()
    if (existing) {
      await db.workEntries.delete(existing.id!)
    }
  }

  return { entry: entry ?? null, isLoading: entry === undefined, saveEntry, deleteEntry }
}

export function useWorkEntries(startDate: string, endDate: string) {
  const entries = useLiveQuery(
    () => db.workEntries.where('date').between(startDate, endDate, true, true).toArray(),
    [startDate, endDate],
  )
  return {
    entries: entries ?? [],
    entriesMap: new Map((entries ?? []).map(e => [e.date, e])),
  }
}
