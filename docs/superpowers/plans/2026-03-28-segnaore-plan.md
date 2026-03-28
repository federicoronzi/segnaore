# SegnaOre Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA time-tracking app with daily hour logging, on-call emergency tracking, absences, night work, and printable reports.

**Architecture:** React SPA with hash-based routing. IndexedDB (via Dexie.js) for persistent local storage. Step-based daily flow as the main screen, with separate pages for calendar, reports, on-call, absences, and settings. Mobile-first responsive design.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v3, Dexie.js, vite-plugin-pwa, date-fns, html2pdf.js, React Router v6

---

## File Structure

```
segnaore/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
├── public/
│   ├── manifest.json
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── db.ts                          # Dexie database schema + instance
│   ├── types.ts                       # All TypeScript interfaces
│   ├── utils/
│   │   ├── time.ts                    # Time parsing, diff, formatting
│   │   └── report.ts                  # Period calculations, aggregations
│   ├── hooks/
│   │   ├── useSettings.ts             # Read/write settings
│   │   ├── useWorkEntry.ts            # CRUD for daily work entries
│   │   ├── useEmergencies.ts          # CRUD for emergencies + on-call weeks
│   │   └── useAbsences.ts            # CRUD for absences
│   ├── components/
│   │   ├── Layout.tsx                 # Shell: navbar + content area
│   │   ├── Navbar.tsx                 # Top bar with menu items
│   │   ├── TimeInput.tsx              # Reusable HH:MM big-digit input
│   │   └── DaySummaryCard.tsx         # Reusable day summary display
│   ├── pages/
│   │   ├── Setup.tsx                  # First-run wizard (5 steps)
│   │   ├── DailyFlow.tsx             # Main screen: 4-step entry + summary
│   │   ├── Calendar.tsx              # Monthly calendar view
│   │   ├── Report.tsx                # Reports with period selector + print/PDF
│   │   ├── OnCall.tsx                # On-call week toggle + emergency list
│   │   ├── Absences.tsx              # Ferie/permessi/malattia management
│   │   └── Settings.tsx              # Settings page (edit + backup)
│   └── index.css                     # Tailwind directives
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Create Vite project with React + TypeScript**

```bash
cd /home/fede/ore-lavoro
npm create vite@latest segnaore -- --template react-ts
cd segnaore
```

- [ ] **Step 2: Install dependencies**

```bash
npm install dexie dexie-react-hooks react-router-dom date-fns html2pdf.js
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Tailwind**

Replace `src/index.css` with:

```css
@import "tailwindcss";
```

Update `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
})
```

- [ ] **Step 4: Set up basic App with React Router**

Replace `src/App.tsx`:

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-500">{name} — coming soon</div>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Placeholder name="Daily Flow" />} />
        <Route path="/calendar" element={<Placeholder name="Calendar" />} />
        <Route path="/report" element={<Placeholder name="Report" />} />
        <Route path="/oncall" element={<Placeholder name="On-Call" />} />
        <Route path="/absences" element={<Placeholder name="Absences" />} />
        <Route path="/settings" element={<Placeholder name="Settings" />} />
        <Route path="/setup" element={<Placeholder name="Setup" />} />
      </Routes>
    </HashRouter>
  )
}
```

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Verify it runs**

```bash
npm run dev
```

Expected: App loads at `http://localhost:5173` showing "Daily Flow — coming soon".

- [ ] **Step 6: Commit**

```bash
git add segnaore/
git commit -m "feat: scaffold Vite + React + Tailwind + Router project"
```

---

### Task 2: Types and Database

**Files:**
- Create: `src/types.ts`, `src/db.ts`

- [ ] **Step 1: Define TypeScript interfaces**

Create `src/types.ts`:

```ts
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
```

- [ ] **Step 2: Create Dexie database**

Create `src/db.ts`:

```ts
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
```

- [ ] **Step 3: Verify database initializes**

Add a temporary log in `src/App.tsx` to verify:

```tsx
import { db } from './db'
console.log('DB tables:', db.tables.map(t => t.name))
```

Run `npm run dev`, open browser console. Expected: `DB tables: ['settings', 'workEntries', 'onCallWeeks', 'emergencies', 'absences']`

Remove the console.log after verifying.

- [ ] **Step 4: Commit**

```bash
git add segnaore/src/types.ts segnaore/src/db.ts
git commit -m "feat: add TypeScript types and Dexie database schema"
```

---

### Task 3: Utility Functions

**Files:**
- Create: `src/utils/time.ts`, `src/utils/report.ts`

- [ ] **Step 1: Create time utilities**

Create `src/utils/time.ts`:

```ts
/**
 * Parse "HH:mm" string to total minutes since midnight.
 */
export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Format total minutes to "Xh Ym" string.
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  const sign = minutes < 0 ? '-' : ''
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m.toString().padStart(2, '0')}m`
}

/**
 * Calculate worked minutes from start, end, and break.
 */
export function calcWorkedMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  return Math.max(0, end - start - breakMinutes)
}

/**
 * Calculate night work minutes from start and end times.
 */
export function calcNightMinutes(startTime: string, endTime: string): number {
  const start = parseTime(startTime)
  let end = parseTime(endTime)
  // Night work can cross midnight: if end < start, add 24h
  if (end <= start) end += 24 * 60
  return end - start
}

/**
 * Format "HH:mm" for display — returns as-is since it's already formatted.
 */
export function formatTime(time: string): string {
  return time
}
```

- [ ] **Step 2: Create report utilities**

Create `src/utils/report.ts`:

```ts
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  getDay,
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
  const dayOfWeek = getDay(new Date(dateStr)) // 0=Sun
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

  for (const day of days) {
    const entry = entries.get(day)
    const expected = getExpectedMinutes(day, settings)
    totalExpectedMinutes += expected
    if (entry) {
      totalWorkedMinutes += entry.workedMinutes
      totalNightMinutes += entry.nightMinutes ?? 0
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
    overtimeMinutes: Math.max(0, totalWorkedMinutes - totalExpectedMinutes),
    totalNightMinutes,
    ferieCount,
    permessoHours,
    malattiaCount,
    emergencyCount,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add segnaore/src/utils/
git commit -m "feat: add time and report utility functions"
```

---

### Task 4: Database Hooks

**Files:**
- Create: `src/hooks/useSettings.ts`, `src/hooks/useWorkEntry.ts`, `src/hooks/useEmergencies.ts`, `src/hooks/useAbsences.ts`

- [ ] **Step 1: Create useSettings hook**

Create `src/hooks/useSettings.ts`:

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Settings } from '../types'

const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  userName: '',
  standardHours: 8,
  reducedDay: null,
  reducedHours: null,
  workDays: [1, 2, 3, 4, 5],
  setupComplete: false,
}

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get('main'))

  async function saveSettings(updates: Partial<Settings>) {
    const current = (await db.settings.get('main')) ?? DEFAULT_SETTINGS
    await db.settings.put({ ...current, ...updates, id: 'main' })
  }

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading: settings === undefined,
    saveSettings,
  }
}
```

- [ ] **Step 2: Create useWorkEntry hook**

Create `src/hooks/useWorkEntry.ts`:

```ts
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

  return { entry: entry ?? null, isLoading: entry === undefined, saveEntry }
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
```

- [ ] **Step 3: Create useEmergencies hook**

Create `src/hooks/useEmergencies.ts`:

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { OnCallWeek, Emergency } from '../types'
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
```

- [ ] **Step 4: Create useAbsences hook**

Create `src/hooks/useAbsences.ts`:

```ts
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
```

- [ ] **Step 5: Commit**

```bash
git add segnaore/src/hooks/
git commit -m "feat: add database hooks for settings, entries, emergencies, absences"
```

---

### Task 5: Shared Components (Layout, Navbar, TimeInput)

**Files:**
- Create: `src/components/Layout.tsx`, `src/components/Navbar.tsx`, `src/components/TimeInput.tsx`, `src/components/DaySummaryCard.tsx`

- [ ] **Step 1: Create Navbar**

Create `src/components/Navbar.tsx`:

```tsx
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/calendar', label: 'Calendario', icon: '📅' },
  { to: '/report', label: 'Report', icon: '📊' },
  { to: '/oncall', label: 'Reperibilità', icon: '🚨' },
  { to: '/absences', label: 'Permessi', icon: '🏖️' },
  { to: '/settings', label: 'Impostazioni', icon: '⚙️' },
]

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white sticky top-0 z-50">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
        <NavLink to="/" className="font-bold text-lg">⏱ SegnaOre</NavLink>
        <div className="flex gap-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-white/30' : 'hover:bg-white/15'
                }`
              }
            >
              <span className="sm:hidden text-lg">{link.icon}</span>
              <span className="hidden sm:inline">{link.icon} {link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create Layout**

Create `src/components/Layout.tsx`:

```tsx
import Navbar from './Navbar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto p-4">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create TimeInput component**

Create `src/components/TimeInput.tsx`:

```tsx
import { useRef } from 'react'

interface TimeInputProps {
  value: string        // "HH:mm"
  onChange: (value: string) => void
  color?: string       // tailwind color class prefix, default "blue"
}

export default function TimeInput({ value, onChange, color = 'blue' }: TimeInputProps) {
  const [hours, minutes] = value.split(':')
  const minuteRef = useRef<HTMLInputElement>(null)

  function handleHoursChange(e: React.ChangeEvent<HTMLInputElement>) {
    let h = e.target.value.replace(/\D/g, '').slice(0, 2)
    const num = parseInt(h || '0', 10)
    if (num > 23) h = '23'
    onChange(`${h.padStart(2, '0')}:${minutes}`)
    if (h.length === 2) minuteRef.current?.focus()
  }

  function handleMinutesChange(e: React.ChangeEvent<HTMLInputElement>) {
    let m = e.target.value.replace(/\D/g, '').slice(0, 2)
    const num = parseInt(m || '0', 10)
    if (num > 59) m = '59'
    onChange(`${hours}:${m.padStart(2, '0')}`)
  }

  const borderColor = `border-${color}-500`
  const textColor = `text-${color}-600`

  return (
    <div className="flex items-center justify-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={hours}
        onChange={handleHoursChange}
        className={`w-20 h-20 text-center text-4xl font-bold rounded-xl border-2 bg-gray-50 ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-${color}-300`}
        maxLength={2}
      />
      <span className="text-4xl font-bold text-gray-400">:</span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        value={minutes}
        onChange={handleMinutesChange}
        className={`w-20 h-20 text-center text-4xl font-bold rounded-xl border-2 bg-gray-50 ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-${color}-300`}
        maxLength={2}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create DaySummaryCard component**

Create `src/components/DaySummaryCard.tsx`:

```tsx
import { formatMinutes, formatTime } from '../utils/time'
import type { WorkEntry } from '../types'

interface DaySummaryCardProps {
  entry: WorkEntry
  onEdit?: () => void
}

export default function DaySummaryCard({ entry, onEdit }: DaySummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
      <div className="text-5xl font-bold text-blue-600 mb-1">
        {formatMinutes(entry.workedMinutes)}
      </div>
      <p className="text-gray-400 mb-4">ore lavorate oggi</p>

      <div className="flex justify-around bg-gray-50 rounded-xl p-3 text-sm">
        <div>
          <div className="font-semibold">Inizio</div>
          <div>{formatTime(entry.startTime)}</div>
        </div>
        <div>
          <div className="font-semibold">Fine</div>
          <div>{formatTime(entry.endTime)}</div>
        </div>
        <div>
          <div className="font-semibold">Pausa</div>
          <div>{entry.breakMinutes}m</div>
        </div>
      </div>

      {entry.nightMinutes != null && entry.nightMinutes > 0 && (
        <div className="mt-3 text-sm text-indigo-600 bg-indigo-50 rounded-lg p-2">
          🌙 Lavoro notturno: {formatMinutes(entry.nightMinutes)}
        </div>
      )}

      {entry.services.length > 0 && (
        <div className="mt-4 text-left">
          <h4 className="text-sm font-semibold text-gray-500 mb-2">Servizi</h4>
          {entry.services.map((s, i) => (
            <div key={i} className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mb-1">
              <span className="text-gray-400">{s.startTime}-{s.endTime}</span> {s.description}
            </div>
          ))}
        </div>
      )}

      {onEdit && (
        <button
          onClick={onEdit}
          className="mt-4 text-blue-500 text-sm hover:underline"
        >
          Modifica
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Wire Layout into App**

Update `src/App.tsx`:

```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-400">{name} — coming soon</div>
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Placeholder name="Daily Flow" />} />
          <Route path="/calendar" element={<Placeholder name="Calendario" />} />
          <Route path="/report" element={<Placeholder name="Report" />} />
          <Route path="/oncall" element={<Placeholder name="Reperibilità" />} />
          <Route path="/absences" element={<Placeholder name="Permessi/Ferie" />} />
          <Route path="/settings" element={<Placeholder name="Impostazioni" />} />
          <Route path="/setup" element={<Placeholder name="Setup" />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
```

- [ ] **Step 6: Verify visually**

```bash
npm run dev
```

Expected: Blue navbar at top with "SegnaOre" logo and menu items. Clicking items navigates. On narrow viewport, labels hide and only icons show.

- [ ] **Step 7: Commit**

```bash
git add segnaore/src/components/ segnaore/src/App.tsx
git commit -m "feat: add Layout, Navbar, TimeInput, DaySummaryCard components"
```

---

### Task 6: Setup Wizard

**Files:**
- Create: `src/pages/Setup.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Setup wizard page**

Create `src/pages/Setup.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export default function Setup() {
  const { saveSettings } = useSettings()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [userName, setUserName] = useState('')
  const [standardHours, setStandardHours] = useState(8)
  const [hasReducedDay, setHasReducedDay] = useState(false)
  const [reducedDay, setReducedDay] = useState(5) // Friday
  const [reducedHours, setReducedHours] = useState(6)
  const [workDays, setWorkDays] = useState([1, 2, 3, 4, 5])

  function toggleDay(day: number) {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort(),
    )
  }

  async function finish() {
    await saveSettings({
      userName,
      standardHours,
      reducedDay: hasReducedDay ? reducedDay : null,
      reducedHours: hasReducedDay ? reducedHours : null,
      workDays,
      setupComplete: true,
    })
    navigate('/')
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map(s => (
          <div
            key={s}
            className={`w-3 h-3 rounded-full ${s === step ? 'bg-blue-500' : s < step ? 'bg-blue-300' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-6">Come ti chiami?</h2>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Il tuo nome"
            className="w-full text-center text-xl p-3 border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && userName.trim() && setStep(2)}
          />
          <button
            disabled={!userName.trim()}
            onClick={() => setStep(2)}
            className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold disabled:opacity-40"
          >
            Avanti →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">📱 I tuoi dati sono al sicuro</h2>
          <div className="bg-blue-50 rounded-xl p-5 text-left text-gray-600 leading-relaxed mb-6">
            <p className="mb-3">I tuoi dati vengono salvati <strong>solo su questo dispositivo</strong>.</p>
            <p className="mb-3">Nessuno può vederli tranne te.</p>
            <p>Ricordati di fare il <strong>backup</strong> dalle impostazioni!</p>
          </div>
          <button
            onClick={() => setStep(3)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold"
          >
            Ho capito, avanti →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-6">Quante ore lavori al giorno?</h2>
          <input
            type="number"
            min={1}
            max={24}
            value={standardHours}
            onChange={e => setStandardHours(Number(e.target.value))}
            className="w-24 text-center text-4xl font-bold p-3 border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <p className="text-gray-400 mt-2">ore al giorno</p>
          <button
            onClick={() => setStep(4)}
            className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold"
          >
            Avanti →
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-6">C'è un giorno con meno ore?</h2>
          <div className="flex gap-3 justify-center mb-4">
            <button
              onClick={() => setHasReducedDay(true)}
              className={`px-6 py-3 rounded-xl font-semibold text-lg ${hasReducedDay ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              Sì
            </button>
            <button
              onClick={() => setHasReducedDay(false)}
              className={`px-6 py-3 rounded-xl font-semibold text-lg ${!hasReducedDay ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              No, tutti uguali
            </button>
          </div>
          {hasReducedDay && (
            <div className="mt-4">
              <div className="flex gap-2 justify-center flex-wrap mb-4">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setReducedDay(i)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                      reducedDay === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={23}
                  value={reducedHours}
                  onChange={e => setReducedHours(Number(e.target.value))}
                  className="w-20 text-center text-2xl font-bold p-2 border-2 border-blue-400 rounded-xl"
                />
                <span className="text-gray-400">ore il {DAY_LABELS[reducedDay]}</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setStep(5)}
            className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold"
          >
            Avanti →
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-6">Quali giorni lavori?</h2>
          <div className="flex gap-2 justify-center flex-wrap mb-6">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`px-4 py-3 rounded-lg text-sm font-semibold ${
                  workDays.includes(i)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={finish}
            className="w-full py-3 bg-green-500 text-white rounded-xl text-lg font-semibold"
          >
            Fatto! ✓
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add setup gate to App.tsx**

Update `src/App.tsx`:

```tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useSettings } from './hooks/useSettings'
import Setup from './pages/Setup'

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-400">{name} — coming soon</div>
}

function AppRoutes() {
  const { settings, isLoading } = useSettings()

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Caricamento...</div>
  }

  if (!settings.setupComplete) {
    return <Setup />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Placeholder name="Daily Flow" />} />
        <Route path="/calendar" element={<Placeholder name="Calendario" />} />
        <Route path="/report" element={<Placeholder name="Report" />} />
        <Route path="/oncall" element={<Placeholder name="Reperibilità" />} />
        <Route path="/absences" element={<Placeholder name="Permessi/Ferie" />} />
        <Route path="/settings" element={<Placeholder name="Impostazioni" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
```

- [ ] **Step 3: Verify wizard flow**

```bash
npm run dev
```

Expected: On first load, wizard appears. Complete 5 steps. After finishing, navbar appears with "Daily Flow — coming soon". Refresh — wizard doesn't appear again (data saved).

- [ ] **Step 4: Commit**

```bash
git add segnaore/src/pages/Setup.tsx segnaore/src/App.tsx
git commit -m "feat: add first-run setup wizard with 5 steps"
```

---

### Task 7: Daily Flow Page

**Files:**
- Create: `src/pages/DailyFlow.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create DailyFlow page**

Create `src/pages/DailyFlow.tsx`:

```tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import TimeInput from '../components/TimeInput'
import DaySummaryCard from '../components/DaySummaryCard'
import { useWorkEntry } from '../hooks/useWorkEntry'
import type { Service } from '../types'

const today = format(new Date(), 'yyyy-MM-dd')
const todayLabel = format(new Date(), 'EEEE d MMMM yyyy', { locale: it })

export default function DailyFlow() {
  const { entry, saveEntry } = useWorkEntry(today)
  const [step, setStep] = useState(1)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [breakMinutes, setBreakMinutes] = useState<number | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [editing, setEditing] = useState(false)

  // Night work
  const [showNight, setShowNight] = useState(false)
  const [nightStart, setNightStart] = useState('22:00')
  const [nightEnd, setNightEnd] = useState('06:00')

  // If already filled today and not editing, show summary
  if (entry && !editing) {
    return (
      <div className="py-6">
        <p className="text-center text-gray-400 text-sm mb-4 capitalize">{todayLabel}</p>
        <DaySummaryCard entry={entry} onEdit={() => setEditing(true)} />

        {/* Night work link */}
        {!entry.nightMinutes && (
          <div className="text-center mt-4">
            <button
              onClick={() => {
                setShowNight(true)
                setEditing(true)
                setStep(5)
                setStartTime(entry.startTime)
                setEndTime(entry.endTime)
                setBreakMinutes(entry.breakMinutes)
                setServices(entry.services)
              }}
              className="text-indigo-400 text-sm hover:underline"
            >
              Hai lavorato di notte?
            </button>
          </div>
        )}
      </div>
    )
  }

  function handleBreak(minutes: number) {
    setBreakMinutes(minutes)
    setStep(4)
  }

  function addService() {
    setServices(prev => [...prev, { startTime: '08:00', endTime: '12:00', description: '' }])
  }

  function updateService(index: number, field: keyof Service, value: string) {
    setServices(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function removeService(index: number) {
    setServices(prev => prev.filter((_, i) => i !== index))
  }

  async function confirm(skipServices: boolean) {
    if (breakMinutes === null) return
    await saveEntry({
      date: today,
      startTime,
      endTime,
      breakMinutes,
      services: skipServices ? [] : services,
      nightStartTime: showNight ? nightStart : undefined,
      nightEndTime: showNight ? nightEnd : undefined,
    })
    setEditing(false)
    setStep(1)
  }

  return (
    <div className="py-6 max-w-sm mx-auto">
      <p className="text-center text-gray-400 text-sm mb-6 capitalize">{todayLabel}</p>

      {step === 1 && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-6">A che ora hai iniziato?</h2>
          <TimeInput value={startTime} onChange={setStartTime} />
          <button
            onClick={() => setStep(2)}
            className="mt-8 w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold"
          >
            Avanti →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-6">A che ora hai finito?</h2>
          <TimeInput value={endTime} onChange={setEndTime} />
          <button
            onClick={() => setStep(3)}
            className="mt-8 w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold"
          >
            Avanti →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-6">Hai fatto la pausa?</h2>
          <div className="flex gap-3">
            <button
              onClick={() => handleBreak(60)}
              className="flex-1 bg-green-50 border-2 border-green-500 rounded-xl p-5 text-center"
            >
              <div className="text-3xl font-bold text-green-500">Sì</div>
              <div className="text-sm text-gray-500 mt-1">1 ora</div>
            </button>
            <button
              onClick={() => handleBreak(30)}
              className="flex-1 bg-orange-50 border-2 border-orange-500 rounded-xl p-5 text-center"
            >
              <div className="text-3xl font-bold text-orange-500">Mezza</div>
              <div className="text-sm text-gray-500 mt-1">30 min</div>
            </button>
            <button
              onClick={() => handleBreak(0)}
              className="flex-1 bg-red-50 border-2 border-red-500 rounded-xl p-5 text-center"
            >
              <div className="text-3xl font-bold text-red-500">No</div>
              <div className="text-sm text-gray-500 mt-1">0 min</div>
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-center">Cosa hai fatto oggi?</h2>
          {services.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">Servizio {i + 1}</span>
                <button onClick={() => removeService(i)} className="text-red-400 text-xs">✕</button>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="time"
                  value={s.startTime}
                  onChange={e => updateService(i, 'startTime', e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-sm"
                />
                <input
                  type="time"
                  value={s.endTime}
                  onChange={e => updateService(i, 'endTime', e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-sm"
                />
              </div>
              <input
                type="text"
                value={s.description}
                onChange={e => updateService(i, 'description', e.target.value)}
                placeholder="Descrizione (es. manutenzione caldaia)"
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
          ))}
          <button
            onClick={addService}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 mb-4"
          >
            + Aggiungi servizio
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => confirm(true)}
              className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-semibold"
            >
              Salta
            </button>
            <button
              onClick={() => confirm(false)}
              className="flex-2 py-3 bg-blue-600 text-white rounded-xl font-semibold"
            >
              Conferma ✓
            </button>
          </div>
        </div>
      )}

      {step === 5 && showNight && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">🌙 Lavoro notturno</h2>
          <p className="text-gray-400 text-sm mb-6">Inserisci orario del turno di notte</p>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Inizio</p>
            <TimeInput value={nightStart} onChange={setNightStart} color="indigo" />
          </div>
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Fine</p>
            <TimeInput value={nightEnd} onChange={setNightEnd} color="indigo" />
          </div>
          <button
            onClick={() => confirm(false)}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl text-lg font-semibold"
          >
            Salva ✓
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire DailyFlow into App.tsx**

In `src/App.tsx`, replace the `"/"` placeholder route:

```tsx
import DailyFlow from './pages/DailyFlow'
// ...
<Route path="/" element={<DailyFlow />} />
```

- [ ] **Step 3: Verify the full daily flow**

```bash
npm run dev
```

Expected: 4-step flow works. After confirming, summary shows. "Hai lavorato di notte?" link shows. Refresh shows summary with "Modifica" button.

- [ ] **Step 4: Commit**

```bash
git add segnaore/src/pages/DailyFlow.tsx segnaore/src/App.tsx
git commit -m "feat: add daily flow page with 4-step entry, night work, and summary"
```

---

### Task 8: On-Call Page

**Files:**
- Create: `src/pages/OnCall.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create OnCall page**

Create `src/pages/OnCall.tsx`:

```tsx
import { useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import { useOnCallWeek, useEmergencies } from '../hooks/useEmergencies'
import TimeInput from '../components/TimeInput'
import { formatMinutes } from '../utils/time'

export default function OnCall() {
  const mondayStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekLabel = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM', { locale: it })
  const weekEndLabel = format(
    new Date(new Date(mondayStr).getTime() + 4 * 86400000),
    'd MMM yyyy',
    { locale: it },
  )

  const { week, toggleOnCall } = useOnCallWeek(mondayStr)
  const { emergencies, addEmergency, deleteEmergency } = useEmergencies(week?.id)

  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showTimes, setShowTimes] = useState(false)
  const [formStart, setFormStart] = useState('22:00')
  const [formEnd, setFormEnd] = useState('23:00')
  const [showDesc, setShowDesc] = useState(false)
  const [formDesc, setFormDesc] = useState('')

  const isActive = week?.active ?? false

  async function handleToggle() {
    await toggleOnCall(mondayStr, !isActive)
  }

  async function handleSave() {
    if (!week?.id) return
    await addEmergency({
      weekId: week.id,
      date: formDate,
      startTime: showTimes ? formStart : undefined,
      endTime: showTimes ? formEnd : undefined,
      description: showDesc && formDesc.trim() ? formDesc.trim() : undefined,
    })
    setShowForm(false)
    setShowTimes(false)
    setShowDesc(false)
    setFormDesc('')
  }

  const totalMinutes = emergencies.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0)

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">🚨 Settimana di reperibilità</h2>
        <button
          onClick={handleToggle}
          className={`w-12 h-7 rounded-full relative transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${isActive ? 'right-1' : 'left-1'}`}
          />
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-4">{weekLabel} — {weekEndLabel}</p>

      {isActive && (
        <>
          {emergencies.map((em, i) => (
            <div key={em.id} className="bg-orange-50 rounded-xl p-3 mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm">Emergenza #{i + 1}</div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(em.date), 'EEE d MMM', { locale: it })}
                    {em.startTime && em.endTime && ` — ${em.startTime} → ${em.endTime}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {em.durationMinutes != null && (
                    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">
                      {formatMinutes(em.durationMinutes)}
                    </span>
                  )}
                  <button onClick={() => deleteEmergency(em.id!)} className="text-red-400 text-xs">✕</button>
                </div>
              </div>
              {em.description && (
                <div className="text-xs text-gray-500 mt-1 italic">{em.description}</div>
              )}
            </div>
          ))}

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-3 text-center my-4">
            <div className="text-3xl font-bold text-orange-500">{emergencies.length}</div>
            <div className="text-sm text-gray-400">emergenze questa settimana</div>
            {totalMinutes > 0 && (
              <div className="text-sm font-semibold text-gray-500 mt-1">
                Totale: {formatMinutes(totalMinutes)}
              </div>
            )}
          </div>

          {/* Add form */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold"
            >
              + Nuova Emergenza
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-bold text-center mb-4">Registra emergenza</h3>
              <p className="text-xs text-gray-400 text-center mb-4">
                Solo la data è obbligatoria. Il resto è facoltativo.
              </p>

              <label className="text-xs font-semibold text-gray-600 block mb-1">
                📅 Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full p-2 border rounded-lg mb-3"
              />

              {/* Optional: times */}
              <button
                onClick={() => setShowTimes(!showTimes)}
                className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2 text-sm text-gray-500"
              >
                <span>🕐 Aggiungi orari</span>
                <span>{showTimes ? '▾' : '▸'}</span>
              </button>
              {showTimes && (
                <div className="flex gap-4 mb-3 justify-center">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Inizio</p>
                    <TimeInput value={formStart} onChange={setFormStart} color="orange" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Fine</p>
                    <TimeInput value={formEnd} onChange={setFormEnd} color="orange" />
                  </div>
                </div>
              )}

              {/* Optional: description */}
              <button
                onClick={() => setShowDesc(!showDesc)}
                className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2 text-sm text-gray-500"
              >
                <span>📝 Aggiungi descrizione</span>
                <span>{showDesc ? '▾' : '▸'}</span>
              </button>
              {showDesc && (
                <input
                  type="text"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Es. Via Roma 15, perdita acqua"
                  className="w-full p-2 border rounded-lg mb-3"
                />
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold"
                >
                  Salva
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!isActive && (
        <p className="text-center text-gray-300 py-8">
          Attiva il toggle per registrare la settimana di reperibilità
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire into App.tsx**

```tsx
import OnCall from './pages/OnCall'
// ...
<Route path="/oncall" element={<OnCall />} />
```

- [ ] **Step 3: Verify**

Expected: Toggle activates on-call. Can add emergencies with just date. Expanding sections shows time inputs and description. Counter updates.

- [ ] **Step 4: Commit**

```bash
git add segnaore/src/pages/OnCall.tsx segnaore/src/App.tsx
git commit -m "feat: add on-call page with emergency tracking"
```

---

### Task 9: Absences Page

**Files:**
- Create: `src/pages/Absences.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Absences page**

Create `src/pages/Absences.tsx`:

```tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAbsences } from '../hooks/useAbsences'
import type { Absence } from '../types'

const TYPE_CONFIG = {
  ferie: { label: 'Ferie', icon: '🏖️', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-600' },
  permesso: { label: 'Permesso', icon: '🕐', color: 'purple', bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-600' },
  malattia: { label: 'Malattia', icon: '🤒', color: 'gray', bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-600' },
} as const

export default function Absences() {
  const { absences, addAbsence, deleteAbsence } = useAbsences()
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<Absence['type']>('ferie')
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formEndDate, setFormEndDate] = useState('')
  const [formHours, setFormHours] = useState(2)
  const [formNote, setFormNote] = useState('')

  async function handleSave() {
    await addAbsence({
      date: formDate,
      endDate: formType === 'ferie' && formEndDate ? formEndDate : undefined,
      type: formType,
      hours: formType === 'permesso' ? formHours : undefined,
      note: formNote.trim() || undefined,
    })
    setShowForm(false)
    setFormNote('')
    setFormEndDate('')
  }

  return (
    <div className="py-4">
      <h2 className="text-lg font-bold mb-4">🏖️ Permessi, Ferie e Malattia</h2>

      {absences.map(a => {
        const cfg = TYPE_CONFIG[a.type]
        return (
          <div key={a.id} className={`${cfg.bg} rounded-xl p-3 mb-2`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="mr-1">{cfg.icon}</span>
                <span className={`font-semibold text-sm ${cfg.text}`}>{cfg.label}</span>
                {a.type === 'permesso' && a.hours && (
                  <span className="text-xs text-gray-400 ml-2">({a.hours}h)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {format(new Date(a.date), 'd MMM', { locale: it })}
                  {a.endDate && ` → ${format(new Date(a.endDate), 'd MMM', { locale: it })}`}
                </span>
                <button onClick={() => deleteAbsence(a.id!)} className="text-red-400 text-xs">✕</button>
              </div>
            </div>
            {a.note && <div className="text-xs text-gray-500 mt-1 italic">{a.note}</div>}
          </div>
        )
      })}

      {absences.length === 0 && !showForm && (
        <p className="text-center text-gray-300 py-8">Nessuna assenza registrata</p>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-semibold"
        >
          + Nuova assenza
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-4 mt-4">
          <h3 className="font-bold text-center mb-4">Registra assenza</h3>

          {/* Type selector */}
          <div className="flex gap-2 mb-4">
            {(Object.keys(TYPE_CONFIG) as Absence['type'][]).map(type => {
              const cfg = TYPE_CONFIG[type]
              return (
                <button
                  key={type}
                  onClick={() => setFormType(type)}
                  className={`flex-1 p-3 rounded-xl text-center border-2 ${
                    formType === type ? `${cfg.bg} ${cfg.border}` : 'bg-gray-50 border-transparent'
                  }`}
                >
                  <div className="text-xl">{cfg.icon}</div>
                  <div className={`text-xs font-semibold ${formType === type ? cfg.text : 'text-gray-400'}`}>
                    {cfg.label}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Date */}
          <label className="text-xs font-semibold text-gray-600 block mb-1">Data</label>
          <input
            type="date"
            value={formDate}
            onChange={e => setFormDate(e.target.value)}
            className="w-full p-2 border rounded-lg mb-3"
          />

          {/* End date for ferie */}
          {formType === 'ferie' && (
            <>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Data fine (per più giorni)
              </label>
              <input
                type="date"
                value={formEndDate}
                onChange={e => setFormEndDate(e.target.value)}
                className="w-full p-2 border rounded-lg mb-3"
              />
            </>
          )}

          {/* Hours for permesso */}
          {formType === 'permesso' && (
            <>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Ore di permesso</label>
              <input
                type="number"
                min={1}
                max={12}
                value={formHours}
                onChange={e => setFormHours(Number(e.target.value))}
                className="w-24 p-2 border rounded-lg mb-3 text-center"
              />
            </>
          )}

          {/* Note */}
          <label className="text-xs font-semibold text-gray-600 block mb-1">Nota (facoltativa)</label>
          <input
            type="text"
            value={formNote}
            onChange={e => setFormNote(e.target.value)}
            placeholder="Es. visita medica"
            className="w-full p-2 border rounded-lg mb-4"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold"
            >
              Salva
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire into App.tsx**

```tsx
import Absences from './pages/Absences'
// ...
<Route path="/absences" element={<Absences />} />
```

- [ ] **Step 3: Verify**

Expected: Can add ferie (single or multi-day), permesso (with hours), malattia. All show in list with correct icons/colors. Delete works.

- [ ] **Step 4: Commit**

```bash
git add segnaore/src/pages/Absences.tsx segnaore/src/App.tsx
git commit -m "feat: add absences page for ferie, permessi, malattia"
```

---

### Task 10: Report Page

**Files:**
- Create: `src/pages/Report.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Report page**

Create `src/pages/Report.tsx`:

```tsx
import { useState, useRef } from 'react'
import { format, addWeeks, addMonths, addYears } from 'date-fns'
import { it } from 'date-fns/locale'
import { useSettings } from '../hooks/useSettings'
import { useWorkEntries } from '../hooks/useWorkEntry'
import { useAbsences } from '../hooks/useAbsences'
import { useEmergencyCount } from '../hooks/useEmergencies'
import {
  getPeriodRange,
  getDaysInRange,
  calcPeriodSummary,
  formatDateIT,
  type PeriodType,
} from '../utils/report'
import { formatMinutes } from '../utils/time'

export default function Report() {
  const { settings } = useSettings()
  const [periodType, setPeriodType] = useState<PeriodType>('week')
  const [refDate, setRefDate] = useState(new Date())
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'))
  const reportRef = useRef<HTMLDivElement>(null)

  const range =
    periodType === 'custom'
      ? { start: new Date(customStart), end: new Date(customEnd) }
      : getPeriodRange(periodType, refDate)

  const startStr = format(range.start, 'yyyy-MM-dd')
  const endStr = format(range.end, 'yyyy-MM-dd')
  const days = getDaysInRange(range.start, range.end)

  const { entries, entriesMap } = useWorkEntries(startStr, endStr)
  const { absences } = useAbsences(startStr, endStr)
  const emergencyCount = useEmergencyCount(startStr, endStr)

  const summary = calcPeriodSummary(days, entriesMap, absences, emergencyCount, settings)

  function navigate(delta: number) {
    setRefDate(prev => {
      if (periodType === 'week') return addWeeks(prev, delta)
      if (periodType === 'month') return addMonths(prev, delta)
      return addYears(prev, delta)
    })
  }

  function periodLabel(): string {
    if (periodType === 'week') {
      return `${format(range.start, 'd MMM', { locale: it })} — ${format(range.end, 'd MMM yyyy', { locale: it })}`
    }
    if (periodType === 'month') return format(range.start, 'MMMM yyyy', { locale: it })
    if (periodType === 'year') return format(range.start, 'yyyy')
    return `${format(range.start, 'd MMM yyyy', { locale: it })} — ${format(range.end, 'd MMM yyyy', { locale: it })}`
  }

  function handlePrint() {
    window.print()
  }

  async function handlePDF() {
    const html2pdf = (await import('html2pdf.js')).default
    html2pdf()
      .set({
        margin: 10,
        filename: `segnaore-report-${startStr}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(reportRef.current)
      .save()
  }

  const tabs: { type: PeriodType; label: string }[] = [
    { type: 'week', label: 'Settimana' },
    { type: 'month', label: 'Mese' },
    { type: 'year', label: 'Anno' },
    { type: 'custom', label: 'Custom' },
  ]

  return (
    <div className="py-4">
      <h2 className="text-lg font-bold mb-4">📊 Report ore lavorate</h2>

      {/* Period tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.type}
            onClick={() => setPeriodType(tab.type)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
              periodType === tab.type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Custom date pickers */}
      {periodType === 'custom' && (
        <div className="flex gap-3 items-center justify-center mb-4">
          <div>
            <label className="text-xs text-gray-400 block">Da</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="p-2 border rounded-lg" />
          </div>
          <span className="text-gray-400 mt-4">→</span>
          <div>
            <label className="text-xs text-gray-400 block">A</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="p-2 border rounded-lg" />
          </div>
        </div>
      )}

      {/* Navigation */}
      {periodType !== 'custom' && (
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate(-1)} className="text-xl text-blue-600">←</button>
          <span className="font-semibold capitalize">{periodLabel()}</span>
          <button onClick={() => navigate(1)} className="text-xl text-blue-600">→</button>
        </div>
      )}

      <div ref={reportRef}>
        {/* Print header (hidden on screen) */}
        <div className="hidden print:block text-center mb-4">
          <h1 className="text-xl font-bold">SegnaOre — Report di {settings.userName}</h1>
          <p className="capitalize">{periodLabel()}</p>
        </div>

        {/* Day table */}
        <div className="border rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2">Giorno</th>
                <th className="px-2 py-2">Inizio</th>
                <th className="px-2 py-2">Fine</th>
                <th className="px-2 py-2">Pausa</th>
                <th className="text-right px-3 py-2">Ore</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => {
                const entry = entriesMap.get(day)
                const absence = absences.find(a => a.date === day)
                const dayOfWeek = new Date(day).getDay()
                const isReduced = settings.reducedDay === dayOfWeek
                const isWorkDay = settings.workDays.includes(dayOfWeek)

                if (!isWorkDay && !entry) return null

                return (
                  <tr
                    key={day}
                    className={`border-t ${isReduced ? 'bg-amber-50' : ''} ${absence ? 'bg-purple-50' : ''}`}
                  >
                    <td className="px-3 py-2 font-semibold capitalize">{formatDateIT(day)}</td>
                    {absence ? (
                      <td colSpan={3} className="text-center text-xs text-purple-500">
                        {absence.type === 'ferie' && '🏖️ Ferie'}
                        {absence.type === 'permesso' && `🕐 Permesso (${absence.hours}h)`}
                        {absence.type === 'malattia' && '🤒 Malattia'}
                      </td>
                    ) : entry ? (
                      <>
                        <td className="text-center px-2 py-2">{entry.startTime}</td>
                        <td className="text-center px-2 py-2">{entry.endTime}</td>
                        <td className="text-center px-2 py-2">{entry.breakMinutes}m</td>
                      </>
                    ) : (
                      <td colSpan={3} className="text-center text-xs text-gray-300">—</td>
                    )}
                    <td className="text-right px-3 py-2 font-semibold text-blue-600">
                      {entry ? formatMinutes(entry.workedMinutes) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Summary boxes */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{formatMinutes(summary.totalWorkedMinutes)}</div>
            <div className="text-xs text-gray-400">ore lavorate</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.overtimeMinutes > 0 ? '+' : ''}{formatMinutes(summary.overtimeMinutes)}
            </div>
            <div className="text-xs text-gray-400">straordinario</div>
          </div>
          {summary.totalNightMinutes > 0 && (
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-indigo-600">{formatMinutes(summary.totalNightMinutes)}</div>
              <div className="text-xs text-gray-400">ore notturne</div>
            </div>
          )}
          {summary.emergencyCount > 0 && (
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-orange-500">{summary.emergencyCount}</div>
              <div className="text-xs text-gray-400">emergenze</div>
            </div>
          )}
          {summary.ferieCount > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-500">{summary.ferieCount}</div>
              <div className="text-xs text-gray-400">giorni ferie</div>
            </div>
          )}
          {summary.permessoHours > 0 && (
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-500">{summary.permessoHours}h</div>
              <div className="text-xs text-gray-400">ore permesso</div>
            </div>
          )}
          {summary.malattiaCount > 0 && (
            <div className="bg-gray-100 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-gray-500">{summary.malattiaCount}</div>
              <div className="text-xs text-gray-400">giorni malattia</div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold"
        >
          🖨️ Stampa
        </button>
        <button
          onClick={handlePDF}
          className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold"
        >
          📥 Scarica PDF
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into App.tsx**

```tsx
import Report from './pages/Report'
// ...
<Route path="/report" element={<Report />} />
```

- [ ] **Step 3: Verify**

Expected: Period tabs switch views. Navigation arrows work. Table shows entries. Summary boxes show totals. Print button opens print dialog. PDF button downloads file.

- [ ] **Step 4: Commit**

```bash
git add segnaore/src/pages/Report.tsx segnaore/src/App.tsx
git commit -m "feat: add report page with period selection, print, and PDF export"
```

---

### Task 11: Calendar Page

**Files:**
- Create: `src/pages/Calendar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Calendar page**

Create `src/pages/Calendar.tsx`:

```tsx
import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { useWorkEntries } from '../hooks/useWorkEntry'
import { useAbsences } from '../hooks/useAbsences'
import { useSettings } from '../hooks/useSettings'
import { formatMinutes } from '../utils/time'

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { settings } = useSettings()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const startStr = format(calStart, 'yyyy-MM-dd')
  const endStr = format(calEnd, 'yyyy-MM-dd')

  const { entriesMap } = useWorkEntries(startStr, endStr)
  const { absences } = useAbsences(startStr, endStr)

  const absenceMap = new Map(absences.map(a => [a.date, a]))

  const allDays = eachDayOfInterval({ start: calStart, end: calEnd })
  const weeks: Date[][] = []
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7))
  }

  const dayHeaders = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentMonth(m => addMonths(m, -1))} className="text-xl text-blue-600">←</button>
        <h2 className="text-lg font-bold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </h2>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="text-xl text-blue-600">→</button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Header */}
        {dayHeaders.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 pb-2">{d}</div>
        ))}

        {/* Days */}
        {weeks.flat().map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const entry = entriesMap.get(dateStr)
          const absence = absenceMap.get(dateStr)
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)
          const dayOfWeek = day.getDay()
          const isWorkDay = settings.workDays.includes(dayOfWeek)
          const expectedMinutes =
            settings.reducedDay === dayOfWeek && settings.reducedHours != null
              ? settings.reducedHours * 60
              : settings.standardHours * 60
          const isOvertime = entry && isWorkDay && entry.workedMinutes > expectedMinutes

          let bgColor = ''
          if (absence) {
            if (absence.type === 'ferie') bgColor = 'bg-blue-100'
            if (absence.type === 'permesso') bgColor = 'bg-purple-100'
            if (absence.type === 'malattia') bgColor = 'bg-gray-200'
          } else if (isOvertime) {
            bgColor = 'bg-green-100'
          }

          return (
            <div
              key={dateStr}
              className={`p-1 rounded-lg text-center min-h-[52px] ${
                !inMonth ? 'opacity-30' : ''
              } ${today ? 'ring-2 ring-blue-500' : ''} ${bgColor || 'bg-gray-50'}`}
            >
              <div className="text-xs font-semibold">{format(day, 'd')}</div>
              {entry && (
                <div className={`text-xs font-bold ${isOvertime ? 'text-green-600' : 'text-blue-600'}`}>
                  {formatMinutes(entry.workedMinutes)}
                </div>
              )}
              {absence && (
                <div className="text-xs">
                  {absence.type === 'ferie' && '🏖️'}
                  {absence.type === 'permesso' && '🕐'}
                  {absence.type === 'malattia' && '🤒'}
                </div>
              )}
              {entry?.nightMinutes != null && entry.nightMinutes > 0 && (
                <div className="text-xs">🌙</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 justify-center text-xs text-gray-400">
        <span><span className="inline-block w-3 h-3 rounded bg-green-100 mr-1" /> Straordinario</span>
        <span><span className="inline-block w-3 h-3 rounded bg-blue-100 mr-1" /> Ferie</span>
        <span><span className="inline-block w-3 h-3 rounded bg-purple-100 mr-1" /> Permesso</span>
        <span><span className="inline-block w-3 h-3 rounded bg-gray-200 mr-1" /> Malattia</span>
        <span>🌙 Notturno</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into App.tsx**

```tsx
import Calendar from './pages/Calendar'
// ...
<Route path="/calendar" element={<Calendar />} />
```

- [ ] **Step 3: Verify**

Expected: Monthly grid with day numbers. Work hours shown per day. Color coding for overtime, absences. Arrow navigation between months. Today highlighted.

- [ ] **Step 4: Commit**

```bash
git add segnaore/src/pages/Calendar.tsx segnaore/src/App.tsx
git commit -m "feat: add calendar page with monthly view and color coding"
```

---

### Task 12: Settings Page

**Files:**
- Create: `src/pages/Settings.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Settings page**

Create `src/pages/Settings.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'
import { db } from '../db'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export default function Settings() {
  const { settings, saveSettings } = useSettings()
  const [userName, setUserName] = useState(settings.userName)
  const [standardHours, setStandardHours] = useState(settings.standardHours)
  const [hasReducedDay, setHasReducedDay] = useState(settings.reducedDay != null)
  const [reducedDay, setReducedDay] = useState(settings.reducedDay ?? 5)
  const [reducedHours, setReducedHours] = useState(settings.reducedHours ?? 6)
  const [workDays, setWorkDays] = useState(settings.workDays)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setUserName(settings.userName)
    setStandardHours(settings.standardHours)
    setHasReducedDay(settings.reducedDay != null)
    setReducedDay(settings.reducedDay ?? 5)
    setReducedHours(settings.reducedHours ?? 6)
    setWorkDays(settings.workDays)
  }, [settings])

  function toggleDay(day: number) {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort(),
    )
  }

  async function handleSave() {
    await saveSettings({
      userName,
      standardHours,
      reducedDay: hasReducedDay ? reducedDay : null,
      reducedHours: hasReducedDay ? reducedHours : null,
      workDays,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleExport() {
    const data = {
      settings: await db.settings.toArray(),
      workEntries: await db.workEntries.toArray(),
      onCallWeeks: await db.onCallWeeks.toArray(),
      emergencies: await db.emergencies.toArray(),
      absences: await db.absences.toArray(),
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `segnaore-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const data = JSON.parse(text)

      await db.transaction('rw', db.settings, db.workEntries, db.onCallWeeks, db.emergencies, db.absences, async () => {
        await db.settings.clear()
        await db.workEntries.clear()
        await db.onCallWeeks.clear()
        await db.emergencies.clear()
        await db.absences.clear()

        if (data.settings) await db.settings.bulkAdd(data.settings)
        if (data.workEntries) await db.workEntries.bulkAdd(data.workEntries)
        if (data.onCallWeeks) await db.onCallWeeks.bulkAdd(data.onCallWeeks)
        if (data.emergencies) await db.emergencies.bulkAdd(data.emergencies)
        if (data.absences) await db.absences.bulkAdd(data.absences)
      })

      window.location.reload()
    }
    input.click()
  }

  return (
    <div className="py-4">
      <h2 className="text-lg font-bold mb-4">⚙️ Impostazioni</h2>

      <div className="mb-4">
        <label className="text-sm font-semibold text-gray-600 block mb-1">Nome</label>
        <input
          type="text"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          className="w-full p-2 border rounded-lg"
        />
      </div>

      <div className="mb-4">
        <label className="text-sm font-semibold text-gray-600 block mb-1">Ore giornaliere standard</label>
        <input
          type="number"
          min={1}
          max={24}
          value={standardHours}
          onChange={e => setStandardHours(Number(e.target.value))}
          className="w-24 p-2 border rounded-lg text-center text-xl font-bold"
        />
      </div>

      <div className="mb-4">
        <label className="text-sm font-semibold text-gray-600 block mb-2">Giorno con orario ridotto</label>
        <div className="flex gap-3 mb-2">
          <button
            onClick={() => setHasReducedDay(true)}
            className={`px-4 py-2 rounded-lg font-semibold ${hasReducedDay ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            Sì
          </button>
          <button
            onClick={() => setHasReducedDay(false)}
            className={`px-4 py-2 rounded-lg font-semibold ${!hasReducedDay ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            No
          </button>
        </div>
        {hasReducedDay && (
          <div>
            <div className="flex gap-2 flex-wrap mb-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setReducedDay(i)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                    reducedDay === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={23}
                value={reducedHours}
                onChange={e => setReducedHours(Number(e.target.value))}
                className="w-20 p-2 border rounded-lg text-center text-xl font-bold"
              />
              <span className="text-gray-400">ore il {DAY_LABELS[reducedDay]}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-600 block mb-2">Giorni lavorativi</label>
        <div className="flex gap-2 flex-wrap">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                workDays.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold mb-6"
      >
        {saved ? '✓ Salvato!' : 'Salva impostazioni'}
      </button>

      <div className="border-t pt-4">
        <label className="text-sm font-semibold text-gray-600 block mb-2">Dati</label>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
          >
            📤 Esporta backup
          </button>
          <button
            onClick={handleImport}
            className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
          >
            📥 Importa backup
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into App.tsx**

```tsx
import Settings from './pages/Settings'
// ...
<Route path="/settings" element={<Settings />} />
```

- [ ] **Step 3: Verify**

Expected: All settings editable. Save button shows confirmation. Export downloads JSON file. Import loads file and refreshes page.

- [ ] **Step 4: Commit**

```bash
git add segnaore/src/pages/Settings.tsx segnaore/src/App.tsx
git commit -m "feat: add settings page with backup export/import"
```

---

### Task 13: PWA Configuration

**Files:**
- Modify: `vite.config.ts`
- Create: `public/manifest.json`, `public/icon-192.png`, `public/icon-512.png`

- [ ] **Step 1: Install PWA plugin**

```bash
cd /home/fede/ore-lavoro/segnaore
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Update vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SegnaOre',
        short_name: 'SegnaOre',
        description: 'Traccia le tue ore di lavoro',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  base: './',
})
```

- [ ] **Step 3: Generate placeholder icons**

Create simple SVG-based PNG icons using a canvas script, or use placeholder colored squares. The simplest approach:

```bash
# Generate a simple blue circle icon with text using ImageMagick if available,
# otherwise create a minimal SVG and convert
cat > /home/fede/ore-lavoro/segnaore/public/icon.svg << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#2563eb"/>
  <text x="256" y="300" font-size="240" font-family="Arial,sans-serif" font-weight="bold" fill="white" text-anchor="middle">⏱</text>
</svg>
SVGEOF
```

Note: For production, replace with proper PNG icons. The SVG serves as a reference. You can use an online tool to convert this SVG to 192x192 and 512x512 PNGs, or use `npx pwa-asset-generator` later.

- [ ] **Step 4: Add print styles to index.css**

Append to `src/index.css`:

```css
@import "tailwindcss";

@media print {
  nav, .print\\:hidden, button {
    display: none !important;
  }
  .print\\:block {
    display: block !important;
  }
  body {
    font-size: 12px;
  }
}
```

- [ ] **Step 5: Build and verify**

```bash
npm run build
npx serve dist
```

Expected: App loads, service worker registers. On mobile Chrome, "Add to Home Screen" prompt appears. Print styles hide buttons.

- [ ] **Step 6: Commit**

```bash
git add segnaore/vite.config.ts segnaore/public/ segnaore/src/index.css
git commit -m "feat: configure PWA with service worker, manifest, and print styles"
```

---

### Task 14: Final Wiring and Cleanup

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Final App.tsx with all routes**

Verify `src/App.tsx` imports all real pages (no more Placeholder):

```tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useSettings } from './hooks/useSettings'
import Setup from './pages/Setup'
import DailyFlow from './pages/DailyFlow'
import Calendar from './pages/Calendar'
import Report from './pages/Report'
import OnCall from './pages/OnCall'
import Absences from './pages/Absences'
import Settings from './pages/Settings'

function AppRoutes() {
  const { settings, isLoading } = useSettings()

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Caricamento...</div>
  }

  if (!settings.setupComplete) {
    return <Setup />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DailyFlow />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/report" element={<Report />} />
        <Route path="/oncall" element={<OnCall />} />
        <Route path="/absences" element={<Absences />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}
```

- [ ] **Step 2: Remove unused Vite boilerplate**

Delete these files if they exist:
- `src/App.css`
- `src/assets/react.svg`
- `public/vite.svg`

- [ ] **Step 3: Full manual test**

Run `npm run dev` and test:
1. First-run wizard (5 steps) — complete it
2. Daily flow — enter start, end, break, optional services
3. Night work link — add night hours
4. Refresh — summary shows with Modifica button
5. On-Call — toggle, add emergencies (with/without details)
6. Absences — add ferie, permesso, malattia
7. Calendar — navigate months, see colors
8. Report — switch periods, navigate, verify totals
9. Print — verify clean output
10. Settings — change values, export backup, reimport

- [ ] **Step 4: Build for production**

```bash
npm run build
```

Expected: No errors. `dist/` folder created with all assets.

- [ ] **Step 5: Commit**

```bash
git add -A segnaore/
git commit -m "feat: complete SegnaOre app — all pages wired, boilerplate removed"
```

---
