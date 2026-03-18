import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { format, addMinutes } from 'date-fns'
import { id } from 'date-fns/locale'

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Jakarta',   label: 'WIB — Waktu Indonesia Barat',  offset: '+07:00' },
  { value: 'Asia/Makassar',  label: 'WITA — Waktu Indonesia Tengah', offset: '+08:00' },
  { value: 'Asia/Jayapura',  label: 'WIT — Waktu Indonesia Timur',  offset: '+09:00' },
]

export function localToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, timezone)
}

export function formatLocalDate(utcDate: string, timezone: string): string {
  return formatInTimeZone(new Date(utcDate), timezone, "EEEE, d MMMM yyyy", { locale: id })
}

export function formatLocalTime(utcDate: string, timezone: string): string {
  return formatInTimeZone(new Date(utcDate), timezone, 'HH:mm')
}

export function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  let current = new Date()
  current.setHours(sh, sm, 0, 0)
  const end = new Date()
  end.setHours(eh, em, 0, 0)

  while (current.getTime() + durationMinutes * 60000 <= end.getTime()) {
    slots.push(format(current, 'HH:mm'))
    current = addMinutes(current, durationMinutes)
  }
  return slots
}
