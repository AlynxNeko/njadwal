'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Users, Mail, Phone, Loader2 } from 'lucide-react'

export default function StaffPage() {
    const supabase = createClient()
    const [staff, setStaff] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [merchantId, setMerchantId] = useState<string | null>(null)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', email: '', phone: '', calendar_color: '#0f766e', role: 'staff' })
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function fetchStaff() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: merchant } = await supabase.from('merchants').select('id').eq('owner_id', user.id).single()
            if (merchant) {
                setMerchantId(merchant.id)
                const { data } = await supabase.from('staff').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false })
                if (data) setStaff(data)
            }
            setLoading(false)
        }
        fetchStaff()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!merchantId) return toast.error('Harap isi pengaturan profil terlebih dahulu')
        setSaving(true)

        try {
            if (editingId) {
                const { error } = await supabase.from('staff').update(form).eq('id', editingId)
                if (error) throw error
                setStaff(staff.map(s => s.id === editingId ? { ...s, ...form } : s))
                toast.success('Staf diupdate')
            } else {
                const { data, error } = await supabase.from('staff').insert({
                    merchant_id: merchantId,
                    ...form
                }).select().single()
                if (error) throw error
                setStaff([data, ...staff])
                toast.success('Staf ditambahkan')
            }
            closeForm()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus staf ini?')) return
        const { error } = await supabase.from('staff').delete().eq('id', id)
        if (error) toast.error('Gagal menghapus')
        else setStaff(staff.filter(s => s.id !== id))
    }

    const openEdit = (s: any) => {
        setForm({ name: s.name, email: s.email || '', phone: s.phone || '', calendar_color: s.calendar_color || '#0f766e', role: s.role || 'staff' })
        setEditingId(s.id)
        setIsFormOpen(true)
    }

    const closeForm = () => {
        setForm({ name: '', email: '', phone: '', calendar_color: '#0f766e', role: 'staff' })
        setEditingId(null)
        setIsFormOpen(false)
    }

    if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></div>

    return (
        <div className="space-y-8 animate-in fade-in max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl text-stone-900 tracking-tight">Anggota Staf</h1>
                    <p className="text-stone-500 mt-1 text-sm">Tambahkan dan kelola anggota staf usahamu.</p>
                </div>
                {!isFormOpen && (
                    <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-800 transition-colors">
                        <Plus size={16} /> Tambah
                    </button>
                )}
            </div>

            {isFormOpen && (
                <form onSubmit={handleSave} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-stone-900 mb-4">{editingId ? 'Edit Staf' : 'Staf Baru'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Nama Lengkap</label>
                            <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="Cth: Budi" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Warna Kalender</label>
                            <div className="flex items-center gap-3">
                                <input type="color" value={form.calendar_color} onChange={e => setForm({ ...form, calendar_color: e.target.value })} className="h-9 w-12 border-0 bg-transparent cursor-pointer p-0 rounded-md" />
                                <span className="text-stone-500 text-sm font-mono">{form.calendar_color}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Email Akses</label>
                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" placeholder="Opsional" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1.5">Peran</label>
                            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white">
                                <option value="staff">Staf (Hanya lihat jadwal sendiri)</option>
                                <option value="admin">Admin (Akses penuh)</option>
                            </select>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.length === 0 && !isFormOpen ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-stone-200 border-dashed">
                        <Users size={32} className="mx-auto text-stone-300 mb-3" />
                        <p className="text-stone-500 text-sm">Belum ada anggota staf. Tambahkan anggota stafmu.</p>
                    </div>
                ) : (
                    staff.map(s => (
                        <div key={s.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:border-stone-300 transition-colors relative group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: s.calendar_color || '#0f766e' }}>
                                        {s.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-stone-900 text-base">{s.name}</h4>
                                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-medium rounded-full uppercase tracking-wider">{s.role}</span>
                                    </div>
                                </div>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(s)} className="p-1.5 text-stone-400 hover:text-teal-600 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4 text-sm text-stone-500">
                                {s.email ? (
                                    <div className="flex items-center gap-2"><Mail size={14} className="text-stone-400" /> <span className="truncate">{s.email}</span></div>
                                ) : (
                                    <div className="flex items-center gap-2"><Mail size={14} className="text-stone-300" /> <span className="italic">Belum ada email</span></div>
                                )}
                                {s.phone ? (
                                    <div className="flex items-center gap-2"><Phone size={14} className="text-stone-400" /> <span>{s.phone}</span></div>
                                ) : (
                                    <div className="flex items-center gap-2"><Phone size={14} className="text-stone-300" /> <span className="italic">Belum ada telepon</span></div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
