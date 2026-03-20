'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QRISCheckout from '@/components/booking/QRISCheckout'
import { formatLocalDate, formatLocalTime } from '@/lib/timezone'
import { ArrowLeft } from 'lucide-react'

export default function CheckoutPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const bookingId = searchParams.get('booking_id')
    const [booking, setBooking] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!bookingId) { router.push('/'); return }

        const supabase = createClient()
        supabase
            .from('bookings')
            .select('*, services(name), merchants(business_name, booking_color, timezone, slug)')
            .eq('id', bookingId)
            .single()
            .then(({ data }) => {
                if (!data || data.payment_status === 'paid') {
                    router.push(`/book/success?booking_id=${bookingId}`)
                    return
                }
                setBooking(data)
                setLoading(false)
            })
    }, [bookingId, router])

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="text-sm text-stone-400 animate-pulse">Memuat...</div>
            </div>
        )
    }

    if (!booking) return null

    const color = booking.merchants?.booking_color || '#0f766e'
    const timezone = booking.merchants?.timezone || 'Asia/Jakarta'
    const merchantSlug = booking.merchants?.slug || ''

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Header */}
            <div style={{ backgroundColor: color }} className="px-5 py-6 text-white">
                <div className="max-w-sm mx-auto flex items-center gap-3">
                    <button onClick={() => router.push(`/book/${merchantSlug}`)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="text-xs opacity-70">Pembayaran</div>
                        <div className="font-display text-lg">{booking.merchants?.business_name}</div>
                    </div>
                </div>
            </div>

            <div className="max-w-sm mx-auto px-5 py-6">
                <QRISCheckout
                    bookingId={bookingId!}
                    merchantSlug={merchantSlug}
                    amountIdr={booking.amount_idr}
                    serviceName={booking.services?.name}
                    businessName={booking.merchants?.business_name}
                    localDate={formatLocalDate(booking.start_time_utc, timezone)}
                    localTime={formatLocalTime(booking.start_time_utc, timezone)}
                    onPaid={() => router.push(`/book/success?booking_id=${bookingId}`)}
                    onCancel={async () => {
                        // Cancel the booking
                        const supabase = createClient()
                        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
                        router.push(`/book/${merchantSlug}`)
                    }}
                />
            </div>

            <div className="text-center py-6">
                <a href="/" className="text-xs text-stone-300 hover:text-stone-500">Powered by Njadwal</a>
            </div>
        </div>
    )
}
