import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import type { WorkEntry } from '../types'
import { calcWorkedMinutes, calcNightMinutes } from '../utils/time'

export function useWorkEntry(date: string) {
  const [entry, setEntry] = useState<WorkEntry | null | undefined>(undefined)

  const reload = useCallback(async () => {
    const found = await db.workEntries.findByDate(date)
    setEntry(found ?? null)
  }, [date])

  useEffect(() => { reload() }, [reload])

  async function saveEntry(data: Omit<WorkEntry, 'id' | 'workedMinutes' | 'nightMinutes'>) {
    const workedMinutes = calcWorkedMinutes(data.startTime, data.endTime, data.breakMinutes)
    const nightMinutes =
      data.nightStartTime && data.nightEndTime
        ? calcNightMinutes(data.nightStartTime, data.nightEndTime)
        : undefined
    await db.workEntries.save({ ...data, workedMinutes, nightMinutes })
    await reload()
  }

  async function deleteEntry(date: string) {
    await db.workEntries.deleteByDate(date)
    await reload()
  }

  return { entry: entry ?? null, isLoading: entry === undefined, saveEntry, deleteEntry }
}

export function useWorkEntries(startDate: string, endDate: string) {
  const [entries, setEntries] = useState<WorkEntry[]>([])

  const reload = useCallback(async () => {
    const data = await db.workEntries.getByDateRange(startDate, endDate)
    setEntries(data)
  }, [startDate, endDate])

  useEffect(() => { reload() }, [reload])

  return {
    entries,
    entriesMap: new Map(entries.map(e => [e.date, e])),
    reload,
  }
}
