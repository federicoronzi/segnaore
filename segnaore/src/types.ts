export interface Settings {
  id: string
  userName: string
  standardHours: number
  reducedDay: number | null   // 0=Sun, 1=Mon...5=Fri, 6=Sat. null = no reduced day
  reducedHours: number | null
  workDays: number[]          // [1,2,3,4,5] = Mon-Fri
  setupComplete: boolean
}

export interface Service {
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  description: string
}

export interface WorkEntry {
  id?: number
  date: string          // YYYY-MM-DD, unique index
  startTime: string     // HH:mm
  endTime: string       // HH:mm
  breakMinutes: number  // 0, 30, 60
  workedMinutes: number // calculated
  services: Service[]
  nightStartTime?: string
  nightEndTime?: string
  nightMinutes?: number
}

export interface OnCallWeek {
  id?: number
  weekStart: string  // YYYY-MM-DD (Monday)
  active: boolean
}

export interface Emergency {
  id?: number
  weekId: number
  date: string           // YYYY-MM-DD
  startTime?: string
  endTime?: string
  durationMinutes?: number
  description?: string
}

export interface Absence {
  id?: number
  date: string           // YYYY-MM-DD
  endDate?: string       // YYYY-MM-DD for multi-day
  type: 'ferie' | 'permesso' | 'malattia'
  hours?: number         // only for 'permesso'
  note?: string
}
