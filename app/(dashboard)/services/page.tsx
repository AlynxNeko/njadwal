'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Clock, DollarSign, Loader2 } from 'lucide-react'

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
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: merchant } = await supabase.from('merchants').select('id').eq('owner_id', user.id).single()
            if (merchant) {
                setMerchantId(merchant.id)
                const { data } = await supabase.from('services').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false })
                if (data) setServices(data)
            }
            setLoading(false)
        }
        fetchServices()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!merchantId) return toast.error('Harap isi pengaturan profil terlebih dahulu')
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
                setServices(services.map(s => s.id === editingId ? { ...s, ...form, duration_minutes: form.duration, price_idr: form.price } : s))
                toast.success('Layanan diupdate')
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
                toast.success('Layanan ditambahkan')
            }
            closeForm()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus layanan ini?')) return
        const { error } = await supabase.from('services').delete().eq('id', id)
        if (error) toast.error('Gagal menghapus')
        else setServices(services.filter(s => s.id !== id))
    }

    const openEdit = (s: any) => {
        setForm({ name: s.name, description: s.description || '', duration: s.duration_minutes, price: s.price_idr })
        setEditingId(s.id)
        setIsFormOpen(true)
    }

    const closeForm = () => {
        setForm({ name: '', description: '', duration: 60, price: 0 })
        setEditingId(null)
        setIsFormOpen(false)
    }

    if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></div>

    return (
        <div className="space-y-8 animate-in fade-in max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl text-stone-900 tracking-tight">Layanan</h1>
                    <p className="text-stone-500 mt-1 text-sm">Kelola daftar layanan dan harga yang ditawarkan.</p>
                </div>
                {!isFormOpen && (
                    <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-800 transition-colors">
                        <Plus size={16} /> Tambah
                    </button>
                )}
            </div>

            {isFormOpen && (
                <form onSubmit={handleSave} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-stone-900 mb-4">{editingId ? 'Edit Layanan' : 'Layanan Baru'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Nama Layanan</label>
                            <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="Cth: Potong Rambut" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Harga (Rp)</label>
                            <input required type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Durasi (Menit)</label>
                            <select value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                                <option value={15}>15 Menit</option>
                                <option value={30}>30 Menit</option>
                                <option value={45}>45 Menit</option>
                                <option value={60}>1 Jam</option>
                                <option value={90}>1.5 Jam</option>
                                <option value={120}>2 Jam</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Deskripsi</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="Deskripsi opsional..." />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-6">
                        <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Batal</button>
                        <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-text-primary bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : null} Simpan
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-3">
                {services.length === 0 && !isFormOpen ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 border-dashed">
                        <Briefcase size={32} className="mx-auto text-stone-300 mb-3" />
                        <p className="text-stone-500 text-sm">Belum ada layanan. Tambahkan layanan pertamamu.</p>
                    </div>
                ) : (
                    services.map(s => (
                        <div key={s.id} className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-stone-300 transition-colors">
                            <div>
                                <h4 className="font-semibold text-stone-900 text-base">{s.name}</h4>
                                {s.description && <p className="text-sm text-stone-500 mt-0.5 line-clamp-1">{s.description}</p>}
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-stone-500 bg-stone-50 px-2 py-1 rounded-md border border-stone-100"><Clock size={12} /> {s.duration_minutes} mnt</span>
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-100"><DollarSign size={12} /> Rp {s.price_idr.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEdit(s)} className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(s.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
