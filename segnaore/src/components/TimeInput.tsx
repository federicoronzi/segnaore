import { useRef } from 'react'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  color?: string
}

export default function TimeInput({ value, onChange, color = 'blue' }: TimeInputProps) {
  const hoursRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)
  const [hours, minutes] = value.split(':')

  function commitHours(raw: string) {
    const num = Math.min(parseInt(raw || '0', 10), 23)
    return num.toString().padStart(2, '0')
  }

  function commitMinutes(raw: string) {
    const num = Math.min(parseInt(raw || '0', 10), 59)
    return num.toString().padStart(2, '0')
  }

  function handleHoursInput(e: React.FormEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const raw = input.value.replace(/\D/g, '').slice(0, 2)
    input.value = raw
    if (raw.length === 2) {
      const h = commitHours(raw)
      onChange(`${h}:${minutes}`)
      minuteRef.current?.focus()
      minuteRef.current?.select()
    }
  }

  function handleHoursBlur(e: React.FocusEvent<HTMLInputElement>) {
    const raw = e.currentTarget.value.replace(/\D/g, '')
    const h = commitHours(raw)
    onChange(`${h}:${minutes}`)
  }

  function handleMinutesInput(e: React.FormEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const raw = input.value.replace(/\D/g, '').slice(0, 2)
    input.value = raw
    if (raw.length === 2) {
      const m = commitMinutes(raw)
      onChange(`${hours}:${m}`)
      input.blur()
    }
  }

  function handleMinutesBlur(e: React.FocusEvent<HTMLInputElement>) {
    const raw = e.currentTarget.value.replace(/\D/g, '')
    const m = commitMinutes(raw)
    onChange(`${hours}:${m}`)
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.value = ''
  }

  const borderColor = `border-${color}-500`
  const textColor = `text-${color}-600`

  return (
    <div className="flex items-center justify-center gap-2">
      <input
        ref={hoursRef}
        type="text"
        inputMode="numeric"
        defaultValue={hours}
        key={`h-${hours}`}
        onInput={handleHoursInput}
        onFocus={handleFocus}
        onBlur={handleHoursBlur}
        className={`w-20 h-20 text-center text-4xl font-bold rounded-xl border-2 bg-gray-50 ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-${color}-300`}
        maxLength={2}
      />
      <span className="text-4xl font-bold text-gray-400">:</span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        defaultValue={minutes}
        key={`m-${minutes}`}
        onInput={handleMinutesInput}
        onFocus={handleFocus}
        onBlur={handleMinutesBlur}
        className={`w-20 h-20 text-center text-4xl font-bold rounded-xl border-2 bg-gray-50 ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-${color}-300`}
        maxLength={2}
      />
    </div>
  )
}
