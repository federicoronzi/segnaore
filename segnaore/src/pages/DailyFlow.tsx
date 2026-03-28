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

  const [showNight, setShowNight] = useState(false)
  const [nightStart, setNightStart] = useState('22:00')
  const [nightEnd, setNightEnd] = useState('06:00')

  if (entry && !editing) {
    return (
      <div className="py-6">
        <p className="text-center text-gray-400 text-sm mb-4 capitalize">{todayLabel}</p>
        <DaySummaryCard entry={entry} onEdit={() => setEditing(true)} />
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
