import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { localToUTC } from '@/lib/timezone'
import { normalizePhone } from '@/lib/utils'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { merchant_id, service_id, staff_id, date, time, customer_name, customer_phone, customer_email } = body

    const supabase = createClient()

    const { data: merchant } = await supabase.from('merchants').select('timezone').eq('id', merchant_id).single()
    const { data: service } = await supabase.from('services').select('duration_minutes, price_idr').eq('id', service_id).single()

    if (!merchant || !service) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const timezone = merchant.timezone || 'Asia/Jakarta'
    const startUtc = localToUTC(date, time, timezone)
    const endUtc = new Date(startUtc.getTime() + service.duration_minutes * 60000)

    const { data: result, error } = await supabase.rpc('book_slot', {
      p_merchant_id: merchant_id,
      p_staff_id: staff_id || null,
      p_service_id: service_id,
      p_start_time_utc: startUtc.toISOString(),
      p_end_time_utc: endUtc.toISOString(),
      p_customer_name: customer_name,
      p_customer_phone: customer_phone ? normalizePhone(customer_phone) : null,
      p_customer_email: customer_email || null,
      p_amount_idr: service.price_idr,
      p_local_date: date,
      p_local_start_time: time,
      p_timezone: timezone,
    })

    if (error || !result?.[0]?.booking_id) {
      if (result?.[0]?.error === 'SLOT_TAKEN') {
        return NextResponse.json({ error: 'Slot sudah terpesan. Pilih waktu lain.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Gagal membuat booking' }, { status: 500 })
    }

    return NextResponse.json({
      booking_id: result[0].booking_id,
      external_id: result[0].external_id,
      amount_idr: service.price_idr,
      is_free: service.price_idr === 0,
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
