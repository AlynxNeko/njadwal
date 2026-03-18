'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, Users, Briefcase, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/bookings', label: 'Booking', icon: Calendar },
    { href: '/schedule', label: 'Jadwal', icon: Calendar },
    { href: '/services', label: 'Layanan', icon: Briefcase },
    { href: '/staff', label: 'Staf', icon: Users },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <aside className="w-64 border-r border-stone-200 bg-stone-50 min-h-screen flex flex-col hidden md:flex shrink-0">
            <div className="h-16 flex items-center px-6 border-b border-stone-200">
                <Link href="/dashboard" className="font-display text-xl text-stone-900 flex items-center gap-2">
                    <div className="w-6 h-6 bg-teal-700 rounded-md flex items-center justify-center">
                        <span className="text-white text-xs font-bold">N</span>
                    </div>
                    <span className="tracking-tight">Njadwal.</span>
                </Link>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    const Icon = item.icon
                    return (
                        <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${isActive ? 'bg-white text-teal-700 shadow-sm ring-1 ring-stone-200' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}>
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-teal-600' : 'text-stone-400'} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t border-stone-200">
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-[13px] font-medium text-stone-600 hover:bg-stone-100 hover:text-red-600 transition-colors group">
                    <LogOut size={18} strokeWidth={2} className="text-stone-400 group-hover:text-red-500" />
                    Keluar
                </button>
            </div>
        </aside>
    )
}
