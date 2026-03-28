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
