'use client'

import { useState } from 'react'
import { cancelBooking } from '../actions'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CancelButton({ id, currentStatus }: { id: string, currentStatus: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const router = useRouter()

    if (currentStatus === 'cancelled') return null

    const handleCancel = async () => {
        setIsLoading(true)
        const result = await cancelBooking(id)
        setIsLoading(false)
        if (result.success) {
            setShowConfirm(false)
            router.refresh()
        } else {
            alert(result.error)
        }
    }

    return (
        <div className="relative">
            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-100 border border-transparent transition-all duration-200 flex items-center gap-2"
                >
                    Batalkan Booking
                </button>
            ) : (
                <div className="flex flex-col items-end gap-3 p-4 bg-red-50/50 border border-red-100 rounded-2xl animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                        <AlertCircle size={16} /> Konfirmasi Pembatalan?
                    </div>
                    <p className="text-xs text-red-600/80 text-right max-w-[200px]">
                        Tindakan ini tidak dapat dibatalkan. Status akan berubah menjadi Dibatalkan.
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowConfirm(false)}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-700 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                            Ya, Batalkan
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
