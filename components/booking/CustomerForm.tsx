'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatRupiah } from '@/lib/utils'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface Props {
  merchant: any
  service: any
  staff: any
  date: string
  time: string
  onBack: () => void
}

export default function CustomerForm({ merchant, service, staff, date, time, onBack }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchant.id,
        service_id: service.id,
        staff_id: staff?.id || null,
        date,
        time,
        customer_name: name,
        customer_phone: phone || null,
        customer_email: email || null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Gagal membuat booking')
      setLoading(false)
      return
    }

    if (data.is_free) {
      // Free service — confirm directly, go to success
      router.push(`/book/${merchant.slug}/success?booking_id=${data.booking_id}`)
      return
    }

    // Paid service — go to checkout page with QRIS
    router.push(`/book/${merchant.slug}/checkout?booking_id=${data.booking_id}`)
  }

  const parsedDate = new Date(`${date}T${time}`)
  const formattedDate = format(parsedDate, "EEEE, d MMMM yyyy", { locale: idLocale })

  return (
    <div>
      <button onClick={onBack} className="text-xs text-teal-600 hover:underline mb-4 block">← Kembali</button>

      {/* Summary card */}
      <div className="bg-stone-50 rounded-xl p-4 mb-5">
        <div className="text-sm font-medium text-stone-700 mb-1">{service.name}</div>
        <div className="text-xs text-stone-400 space-y-0.5">
          <div>📅 {formattedDate} · {time}</div>
          {staff && <div>👤 {staff.name}</div>}
          <div className="font-medium text-teal-600 text-sm mt-2">
            {service.price_idr === 0 ? 'Gratis' : formatRupiah(service.price_idr)}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">Nama Lengkap *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Budi Santoso" required />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">
            Nomor HP <span className="text-stone-300 font-normal">(opsional)</span>
          </label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="0812-3456-7890" />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">
            Email <span className="text-stone-300 font-normal">(opsional, untuk bukti booking)</span>
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="budi@email.com" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-60">
          {loading ? 'Memproses...' : (
            <>
              {service.price_idr === 0 ? 'Konfirmasi Booking' : 'Lanjut ke Pembayaran'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
