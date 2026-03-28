export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  const sign = minutes < 0 ? '-' : ''
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m.toString().padStart(2, '0')}m`
}

export function calcWorkedMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  return Math.max(0, end - start - breakMinutes)
}

export function calcNightMinutes(startTime: string, endTime: string): number {
  const start = parseTime(startTime)
  let end = parseTime(endTime)
  if (end <= start) end += 24 * 60
  return end - start
}

export function formatTime(time: string): string {
  return time
}
