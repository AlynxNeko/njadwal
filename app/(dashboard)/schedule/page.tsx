'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, Save } from 'lucide-react'

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export default function SchedulePage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [merchantId, setMerchantId] = useState<string | null>(null)

    const [schedule, setSchedule] = useState(
        DAYS.map((name, index) => ({
            id: null as string | null,
            day_of_week: index,
            name,
            is_available: index !== 0, // Libur hari Minggu by default
            start_time: '09:00',
            end_time: '17:00'
        }))
    )

    useEffect(() => {
        async function loadSchedule() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: merchant } = await supabase.from('merchants').select('id').eq('owner_id', user.id).single()
            if (merchant) {
                setMerchantId(merchant.id)
                const { data } = await supabase.from('availability').select('*').eq('merchant_id', merchant.id)

                if (data && data.length > 0) {
                    setSchedule(prev => prev.map(day => {
                        const saved = data.find(d => d.day_of_week === day.day_of_week)
                        if (saved) {
                            return {
                                ...day,
                                id: saved.id,
                                is_available: saved.is_available,
                                start_time: saved.start_time.substring(0, 5), // removes seconds
                                end_time: saved.end_time.substring(0, 5)
                            }
                        }
                        return day
                    }))
                }
            }
            setLoading(false)
        }
        loadSchedule()
    }, [])

    const handleSave = async () => {
        if (!merchantId) return toast.error('Harap isi pengaturan profil terlebih dahulu')
        setSaving(true)

        try {
            const upserts = schedule.map(day => ({
                id: day.id || undefined,
                merchant_id: merchantId,
                day_of_week: day.day_of_week,
                is_available: day.is_available,
                start_time: day.start_time,
                end_time: day.end_time
            }))

            const { error } = await supabase.from('availability').upsert(upserts, { onConflict: 'merchant_id,staff_id,day_of_week' })
            if (error) throw error

            toast.success('Jadwal berhasil disimpan')
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const updateDay = (index: number, field: string, value: any) => {
        const updated = [...schedule]
        updated[index] = { ...updated[index], [field]: value }
        setSchedule(updated)
    }

    if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></div>

    return (
        <div className="space-y-8 animate-in fade-in max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl text-stone-900 tracking-tight">Jadwal Praktik</h1>
                    <p className="text-stone-500 mt-1 text-sm">Tentukan jam buka dan tutup bisnismu setiap minggunya.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="divide-y divide-stone-100 p-6">
                    {schedule.map((day, i) => (
                        <div key={day.day_of_week} className="flex flex-col sm:flex-row sm:items-center py-5 first:pt-0 last:pb-0 gap-4">
                            <div className="w-32 flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={day.is_available} onChange={(e) => updateDay(i, 'is_available', e.target.checked)} />
                                    <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                                </label>
                                <span className={`text-sm font-medium ${day.is_available ? 'text-stone-900' : 'text-stone-400'}`}>{day.name}</span>
                            </div>

                            <div className="flex-1 flex items-center gap-2 sm:gap-4">
                                {day.is_available ? (
                                    <>
                                        <input type="time" value={day.start_time} onChange={(e) => updateDay(i, 'start_time', e.target.value)}
                                            className="px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-28 text-center" />
                                        <span className="text-stone-400 text-sm">—</span>
                                        <input type="time" value={day.end_time} onChange={(e) => updateDay(i, 'end_time', e.target.value)}
                                            className="px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-28 text-center" />
                                    </>
                                ) : (
                                    <span className="text-sm font-medium text-stone-400 bg-stone-100 px-3 py-2 rounded-xl">Tutup</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-end">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-text-primary bg-stone-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-stone-800 transition-colors disabled:opacity-50">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Simpan Jadwal
                    </button>
                </div>
            </div>
        </div>
    )
}
