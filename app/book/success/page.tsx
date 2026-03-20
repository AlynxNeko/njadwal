import { createClient } from '@/lib/supabase/server'
import { CheckCircle, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatLocalDate, formatLocalTime } from '@/lib/timezone'
import { redirect } from 'next/navigation'

export default async function SuccessPage({
    searchParams,
}: {
    searchParams: { booking_id?: string }
}) {
    if (!searchParams.booking_id) {
        redirect('/')
    }

    const supabase = createClient()
    const { data: booking } = await supabase
        .from('bookings')
        .select('*, services(name), merchants(business_name, slug, booking_color, timezone)')
        .eq('id', searchParams.booking_id)
        .single()

    if (!booking) {
        return (
            <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-5 text-center">
                <h1 className="text-xl font-medium text-stone-900 mb-2">Booking tidak ditemukan</h1>
                <p className="text-stone-500 text-sm">Cek kembali link booking kamu.</p>
                <Link href="/" className="mt-6 text-teal-600 font-medium">Ke Beranda</Link>
            </div>
        )
    }

    const color = booking.merchants?.booking_color || '#0f766e'
    const timezone = booking.merchants?.timezone || 'Asia/Jakarta'
    const merchantSlug = booking.merchants?.slug || ''

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-5 py-12">
            <div className="w-full max-w-sm text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ backgroundColor: color + '15' }}>
                    <CheckCircle size={32} style={{ color }} />
                </div>

                <h1 className="font-display text-2xl text-stone-900 mb-2">
                    {booking.status === 'confirmed' ? 'Booking Terkonfirmasi!' : 'Konfirmasi Terpending'}
                </h1>
                <p className="text-sm text-stone-400 mb-8">
                    {booking.status === 'confirmed'
                        ? 'Sampai bertemu di sana 👋'
                        : 'Pembayaran kamu sedang kami verifikasi. Silakan cek berkala di dashboard.'}
                </p>

                <div className="bg-white rounded-2xl border border-stone-100 p-5 text-left mb-6">
                    <div className="font-medium text-stone-800 mb-3">{booking.merchants?.business_name}</div>
                    <div className="space-y-2 text-sm text-stone-500">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-stone-300 shrink-0" />
                            {formatLocalDate(booking.start_time_utc, timezone)}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-stone-300 shrink-0" />
                            {formatLocalTime(booking.start_time_utc, timezone)} WIB
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs shrink-0">✓</span>
                            {booking.services?.name}
                        </div>
                    </div>
                </div>

                <Link
                    href={`/book/${merchantSlug}`}
                    className="text-sm text-teal-600 hover:underline font-medium"
                >
                    Buat Booking Lagi
                </Link>
            </div>

            <div className="mt-12 text-xs text-stone-300">
                Powered by <Link href="/" className="hover:text-stone-500 transition-colors">Njadwal</Link>
            </div>
        </div>
    )
}
