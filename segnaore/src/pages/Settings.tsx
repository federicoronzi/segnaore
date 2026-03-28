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

      await db.transaction('rw', [db.settings, db.workEntries, db.onCallWeeks, db.emergencies, db.absences], async () => {
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
        <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full p-2 border rounded-lg" />
      </div>

      <div className="mb-4">
        <label className="text-sm font-semibold text-gray-600 block mb-1">Ore giornaliere standard</label>
        <input type="number" min={1} max={24} value={standardHours} onChange={e => setStandardHours(Number(e.target.value))} className="w-24 p-2 border rounded-lg text-center text-xl font-bold" />
      </div>

      <div className="mb-4">
        <label className="text-sm font-semibold text-gray-600 block mb-2">Giorno con orario ridotto</label>
        <div className="flex gap-3 mb-2">
          <button onClick={() => setHasReducedDay(true)} className={`px-4 py-2 rounded-lg font-semibold ${hasReducedDay ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>Sì</button>
          <button onClick={() => setHasReducedDay(false)} className={`px-4 py-2 rounded-lg font-semibold ${!hasReducedDay ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>No</button>
        </div>
        {hasReducedDay && (
          <div>
            <div className="flex gap-2 flex-wrap mb-2">
              {DAY_LABELS.map((label, i) => (
                <button key={i} onClick={() => setReducedDay(i)} className={`px-3 py-2 rounded-lg text-sm font-semibold ${reducedDay === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={23} value={reducedHours} onChange={e => setReducedHours(Number(e.target.value))} className="w-20 p-2 border rounded-lg text-center text-xl font-bold" />
              <span className="text-gray-400">ore il {DAY_LABELS[reducedDay]}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-600 block mb-2">Giorni lavorativi</label>
        <div className="flex gap-2 flex-wrap">
          {DAY_LABELS.map((label, i) => (
            <button key={i} onClick={() => toggleDay(i)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${workDays.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>
          ))}
        </div>
      </div>

      <button onClick={handleSave} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold mb-6">
        {saved ? '✓ Salvato!' : 'Salva impostazioni'}
      </button>

      <div className="border-t pt-4">
        <label className="text-sm font-semibold text-gray-600 block mb-2">Dati</label>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">📤 Esporta backup</button>
          <button onClick={handleImport} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">📥 Importa backup</button>
        </div>
      </div>
    </div>
  )
}
