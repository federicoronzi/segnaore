import { useRef, useState } from 'react'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  color?: string
}

export default function TimeInput({ value, onChange, color = 'blue' }: TimeInputProps) {
  const [hours, minutes] = value.split(':')
  const [editingHours, setEditingHours] = useState<string | null>(null)
  const [editingMinutes, setEditingMinutes] = useState<string | null>(null)
  const minuteRef = useRef<HTMLInputElement>(null)

  function handleHoursChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    setEditingHours(raw)
    if (raw.length === 2) {
      const num = Math.min(parseInt(raw, 10), 23)
      const padded = num.toString().padStart(2, '0')
      setEditingHours(null)
      onChange(`${padded}:${minutes}`)
      minuteRef.current?.focus()
    }
  }

  function handleHoursBlur() {
    if (editingHours !== null) {
      const num = Math.min(parseInt(editingHours || '0', 10), 23)
      const padded = num.toString().padStart(2, '0')
      setEditingHours(null)
      onChange(`${padded}:${minutes}`)
    }
  }

  function handleMinutesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    setEditingMinutes(raw)
    if (raw.length === 2) {
      const num = Math.min(parseInt(raw, 10), 59)
      const padded = num.toString().padStart(2, '0')
      setEditingMinutes(null)
      onChange(`${hours}:${padded}`)
    }
  }

  function handleMinutesBlur() {
    if (editingMinutes !== null) {
      const num = Math.min(parseInt(editingMinutes || '0', 10), 59)
      const padded = num.toString().padStart(2, '0')
      setEditingMinutes(null)
      onChange(`${hours}:${padded}`)
    }
  }

  function handleHoursFocus(e: React.FocusEvent<HTMLInputElement>) {
    setEditingHours('')
    e.target.select()
  }

  function handleMinutesFocus(e: React.FocusEvent<HTMLInputElement>) {
    setEditingMinutes('')
    e.target.select()
  }

  const borderColor = `border-${color}-500`
  const textColor = `text-${color}-600`

  return (
    <div className="flex items-center justify-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={editingHours !== null ? editingHours : hours}
        onChange={handleHoursChange}
        onFocus={handleHoursFocus}
        onBlur={handleHoursBlur}
        className={`w-20 h-20 text-center text-4xl font-bold rounded-xl border-2 bg-gray-50 ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-${color}-300`}
        maxLength={2}
      />
      <span className="text-4xl font-bold text-gray-400">:</span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        value={editingMinutes !== null ? editingMinutes : minutes}
        onChange={handleMinutesChange}
        onFocus={handleMinutesFocus}
        onBlur={handleMinutesBlur}
        className={`w-20 h-20 text-center text-4xl font-bold rounded-xl border-2 bg-gray-50 ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-${color}-300`}
        maxLength={2}
      />
    </div>
  )
}
