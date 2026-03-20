'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, Save, Clock, Calendar, CheckCircle2, AlertCircle, Trash2, Plus, CalendarOff } from 'lucide-react'

const DAYS = [
    { name: 'Minggu', code: 'Sun' },
    { name: 'Senin', code: 'Mon' },
    { name: 'Selasa', code: 'Tue' },
    { name: 'Rabu', code: 'Wed' },
    { name: 'Kamis', code: 'Thu' },
    { name: 'Jumat', code: 'Fri' },
    { name: 'Sabtu', code: 'Sat' }
]

export default function SchedulePage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [merchantId, setMerchantId] = useState<string | null>(null)
    const [overrides, setOverrides] = useState<any[]>([])
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false)
    const [newOverride, setNewOverride] = useState({
        date: '',
        is_closed: true,
        start_time: '09:00',
        end_time: '17:00'
    })

    const [schedule, setSchedule] = useState(
        DAYS.map((day, index) => ({
            id: null as string | null,
            day_of_week: index,
            name: day.name,
            is_available: index !== 0, // Libur hari Minggu by default
            start_time: '09:00',
            end_time: '17:00'
        }))
    )

    useEffect(() => {
        async function loadSchedule() {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: merchant } = await supabase.from('merchants').select('id').eq('owner_id', user.id).single()
                if (merchant) {
                    setMerchantId(merchant.id)
                    const { data } = await supabase.from('availability').select('*').eq('merchant_id', merchant.id).is('staff_id', null)

                    if (data && data.length > 0) {
                        setSchedule(prev => prev.map(day => {
                            const saved = data.find(d => d.day_of_week === day.day_of_week)
                            if (saved) {
                                return {
                                    ...day,
                                    id: saved.id,
                                    is_available: saved.is_available,
                                    start_time: saved.start_time.substring(0, 5),
                                    end_time: saved.end_time.substring(0, 5)
                                }
                            }
                            return day
                        }))
                    }

                    // Load overrides
                    const { data: overrideData } = await supabase
                        .from('availability_overrides')
                        .select('*')
                        .eq('merchant_id', merchant.id)
                        .is('staff_id', null)
                        .order('override_date', { ascending: true })
                    if (overrideData) setOverrides(overrideData)
                }
            } catch (err) {
                console.error('Error loading schedule:', err)
            } finally {
                setLoading(false)
            }
        }
        loadSchedule()
    }, [supabase])

    const handleSave = async () => {
        if (!merchantId) return toast.error('Lengkapi profil merchant terlebih dahulu')
        setSaving(true)

        try {
            // To avoid "availability_pkey" violation, we must be careful with conflict targets.
            // When an ID is present, the default upsert (on PK) is safest.
            // When ID is absent, we use the natural key conflict target.
            const promises = schedule.map(async (day) => {
                const payload: any = {
                    merchant_id: merchantId,
                    staff_id: null,
                    day_of_week: day.day_of_week,
                    is_available: day.is_available,
                    start_time: day.start_time,
                    end_time: day.end_time
                }

                if (day.id) {
                    payload.id = day.id
                    // Default upsert matches on the primary key (id)
                    return supabase.from('availability').upsert(payload).select().single()
                } else {
                    // New record: match on natural unique keys to avoid duplicates
                    return supabase.from('availability').upsert(payload, {
                        onConflict: 'merchant_id,staff_id,day_of_week'
                    }).select().single()
                }
            })

            const results = await Promise.all(promises)
            const errors = results.filter(r => r.error)

            if (errors.length > 0) {
                // If we get a conflict error here, it might be due to NULLs in staff_id.
                // But at least we won't crash with a PK violation.
                throw new Error(errors[0].error?.message || 'Gagal menyimpan beberapa jadwal')
            }

            // Update local state with latest data from DB
            const updatedSchedule = results.map((res, i) => ({
                ...schedule[i],
                id: res.data?.id || schedule[i].id
            }))
            setSchedule(updatedSchedule)

            toast.success('Jadwal operasional berhasil diperbarui', {
                icon: <CheckCircle2 className="text-teal-600" />
            })
        } catch (err: any) {
            toast.error(err.message, {
                icon: <AlertCircle className="text-red-500" />
            })
        } finally {
            setSaving(false)
        }
    }

    const updateDay = (index: number, field: string, value: any) => {
        const updated = [...schedule]
        updated[index] = { ...updated[index], [field]: value }
        setSchedule(updated)
    }

    const handleAddOverride = async () => {
        if (!merchantId) return
        if (!newOverride.date) return toast.error('Pilih tanggal terlebih dahulu')

        setSaving(true)
        try {
            const { data, error } = await supabase
                .from('availability_overrides')
                .upsert({
                    merchant_id: merchantId,
                    staff_id: null,
                    override_date: newOverride.date,
                    is_closed: newOverride.is_closed,
                    start_time: newOverride.is_closed ? null : newOverride.start_time,
                    end_time: newOverride.is_closed ? null : newOverride.end_time
                }, {
                    onConflict: 'merchant_id,staff_id,override_date'
                })
                .select()
                .single()

            if (error) throw error

            setOverrides(prev => {
                const existing = prev.findIndex(o => o.override_date === data.override_date)
                if (existing > -1) {
                    const updated = [...prev]
                    updated[existing] = data
                    return updated.sort((a, b) => a.override_date.localeCompare(b.override_date))
                }
                return [...prev, data].sort((a, b) => a.override_date.localeCompare(b.override_date))
            })

            setIsOverrideModalOpen(false)
            setNewOverride({ date: '', is_closed: true, start_time: '09:00', end_time: '17:00' })
            toast.success('Pengecualian jadwal berhasil ditambahkan')
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteOverride = async (id: string) => {
        try {
            const { error } = await supabase
                .from('availability_overrides')
                .delete()
                .eq('id', id)

            if (error) throw error
            setOverrides(prev => prev.filter(o => o.id !== id))
            toast.success('Pengecualian jadwal berhasil dihapus')
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    if (loading) return (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-sm font-medium text-stone-500">Memuat jadwal...</p>
        </div>
    )

    return (
        <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="font-display text-4xl text-stone-900 tracking-tight">Jadwal Operasional</h1>
                <p className="text-stone-500 text-sm lg:text-base leading-relaxed max-w-xl">
                    Tentukan kapan klien bisa memesan layanan Anda. Pastikan jam operasional akurat untuk menghindari bentrok jadwal.
                </p>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/60 shadow-xl shadow-stone-100/50 overflow-hidden backdrop-blur-sm">
                <div className="divide-y divide-stone-100 px-8 py-6">
                    {schedule.map((day, i) => (
                        <div key={day.day_of_week} className="flex flex-col sm:flex-row sm:items-center py-6 first:pt-2 last:pb-2 gap-6 group transition-all">
                            <div className="w-40 flex items-center gap-4">
                                <label className="relative inline-flex items-center cursor-pointer group/toggle">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={day.is_available}
                                        onChange={(e) => updateDay(i, 'is_available', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-stone-100 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 shadow-inner group-hover/toggle:ring-4 group-hover/toggle:ring-stone-50 transition-all"></div>
                                </label>
                                <span className={`text-[15px] font-semibold transition-colors ${day.is_available ? 'text-stone-900' : 'text-stone-300'}`}>
                                    {day.name}
                                </span>
                            </div>

                            <div className="flex-1 flex items-center gap-3">
                                {day.is_available ? (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="relative">
                                            <input
                                                type="time"
                                                value={day.start_time}
                                                onChange={(e) => updateDay(i, 'start_time', e.target.value)}
                                                className="bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-sm font-medium text-stone-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition-all w-32 text-center"
                                            />
                                        </div>
                                        <span className="text-stone-300 font-medium px-1">—</span>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                value={day.end_time}
                                                onChange={(e) => updateDay(i, 'end_time', e.target.value)}
                                                className="bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-sm font-medium text-stone-900 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition-all w-32 text-center"
                                            />
                                        </div>
                                        <div className="ml-3 hidden md:flex items-center gap-1.5 text-xs text-stone-400 font-medium bg-stone-50 px-3 py-1.5 rounded-full">
                                            <Clock className="h-3 w-3" />
                                            <span>Aktif</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 animate-in fade-in duration-300">
                                        <span className="text-xs font-bold uppercase tracking-widest text-stone-400 bg-stone-50 border border-stone-100 px-4 py-2.5 rounded-2xl min-w-[120px] text-center">
                                            Libur
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-8 py-6 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-stone-500 italic">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Jadwal ini akan berlaku secara permanen setiap minggu.</span>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-8 py-4 rounded-2xl font-semibold text-[15px] hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-stone-200 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Simpan Jadwal Praktik</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-teal-50/50 border border-teal-100/50 rounded-2xl p-6 flex gap-4 items-start">
                <div className="bg-white p-2 rounded-xl shadow-sm text-teal-700">
                    <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-teal-900">Tips Penjadwalan</h4>
                    <p className="text-xs lg:text-sm text-teal-800/70 leading-relaxed">
                        Anda dapat mengubah jadwal ini kapan saja. Perubahan akan langsung berdampak pada ketersediaan slot di halaman booking pelanggan.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-stone-900">Holiday Override & Jam Khusus</h2>
                        <p className="text-stone-500 text-sm">Tambahkan hari libur atau perubahan jam operasional untuk tanggal tertentu.</p>
                    </div>
                    <button
                        onClick={() => setIsOverrideModalOpen(true)}
                        className="inline-flex items-center gap-2 bg-white border border-stone-200 px-4 py-2 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        <span>Tambah Tanggal</span>
                    </button>
                </div>

                {overrides.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-stone-200/60 p-12 text-center space-y-3">
                        <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-400">
                            <CalendarOff size={24} />
                        </div>
                        <p className="text-stone-500 text-sm">Belum ada pengecualian jadwal.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {overrides.map((override) => (
                            <div key={override.id} className="bg-white rounded-2xl border border-stone-200/60 p-5 flex items-center justify-between group hover:border-teal-200 transition-colors shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${override.is_closed ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-600'}`}>
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-stone-900">
                                            {new Date(override.override_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-xs text-stone-500">
                                            {override.is_closed ? 'Tutup / Libur' : `${override.start_time.substring(0, 5)} — ${override.end_time.substring(0, 5)}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteOverride(override.id)}
                                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Override */}
            {isOverrideModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 space-y-6">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-stone-900">Tambah Pengecualian</h3>
                                <p className="text-sm text-stone-500">Tentukan hari libur atau jam khusus.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Pilih Tanggal</label>
                                    <input
                                        type="date"
                                        value={newOverride.date}
                                        onChange={(e) => setNewOverride({ ...newOverride, date: e.target.value })}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Status</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setNewOverride({ ...newOverride, is_closed: true })}
                                            className={`py-3 rounded-2xl text-sm font-medium border transition-all ${newOverride.is_closed ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'}`}
                                        >
                                            Libur / Tutup
                                        </button>
                                        <button
                                            onClick={() => setNewOverride({ ...newOverride, is_closed: false })}
                                            className={`py-3 rounded-2xl text-sm font-medium border transition-all ${!newOverride.is_closed ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'}`}
                                        >
                                            Jam Khusus
                                        </button>
                                    </div>
                                </div>

                                {!newOverride.is_closed && (
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Mulai</label>
                                            <input
                                                type="time"
                                                value={newOverride.start_time}
                                                onChange={(e) => setNewOverride({ ...newOverride, start_time: e.target.value })}
                                                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Selesai</label>
                                            <input
                                                type="time"
                                                value={newOverride.end_time}
                                                onChange={(e) => setNewOverride({ ...newOverride, end_time: e.target.value })}
                                                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsOverrideModalOpen(false)}
                                    className="flex-1 py-4 px-6 rounded-2xl text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleAddOverride}
                                    disabled={saving}
                                    className="flex-1 py-4 px-6 rounded-2xl text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-lg shadow-teal-100 disabled:opacity-50"
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
