import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAbsences } from '../hooks/useAbsences'
import type { Absence } from '../types'

const TYPE_CONFIG = {
  ferie: { label: 'Ferie', icon: '🏖️', bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-600' },
  permesso: { label: 'Permesso', icon: '🕐', bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-600' },
  malattia: { label: 'Malattia', icon: '🤒', bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-600' },
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

          <label className="text-xs font-semibold text-gray-600 block mb-1">Data</label>
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-2 border rounded-lg mb-3" />

          {formType === 'ferie' && (
            <>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Data fine (per più giorni)</label>
              <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} className="w-full p-2 border rounded-lg mb-3" />
            </>
          )}

          {formType === 'permesso' && (
            <>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Ore di permesso</label>
              <input type="number" min={1} max={12} value={formHours} onChange={e => setFormHours(Number(e.target.value))} className="w-24 p-2 border rounded-lg mb-3 text-center" />
            </>
          )}

          <label className="text-xs font-semibold text-gray-600 block mb-1">Nota (facoltativa)</label>
          <input type="text" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Es. visita medica" className="w-full p-2 border rounded-lg mb-4" />

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl">Annulla</button>
            <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold">Salva</button>
          </div>
        </div>
      )}
    </div>
  )
}
