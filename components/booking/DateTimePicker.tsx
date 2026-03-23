'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    format,
    addDays,
    startOfToday,
    parseISO,
    isSameDay,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    isBefore,
    isAfter,
    addHours,
    differenceInHours
} from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react'

export default function DateTimePicker({
    merchantId,
    duration,
    schedule,
    overrides,
    selectedDateTime,
    noticePeriod = 4,
    bookingWindow = 60,
    onSelect
}: {
    merchantId: string
    duration: number
    schedule: any[]
    overrides?: any[]
    selectedDateTime: string | null
    noticePeriod?: number
    bookingWindow?: number
    onSelect: (datetime: string) => void
}) {
    const [viewDate, setViewDate] = useState<Date>(startOfToday())
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday())
    const [availableSlots, setAvailableSlots] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    // Generate days for the current view month
    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewDate))
        const end = endOfWeek(endOfMonth(viewDate))
        return eachDayOfInterval({ start, end })
    }, [viewDate])

    useEffect(() => {
        if (!merchantId || !selectedDate) return
        let isMounted = true

        async function fetchAvailability() {
            setLoading(true)
            try {
                const dateStr = format(selectedDate, 'yyyy-MM-dd')
                const dayOfWeek = selectedDate.getDay() // 0 is Sunday, 1 is Monday

                // Find if merchant is open
                const daySchedule = schedule.find(s => s.day_of_week === dayOfWeek)
                const override = overrides?.find(o => o.override_date === dateStr)

                // If closed by override
                if (override?.is_closed) {
                    if (isMounted) setAvailableSlots([])
                    return
                }

                // If not open by regular schedule and no override with custom hours
                if (!daySchedule?.is_available && !override) {
                    if (isMounted) setAvailableSlots([])
                    return
                }

                const startTime = override?.start_time || daySchedule?.start_time
                const endTime = override?.end_time || daySchedule?.end_time

                if (!startTime || !endTime) {
                    if (isMounted) setAvailableSlots([])
                    return
                }

                // Fetch booked spans
                const res = await fetch(`/api/bookings/availability?merchant_id=${merchantId}&date=${dateStr}`)
                if (!res.ok) throw new Error('Gagal memuat jadwal')
                const { booked_spans } = await res.json()

                // Generate slots
                const slots: string[] = []
                const [startH, startM] = startTime.split(':').map(Number)
                const [endH, endM] = endTime.split(':').map(Number)

                let currentMins = startH * 60 + startM
                const endMins = endH * 60 + endM

                while (currentMins + duration <= endMins) {
                    const h = Math.floor(currentMins / 60).toString().padStart(2, '0')
                    const m = (currentMins % 60).toString().padStart(2, '0')
                    const timeSlot = `${h}:${m}`

                    // Check overlap with bookings AND notice period
                    const now = new Date()
                    const slotDateTime = parseISO(`${dateStr}T${timeSlot}:00`)
                    const isWithinNotice = isBefore(slotDateTime, addHours(now, noticePeriod))

                    const isOverlapping = (booked_spans || []).some((span: any) => {
                        const [spanStartH, spanStartM] = span.start.split(':').map(Number)
                        const [spanEndH, spanEndM] = span.end.split(':').map(Number)
                        const spanStartMins = spanStartH * 60 + spanStartM
                        const spanEndMins = spanEndH * 60 + spanEndM
                        // General overlap check: (slotStart < spanEnd && slotEnd > spanStart)
                        return currentMins < spanEndMins && (currentMins + duration) > spanStartMins
                    })

                    if (!isOverlapping && !isWithinNotice) {
                        slots.push(timeSlot)
                    }
                    currentMins += Math.min(15, duration) // Step by 15 mins or duration if smaller
                }

                if (isMounted) setAvailableSlots(slots)
            } catch (err) {
                console.error(err)
                if (isMounted) setAvailableSlots([])
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchAvailability()
        return () => { isMounted = false }
    }, [merchantId, selectedDate, duration, schedule, overrides])

    const nextMonth = () => setViewDate(addMonths(viewDate, 1))
    const prevMonth = () => setViewDate(subMonths(viewDate, 1))

    return (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm transition-all duration-300">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="text-teal-600" size={18} />
                    <h4 className="font-semibold text-stone-900 text-sm">Pilih Tanggal</h4>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-stone-700">
                        {format(viewDate, 'MMMM yyyy', { locale: id })}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 text-stone-400 hover:text-teal-700 hover:bg-white rounded-lg border border-stone-200"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 text-stone-400 hover:text-teal-700 hover:bg-white rounded-lg border border-stone-200"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white">
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                        <div key={day} className="text-center text-[10px] font-bold text-stone-400 uppercase py-1">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, i) => {
                        const isCurrentMonth = isSameMonth(day, viewDate)
                        const isSelected = isSameDay(day, selectedDate)
                        const isPast = isBefore(day, startOfToday())
                        const isOutsideWindow = isAfter(day, addDays(startOfToday(), bookingWindow))
                        const isDisabled = isPast || isOutsideWindow
                        const today = isToday(day)

                        return (
                            <button
                                key={i}
                                disabled={isDisabled}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    relative h-11 flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                                    ${!isCurrentMonth ? 'text-stone-300' : 'text-stone-700'}
                                    ${isSelected ? 'bg-teal-700 text-white shadow-md scale-105 z-10' : 'hover:bg-teal-50 hover:text-teal-700'}
                                    ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer'}
                                    ${today && !isSelected ? 'ring-1 ring-teal-200' : ''}
                                `}
                            >
                                <span>{format(day, 'd')}</span>
                                {today && !isSelected && (
                                    <span className="absolute bottom-1 w-1 h-1 bg-teal-500 rounded-full"></span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="p-4 md:p-5 border-t border-stone-100 bg-stone-50/30">
                <div className="text-sm font-medium text-stone-600 mb-4 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs text-stone-400 uppercase tracking-wider">Jam Tersedia</span>
                        <span className="text-stone-900">{format(selectedDate, 'EEEE, dd MMMM', { locale: id })}</span>
                    </div>
                    {loading && <Loader2 size={16} className="animate-spin text-teal-600" />}
                </div>

                {loading ? (
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-11 bg-stone-100 animate-pulse rounded-xl"></div>)}
                    </div>
                ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-stone-500 text-sm border border-stone-200 border-dashed rounded-xl bg-white/80">
                        Penjadwalan penuh atau tidak tersedia pada hari ini.
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {availableSlots.map((time, i) => {
                            const datetimeStr = `${format(selectedDate, 'yyyy-MM-dd')}T${time}:00`
                            const isSelected = selectedDateTime === datetimeStr
                            return (
                                <button
                                    key={i}
                                    onClick={() => onSelect(datetimeStr)}
                                    className={`py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${isSelected
                                        ? 'bg-teal-700 border-teal-700 text-white ring-2 ring-teal-700 ring-offset-2 scale-[0.98]'
                                        : 'bg-white border border-stone-200 text-stone-700 hover:border-teal-600 hover:text-teal-700 hover:shadow-md'
                                        }`}
                                >
                                    {time}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
