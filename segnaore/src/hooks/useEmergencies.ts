import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Emergency } from '../types'
import { calcNightMinutes } from '../utils/time'

export function useOnCallWeek(weekStart: string) {
  const week = useLiveQuery(
    () => db.onCallWeeks.where('weekStart').equals(weekStart).first(),
    [weekStart],
  )

  async function toggleOnCall(weekStart: string, active: boolean) {
    const existing = await db.onCallWeeks.where('weekStart').equals(weekStart).first()
    if (existing) {
      await db.onCallWeeks.update(existing.id!, { active })
    } else {
      await db.onCallWeeks.add({ weekStart, active })
    }
  }

  return { week: week ?? null, toggleOnCall }
}

export function useEmergencies(weekId: number | undefined) {
  const emergencies = useLiveQuery(
    () => (weekId ? db.emergencies.where('weekId').equals(weekId).toArray() : []),
    [weekId],
  )

  async function addEmergency(data: Omit<Emergency, 'id' | 'durationMinutes'>) {
    const durationMinutes =
      data.startTime && data.endTime ? calcNightMinutes(data.startTime, data.endTime) : undefined
    await db.emergencies.add({ ...data, durationMinutes })
  }

  async function deleteEmergency(id: number) {
    await db.emergencies.delete(id)
  }

  return { emergencies: emergencies ?? [], addEmergency, deleteEmergency }
}

export function useEmergencyCount(startDate: string, endDate: string) {
  const count = useLiveQuery(
    () => db.emergencies.where('date').between(startDate, endDate, true, true).count(),
    [startDate, endDate],
  )
  return count ?? 0
}
