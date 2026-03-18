'use client'

import { Check, Clock, DollarSign } from 'lucide-react'

export default function ServicePicker({ services, selectedId, onSelect }: { services: any[], selectedId: string | null, onSelect: (id: string) => void }) {
    if (services.length === 0) {
        return <div className="p-8 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">Belum ada layanan yang tersedia.</div>
    }

    return (
        <div className="space-y-3">
            {services.map(s => (
                <div
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer ${selectedId === s.id
                            ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600 shadow-sm'
                            : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                        }`}
                >
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h4 className={`font-semibold text-base ${selectedId === s.id ? 'text-teal-900' : 'text-stone-900'}`}>{s.name}</h4>
                            {s.description && <p className="text-sm text-stone-500 mt-0.5 line-clamp-2">{s.description}</p>}
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${selectedId === s.id ? 'bg-white/50 border-teal-200 text-teal-700' : 'bg-stone-50 border-stone-100 text-stone-500'
                                    }`}>
                                    <Clock size={12} /> {s.duration_minutes} mnt
                                </span>
                                <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${selectedId === s.id ? 'bg-white/50 border-teal-200 text-teal-700' : 'bg-teal-50 border-teal-100 text-teal-700'
                                    }`}>
                                    <DollarSign size={12} /> Rp {s.price_idr.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>

                        <div className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${selectedId === s.id ? 'border-teal-600 bg-teal-600 text-white' : 'border-stone-300'
                            }`}>
                            {selectedId === s.id && <Check size={14} strokeWidth={3} />}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
