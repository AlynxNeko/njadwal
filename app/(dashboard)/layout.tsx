import Sidebar from '@/components/dashboard/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-white overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full relative">
                <div className="flex-1 overflow-y-auto bg-stone-50/50">
                    <div className="max-w-5xl mx-auto p-4 md:p-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
