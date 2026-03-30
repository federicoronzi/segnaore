import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import type { Emergency } from '../types'
import { calcNightMinutes } from '../utils/time'

export function useOnCallWeek(weekStart: string) {
  const [week, setWeek] = useState<{ id?: number; weekStart: string; active: boolean } | null>(null)

  const reload = useCallback(async () => {
    const found = await db.onCallWeeks.findByWeekStart(weekStart)
    setWeek(found ?? null)
  }, [weekStart])

  useEffect(() => { reload() }, [reload])

  async function toggleOnCall(weekStart: string, active: boolean) {
    await db.onCallWeeks.save(weekStart, active)
    await reload()
  }

  return { week, toggleOnCall }
}

export function useEmergencies(weekId: number | undefined) {
  const [emergencies, setEmergencies] = useState<Emergency[]>([])

  const reload = useCallback(async () => {
    if (weekId) {
      setEmergencies(await db.emergencies.getByWeekId(weekId))
    } else {
      setEmergencies([])
    }
  }, [weekId])

  useEffect(() => { reload() }, [reload])

  async function addEmergency(data: Omit<Emergency, 'id' | 'durationMinutes'>) {
    const durationMinutes =
      data.startTime && data.endTime ? calcNightMinutes(data.startTime, data.endTime) : undefined
    await db.emergencies.add({ ...data, durationMinutes })
    await reload()
  }

  async function deleteEmergency(id: number) {
    await db.emergencies.delete(id)
    await reload()
  }

  return { emergencies, addEmergency, deleteEmergency }
}

export function useEmergencyCount(startDate: string, endDate: string) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    db.emergencies.countByDateRange(startDate, endDate).then(setCount)
  }, [startDate, endDate])

  return count
}
