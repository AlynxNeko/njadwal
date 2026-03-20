import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, User, Phone, Mail, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import CancelButton from './CancelButton'

export default async function BookingDetailPage({
    params
}: {
    params: { id: string }
}) {
    const supabase = createClient()
    const { data: booking } = await supabase
        .from('bookings')
        .select('*, services(name), staff(name)')
        .eq('id', params.id)
        .single()

    if (!booking) notFound()

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'confirmed': return { label: 'Terkonfirmasi', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle }
            case 'pending_payment': return { label: 'Menunggu Pembayaran', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock }
            case 'completed': return { label: 'Selesai', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: CheckCircle }
            case 'cancelled': return { label: 'Dibatalkan', color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle }
            case 'no_show': return { label: 'Tidak Hadir', color: 'text-stone-600 bg-stone-50 border-stone-200', icon: AlertCircle }
            default: return { label: status, color: 'text-stone-600 bg-stone-50 border-stone-200', icon: AlertCircle }
        }
    }

    const statusInfo = getStatusInfo(booking.status)
    const StatusIcon = statusInfo.icon

    return (
        <div className="space-y-6 animate-in fade-in max-w-2xl pb-10">
            <Link href="/bookings" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors">
                <ArrowLeft size={16} /> Kembali ke Daftar
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl text-stone-900 tracking-tight">Detail Booking</h1>
                    <p className="text-stone-500 mt-1 text-sm">Informasi lengkap pemesanan pelanggan.</p>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${statusInfo.color}`}>
                    <StatusIcon size={14} />
                    {statusInfo.label}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Information Card */}
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                        <h3 className="text-sm font-semibold text-stone-900">Data Pelanggan</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                <User size={20} className="text-stone-500" />
                            </div>
                            <div>
                                <div className="text-xs text-stone-400 uppercase font-semibold tracking-wider">Nama</div>
                                <div className="text-stone-900 font-medium">{booking.customer_name}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                    <Phone size={20} className="text-stone-500" />
                                </div>
                                <div>
                                    <div className="text-xs text-stone-400 uppercase font-semibold tracking-wider">Phone</div>
                                    <div className="text-stone-900 font-medium">{booking.customer_phone || '-'}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                    <Mail size={20} className="text-stone-500" />
                                </div>
                                <div>
                                    <div className="text-xs text-stone-400 uppercase font-semibold tracking-wider">Email</div>
                                    <div className="text-stone-900 font-medium truncate max-w-[200px]">{booking.customer_email || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service Card */}
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                        <h3 className="text-sm font-semibold text-stone-900">Rincian Layanan</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                                        <CheckCircle size={20} className="text-teal-600" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-stone-400 uppercase font-semibold tracking-wider">Layanan</div>
                                        <div className="text-stone-900 font-medium">{booking.services?.name}</div>
                                    </div>
                                </div>
                                {booking.staff && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                            <User size={20} className="text-stone-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-stone-400 uppercase font-semibold tracking-wider">Staf / Kalender</div>
                                            <div className="text-stone-900 font-medium">{booking.staff.name}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                        <Calendar size={20} className="text-stone-500" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-stone-400 uppercase font-semibold tracking-wider">Tanggal</div>
                                        <div className="text-stone-900 font-medium">
                                            {format(parseISO(booking.start_time_utc), 'dd MMMM yyyy', { locale: id })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                                        <Clock size={20} className="text-stone-500" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-stone-400 uppercase font-semibold tracking-wider">Waktu</div>
                                        <div className="text-stone-900 font-medium">
                                            {format(parseISO(booking.start_time_utc), 'HH:mm')} - {format(parseISO(booking.end_time_utc), 'HH:mm')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Card */}
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                        <h3 className="text-sm font-semibold text-stone-900">Pembayaran</h3>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                            <div className="flex items-center gap-3">
                                <CreditCard size={20} className="text-stone-400" />
                                <div>
                                    <div className="text-xs text-stone-400 font-medium">Status Pembayaran</div>
                                    <div className={`text-sm font-semibold ${booking.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                        {booking.payment_status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-stone-400 font-medium">Total Harga</div>
                                <div className="text-lg font-display text-stone-900 font-bold">
                                    Rp {booking.amount_idr.toLocaleString('id-ID')}
                                </div>
                            </div>
                        </div>

                        {booking.payment_status === 'paid' && (
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                                    <div className="text-[10px] uppercase text-stone-400 font-bold tracking-wider">Metode</div>
                                    <div className="text-sm font-medium text-stone-700">{booking.xendit_payment_method || 'Xendit'}</div>
                                </div>
                                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                                    <div className="text-[10px] uppercase text-stone-400 font-bold tracking-wider">Waktu Bayar</div>
                                    <div className="text-sm font-medium text-stone-700">
                                        {booking.paid_at ? format(parseISO(booking.paid_at), 'dd/MM/yy HH:mm') : '-'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {booking.xendit_invoice_id && booking.payment_status !== 'paid' && (
                            <div className="mt-4">
                                <div className="text-[10px] uppercase text-stone-400 font-bold tracking-wider mb-1">ID Invoice Xendit</div>
                                <div className="text-sm font-mono text-stone-600 break-all">{booking.xendit_invoice_id}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes */}
                {booking.notes && (
                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50">
                            <h3 className="text-sm font-semibold text-stone-900">Catatan Pelanggan</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-stone-600 leading-relaxed italic">
                                "{booking.notes}"
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-8 flex justify-end">
                <CancelButton id={booking.id} currentStatus={booking.status} />
            </div>
        </div>
    )
}
