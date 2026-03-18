'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, DollarSign, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        today: 0,
        upcoming: 0,
        monthRevenue: 0,
    })

    useEffect(() => {
        // In a real app we'd fetch actual stats from Supabase
        // For now we simulate loading and show placeholder data
        setTimeout(() => {
            setStats({
                today: 12,
                upcoming: 47,
                monthRevenue: 4500000,
            })
            setLoading(false)
        }, 500)
    }, [])

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="font-display text-3xl text-stone-900 tracking-tight">Dashboard</h1>
                <p className="text-stone-500 mt-1 text-sm">Ringkasan aktivitas dan jadwal bisnis kamu hari ini.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-2 text-stone-500 mb-2">
                        <Calendar size={16} />
                        <span className="text-xs font-medium uppercase tracking-wider">Booking Hari Ini</span>
                    </div>
                    <p className="text-3xl font-semibold text-stone-900">{stats.today}</p>
                    <p className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded w-fit mt-1 flex items-center gap-1">
                        <TrendingUp size={12} /> +3 dari kemarin
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-2 text-stone-500 mb-2">
                        <Clock size={16} />
                        <span className="text-xs font-medium uppercase tracking-wider">Jadwal Mendatang</span>
                    </div>
                    <p className="text-3xl font-semibold text-stone-900">{stats.upcoming}</p>
                    <p className="text-xs text-stone-500 mt-1">Dalam 7 hari kedepan</p>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-2 text-stone-500 mb-2">
                        <DollarSign size={16} />
                        <span className="text-xs font-medium uppercase tracking-wider">Pendapatan Bulan Ini</span>
                    </div>
                    <p className="text-3xl font-semibold text-stone-900">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.monthRevenue)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">Estimasi kotor</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="font-medium text-stone-900">Jadwal Mendatang Terbaru</h2>
                    <button className="text-sm text-teal-600 hover:underline font-medium">Lihat Semua</button>
                </div>
                <div className="divide-y divide-stone-100">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-medium text-sm">
                                    {['RA', 'DP', 'FK'][i - 1]}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-stone-900">{['Rizky Ahmad', 'Dimas Prasetyo', 'Fajar Kurniawan'][i - 1]}</p>
                                    <p className="text-xs text-stone-500 mt-0.5">Potong Rambut Standard • 60 mnt</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-stone-900">10:30 WIB</p>
                                <div className="flex items-center gap-1.5 mt-1 justify-end">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                    <p className="text-xs text-stone-500">Terkonfirmasi</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
