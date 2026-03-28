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

  const { entriesMap } = useWorkEntries(startStr, endStr)
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
    if (!reportRef.current) return
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

      {periodType !== 'custom' && (
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate(-1)} className="text-xl text-blue-600">←</button>
          <span className="font-semibold capitalize">{periodLabel()}</span>
          <button onClick={() => navigate(1)} className="text-xl text-blue-600">→</button>
        </div>
      )}

      <div ref={reportRef}>
        <div className="hidden print:block text-center mb-4">
          <h1 className="text-xl font-bold">SegnaOre — Report di {settings.userName}</h1>
          <p className="capitalize">{periodLabel()}</p>
        </div>

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

      <div className="flex gap-3 print:hidden">
        <button onClick={handlePrint} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold">
          🖨️ Stampa
        </button>
        <button onClick={handlePDF} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold">
          📥 Scarica PDF
        </button>
      </div>
    </div>
  )
}
