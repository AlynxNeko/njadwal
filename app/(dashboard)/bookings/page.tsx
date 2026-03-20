'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar as CalendarIcon, Loader2, Search, Filter, LayoutList, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import BookingCalendar from '@/components/dashboard/BookingCalendar'

export default function BookingsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [bookings, setBookings] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')


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

    const filteredBookings = bookings.filter(booking => {
        const matchesSearch =
            booking.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.xendit_invoice_id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

        return matchesSearch && matchesStatus;
    })


    if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></div>

    return (
        <div className="space-y-6 animate-in fade-in max-w-5xl pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-teal-600 mb-1">
                        <CalendarIcon size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Penjadwalan</span>
                    </div>
                    <h1 className="font-display text-3xl text-stone-900 tracking-tight">Manajemen Booking</h1>
                    <p className="text-stone-500 mt-1 text-sm">Lihat dan konfirmasi jadwal temu pelanggan Anda.</p>
                </div>

                <div className="flex items-center bg-stone-100 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        <LayoutList size={16} />
                        List
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'calendar' ? 'bg-white text-teal-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        <Calendar size={16} />
                        Calendar
                    </button>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <BookingCalendar bookings={filteredBookings} />
            ) : (
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col animate-in slide-in-from-bottom-2 duration-400">
                    <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row gap-4 justify-between bg-stone-50/50">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                            <input
                                type="text"
                                placeholder="Cari nama atau invoice..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="flex items-center justify-center gap-2 px-4 py-2 border border-stone-200 bg-white rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                            >
                                <option value="all">Semua Status</option>
                                <option value="confirmed">Terkonfirmasi</option>
                                <option value="pending_payment">Menunggu Pembayaran</option>
                                <option value="completed">Selesai</option>
                                <option value="cancelled">Dibatalkan</option>
                                <option value="no_show">Tidak Hadir</option>
                            </select>
                        </div>
                    </div>


                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-stone-100 bg-stone-50/80">
                                    <th className="px-6 py-4 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Pelanggan</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Layanan</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Waktu</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-stone-500 uppercase tracking-wider text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filteredBookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-stone-500 text-sm">
                                            <CalendarIcon size={32} className="mx-auto text-stone-300 mb-3" />
                                            {searchTerm || statusFilter !== 'all' ? 'Tidak ada booking yang cocok.' : 'Belum ada booking masuk.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBookings.map((booking) => (
                                        <tr key={booking.id} className="hover:bg-teal-50/30 transition-colors">

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-stone-900 text-sm">{booking.customer_name}</div>
                                                <div className="text-xs text-stone-500 mt-0.5 font-medium">{booking.customer_phone}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-stone-900">{booking.services?.name || 'Layanan Dihapus'}</div>
                                                <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1 font-medium">
                                                    Rp {booking.amount_idr.toLocaleString('id-ID')} • {booking.payment_status === 'paid' ? (booking.xendit_payment_method || 'Paid') : 'Belum bayar'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-stone-900">
                                                    {format(parseISO(booking.start_time_utc), 'dd MMM yyyy', { locale: id })}
                                                </div>
                                                <div className="text-xs text-stone-500 mt-0.5 font-medium flex items-center gap-1">
                                                    <Clock size={12} className="text-stone-400" />
                                                    {format(parseISO(booking.start_time_utc), 'HH:mm')} - {format(parseISO(booking.end_time_utc), 'HH:mm')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${getStatusColor(booking.status)}`}>
                                                    {getStatusText(booking.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link href={`/bookings/${booking.id}`} className="text-teal-600 hover:text-teal-900 transition-colors bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-100 font-bold">Detail</Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-widest">
                        <span>Menampilkan {filteredBookings.length} booking</span>
                    </div>

                </div>
            )}
        </div>
    )
}
