'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import ServicePicker from '@/components/booking/ServicePicker'
import DateTimePicker from '@/components/booking/DateTimePicker'
import CustomerForm from '@/components/booking/CustomerForm'

export default function PublicBookingPage({ params }: { params: { slug: string } }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)

    const [merchant, setMerchant] = useState<any>(null)
    const [services, setServices] = useState<any[]>([])
    const [schedule, setSchedule] = useState<any[]>([])

    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
    const [selectedDateTime, setSelectedDateTime] = useState<string | null>(null)

    useEffect(() => {
        async function fetchMerchantData() {
            // Fetch merchant by slug
            const { data: mData, error: mErr } = await supabase
                .from('merchants')
                .select('*')
                .eq('slug', params.slug)
                .single()

            if (mErr || !mData) {
                setLoading(false)
                return
            }
            setMerchant(mData)

            // Fetch services
            const { data: sData } = await supabase
                .from('services')
                .select('*')
                .eq('merchant_id', mData.id)
                .eq('is_active', true)
                .order('sort_order', { ascending: true })
            if (sData) setServices(sData)

            // Fetch schedule
            const { data: schData } = await supabase
                .from('availability')
                .select('*')
                .eq('merchant_id', mData.id)
            if (schData) setSchedule(schData)

            // Fetch overrides
            const { data: ovrData } = await supabase
                .from('availability_overrides')
                .select('*')
                .eq('merchant_id', mData.id)

            setMerchant({ ...mData, overrides: ovrData || [] })

            setLoading(false)
        }

        fetchMerchantData()
    }, [params.slug])

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-teal-600" />
            </div>
        )
    }

    if (!merchant) {
        return (
            <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-5 text-center">
                <h1 className="text-xl font-medium text-stone-900 mb-2">Halaman tidak ditemukan</h1>
                <p className="text-stone-500 text-sm">Cek kembali URL yang kamu tuju.</p>
            </div>
        )
    }

    const selectedService = services.find(s => s.id === selectedServiceId)

    // Format DateTime for CustomerForm
    const dateStr = selectedDateTime ? selectedDateTime.split('T')[0] : ''
    const timeStr = selectedDateTime ? selectedDateTime.split('T')[1].substring(0, 5) : ''

    return (
        <div className="min-h-screen bg-stone-50">
            {/* Dynamic Header */}
            <div className="px-5 py-8 md:py-12 bg-white border-b border-stone-200">
                <div className="max-w-xl mx-auto flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-sm" style={{ backgroundColor: merchant.booking_color || '#0f766e' }}>
                        {merchant.business_name.substring(0, 1).toUpperCase()}
                    </div>
                    <h1 className="font-display text-2xl md:text-3xl text-stone-900 tracking-tight">{merchant.business_name}</h1>
                    {merchant.description && (
                        <p className="text-stone-500 mt-2 text-sm max-w-sm">{merchant.description}</p>
                    )}
                </div>
            </div>

            <div className="max-w-xl mx-auto px-5 py-8 md:py-12">
                {step === 1 && (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                        <h2 className="text-lg font-semibold text-stone-900 mb-4">Pilih Layanan</h2>
                        <ServicePicker
                            services={services}
                            selectedId={selectedServiceId}
                            onSelect={id => setSelectedServiceId(id)}
                        />
                        {selectedServiceId && (
                            <button
                                onClick={() => setStep(2)}
                                className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-800 transition-colors"
                                style={{ backgroundColor: merchant.booking_color }}
                            >
                                Lanjutkan
                            </button>
                        )}
                    </div>
                )}

                {step === 2 && selectedService && (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <button onClick={() => setStep(1)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-200 transition-colors">
                                <ArrowLeft size={18} />
                            </button>
                            <h2 className="text-lg font-semibold text-stone-900">Pilih Waktu</h2>
                        </div>

                        <DateTimePicker
                            merchantId={merchant.id}
                            duration={selectedService.duration_minutes}
                            schedule={schedule}
                            overrides={merchant.overrides || []}
                            selectedDateTime={selectedDateTime}
                            onSelect={dt => setSelectedDateTime(dt)}
                        />

                        {selectedDateTime && (
                            <button
                                onClick={() => setStep(3)}
                                className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-800 transition-colors"
                                style={{ backgroundColor: merchant.booking_color }}
                            >
                                Lanjutkan
                            </button>
                        )}
                    </div>
                )}

                {step === 3 && selectedService && selectedDateTime && (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                        <h2 className="text-lg font-semibold text-stone-900 mb-4">Detail Pemesanan</h2>
                        <CustomerForm
                            merchant={merchant}
                            service={selectedService}
                            staff={null} // Simplified: no staff picker for now
                            date={dateStr}
                            time={timeStr}
                            onBack={() => setStep(2)}
                        />
                    </div>
                )}
            </div>

            <div className="text-center pb-8 pt-4">
                <span className="text-xs text-stone-400 font-medium tracking-wide flex items-center justify-center gap-1.5">
                    POWERED BY <span className="font-bold text-stone-500">NJADWAL</span>
                </span>
            </div>
        </div>
    )
}
