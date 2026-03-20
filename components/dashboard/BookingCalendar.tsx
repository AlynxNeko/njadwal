'use client'

import { useState, useMemo } from 'react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    parseISO,
    isToday
} from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from 'lucide-react'
import Link from 'next/link'

interface Booking {
    id: string
    customer_name: string
    start_time_utc: string
    status: string
    services?: { name: string }
}

export default function BookingCalendar({ bookings }: { bookings: Booking[] }) {
    const [viewDate, setViewDate] = useState(new Date())

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewDate))
        const end = endOfWeek(endOfMonth(viewDate))
        return eachDayOfInterval({ start, end })
    }, [viewDate])

    const getBookingsForDay = (day: Date) => {
        return bookings.filter(b => isSameDay(parseISO(b.start_time_utc), day))
            .sort((a, b) => a.start_time_utc.localeCompare(b.start_time_utc))
    }

    const nextMonth = () => setViewDate(addMonths(viewDate, 1))
    const prevMonth = () => setViewDate(subMonths(viewDate, 1))

    return (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm animate-in fade-in duration-500">
            {/* Calendar Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                    <div className="bg-teal-100 text-teal-700 p-2 rounded-lg">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-900 leading-none">
                            {format(viewDate, 'MMMM yyyy', { locale: id })}
                        </h3>
                        <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mt-1">Calendar View</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 text-stone-600 hover:bg-white hover:text-teal-700 rounded-xl border border-stone-200 transition-all shadow-sm"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => setViewDate(new Date())}
                        className="px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-white hover:text-teal-700 rounded-xl border border-stone-200 transition-all shadow-sm"
                    >
                        Hari Ini
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 text-stone-600 hover:bg-white hover:text-teal-700 rounded-xl border border-stone-200 transition-all shadow-sm"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 border-b border-stone-100">
                {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => (
                    <div key={day} className="py-3 text-center text-[11px] font-bold text-stone-400 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-[120px]">
                {days.map((day, i) => {
                    const dayBookings = getBookingsForDay(day)
                    const isCurrentMonth = isSameMonth(day, viewDate)
                    const today = isToday(day)

                    return (
                        <div
                            key={i}
                            className={`
                                border-r border-b border-stone-100 p-2 transition-colors
                                ${!isCurrentMonth ? 'bg-stone-50/40' : 'bg-white'}
                                ${today ? 'bg-teal-50/30' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`
                                    text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                                    ${today ? 'bg-teal-700 text-white shadow-sm' : isCurrentMonth ? 'text-stone-700' : 'text-stone-300'}
                                `}>
                                    {format(day, 'd')}
                                </span>
                                {dayBookings.length > 0 && (
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                                        {dayBookings.length}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                {dayBookings.slice(0, 3).map((booking) => (
                                    <Link
                                        key={booking.id}
                                        href={`/bookings/${booking.id}`}
                                        className={`
                                            block px-1.5 py-0.5 text-[10px] rounded border truncate transition-all
                                            ${booking.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100 hover:border-green-300' :
                                                booking.status === 'pending_payment' ? 'bg-amber-50 text-amber-700 border-amber-100 hover:border-amber-300' :
                                                    'bg-stone-50 text-stone-600 border-stone-100 hover:border-stone-300'}
                                        `}
                                    >
                                        <span className="font-bold">{format(parseISO(booking.start_time_utc), 'HH:mm')}</span> {booking.customer_name}
                                    </Link>
                                ))}
                                {dayBookings.length > 3 && (
                                    <div className="text-[9px] text-stone-400 font-medium pl-1 italic">
                                        + {dayBookings.length - 3} lainnya
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e7e5e4; border-radius: 10px; }
            `}</style>
        </div>
    )
}
