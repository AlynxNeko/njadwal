'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Clock, DollarSign, Loader2, Briefcase, ChevronRight } from 'lucide-react'

export default function ServicesPage() {
    const supabase = createClient()
    const [services, setServices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [merchantId, setMerchantId] = useState<string | null>(null)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', description: '', duration: 60, price: 0 })
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

            const { data: merchant } = await supabase.from('merchants').select('id').eq('owner_id', user.id).single()
            if (merchant) {
                setMerchantId(merchant.id)
                const { data } = await supabase.from('services').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false })
                if (data) setServices(data)
            }
            setLoading(false)
        }
        fetchServices()
    }, [supabase])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!merchantId) return toast.error('Lengkapi profil merchant terlebih dahulu')
        setSaving(true)

        try {
            if (editingId) {
                const { error } = await supabase.from('services').update({
                    name: form.name,
                    description: form.description,
                    duration_minutes: form.duration,
                    price_idr: form.price
                }).eq('id', editingId)
                if (error) throw error
                setServices(services.map(s => s.id === editingId ? { ...s, name: form.name, description: form.description, duration_minutes: form.duration, price_idr: form.price } : s))
                toast.success('Layanan berhasil diupdate')
            } else {
                const { data, error } = await supabase.from('services').insert({
                    merchant_id: merchantId,
                    name: form.name,
                    description: form.description,
                    duration_minutes: form.duration,
                    price_idr: form.price
                }).select().single()
                if (error) throw error
                setServices([data, ...services])
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
        setForm({ name: s.name, description: s.description || '', duration: s.duration_minutes, price: s.price_idr })
        setEditingId(s.id)
        setIsFormOpen(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const closeForm = () => {
        setForm({ name: '', description: '', duration: 60, price: 0 })
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
        <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between group">
                <div>
                    <h1 className="font-display text-4xl text-stone-900 tracking-tight">Layanan</h1>
                    <p className="text-stone-500 mt-1.5 text-sm lg:text-base leading-relaxed">Terbitkan daftar layanan dan atur harga untuk memudahkan klien memesan secara online.</p>
                </div>
                {!isFormOpen && (
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-2xl text-sm font-semibold hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-stone-200"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tambah Layanan</span>
                    </button>
                )}
            </div>

            {isFormOpen && (
                <div className="animate-in slide-in-from-top-4 fade-in duration-500">
                    <form onSubmit={handleSave} className="bg-white border border-stone-200/60 rounded-3xl p-8 shadow-xl shadow-stone-100/50 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <Briefcase className="h-32 w-32" />
                        </div>

                        <div className="relative">
                            <h3 className="text-xl font-semibold text-stone-900 mb-8 flex items-center gap-2">
                                <span className="h-8 w-8 bg-teal-50 text-teal-700 flex items-center justify-center rounded-lg text-sm">
                                    {editingId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                </span>
                                {editingId ? 'Update Layanan' : 'Buat Layanan Baru'}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-stone-700 ml-1">Nama Layanan</label>
                                    <input
                                        required
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-stone-50/50 border border-stone-200 rounded-2xl px-5 py-3.5 text-stone-900 text-[15px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition-all placeholder:text-stone-400"
                                        placeholder="Cth: Potong Rambut Laki-laki"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-stone-700 ml-1">Harga Layanan (Rp)</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 font-medium border-r border-stone-200 pr-4">Rp</span>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={form.price}
                                            onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-stone-50/50 border border-stone-200 rounded-2xl pl-[72px] pr-5 py-3.5 text-stone-900 text-[15px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-stone-700 ml-1">Estimasi Durasi</label>
                                    <div className="relative group/select">
                                        <select
                                            value={form.duration}
                                            onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}
                                            className="w-full bg-stone-50/50 border border-stone-200 rounded-2xl px-5 py-3.5 text-stone-900 text-[15px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value={15}>15 Menit</option>
                                            <option value={30}>30 Menit</option>
                                            <option value={45}>45 Menit</option>
                                            <option value={60}>1 Jam</option>
                                            <option value={90}>1.5 Jam</option>
                                            <option value={120}>2 Jam</option>
                                            <option value={180}>3 Jam</option>
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                                            <ChevronRight className="h-4 w-4 rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-stone-700 ml-1">Deskripsi & Syarat (Opsional)</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        rows={3}
                                        className="w-full bg-stone-50/50 border border-stone-200 rounded-2xl px-5 py-3.5 text-stone-900 text-[15px] focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 focus:outline-none transition-all placeholder:text-stone-400 resize-none"
                                        placeholder="Berikan info tambahan untuk klien..."
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-10">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 rounded-2xl transition-colors"
                                >
                                    Batalkan
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-stone-900 text-white rounded-2xl text-[15px] font-semibold hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-stone-200"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    <span>{editingId ? 'Simpan Perubahan' : 'Buat Layanan'}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {services.length === 0 && !isFormOpen ? (
                    <div className="flex flex-col items-center justify-center py-24 px-6 bg-white rounded-3xl border-2 border-dashed border-stone-100 text-center animate-in fade-in zoom-in-95 duration-700">
                        <div className="bg-stone-50 p-6 rounded-full mb-6">
                            <Briefcase className="h-10 w-10 text-stone-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-stone-900 mb-2">Belum ada layanan</h3>
                        <p className="max-w-[320px] text-stone-500 text-sm leading-relaxed mb-8">
                            Tambahkan layanan yang ingin Anda tawarkan kepada pelanggan untuk memulai booking online.
                        </p>
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-teal-100 transition-all border border-teal-100"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Buat Layanan Pertamamu</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5">
                        {services.map((s, idx) => (
                            <div
                                key={s.id}
                                className="group bg-white border border-stone-200/60 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-xl hover:shadow-stone-100 hover:border-teal-200/50 transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-stone-900 text-[17px] group-hover:text-teal-700 transition-colors">{s.name}</h4>
                                        {s.description && <p className="text-[14px] text-stone-500 leading-relaxed max-w-xl line-clamp-2">{s.description}</p>}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2 text-[13px] font-semibold text-stone-500 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{s.duration_minutes} Menit</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[13px] font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            <span>Rp {s.price_idr?.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end md:self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEdit(s)}
                                        className="h-11 w-11 inline-flex items-center justify-center text-stone-400 hover:text-teal-600 hover:bg-teal-50 border border-transparent hover:border-teal-100 rounded-2xl transition-all"
                                        title="Edit Layanan"
                                    >
                                        <Edit2 className="h-[18px] w-[18px]" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        className="h-11 w-11 inline-flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-2xl transition-all"
                                        title="Hapus Layanan"
                                    >
                                        <Trash2 className="h-[18px] w-[18px]" />
                                    </button>
                                </div>
                                {/* Mobile actions always visible or indicated by arrow */}
                                <div className="md:hidden flex items-center justify-between border-t border-stone-100 pt-4 mt-1">
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Tindakan</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEdit(s)} className="text-[13px] font-bold text-teal-700 px-3 py-1">Ubah</button>
                                        <button onClick={() => handleDelete(s.id)} className="text-[13px] font-bold text-red-600 px-3 py-1">Hapus</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {services.length > 0 && !isFormOpen && (
                    <p className="text-center text-[13px] text-stone-400 py-4">
                        Menampilkan {services.length} layanan yang aktif
                    </p>
                )}
            </div>
        </div>
    )
}
