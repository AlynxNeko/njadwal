'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar as CalendarIcon, Loader2, Search, Filter } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

export default function BookingsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [bookings, setBookings] = useState<any[]>([])

    useEffect(() => {
        async function fetchBookings() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: merchant } = await supabase.from('merchants').select('id').eq('owner_id', user.id).single()
            if (merchant) {
                // Fetch bookings with their related service
                const { data } = await supabase.from('bookings').select('*, services(name)')
                    .eq('merchant_id', merchant.id)
                    .order('start_time_utc', { ascending: false })

                if (data) setBookings(data)
            }
            setLoading(false)
        }
        fetchBookings()
    }, [])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-700 border-green-200'
            case 'pending_payment': return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
            case 'no_show': return 'bg-stone-100 text-stone-600 border-stone-200'
            default: return 'bg-stone-100 text-stone-600 border-stone-200'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Terkonfirmasi'
            case 'pending_payment': return 'Menunggu Pembayaran'
            case 'completed': return 'Selesai'
            case 'cancelled': return 'Dibatalkan'
            case 'no_show': return 'Tidak Hadir'
            default: return status
        }
    }

    if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></div>

    return (
        <div className="space-y-6 animate-in fade-in max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl text-stone-900 tracking-tight">Daftar Booking</h1>
                    <p className="text-stone-500 mt-1 text-sm">Semua jadwal temu yang masuk dari pelanggan.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row gap-4 justify-between bg-stone-50/50">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input type="text" placeholder="Cari nama atau invoice..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow" />
                    </div>
                    <button className="flex items-center justify-center gap-2 px-4 py-2 border border-stone-200 bg-white rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                        <Filter size={16} /> Filter
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-stone-100 bg-stone-50/80">
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Pelanggan</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Layanan</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Waktu</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-stone-500 text-sm">
                                        <CalendarIcon size={32} className="mx-auto text-stone-300 mb-3" />
                                        Belum ada booking masuk.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-stone-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-stone-900 text-sm">{booking.customer_name}</div>
                                            <div className="text-xs text-stone-500 mt-0.5">{booking.customer_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-stone-900">{booking.services?.name || 'Layanan Dihapus'}</div>
                                            <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                                                Rp {booking.amount_idr.toLocaleString('id-ID')} • {booking.payment_method || 'Belum bayar'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-stone-900">
                                                {format(parseISO(booking.start_time_utc), 'dd MMM yyyy', { locale: id })}
                                            </div>
                                            <div className="text-xs text-stone-500 mt-0.5">
                                                {format(parseISO(booking.start_time_utc), 'HH:mm')} - {format(parseISO(booking.end_time_utc), 'HH:mm')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(booking.status)}`}>
                                                {getStatusText(booking.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-teal-600 hover:text-teal-900 hover:underline">Detail</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-sm text-stone-500">
                    <span>Menampilkan {bookings.length} booking</span>
                </div>
            </div>
        </div>
    )
}
