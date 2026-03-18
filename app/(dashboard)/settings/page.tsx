'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Store, Globe, MapPin, Save, Loader2 } from 'lucide-react'

export default function SettingsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [form, setForm] = useState({
        business_name: '',
        slug: '',
        description: '',
        phone: '',
        city: '',
        address: ''
    })

    const [merchantId, setMerchantId] = useState<string | null>(null)

    useEffect(() => {
        async function loadMerchant() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase.from('merchants').select('*').eq('owner_id', user.id).single()

            if (data) {
                setMerchantId(data.id)
                setForm({
                    business_name: data.business_name || '',
                    slug: data.slug || '',
                    description: data.description || '',
                    phone: data.phone || '',
                    city: data.city || '',
                    address: data.address || ''
                })
            }
            setLoading(false)
        }
        loadMerchant()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error('Belum login')
            setSaving(false)
            return
        }

        try {
            if (merchantId) {
                // Update existing
                const { error } = await supabase.from('merchants').update({
                    business_name: form.business_name,
                    slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
                    description: form.description,
                    phone: form.phone,
                    city: form.city,
                    address: form.address,
                    updated_at: new Date().toISOString()
                }).eq('id', merchantId)

                if (error) throw error
                toast.success('Pengaturan berhasil disimpan')
            } else {
                // Create new
                const { data: newMerchant, error: createError } = await supabase.from('merchants').insert({
                    owner_id: user.id,
                    business_name: form.business_name,
                    slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
                    description: form.description,
                    phone: form.phone,
                    city: form.city,
                    address: form.address,
                }).select().single()

                if (createError) throw createError

                // Auto-create subscription
                await supabase.from('subscriptions').insert({
                    merchant_id: newMerchant.id,
                    plan_id: 'solo',
                    status: 'active',
                    current_period_start: new Date().toISOString(),
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                })

                setMerchantId(newMerchant.id)
                toast.success('Berhasil membuat profil bisnis baru')
            }
        } catch (error: any) {
            if (error.code === '23505' && error.message.includes('slug')) {
                toast.error('URL slug sudah dipakai yang lain, coba yang lain.')
            } else {
                toast.error(error.message || 'Terjadi kesalahan')
            }
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-32 items-center justify-center">
                <Loader2 className="animate-spin text-teal-600" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
            <div>
                <h1 className="font-display text-3xl text-stone-900 tracking-tight">Pengaturan Bisnis</h1>
                <p className="text-stone-500 mt-1 text-sm">Kelola informasi profil dan detail operasional usahamu.</p>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-8">

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                            <Store size={18} className="text-stone-400" /> Profil Dasar
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-stone-700">Nama Bisnis</label>
                                <input required type="text" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                    placeholder="Contoh: Barbershop Asgar" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-stone-700">URL Halaman Booking</label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-stone-200 bg-stone-50 text-stone-500 sm:text-sm">
                                        njadwal.app/
                                    </span>
                                    <input required type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-xl text-sm border border-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                        placeholder="nama-bisnis-kamu" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-stone-700">Deskripsi Singkat</label>
                            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                placeholder="Ceritakan tentang bisnis kamu..." />
                        </div>
                    </div>

                    <div className="h-px bg-stone-100 w-full" />

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                            <MapPin size={18} className="text-stone-400" /> Kontak & Lokasi
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-stone-700">Nomor WhatsApp</label>
                                <input required type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                    placeholder="081234567890" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-stone-700">Kota</label>
                                <input required type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                    placeholder="Contoh: Jakarta Selatan" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-stone-700">Alamat Lengkap</label>
                            <textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                                placeholder="Alamat jalan lengkap..." />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 md:px-8 border-t border-stone-100 bg-stone-50 flex justify-end">
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-teal-800 transition-colors disabled:opacity-50">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </form>
        </div>
    )
}
