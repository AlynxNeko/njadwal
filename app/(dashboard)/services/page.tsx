'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Clock, DollarSign, Loader2, Briefcase, ChevronRight, MapPin, Calendar } from 'lucide-react'

export default function ServicesPage() {
    const supabase = createClient()
    const [services, setServices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [merchantId, setMerchantId] = useState<string | null>(null)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState({
        name: '',
        description: '',
        duration: 60,
        price: 0,
        location_type: 'in-person' as 'in-person' | 'online' | 'phone' | 'other',
        location_details: '',
        notice_period: 4, // 4 jam default
        booking_window: 60 // 60 hari default
    })
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function fetchServices() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            const { data: merchant } = await supabase.from('merchants').select('id, timezone').eq('owner_id', user.id).single()
            if (merchant) {
                setMerchantId(merchant.id)
                const { data } = await supabase.from('services').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false })
                if (data) {
                    setServices(data)
                }
            }
            setLoading(false)
        }
        fetchServices()
    }, [supabase])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!merchantId) return toast.error('Lengkapi profil merchant terlebih dahulu')
        setSaving(true)

        const servicePayload = {
            name: form.name,
            description: form.description,
            duration_minutes: form.duration,
            price_idr: form.price,
            location_type: form.location_type,
            location_details: form.location_details,
            notice_period_hours: form.notice_period,
            booking_window_days: form.booking_window
        }

        try {
            if (editingId) {
                const { error } = await supabase.from('services').update(servicePayload).eq('id', editingId)

                if (error) {
                    if (error.code === '42703') { // undefined_column
                        const { error: fallbackError } = await supabase.from('services').update({
                            name: form.name,
                            description: JSON.stringify({
                                text: form.description,
                                location: { type: form.location_type, details: form.location_details },
                                rules: { notice_period: form.notice_period, booking_window: form.booking_window }
                            }),
                            duration_minutes: form.duration,
                            price_idr: form.price
                        }).eq('id', editingId)
                        if (fallbackError) throw fallbackError
                    } else {
                        throw error
                    }
                }

                setServices(services.map(s => s.id === editingId ? { ...s, ...servicePayload } : s))
                toast.success('Layanan berhasil diupdate')
            } else {
                const { data, error } = await supabase.from('services').insert({
                    merchant_id: merchantId,
                    ...servicePayload
                }).select().single()

                if (error) {
                    if (error.code === '42703') {
                        const { data: fallbackData, error: fallbackError } = await supabase.from('services').insert({
                            merchant_id: merchantId,
                            name: form.name,
                            description: JSON.stringify({
                                text: form.description,
                                location: { type: form.location_type, details: form.location_details },
                                rules: { notice_period: form.notice_period, booking_window: form.booking_window }
                            }),
                            duration_minutes: form.duration,
                            price_idr: form.price
                        }).select().single()
                        if (fallbackError) throw fallbackError
                        setServices([fallbackData, ...services])
                    } else {
                        throw error
                    }
                } else {
                    setServices([data, ...services])
                }

                toast.success('Layanan baru ditambahkan')
            }
            closeForm()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus layanan ini?')) return
        const { error } = await supabase.from('services').delete().eq('id', id)
        if (error) toast.error('Gagal menghapus layanan')
        else {
            setServices(services.filter(s => s.id !== id))
            toast.success('Layanan dihapus')
        }
    }

    const openEdit = (s: any) => {
        let desc = s.description || ''
        let locType = 'in-person'
        let locDetails = ''
        let notice = 4
        let windowDays = 60

        try {
            const parsed = JSON.parse(s.description)
            if (parsed && typeof parsed === 'object') {
                desc = parsed.text || ''
                locType = parsed.location?.type || 'in-person'
                locDetails = parsed.location?.details || ''
                notice = parsed.rules?.notice_period || 4
                windowDays = parsed.rules?.booking_window || 60
            }
        } catch (e) { }

        setForm({
            name: s.name,
            description: desc,
            duration: s.duration_minutes,
            price: s.price_idr,
            location_type: s.location_type || (locType as any),
            location_details: s.location_details || locDetails,
            notice_period: s.notice_period_hours || notice,
            booking_window: s.booking_window_days || windowDays
        })
        setEditingId(s.id)
        setIsFormOpen(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const closeForm = () => {
        setForm({
            name: '',
            description: '',
            duration: 60,
            price: 0,
            location_type: 'in-person',
            location_details: '',
            notice_period: 4,
            booking_window: 60
        })
        setEditingId(null)
        setIsFormOpen(false)
    }

    if (loading) return (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-sm font-medium text-stone-500">Memuat layanan...</p>
        </div>
    )

    return (
        <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between group">
                <div>
                    <h1 className="font-display text-4xl text-stone-900 tracking-tight">Layanan & Event</h1>
                    <p className="text-stone-500 mt-1.5 text-sm lg:text-base leading-relaxed">Kelola apa yang Anda tawarkan, durasi, lokasi, dan ketersediaan.</p>
                </div>
                {!isFormOpen && (
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3.5 rounded-2xl text-[15px] font-semibold hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-stone-200"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Buat Tipe Event</span>
                    </button>
                )}
            </div>

            {isFormOpen && (
                <div className="animate-in slide-in-from-top-4 fade-in duration-500">
                    <form onSubmit={handleSave} className="bg-white border border-stone-200/60 rounded-[32px] shadow-2xl shadow-stone-200/50 overflow-hidden relative">
                        <div className="p-8 md:p-10">
                            <h3 className="text-2xl font-bold text-stone-900 mb-8 flex items-center gap-3">
                                <span className="h-10 w-10 bg-teal-50 text-teal-700 flex items-center justify-center rounded-xl">
                                    {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                </span>
                                {editingId ? 'Edit Event Type' : 'Buat Event Type Baru'}
                            </h3>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                <div className="lg:col-span-12 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold uppercase tracking-wider text-stone-400 ml-1">Nama Layanan</label>
                                            <input
                                                required
                                                type="text"
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 text-[15px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                                placeholder="Cth: Konsultasi Strategi Bisnis"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold uppercase tracking-wider text-stone-400 ml-1">Harga (Rp)</label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 font-medium">Rp</span>
                                                <input
                                                    required
                                                    type="number"
                                                    value={form.price}
                                                    onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-14 pr-5 py-4 text-stone-900 text-[15px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-stone-100 grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-[13px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                                                    <Clock className="h-4 w-4" /> Durasi
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[15, 30, 45, 60, 90, 120].map((d) => (
                                                        <button
                                                            key={d}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, duration: d })}
                                                            className={`py-3 rounded-xl text-sm font-semibold border transition-all ${form.duration === d ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
                                                        >
                                                            {d >= 60 ? `${d / 60} Jam` : `${d} Min`}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[13px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                                                    <Briefcase className="h-4 w-4" /> Lokasi
                                                </label>
                                                <select
                                                    value={form.location_type}
                                                    onChange={e => setForm({ ...form, location_type: e.target.value as any })}
                                                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 text-[15px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="in-person">📍 Di Lokasi / In-Person</option>
                                                    <option value="online">🎥 Online Meeting (Meet/Zoom)</option>
                                                    <option value="phone">📞 Telepon</option>
                                                    <option value="other">✨ Lainnya</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={form.location_details}
                                                    onChange={e => setForm({ ...form, location_details: e.target.value })}
                                                    placeholder="Detail lokasi (Alamat, Link, atau Instruksi)..."
                                                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 text-[15px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-[13px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" /> Aturan Penjadwalan
                                                </label>
                                                <div className="space-y-4 bg-stone-50 p-5 rounded-2xl border border-stone-200/60">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-sm font-medium text-stone-600">Batas Notice (Jam)</span>
                                                        <input
                                                            type="number"
                                                            value={form.notice_period}
                                                            onChange={e => setForm({ ...form, notice_period: parseInt(e.target.value) || 0 })}
                                                            className="w-20 bg-white border border-stone-200 rounded-xl px-3 py-2 text-center text-sm font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-sm font-medium text-stone-600">Range Booking (Hari)</span>
                                                        <input
                                                            type="number"
                                                            value={form.booking_window}
                                                            onChange={e => setForm({ ...form, booking_window: parseInt(e.target.value) || 0 })}
                                                            className="w-20 bg-white border border-stone-200 rounded-xl px-3 py-2 text-center text-sm font-bold"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-stone-400 italic">Klien tidak bisa memesan melebihi range ini.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold uppercase tracking-wider text-stone-400 ml-1">Deskripsi & Instruksi</label>
                                        <textarea
                                            value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                            rows={4}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 text-[15px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all resize-none"
                                            placeholder="Tuliskan detail layanan, apa yang harus dibawa, atau link khusus..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 mt-12 pt-8 border-t border-stone-100">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-2xl transition-all"
                                >
                                    Batalkan
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 bg-teal-700 text-white rounded-2xl text-[15px] font-bold hover:bg-teal-800 hover:shadow-xl hover:shadow-teal-100 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                                    <span>{editingId ? 'Simpan Perubahan' : 'Terbitkan Layanan'}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {services.length === 0 && !isFormOpen ? (
                    <div className="md:col-span-2 flex flex-col items-center justify-center py-32 px-6 bg-white rounded-3xl border-2 border-dashed border-stone-200 text-center animate-in fade-in zoom-in-95 duration-700">
                        <div className="bg-stone-50 p-8 rounded-full mb-6">
                            <Briefcase className="h-12 w-12 text-stone-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-stone-900 mb-2">Belum ada layanan aktif</h3>
                        <p className="max-w-md text-stone-500 text-sm leading-relaxed mb-10">
                            Mulailah dengan membuat tipe event pertama Anda. Atur durasi, harga, dan lokasi sekarang.
                        </p>
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="inline-flex items-center gap-3 bg-teal-700 text-white px-8 py-4 rounded-2xl text-[15px] font-bold hover:bg-teal-800 transition-all shadow-lg shadow-teal-100"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Buat Layanan Pertama</span>
                        </button>
                    </div>
                ) : (
                    services.map((s, idx) => {
                        let parsedDesc = s.description || ''
                        let locType = s.location_type || 'in-person'
                        let locDetails = s.location_details || ''

                        try {
                            const parsed = JSON.parse(s.description)
                            if (parsed && typeof parsed === 'object') {
                                parsedDesc = parsed.text || ''
                                locType = parsed.location?.type || locType
                                locDetails = parsed.location?.details || locDetails
                            }
                        } catch (e) { }

                        return (
                            <div
                                key={s.id}
                                className="group bg-white border border-stone-200/60 rounded-[32px] p-8 flex flex-col justify-between h-full shadow-sm hover:shadow-2xl hover:shadow-stone-200/50 hover:border-teal-200 transition-all duration-500 animate-in slide-in-from-bottom-4 fade-in"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className={`h-12 w-12 flex items-center justify-center rounded-2xl font-bold text-teal-700 ${idx % 3 === 0 ? 'bg-teal-50' : idx % 3 === 1 ? 'bg-orange-50 text-orange-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                            {s.name.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(s)} className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(s.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-stone-900 text-xl mb-2 group-hover:text-teal-700 transition-colors line-clamp-1">{s.name}</h4>
                                        <p className="text-[14px] text-stone-500 leading-relaxed line-clamp-2 h-10">{parsedDesc}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-stone-50 border border-stone-100 rounded-2xl p-3 flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Durasi</span>
                                            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                                                <Clock className="h-3.5 w-3.5 text-stone-400" />
                                                <span>{s.duration_minutes} Min</span>
                                            </div>
                                        </div>
                                        <div className="bg-stone-50 border border-stone-100 rounded-2xl p-3 flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Biaya</span>
                                            <div className="flex items-center gap-1 text-teal-700 font-bold text-sm">
                                                <span>Rp</span>
                                                <span>{s.price_idr?.toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-stone-600 bg-stone-50/50 p-3 rounded-2xl border border-stone-100/50">
                                            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center border border-stone-100 shadow-sm text-stone-400">
                                                <MapPin className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Lokasi</span>
                                                <span className="font-medium text-stone-700 line-clamp-1">
                                                    {locType === 'online' ? '🎥 Online Meeting' : locType === 'phone' ? '📞 Telepon' : '📍 ' + (locDetails || 'Di Lokasi')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        <div className="h-8 w-8 rounded-full border-2 border-white bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-500">
                                            NY
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openEdit(s)}
                                        className="text-sm font-bold text-teal-700 hover:text-teal-800 flex items-center gap-2 group/btn"
                                    >
                                        Atur Detail <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {services.length > 0 && !isFormOpen && (
                <div className="flex items-center justify-center gap-4 py-10 opacity-40">
                    <div className="h-px w-12 bg-stone-300" />
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Terdaftar {services.length} Tipe Event</span>
                    <div className="h-px w-12 bg-stone-300" />
                </div>
            )}
        </div>
    )
}
