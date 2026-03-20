import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { xenditClient } from '@/lib/xendit'

export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()
    const supabase = createClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('*, merchants(business_name, slug, city, xendit_sub_account_id), services(name)')
      .eq('id', booking_id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.amount_idr === 0) return NextResponse.json({ free: true })

    // If invoice already exists, fetch the latest from Xendit to get all details (including bank VAs)
    if (booking.xendit_invoice_id) {
      const invoiceResponse = await fetch(`https://api.xendit.co/v2/invoices/${booking.xendit_invoice_id}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY! + ':').toString('base64')}`,
        },
      })
      if (invoiceResponse.ok) {
        const invoice = await invoiceResponse.json()
        const qrisData = (invoice.available_qr_codes?.[0] || invoice.available_qris_codes?.[0]) || null
        return NextResponse.json({
          invoice_id: invoice.id,
          qr_string: qrisData?.qr_string || booking.xendit_qr_string,
          qr_image_url: qrisData?.qr_image_url || booking.xendit_qr_url,
          invoice_url: invoice.invoice_url,
          expires_at: invoice.expiry_date,
          available_banks: invoice.available_banks || [],
        })
      }
    }

    const expiryTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Create Xendit invoice
    // The invoice comes back with a qr_code object for QRIS
    const invoicePayload: any = {
      external_id: booking.xendit_external_id,
      amount: booking.amount_idr,
      description: `Booking ${booking.services.name} — ${booking.merchants.business_name}`,
      currency: 'IDR',
      invoice_duration: 3600,
      success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/success?booking_id=${booking_id}`,
      failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/checkout?booking_id=${booking_id}&error=failed`,
      payment_methods: ['QRIS', 'BCA', 'MANDIRI', 'BNI', 'BRI', 'PERMATA'],
    }

    // Route to merchant's Xendit sub-account if connected
    const headers: any = {}
    if (booking.merchants.xendit_sub_account_id) {
      headers['for-user-id'] = booking.merchants.xendit_sub_account_id
    }

    const invoiceResponse = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY! + ':').toString('base64')}`,
        ...headers,
      },
      body: JSON.stringify(invoicePayload),
    })

    const invoice = await invoiceResponse.json()

    if (!invoiceResponse.ok) {
      console.error('Xendit error:', invoice)
      return NextResponse.json({ error: 'Gagal membuat invoice' }, { status: 500 })
    }

    // Extract QRIS data from invoice
    // Xendit invoice returns available_qr_codes (some docs say available_qris_codes, but v2 uses qr_codes)
    const qrisData = (invoice.available_qr_codes?.[0] || invoice.available_qris_codes?.[0]) || null
    const qrString = qrisData?.qr_string || null
    const qrImageUrl = qrisData?.qr_image_url || null

    // Save to booking
    await supabase.from('bookings').update({
      xendit_invoice_id: invoice.id,
      xendit_invoice_url: invoice.invoice_url,
      xendit_qr_string: qrString,
      xendit_qr_url: qrImageUrl,
      xendit_invoice_expires_at: expiryTime.toISOString(),
    }).eq('id', booking_id)

    return NextResponse.json({
      invoice_id: invoice.id,
      qr_string: qrString,
      qr_image_url: qrImageUrl,
      invoice_url: invoice.invoice_url,
      expires_at: expiryTime.toISOString(),
      // Also return VA options for non-QRIS
      available_banks: invoice.available_banks || [],
    })

  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
