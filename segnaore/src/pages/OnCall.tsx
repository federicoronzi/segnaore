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
    new Date(new Date(mondayStr).getTime() + 6 * 86400000),
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

          <div className="bg-gray-50 rounded-xl p-3 text-center my-4">
            <div className="text-3xl font-bold text-orange-500">{emergencies.length}</div>
            <div className="text-sm text-gray-400">emergenze questa settimana</div>
            {totalMinutes > 0 && (
              <div className="text-sm font-semibold text-gray-500 mt-1">
                Totale: {formatMinutes(totalMinutes)}
              </div>
            )}
          </div>

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
