import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { useWorkEntries } from '../hooks/useWorkEntry'
import { useAbsences } from '../hooks/useAbsences'
import { useSettings } from '../hooks/useSettings'
import { formatMinutes } from '../utils/time'
import { db } from '../db'
import DaySummaryCard from '../components/DaySummaryCard'
import TimeInput from '../components/TimeInput'
import type { Service, WorkEntry } from '../types'
import { calcWorkedMinutes } from '../utils/time'

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { settings } = useSettings()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editStep, setEditStep] = useState(1)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [breakMinutes, setBreakMinutes] = useState<number | null>(null)
  const [services, setServices] = useState<Service[]>([])

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

  function openDay(dateStr: string) {
    setSelectedDate(dateStr)
    setEditing(false)
    setEditStep(1)
  }

  function startEdit(entry?: WorkEntry) {
    setStartTime(entry?.startTime ?? '08:00')
    setEndTime(entry?.endTime ?? '17:00')
    setBreakMinutes(entry?.breakMinutes ?? null)
    setServices(entry?.services ?? [])
    setEditing(true)
    setEditStep(1)
  }

  async function saveEdit() {
    if (!selectedDate || breakMinutes === null) return
    const workedMins = calcWorkedMinutes(startTime, endTime, breakMinutes)
    const existing = await db.workEntries.where('date').equals(selectedDate).first()
    const data = {
      date: selectedDate,
      startTime,
      endTime,
      breakMinutes,
      workedMinutes: workedMins,
      services,
    }
    if (existing) {
      await db.workEntries.update(existing.id!, data)
    } else {
      await db.workEntries.add(data)
    }
    setEditing(false)
  }

  async function deleteDay() {
    if (!selectedDate) return
    if (window.confirm('Sei sicuro di voler cancellare questa giornata?')) {
      const existing = await db.workEntries.where('date').equals(selectedDate).first()
      if (existing) await db.workEntries.delete(existing.id!)
      setSelectedDate(null)
    }
  }

  // Day detail view
  if (selectedDate) {
    const entry = entriesMap.get(selectedDate)
    const absence = absenceMap.get(selectedDate)
    const dayLabel = format(new Date(selectedDate), 'EEEE d MMMM yyyy', { locale: it })

    if (editing) {
      return (
        <div className="py-4 max-w-sm mx-auto">
          <button onClick={() => setEditing(false)} className="text-blue-600 text-sm mb-4">← Indietro</button>
          <p className="text-center text-gray-400 text-sm mb-4 capitalize">{dayLabel}</p>

          {editStep === 1 && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-6">Ora di inizio</h2>
              <TimeInput value={startTime} onChange={setStartTime} />
              <button onClick={() => setEditStep(2)} className="mt-8 w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold">Avanti →</button>
            </div>
          )}

          {editStep === 2 && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-6">Ora di fine</h2>
              <TimeInput value={endTime} onChange={setEndTime} />
              <button onClick={() => setEditStep(3)} className="mt-8 w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold">Avanti →</button>
            </div>
          )}

          {editStep === 3 && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-6">Hai fatto la pausa?</h2>
              <div className="flex gap-3">
                <button onClick={() => { setBreakMinutes(60); setEditStep(4) }} className="flex-1 bg-green-50 border-2 border-green-500 rounded-xl p-5">
                  <div className="text-3xl font-bold text-green-500">Sì</div>
                  <div className="text-sm text-gray-500 mt-1">1 ora</div>
                </button>
                <button onClick={() => { setBreakMinutes(30); setEditStep(4) }} className="flex-1 bg-orange-50 border-2 border-orange-500 rounded-xl p-5">
                  <div className="text-3xl font-bold text-orange-500">Mezza</div>
                  <div className="text-sm text-gray-500 mt-1">30 min</div>
                </button>
                <button onClick={() => { setBreakMinutes(0); setEditStep(4) }} className="flex-1 bg-red-50 border-2 border-red-500 rounded-xl p-5">
                  <div className="text-3xl font-bold text-red-500">No</div>
                  <div className="text-sm text-gray-500 mt-1">0 min</div>
                </button>
              </div>
            </div>
          )}

          {editStep === 4 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-center">Cosa hai fatto?</h2>
              {services.map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Servizio {i + 1}</span>
                    <button onClick={() => setServices(prev => prev.filter((_, j) => j !== i))} className="text-red-400 text-xs">✕</button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input type="time" value={s.startTime} onChange={e => setServices(prev => prev.map((x, j) => j === i ? { ...x, startTime: e.target.value } : x))} className="flex-1 p-2 border rounded-lg text-sm" />
                    <input type="time" value={s.endTime} onChange={e => setServices(prev => prev.map((x, j) => j === i ? { ...x, endTime: e.target.value } : x))} className="flex-1 p-2 border rounded-lg text-sm" />
                  </div>
                  <input type="text" value={s.description} onChange={e => setServices(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Descrizione" className="w-full p-2 border rounded-lg text-sm" />
                </div>
              ))}
              <button onClick={() => setServices(prev => [...prev, { startTime: '08:00', endTime: '12:00', description: '' }])} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 mb-4">+ Aggiungi servizio</button>
              <div className="flex gap-3">
                <button onClick={() => { setServices([]); saveEdit() }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-semibold">Salta</button>
                <button onClick={saveEdit} className="flex-2 py-3 bg-blue-600 text-white rounded-xl font-semibold">Conferma ✓</button>
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="py-4">
        <button onClick={() => setSelectedDate(null)} className="text-blue-600 text-sm mb-4">← Calendario</button>
        <p className="text-center text-gray-400 text-sm mb-4 capitalize">{dayLabel}</p>

        {entry ? (
          <>
            <DaySummaryCard entry={entry} onEdit={() => startEdit(entry)} />
            <div className="text-center mt-6">
              <button onClick={deleteDay} className="text-red-400 text-xs hover:underline">Cancella giornata</button>
            </div>
          </>
        ) : absence ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="text-4xl mb-2">
              {absence.type === 'ferie' && '🏖️'}
              {absence.type === 'permesso' && '🕐'}
              {absence.type === 'malattia' && '🤒'}
            </div>
            <div className="text-lg font-semibold capitalize">{absence.type}</div>
            {absence.hours && <div className="text-gray-400">{absence.hours}h</div>}
            {absence.note && <div className="text-sm text-gray-500 mt-2 italic">{absence.note}</div>}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-300 mb-4">Nessun dato per questo giorno</p>
            <button onClick={() => startEdit()} className="py-3 px-6 bg-blue-600 text-white rounded-xl font-semibold">
              + Inserisci ore
            </button>
          </div>
        )}
      </div>
    )
  }

  // Calendar grid
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
        {dayHeaders.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 pb-2">{d}</div>
        ))}

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
              onClick={() => inMonth && openDay(dateStr)}
              className={`p-1 rounded-lg text-center min-h-[52px] cursor-pointer active:scale-95 transition-transform ${
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
