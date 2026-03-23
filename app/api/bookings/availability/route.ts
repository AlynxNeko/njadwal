import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const merchant_id = searchParams.get('merchant_id')
  const date = searchParams.get('date')
  const staff_id = searchParams.get('staff_id') || null

  if (!merchant_id || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const supabase = createClient()
  const { data: merchant } = await supabase.from('merchants').select('timezone').eq('id', merchant_id).single()
  const timezone = merchant?.timezone || 'Asia/Jakarta'

  const startOfDay = fromZonedTime(`${date}T00:00:00`, timezone)
  const endOfDay = fromZonedTime(`${date}T23:59:59`, timezone)

  let query = supabase
    .from('bookings')
    .select('start_time_utc, end_time_utc')
    .eq('merchant_id', merchant_id)
    .neq('status', 'cancelled')
    .gte('start_time_utc', startOfDay.toISOString())
    .lte('start_time_utc', endOfDay.toISOString())

  if (staff_id) query = query.eq('staff_id', staff_id)

  const { data: bookings } = await query

  const bookedSpans = (bookings || []).map(b => ({
    start: formatInTimeZone(new Date(b.start_time_utc), timezone, 'HH:mm'),
    end: formatInTimeZone(new Date(b.end_time_utc), timezone, 'HH:mm')
  }))

  return NextResponse.json({ booked_spans: bookedSpans })
}
