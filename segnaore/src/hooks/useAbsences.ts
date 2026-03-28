import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Absence } from '../types'

export function useAbsences(startDate?: string, endDate?: string) {
  const absences = useLiveQuery(() => {
    if (startDate && endDate) {
      return db.absences.where('date').between(startDate, endDate, true, true).toArray()
    }
    return db.absences.toArray()
  }, [startDate, endDate])

  async function addAbsence(data: Omit<Absence, 'id'>) {
    await db.absences.add(data)
  }

  async function deleteAbsence(id: number) {
    await db.absences.delete(id)
  }

  return { absences: absences ?? [], addAbsence, deleteAbsence }
}
