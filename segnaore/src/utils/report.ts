import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, format, getDay,
} from 'date-fns'
import { it } from 'date-fns/locale'
import type { Settings, WorkEntry, Absence } from '../types'

export type PeriodType = 'week' | 'month' | 'year' | 'custom'

export function getPeriodRange(type: PeriodType, referenceDate: Date): { start: Date; end: Date } {
  switch (type) {
    case 'week':
      return {
        start: startOfWeek(referenceDate, { weekStartsOn: 1 }),
        end: endOfWeek(referenceDate, { weekStartsOn: 1 }),
      }
    case 'month':
      return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) }
    case 'year':
      return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) }
    case 'custom':
      return { start: referenceDate, end: referenceDate }
  }
}

export function getDaysInRange(start: Date, end: Date): string[] {
  return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'))
}

export function getExpectedMinutes(dateStr: string, settings: Settings): number {
  const dayOfWeek = getDay(new Date(dateStr))
  if (!settings.workDays.includes(dayOfWeek)) return 0
  if (settings.reducedDay === dayOfWeek && settings.reducedHours != null) {
    return settings.reducedHours * 60
  }
  return settings.standardHours * 60
}

export function formatDateIT(dateStr: string): string {
  return format(new Date(dateStr), 'EEE d MMM', { locale: it })
}

export interface PeriodSummary {
  totalWorkedMinutes: number
  totalExpectedMinutes: number
  overtimeMinutes: number
  totalNightMinutes: number
  ferieCount: number
  permessoHours: number
  malattiaCount: number
  emergencyCount: number
}

export function calcPeriodSummary(
  days: string[],
  entries: Map<string, WorkEntry>,
  absences: Absence[],
  emergencyCount: number,
  settings: Settings,
): PeriodSummary {
  let totalWorkedMinutes = 0
  let totalExpectedMinutes = 0
  let totalNightMinutes = 0

  let overtimeMinutes = 0

  for (const day of days) {
    const entry = entries.get(day)
    if (entry) {
      totalWorkedMinutes += entry.workedMinutes
      totalNightMinutes += entry.nightMinutes ?? 0

      const expected = getExpectedMinutes(day, settings)
      totalExpectedMinutes += expected

      if (expected === 0) {
        // Non-work day (weekend etc): all hours are overtime
        overtimeMinutes += entry.workedMinutes
      } else if (entry.workedMinutes > expected) {
        // Work day: hours beyond expected are overtime
        overtimeMinutes += entry.workedMinutes - expected
      }

      // Night hours are always overtime
      overtimeMinutes += entry.nightMinutes ?? 0
    }
  }

  let ferieCount = 0
  let permessoHours = 0
  let malattiaCount = 0
  for (const a of absences) {
    if (a.type === 'ferie') ferieCount++
    if (a.type === 'permesso') permessoHours += a.hours ?? 0
    if (a.type === 'malattia') malattiaCount++
  }

  return {
    totalWorkedMinutes,
    totalExpectedMinutes,
    overtimeMinutes,
    totalNightMinutes,
    ferieCount,
    permessoHours,
    malattiaCount,
    emergencyCount,
  }
}
