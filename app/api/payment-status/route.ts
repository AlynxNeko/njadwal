import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const booking_id = searchParams.get('booking_id')

  if (!booking_id) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

  const supabase = createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('payment_status, status, xendit_invoice_expires_at')
    .eq('id', booking_id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const expired = booking.xendit_invoice_expires_at
    ? new Date(booking.xendit_invoice_expires_at) < now
    : false

  return NextResponse.json({
    payment_status: booking.payment_status,
    booking_status: booking.status,
    is_paid: booking.payment_status === 'paid',
    is_expired: expired && booking.payment_status !== 'paid',
  })
}
