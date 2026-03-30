import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import type { Absence } from '../types'

export function useAbsences(startDate?: string, endDate?: string) {
  const [absences, setAbsences] = useState<Absence[]>([])

  const reload = useCallback(async () => {
    if (startDate && endDate) {
      setAbsences(await db.absences.getByDateRange(startDate, endDate))
    } else {
      setAbsences(await db.absences.toArray())
    }
  }, [startDate, endDate])

  useEffect(() => { reload() }, [reload])

  async function addAbsence(data: Omit<Absence, 'id'>) {
    await db.absences.add(data)
    await reload()
  }

  async function deleteAbsence(id: number) {
    await db.absences.delete(id)
    await reload()
  }

  return { absences, addAbsence, deleteAbsence }
}
