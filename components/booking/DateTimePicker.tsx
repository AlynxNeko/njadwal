'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfToday, parseISO, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export default function DateTimePicker({
    merchantId,
    duration,
    schedule,
    selectedDateTime,
    onSelect
}: {
    merchantId: string
    duration: number
    schedule: any[]
    selectedDateTime: string | null
    onSelect: (datetime: string) => void
}) {
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday())
    const [availableSlots, setAvailableSlots] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [dates, setDates] = useState<Date[]>([])

    // Generate next 14 days
    useEffect(() => {
        const today = startOfToday()
        const nextDates = Array.from({ length: 14 }).map((_, i) => addDays(today, i))
        setDates(nextDates)
    }, [])

    useEffect(() => {
        if (!merchantId || !selectedDate) return
        let isMounted = true

        async function fetchAvailability() {
            setLoading(true)
            try {
                const dateStr = format(selectedDate, 'yyyy-MM-dd')
                const dayOfWeek = selectedDate.getDay()

                // Find if merchant is open
                const daySchedule = schedule.find(s => s.day_of_week === dayOfWeek)
                if (!daySchedule || !daySchedule.is_available) {
                    if (isMounted) setAvailableSlots([])
                    return
                }

                // Fetch booked times
                const res = await fetch(`/api/bookings/availability?merchant_id=${merchantId}&date=${dateStr}`)
                if (!res.ok) throw new Error('Gagal memuat jadwal')
                const { booked_times } = await res.json()

                // Generate slots
                // This is a simplified slot generator. Realistically we'd account for duration and overlapping
                const slots: string[] = []
                const [startH, startM] = daySchedule.start_time.split(':').map(Number)
                const [endH, endM] = daySchedule.end_time.split(':').map(Number)

                let currentMins = startH * 60 + startM
                const endMins = endH * 60 + endM

                while (currentMins + duration <= endMins) {
                    const h = Math.floor(currentMins / 60).toString().padStart(2, '0')
                    const m = (currentMins % 60).toString().padStart(2, '0')
                    const timeSlot = `${h}:${m}`

                    // Check overlap with bookings
                    // In a fully accurate system, we check if [currentMins, currentMins+duration] overlaps any booking.
                    // For simplicity here, if the exact slot is in booked_times, we disable it.
                    if (!booked_times.includes(timeSlot)) {
                        slots.push(timeSlot)
                    }
                    currentMins += Math.max(30, duration) // Step by 30 mins or duration
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
    }, [merchantId, selectedDate, duration, schedule])

    const moveDate = (days: number) => {
        const newDate = addDays(selectedDate, days)
        // Only allow within 14 days logic
        const today = startOfToday()
        const maxDate = addDays(today, 13)
        if (newDate >= today && newDate <= maxDate) {
            setSelectedDate(newDate)
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <h4 className="font-semibold text-stone-900 text-sm">Pilih Tanggal & Waktu</h4>
                <div className="flex items-center gap-1">
                    <button onClick={() => moveDate(-1)} className="p-1.5 text-stone-400 hover:text-teal-700 hover:bg-stone-50 rounded-lg"><ChevronLeft size={18} /></button>
                    <button onClick={() => moveDate(1)} className="p-1.5 text-stone-400 hover:text-teal-700 hover:bg-stone-50 rounded-lg"><ChevronRight size={18} /></button>
                </div>
            </div>

            <div className="p-4 bg-stone-50/50">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 snap-x hide-scrollbar">
                    {dates.map((d, i) => {
                        const isSelected = isSameDay(d, selectedDate)
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(d)}
                                className={`flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-xl border min-w-[64px] snap-center transition-colors ${isSelected ? 'bg-teal-700 border-teal-700 text-white shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                                    }`}
                            >
                                <span className={`text-[10px] font-medium uppercase mb-0.5 ${isSelected ? 'text-teal-100' : 'text-stone-400'}`}>
                                    {format(d, 'EEE', { locale: id })}
                                </span>
                                <span className="text-lg font-semibold leading-none">
                                    {format(d, 'dd')}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="p-4 md:p-5">
                <div className="text-sm font-medium text-stone-600 mb-4 flex items-center justify-between">
                    <span>{format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}</span>
                    {loading && <Loader2 size={16} className="animate-spin text-stone-300" />}
                </div>

                {loading ? (
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-10 bg-stone-100 animate-pulse rounded-xl"></div>)}
                    </div>
                ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-stone-500 text-sm border border-stone-200 border-dashed rounded-xl bg-stone-50">
                        Penjadwalan penuh atau tidak tersedia pada hari ini.
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {availableSlots.map((time, i) => {
                            const datetimeStr = `${format(selectedDate, 'yyyy-MM-dd')}T${time}:00`
                            const isSelected = selectedDateTime === datetimeStr
                            return (
                                <button
                                    key={i}
                                    onClick={() => onSelect(datetimeStr)}
                                    className={`py-2 rounded-xl text-sm font-medium transition-all ${isSelected
                                            ? 'bg-teal-700 border-teal-700 text-white ring-2 ring-teal-700 ring-offset-1'
                                            : 'bg-white border border-stone-200 text-stone-700 hover:border-teal-600 hover:text-teal-700'
                                        }`}
                                >
                                    {time}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    )
}
