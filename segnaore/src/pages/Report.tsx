import { useRef, useState } from 'react'
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
  getExpectedMinutes,
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

  function buildSummaryBoxes(): string {
    const boxes: string[] = []
    boxes.push(`<div style="flex:1;min-width:140px;padding:14px;border-radius:12px;text-align:center;background:#eff6ff;">
      <div style="font-size:22px;font-weight:700;color:#2563eb;">${formatMinutes(summary.totalWorkedMinutes - summary.overtimeMinutes)}</div>
      <div style="font-size:12px;color:#9ca3af;">ore ordinarie</div></div>`)
    boxes.push(`<div style="flex:1;min-width:140px;padding:14px;border-radius:12px;text-align:center;background:#f0fdf4;">
      <div style="font-size:22px;font-weight:700;color:#16a34a;">${summary.overtimeMinutes > 0 ? '+' : ''}${formatMinutes(summary.overtimeMinutes)}</div>
      <div style="font-size:12px;color:#9ca3af;">straordinario</div></div>`)
    if (summary.totalNightMinutes > 0)
      boxes.push(`<div style="flex:1;min-width:140px;padding:14px;border-radius:12px;text-align:center;background:#eef2ff;">
        <div style="font-size:22px;font-weight:700;color:#4f46e5;">${formatMinutes(summary.totalNightMinutes)}</div>
        <div style="font-size:12px;color:#9ca3af;">ore notturne</div></div>`)
    if (summary.emergencyCount > 0)
      boxes.push(`<div style="flex:1;min-width:140px;padding:14px;border-radius:12px;text-align:center;background:#fff7ed;">
        <div style="font-size:22px;font-weight:700;color:#f97316;">${summary.emergencyCount}</div>
        <div style="font-size:12px;color:#9ca3af;">emergenze</div></div>`)
    if (summary.ferieCount > 0)
      boxes.push(`<div style="flex:1;min-width:140px;padding:14px;border-radius:12px;text-align:center;background:#eff6ff;">
        <div style="font-size:22px;font-weight:700;color:#3b82f6;">${summary.ferieCount}</div>
        <div style="font-size:12px;color:#9ca3af;">giorni ferie</div></div>`)
    if (summary.permessoHours > 0)
      boxes.push(`<div style="flex:1;min-width:140px;padding:14px;border-radius:12px;text-align:center;background:#faf5ff;">
        <div style="font-size:22px;font-weight:700;color:#a855f7;">${summary.permessoHours}h</div>
        <div style="font-size:12px;color:#9ca3af;">ore permesso</div></div>`)
    if (summary.malattiaCount > 0)
      boxes.push(`<div style="flex:1;min-width:140px;padding:14px;border-radius:12px;text-align:center;background:#f3f4f6;">
        <div style="font-size:22px;font-weight:700;color:#6b7280;">${summary.malattiaCount}</div>
        <div style="font-size:12px;color:#9ca3af;">giorni malattia</div></div>`)
    return boxes.join('')
  }

  function buildReportHTML(): string {
    const isCompact = periodType === 'month' || periodType === 'year'

    if (isCompact) {
      // Compact: group by week for month, by month for year
      let tableContent = ''

      if (periodType === 'month') {
        // Group days into weeks
        const weeks: string[][] = []
        let currentWeek: string[] = []
        for (const day of days) {
          currentWeek.push(day)
          if (new Date(day).getDay() === 0) { // Sunday = end of week
            weeks.push(currentWeek)
            currentWeek = []
          }
        }
        if (currentWeek.length > 0) weeks.push(currentWeek)

        for (const week of weeks) {
          let weekWorked = 0
          let weekExpected = 0
          let weekDaysWorked = 0
          for (const day of week) {
            const entry = entriesMap.get(day)
            if (entry) {
              weekWorked += entry.workedMinutes
              weekDaysWorked++
              weekExpected += getExpectedMinutes(day, settings)
            }
          }
          const weekStart = formatDateIT(week[0])
          const weekEnd = formatDateIT(week[week.length - 1])
          const overtime = Math.max(0, weekWorked - weekExpected)
          const regularHours = weekWorked - overtime
          const overtimeStr = overtime > 0 ? `<span style="color:#16a34a;">+${formatMinutes(overtime)}</span>` : ''

          tableContent += `<tr style="border-top:1px solid #e5e7eb;">
            <td style="text-align:left;padding:10px 12px;font-weight:600;text-transform:capitalize;">${weekStart} — ${weekEnd}</td>
            <td style="text-align:center;padding:10px 8px;">${weekDaysWorked}gg</td>
            <td style="text-align:center;padding:10px 8px;font-weight:600;color:#2563eb;">${formatMinutes(regularHours)}</td>
            <td style="text-align:right;padding:10px 12px;">${overtimeStr}</td>
          </tr>`
        }

        return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Report SegnaOre</title></head>
<body style="font-family:-apple-system,system-ui,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
  <h1 style="text-align:center;font-size:22px;margin-bottom:4px;">SegnaOre — Report di ${settings.userName}</h1>
  ${settings.companyName ? `<p style="text-align:center;color:#4b5563;font-weight:600;margin:0;">${settings.companyName}</p>` : ''}
  <p style="text-align:center;color:#6b7280;text-transform:capitalize;margin-top:4px;">${periodLabel()}</p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:16px 0;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;font-size:13px;">Settimana</th>
        <th style="padding:10px 8px;font-size:13px;">Giorni</th>
        <th style="padding:10px 8px;font-size:13px;">Ore</th>
        <th style="text-align:right;padding:10px 12px;font-size:13px;">Straord.</th>
      </tr>
    </thead>
    <tbody>${tableContent}</tbody>
  </table>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin:16px 0;">${buildSummaryBoxes()}</div>
</body></html>`
      }

      // Year: group by month
      const months = new Map<string, { worked: number; expected: number; daysWorked: number }>()
      for (const day of days) {
        const monthKey = day.slice(0, 7) // YYYY-MM
        const entry = entriesMap.get(day)
        if (!months.has(monthKey)) months.set(monthKey, { worked: 0, expected: 0, daysWorked: 0 })
        const m = months.get(monthKey)!
        if (entry) {
          m.worked += entry.workedMinutes
          m.daysWorked++
          m.expected += getExpectedMinutes(day, settings)
        }
      }

      for (const [monthKey, data] of months) {
        const monthDate = new Date(monthKey + '-01')
        const monthLabel = format(monthDate, 'MMMM yyyy', { locale: it })
        const overtime = Math.max(0, data.worked - data.expected)
        const regularHours = data.worked - overtime
        const overtimeStr = overtime > 0 ? `<span style="color:#16a34a;">+${formatMinutes(overtime)}</span>` : ''

        tableContent += `<tr style="border-top:1px solid #e5e7eb;">
          <td style="text-align:left;padding:10px 12px;font-weight:600;text-transform:capitalize;">${monthLabel}</td>
          <td style="text-align:center;padding:10px 8px;">${data.daysWorked}gg</td>
          <td style="text-align:center;padding:10px 8px;font-weight:600;color:#2563eb;">${formatMinutes(regularHours)}</td>
          <td style="text-align:right;padding:10px 12px;">${overtimeStr}</td>
        </tr>`
      }

      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Report SegnaOre</title></head>
<body style="font-family:-apple-system,system-ui,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
  <h1 style="text-align:center;font-size:22px;margin-bottom:4px;">SegnaOre — Report di ${settings.userName}</h1>
  ${settings.companyName ? `<p style="text-align:center;color:#4b5563;font-weight:600;margin:0;">${settings.companyName}</p>` : ''}
  <p style="text-align:center;color:#6b7280;text-transform:capitalize;margin-top:4px;">${periodLabel()}</p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:16px 0;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;font-size:13px;">Mese</th>
        <th style="padding:10px 8px;font-size:13px;">Giorni</th>
        <th style="padding:10px 8px;font-size:13px;">Ore</th>
        <th style="text-align:right;padding:10px 12px;font-size:13px;">Straord.</th>
      </tr>
    </thead>
    <tbody>${tableContent}</tbody>
  </table>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin:16px 0;">${buildSummaryBoxes()}</div>
</body></html>`
    }

    // Weekly / custom: detailed day-by-day
    const rows = days.map(day => {
      const entry = entriesMap.get(day)
      const absence = absences.find(a => a.date === day)
      const dayOfWeek = new Date(day).getDay()
      const isReduced = settings.reducedDay === dayOfWeek
      const isWorkDay = settings.workDays.includes(dayOfWeek)
      if (!isWorkDay && !entry && !absence) return ''

      const bgStyle = isReduced ? 'background:#fffbeb;' : absence ? 'background:#faf5ff;' : ''
      const dayLabel = formatDateIT(day)

      if (absence) {
        const absLabel = absence.type === 'ferie' ? '🏖️ Ferie'
          : absence.type === 'permesso' ? `🕐 Permesso (${absence.hours}h)`
          : '🤒 Malattia'
        return `<tr style="${bgStyle}">
          <td style="text-align:left;padding:8px 12px;font-weight:600;text-transform:capitalize;">${dayLabel}</td>
          <td colspan="3" style="text-align:center;color:#a855f7;font-size:13px;">${absLabel}</td>
          <td style="text-align:center;">—</td>
          <td style="text-align:right;padding:8px 12px;">—</td>
        </tr>`
      }
      if (entry) {
        const expected = getExpectedMinutes(day, settings)
        const regular = expected > 0 ? Math.min(entry.workedMinutes, expected) : 0
        const ot = entry.workedMinutes - regular
        return `<tr style="${bgStyle}">
          <td style="text-align:left;padding:8px 12px;font-weight:600;text-transform:capitalize;">${dayLabel}</td>
          <td style="text-align:center;padding:8px;">${entry.startTime}</td>
          <td style="text-align:center;padding:8px;">${entry.endTime}</td>
          <td style="text-align:center;padding:8px;">${entry.breakMinutes}m</td>
          <td style="text-align:center;padding:8px;font-weight:600;color:#2563eb;">${formatMinutes(regular)}</td>
          <td style="text-align:right;padding:8px 12px;font-weight:600;color:#16a34a;">${ot > 0 ? '+' + formatMinutes(ot) : '—'}</td>
        </tr>`
      }
      return `<tr style="${bgStyle}">
        <td style="text-align:left;padding:8px 12px;font-weight:600;text-transform:capitalize;">${dayLabel}</td>
        <td colspan="3" style="text-align:center;color:#d1d5db;font-size:13px;">—</td>
        <td style="text-align:center;color:#d1d5db;">—</td>
        <td style="text-align:right;padding:8px 12px;color:#d1d5db;">—</td>
      </tr>`
    }).join('')

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Report SegnaOre</title></head>
<body style="font-family:-apple-system,system-ui,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
  <h1 style="text-align:center;font-size:22px;margin-bottom:4px;">SegnaOre — Report di ${settings.userName}</h1>
  ${settings.companyName ? `<p style="text-align:center;color:#4b5563;font-weight:600;margin:0;">${settings.companyName}</p>` : ''}
  <p style="text-align:center;color:#6b7280;text-transform:capitalize;margin-top:4px;">${periodLabel()}</p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:16px 0;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;font-size:13px;">Giorno</th>
        <th style="padding:10px 8px;font-size:13px;">Inizio</th>
        <th style="padding:10px 8px;font-size:13px;">Fine</th>
        <th style="padding:10px 8px;font-size:13px;">Pausa</th>
        <th style="padding:10px 8px;font-size:13px;">Ore</th>
        <th style="text-align:right;padding:10px 12px;font-size:13px;">Str.</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin:16px 0;">${buildSummaryBoxes()}</div>
</body></html>`
  }

  const [previewHTML, setPreviewHTML] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'print' | 'save'>('save')

  function handlePrint() {
    setPreviewHTML(buildReportHTML())
    setPreviewMode('print')
  }

  function handleSaveImage() {
    setPreviewHTML(buildReportHTML())
    setPreviewMode('save')
  }

  const tabs: { type: PeriodType; label: string }[] = [
    { type: 'week', label: 'Settimana' },
    { type: 'month', label: 'Mese' },
    { type: 'year', label: 'Anno' },
    { type: 'custom', label: 'Custom' },
  ]

  if (previewHTML) {
    const bodyContent = previewHTML
      .replace(/<!DOCTYPE.*?<body[^>]*>/s, '')
      .replace(/<\/body>.*$/s, '')

    return (
      <div className="py-4">
        <div
          className="bg-white rounded-xl p-4 shadow-sm"
          dangerouslySetInnerHTML={{ __html: bodyContent }}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setPreviewHTML(null)}
            className="flex-1 py-3 bg-gray-200 text-gray-600 rounded-xl font-semibold"
          >
            ← Indietro
          </button>
          {previewMode === 'print' && (
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold"
            >
              🖨️ Stampa
            </button>
          )}
        </div>
        {previewMode === 'save' && (
          <p className="text-xs text-gray-400 text-center mt-3">Fai uno screenshot per salvare</p>
        )}
      </div>
    )
  }

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
          {settings.companyName && <p className="font-semibold text-gray-600">{settings.companyName}</p>}
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
                <th className="px-2 py-2">Ore</th>
                <th className="text-right px-3 py-2">Str.</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => {
                const entry = entriesMap.get(day)
                const absence = absences.find(a => a.date === day)
                const dayOfWeek = new Date(day).getDay()
                const isReduced = settings.reducedDay === dayOfWeek
                const isWorkDay = settings.workDays.includes(dayOfWeek)

                if (!isWorkDay && !entry && !absence) return null

                return (
                  <tr
                    key={day}
                    className={`border-t ${isReduced ? 'bg-amber-50' : ''} ${absence ? 'bg-purple-50' : ''}`}
                  >
                    <td className="px-3 py-2 font-semibold capitalize">{formatDateIT(day)}</td>
                    {absence ? (
                      <>
                        <td colSpan={3} className="text-center text-xs text-purple-500">
                          {absence.type === 'ferie' && '🏖️ Ferie'}
                          {absence.type === 'permesso' && `🕐 Permesso (${absence.hours}h)`}
                          {absence.type === 'malattia' && '🤒 Malattia'}
                        </td>
                        <td className="text-center">—</td>
                        <td className="text-right px-3">—</td>
                      </>
                    ) : entry ? (() => {
                      const expected = getExpectedMinutes(day, settings)
                      const regular = expected > 0 ? Math.min(entry.workedMinutes, expected) : 0
                      const ot = entry.workedMinutes - regular
                      return (
                        <>
                          <td className="text-center px-2 py-2">{entry.startTime}</td>
                          <td className="text-center px-2 py-2">{entry.endTime}</td>
                          <td className="text-center px-2 py-2">{entry.breakMinutes}m</td>
                          <td className="text-center px-2 py-2 font-semibold text-blue-600">{formatMinutes(regular)}</td>
                          <td className="text-right px-3 py-2 font-semibold text-green-600">{ot > 0 ? `+${formatMinutes(ot)}` : '—'}</td>
                        </>
                      )
                    })() : (
                      <>
                        <td colSpan={3} className="text-center text-xs text-gray-300">—</td>
                        <td className="text-center text-gray-300">—</td>
                        <td className="text-right px-3 text-gray-300">—</td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{formatMinutes(summary.totalWorkedMinutes - summary.overtimeMinutes)}</div>
            <div className="text-xs text-gray-400">ore ordinarie</div>
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
        <button
          onClick={handleSaveImage}
          className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold"
        >
          📸 Salva / Condividi
        </button>
      </div>
    </div>
  )
}
