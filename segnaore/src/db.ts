import Dexie, { type Table } from 'dexie'
import type { Settings, WorkEntry, OnCallWeek, Emergency, Absence } from './types'

class SegnaOreDB extends Dexie {
  settings!: Table<Settings, string>
  workEntries!: Table<WorkEntry, number>
  onCallWeeks!: Table<OnCallWeek, number>
  emergencies!: Table<Emergency, number>
  absences!: Table<Absence, number>

  constructor() {
    super('segnaore')
    this.version(1).stores({
      settings: 'id',
      workEntries: '++id, &date',
      onCallWeeks: '++id, &weekStart',
      emergencies: '++id, weekId, date',
      absences: '++id, date, type',
    })
  }
}

export const db = new SegnaOreDB()
