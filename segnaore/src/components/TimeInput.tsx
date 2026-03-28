import { useRef } from 'react'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  color?: string
}

export default function TimeInput({ value, onChange, color = 'blue' }: TimeInputProps) {
  const [hours, minutes] = value.split(':')
  const minuteRef = useRef<HTMLInputElement>(null)

  function handleHoursChange(e: React.ChangeEvent<HTMLInputElement>) {
    let h = e.target.value.replace(/\D/g, '').slice(0, 2)
    const num = parseInt(h || '0', 10)
    if (num > 23) h = '23'
    onChange(`${h.padStart(2, '0')}:${minutes}`)
    if (h.length === 2) minuteRef.current?.focus()
  }

  function handleMinutesChange(e: React.ChangeEvent<HTMLInputElement>) {
    let m = e.target.value.replace(/\D/g, '').slice(0, 2)
    const num = parseInt(m || '0', 10)
    if (num > 59) m = '59'
    onChange(`${hours}:${m.padStart(2, '0')}`)
  }

  const borderColor = `border-${color}-500`
  const textColor = `text-${color}-600`

  return (
    <div className="flex items-center justify-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={hours}
        onChange={handleHoursChange}
        className={`w-20 h-20 text-center text-4xl font-bold rounded-xl border-2 bg-gray-50 ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-${color}-300`}
        maxLength={2}
      />
      <span className="text-4xl font-bold text-gray-400">:</span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        value={minutes}
        onChange={handleMinutesChange}
        className={`w-20 h-20 text-center text-4xl font-bold rounded-xl border-2 bg-gray-50 ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-${color}-300`}
        maxLength={2}
      />
    </div>
  )
}
