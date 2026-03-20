import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { parseBookingIdFromExternal } from '@/lib/xendit'

export async function POST(req: NextRequest) {
  const callbackToken = req.headers.get('x-callback-token')
  if (callbackToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await req.json()
  const supabase = createAdminClient()

  if (payload.status === 'PAID') {
    // external_id = 'NJADWAL-{booking_id}'
    const bookingId = parseBookingIdFromExternal(payload.external_id)

    await supabase.from('bookings').update({
      payment_status: 'paid',
      status: 'confirmed',
      paid_at: new Date().toISOString(),
      xendit_payment_method: payload.payment_method || null,
    }).eq('id', bookingId)
  }

  if (payload.status === 'EXPIRED') {
    const bookingId = parseBookingIdFromExternal(payload.external_id)
    // Don't cancel booking — just let it sit as pending_payment
    // Merchant can manually cancel, or user can create new invoice
    await supabase.from('bookings').update({
      status: 'cancelled',
      payment_status: 'unpaid',
    }).eq('id', bookingId).eq('payment_status', 'unpaid') // only if still unpaid
  }

  return NextResponse.json({ received: true })
}
