import Link from 'next/link'
import { Check } from 'lucide-react'

const plans = [
  {
    id: 'solo',
    name: 'Solo',
    price: '99.000',
    desc: 'Untuk freelancer & bisnis 1 orang',
    features: [
      '1 kalender',
      'QRIS & transfer bank',
      'Booking tak terbatas',
      'Link booking publik',
      'Dashboard dasar',
    ],
    cta: 'Mulai Solo',
    highlighted: false,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '199.000',
    desc: 'Untuk studio & tim',
    features: [
      'Kalender multi-staff (s/d 10)',
      'QRIS & transfer bank',
      'Booking tak terbatas',
      'Link booking publik',
      'Manajemen tim & jadwal',
      'Google Calendar sync',
      'Laporan booking',
    ],
    cta: 'Mulai Studio',
    highlighted: true,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-5">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-medium text-teal-600 uppercase tracking-widest">Harga</span>
          <h2 className="font-display text-3xl md:text-4xl text-stone-900 mt-3 mb-4">
            Harga yang masuk akal
          </h2>
          <p className="text-stone-500">Tidak ada biaya tersembunyi. Bayar bulanan, batalkan kapan saja.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {plans.map(plan => (
            <div key={plan.id} className={`p-8 rounded-2xl border-2 relative ${
              plan.highlighted ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-200 bg-white'
            }`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                  Paling Populer
                </div>
              )}
              <div className="mb-6">
                <div className={`text-sm font-medium mb-1 ${plan.highlighted ? 'text-teal-200' : 'text-stone-500'}`}>
                  Paket {plan.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-sm ${plan.highlighted ? 'text-teal-200' : 'text-stone-500'}`}>Rp</span>
                  <span className="font-display text-4xl font-medium">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-teal-200' : 'text-stone-400'}`}>/bulan</span>
                </div>
                <div className={`text-sm mt-1 ${plan.highlighted ? 'text-teal-200' : 'text-stone-400'}`}>{plan.desc}</div>
              </div>

              <ul className="space-y-2.5 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check size={15} className={plan.highlighted ? 'text-teal-300' : 'text-teal-600'} />
                    <span className={`text-sm ${plan.highlighted ? 'text-teal-100' : 'text-stone-600'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register" className={`block text-center text-sm font-medium py-3 rounded-xl transition-all ${
                plan.highlighted ? 'bg-white text-teal-700 hover:bg-teal-50' : 'bg-teal-700 text-white hover:bg-teal-800'
              }`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
