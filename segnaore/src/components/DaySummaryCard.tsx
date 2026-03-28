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
