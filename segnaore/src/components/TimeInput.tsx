interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  color?: string
}

export default function TimeInput({ value, onChange, color = 'blue' }: TimeInputProps) {
  const borderColor = `border-${color}-500`
  const textColor = `text-${color}-600`

  return (
    <div className="flex items-center justify-center">
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value || value)}
        className={`text-center text-4xl font-bold rounded-xl border-2 bg-gray-50 px-6 py-4 ${borderColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-${color}-300`}
      />
    </div>
  )
}
