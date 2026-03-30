import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export default function Setup() {
  const { saveSettings } = useSettings()
  const [step, setStep] = useState(1)
  const [userName, setUserName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [standardHours, setStandardHours] = useState(8)
  const [hasReducedDay, setHasReducedDay] = useState(false)
  const [reducedDay, setReducedDay] = useState(5)
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
      companyName,
      standardHours,
      reducedDay: hasReducedDay ? reducedDay : null,
      reducedHours: hasReducedDay ? reducedHours : null,
      workDays,
      setupComplete: true,
    })
    window.location.reload()
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-sm w-full pb-8">
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
              className="w-full text-center text-xl p-3 border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
              autoFocus
            />
            <h2 className="text-xl font-bold mb-4 mt-6">Per che azienda lavori?</h2>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Nome azienda (facoltativo)"
              className="w-full text-center text-lg p-3 border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
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
    </div>
  )
}
