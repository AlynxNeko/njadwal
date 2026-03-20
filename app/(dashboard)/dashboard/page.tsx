'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Calendar, Clock, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { startOfMonth, addDays } from 'date-fns'

export default function DashboardPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        today: 0,
        upcoming: 0,
        monthRevenue: 0,
        trend: 0
    })
    const [upcomingBookings, setUpcomingBookings] = useState<any[]>([])

    const fetchData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Get user's merchant
            const { data: merchants } = await supabase
                .from('merchants')
                .select('id, timezone')
                .eq('owner_id', session.user.id)
                .limit(1)

            if (!merchants || merchants.length === 0) {
                setLoading(false)
                return
            }
            const merchant = merchants[0]
            const tz = merchant.timezone || 'Asia/Jakarta'

            const now = new Date()
            const todayStr = formatInTimeZone(now, tz, 'yyyy-MM-dd')
            const yesterdayStr = formatInTimeZone(addDays(now, -1), tz, 'yyyy-MM-dd')
            const firstDayOfMonth = formatInTimeZone(startOfMonth(now), tz, 'yyyy-MM-dd')
            const in7DaysStr = formatInTimeZone(addDays(now, 7), tz, 'yyyy-MM-dd')

            // Fetch statistics in parallel
            const [
                { count: todayCount },
                { count: yesterdayCount },
                { count: upcomingCount },
                { data: revenueData }
            ] = await Promise.all([
                supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('local_date', todayStr).neq('status', 'cancelled'),
                supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('local_date', yesterdayStr).neq('status', 'cancelled'),
                supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).gt('local_date', todayStr).lte('local_date', in7DaysStr).neq('status', 'cancelled'),
                supabase.from('bookings').select('amount_idr').eq('merchant_id', merchant.id).gte('local_date', firstDayOfMonth).in('payment_status', ['paid', 'free'])
            ])

            const monthRevenue = revenueData?.reduce((acc, curr) => acc + curr.amount_idr, 0) || 0
            const trend = (todayCount || 0) - (yesterdayCount || 0)

            setStats({
                today: todayCount || 0,
                upcoming: upcomingCount || 0,
                monthRevenue: monthRevenue,
                trend: trend
            })

            // Latest Upcoming Bookings
            const { data: bookings } = await supabase
                .from('bookings')
                .select(`
                    *,
                    services:service_id(name, duration_minutes),
                    staff:staff_id(name)
                `)
                .eq('merchant_id', merchant.id)
                .gte('local_date', todayStr)
                .neq('status', 'cancelled')
                .order('local_date', { ascending: true })
                .order('local_start_time', { ascending: true })
                .limit(10)

            setUpcomingBookings(bookings || [])

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const formatIDR = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending_payment': return 'Menunggu Bayar'
            case 'confirmed': return 'Terkonfirmasi'
            case 'completed': return 'Selesai'
            case 'cancelled': return 'Dibatalkan'
            case 'no_show': return 'Tidak Datang'
            default: return status
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_payment': return 'bg-amber-500'
            case 'confirmed': return 'bg-teal-500'
            case 'completed': return 'bg-blue-500'
            case 'cancelled': return 'bg-red-500'
            case 'no_show': return 'bg-stone-500'
            default: return 'bg-stone-300'
        }
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
    }

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
                    {stats.trend !== 0 ? (
                        <p className={`text-xs ${stats.trend > 0 ? 'text-teal-600 bg-teal-50' : 'text-rose-600 bg-rose-50'} px-2 py-1 rounded w-fit mt-1 flex items-center gap-1`}>
                            {stats.trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(stats.trend)} dari kemarin
                        </p>
                    ) : (
                        <p className="text-xs text-stone-400 bg-stone-50 px-2 py-1 rounded w-fit mt-1 flex items-center gap-1">
                            <Minus size={12} /> Sama seperti kemarin
                        </p>
                    )}
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
                        {formatIDR(stats.monthRevenue)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">Estimasi kotor</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="font-medium text-stone-900">Jadwal Mendatang Terbaru</h2>
                    <Link href="/bookings" className="text-sm text-teal-600 hover:underline font-medium">Lihat Semua</Link>
                </div>
                <div className="divide-y divide-stone-100">
                    {upcomingBookings.length > 0 ? (
                        upcomingBookings.map((booking) => (
                            <div key={booking.id} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-medium text-sm">
                                        {getInitials(booking.customer_name)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-stone-900">{booking.customer_name}</p>
                                        <p className="text-xs text-stone-500 mt-0.5">
                                            {booking.services?.name} • {booking.services?.duration_minutes} mnt
                                            {booking.staff?.name ? ` • Pelayan: ${booking.staff.name}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-stone-900">{booking.local_start_time.substring(0, 5)} WIB</p>
                                    <div className="flex items-center gap-1.5 mt-1 justify-end">
                                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(booking.status)}`}></span>
                                        <p className="text-xs text-stone-500">{getStatusLabel(booking.status)}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-12 text-center">
                            <p className="text-stone-500 text-sm italic">Belum ada jadwal hari ini atau mendatang.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

