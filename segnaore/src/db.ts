import Dexie, { type Table } from 'dexie'
import type { Settings, WorkEntry, OnCallWeek, Emergency, Absence } from './types'

// === Dexie (IndexedDB) database ===
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

const dexieDb = new SegnaOreDB()

// === IndexedDB availability detection ===
let _canUseIDB: boolean | null = null

async function canUseIndexedDB(): Promise<boolean> {
  if (_canUseIDB !== null) return _canUseIDB
  try {
    await dexieDb.open()
    _canUseIDB = true
  } catch {
    _canUseIDB = false
  }
  return _canUseIDB
}

// === localStorage helpers ===
function lsRead<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(`so_${key}`) || '[]') }
  catch { return [] }
}

function lsWrite<T>(key: string, items: T[]) {
  localStorage.setItem(`so_${key}`, JSON.stringify(items))
}

function lsNextId(key: string): number {
  const n = parseInt(localStorage.getItem(`so_${key}_seq`) || '0') + 1
  localStorage.setItem(`so_${key}_seq`, String(n))
  return n
}

// === Unified storage API ===
// Each method tries IndexedDB first, falls back to localStorage

export const db = {
  async open() {
    await canUseIndexedDB()
  },

  async importAll(data: Record<string, unknown[]>) {
    if (await canUseIndexedDB()) {
      await dexieDb.transaction('rw', [dexieDb.settings, dexieDb.workEntries, dexieDb.onCallWeeks, dexieDb.emergencies, dexieDb.absences], async () => {
        await dexieDb.settings.clear()
        await dexieDb.workEntries.clear()
        await dexieDb.onCallWeeks.clear()
        await dexieDb.emergencies.clear()
        await dexieDb.absences.clear()
        if (data.settings) await dexieDb.settings.bulkAdd(data.settings as Settings[])
        if (data.workEntries) await dexieDb.workEntries.bulkAdd(data.workEntries as WorkEntry[])
        if (data.onCallWeeks) await dexieDb.onCallWeeks.bulkAdd(data.onCallWeeks as OnCallWeek[])
        if (data.emergencies) await dexieDb.emergencies.bulkAdd(data.emergencies as Emergency[])
        if (data.absences) await dexieDb.absences.bulkAdd(data.absences as Absence[])
      })
    } else {
      // localStorage fallback
      const keys = ['settings', 'workEntries', 'onCallWeeks', 'emergencies', 'absences'] as const
      for (const key of keys) {
        if (data[key]) lsWrite(key, data[key] as unknown[])
        else lsWrite(key, [])
      }
    }
  },

  settings: {
    async get(id: string): Promise<Settings | undefined> {
      if (await canUseIndexedDB()) return dexieDb.settings.get(id)
      return lsRead<Settings>('settings').find(s => s.id === id)
    },
    async put(item: Settings) {
      if (await canUseIndexedDB()) { await dexieDb.settings.put(item); return }
      const items = lsRead<Settings>('settings')
      const idx = items.findIndex(s => s.id === item.id)
      if (idx >= 0) items[idx] = item; else items.push(item)
      lsWrite('settings', items)
    },
    async toArray(): Promise<Settings[]> {
      if (await canUseIndexedDB()) return dexieDb.settings.toArray()
      return lsRead<Settings>('settings')
    },
  },

  workEntries: {
    async findByDate(date: string): Promise<WorkEntry | undefined> {
      if (await canUseIndexedDB()) return dexieDb.workEntries.where('date').equals(date).first()
      return lsRead<WorkEntry>('workEntries').find(e => e.date === date)
    },
    async getByDateRange(start: string, end: string): Promise<WorkEntry[]> {
      if (await canUseIndexedDB()) return dexieDb.workEntries.where('date').between(start, end, true, true).toArray()
      return lsRead<WorkEntry>('workEntries').filter(e => e.date >= start && e.date <= end)
    },
    async toArray(): Promise<WorkEntry[]> {
      if (await canUseIndexedDB()) return dexieDb.workEntries.toArray()
      return lsRead<WorkEntry>('workEntries')
    },
    async save(data: Omit<WorkEntry, 'id'> & { id?: number }) {
      if (await canUseIndexedDB()) {
        const existing = await dexieDb.workEntries.where('date').equals(data.date).first()
        if (existing) await dexieDb.workEntries.update(existing.id!, data)
        else await dexieDb.workEntries.add(data as WorkEntry)
        return
      }
      const items = lsRead<WorkEntry>('workEntries')
      const idx = items.findIndex(e => e.date === data.date)
      if (idx >= 0) { items[idx] = { ...items[idx], ...data }; }
      else { items.push({ ...data, id: lsNextId('workEntries') } as WorkEntry) }
      lsWrite('workEntries', items)
    },
    async deleteByDate(date: string) {
      if (await canUseIndexedDB()) {
        const existing = await dexieDb.workEntries.where('date').equals(date).first()
        if (existing) await dexieDb.workEntries.delete(existing.id!)
        return
      }
      lsWrite('workEntries', lsRead<WorkEntry>('workEntries').filter(e => e.date !== date))
    },
    async delete(id: number) {
      if (await canUseIndexedDB()) { await dexieDb.workEntries.delete(id); return }
      lsWrite('workEntries', lsRead<WorkEntry>('workEntries').filter(e => e.id !== id))
    },
  },

  onCallWeeks: {
    async findByWeekStart(weekStart: string): Promise<OnCallWeek | undefined> {
      if (await canUseIndexedDB()) return dexieDb.onCallWeeks.where('weekStart').equals(weekStart).first()
      return lsRead<OnCallWeek>('onCallWeeks').find(w => w.weekStart === weekStart)
    },
    async toArray(): Promise<OnCallWeek[]> {
      if (await canUseIndexedDB()) return dexieDb.onCallWeeks.toArray()
      return lsRead<OnCallWeek>('onCallWeeks')
    },
    async save(weekStart: string, active: boolean) {
      if (await canUseIndexedDB()) {
        const existing = await dexieDb.onCallWeeks.where('weekStart').equals(weekStart).first()
        if (existing) await dexieDb.onCallWeeks.update(existing.id!, { active })
        else await dexieDb.onCallWeeks.add({ weekStart, active })
        return
      }
      const items = lsRead<OnCallWeek>('onCallWeeks')
      const idx = items.findIndex(w => w.weekStart === weekStart)
      if (idx >= 0) items[idx].active = active
      else items.push({ id: lsNextId('onCallWeeks'), weekStart, active })
      lsWrite('onCallWeeks', items)
    },
    async delete(id: number) {
      if (await canUseIndexedDB()) { await dexieDb.onCallWeeks.delete(id); return }
      lsWrite('onCallWeeks', lsRead<OnCallWeek>('onCallWeeks').filter(w => w.id !== id))
    },
  },

  emergencies: {
    async getByWeekId(weekId: number): Promise<Emergency[]> {
      if (await canUseIndexedDB()) return dexieDb.emergencies.where('weekId').equals(weekId).toArray()
      return lsRead<Emergency>('emergencies').filter(e => e.weekId === weekId)
    },
    async countByDateRange(start: string, end: string): Promise<number> {
      if (await canUseIndexedDB()) return dexieDb.emergencies.where('date').between(start, end, true, true).count()
      return lsRead<Emergency>('emergencies').filter(e => e.date >= start && e.date <= end).length
    },
    async toArray(): Promise<Emergency[]> {
      if (await canUseIndexedDB()) return dexieDb.emergencies.toArray()
      return lsRead<Emergency>('emergencies')
    },
    async add(data: Omit<Emergency, 'id'>) {
      if (await canUseIndexedDB()) { await dexieDb.emergencies.add(data as Emergency); return }
      const items = lsRead<Emergency>('emergencies')
      items.push({ ...data, id: lsNextId('emergencies') } as Emergency)
      lsWrite('emergencies', items)
    },
    async delete(id: number) {
      if (await canUseIndexedDB()) { await dexieDb.emergencies.delete(id); return }
      lsWrite('emergencies', lsRead<Emergency>('emergencies').filter(e => e.id !== id))
    },
    async bulkDelete(ids: number[]) {
      if (await canUseIndexedDB()) { await dexieDb.emergencies.bulkDelete(ids); return }
      lsWrite('emergencies', lsRead<Emergency>('emergencies').filter(e => !ids.includes(e.id!)))
    },
  },

  absences: {
    async getByDateRange(start: string, end: string): Promise<Absence[]> {
      if (await canUseIndexedDB()) return dexieDb.absences.where('date').between(start, end, true, true).toArray()
      return lsRead<Absence>('absences').filter(a => a.date >= start && a.date <= end)
    },
    async toArray(): Promise<Absence[]> {
      if (await canUseIndexedDB()) return dexieDb.absences.toArray()
      return lsRead<Absence>('absences')
    },
    async add(data: Omit<Absence, 'id'>) {
      if (await canUseIndexedDB()) { await dexieDb.absences.add(data as Absence); return }
      const items = lsRead<Absence>('absences')
      items.push({ ...data, id: lsNextId('absences') } as Absence)
      lsWrite('absences', items)
    },
    async delete(id: number) {
      if (await canUseIndexedDB()) { await dexieDb.absences.delete(id); return }
      lsWrite('absences', lsRead<Absence>('absences').filter(a => a.id !== id))
    },
  },
}
