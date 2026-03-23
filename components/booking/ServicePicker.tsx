'use client'

import { Check, Clock, DollarSign, MapPin, Video, Phone, Info } from 'lucide-react'

export default function ServicePicker({ services, selectedId, onSelect }: { services: any[], selectedId: string | null, onSelect: (id: string) => void }) {
    if (services.length === 0) {
        return <div className="p-12 text-center text-stone-400 bg-white rounded-3xl border border-stone-100 border-dashed animate-in fade-in">Belum ada layanan yang tersedia.</div>
    }

    return (
        <div className="space-y-4">
            {services.map((s, idx) => {
                let displayDesc = s.description || ''
                let locType = s.location_type || 'in-person'
                let locDetails = s.location_details || ''

                try {
                    const parsed = JSON.parse(s.description)
                    if (parsed && typeof parsed === 'object') {
                        displayDesc = parsed.text || ''
                        locType = parsed.location?.type || locType
                        locDetails = parsed.location?.details || locDetails
                    }
                } catch (e) { }

                const isSelected = selectedId === s.id

                return (
                    <div
                        key={s.id}
                        onClick={() => onSelect(s.id)}
                        className={`group relative p-6 rounded-[24px] border-2 transition-all cursor-pointer overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-500 ${isSelected
                            ? 'border-teal-600 bg-teal-50 shadow-xl shadow-teal-100/30 scale-[1.01]'
                            : 'border-stone-100 bg-white hover:border-stone-200 hover:shadow-lg hover:shadow-stone-100'
                            }`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        {isSelected && (
                            <div className="absolute top-0 right-0 p-3">
                                <div className="bg-teal-600 text-white rounded-full p-1 shadow-lg shadow-teal-700/20">
                                    <Check size={16} strokeWidth={3} />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-5">
                            <div className="flex-1">
                                <h4 className={`font-bold text-lg md:text-xl tracking-tight transition-colors ${isSelected ? 'text-teal-900' : 'text-stone-900'}`}>{s.name}</h4>
                                {displayDesc && (
                                    <p className={`text-sm mt-1.5 leading-relaxed line-clamp-2 transition-colors ${isSelected ? 'text-teal-700/70' : 'text-stone-500'}`}>
                                        {displayDesc}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${isSelected ? 'bg-white border-teal-200 text-teal-700' : 'bg-stone-50 border-stone-100 text-stone-500'
                                    }`}>
                                    <Clock size={14} className="opacity-60" /> {s.duration_minutes >= 60 ? `${s.duration_minutes / 60} jam` : `${s.duration_minutes} min`}
                                </div>
                                <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${isSelected ? 'bg-white border-teal-200 text-teal-800' : 'bg-teal-50 border-teal-100/50 text-teal-700'
                                    }`}>
                                    <DollarSign size={14} className="opacity-60" /> Rp {s.price_idr.toLocaleString('id-ID')}
                                </div>

                                <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all capitalize ${isSelected ? 'bg-teal-600 text-white border-teal-600' : 'bg-stone-50 border-stone-100 text-stone-500 opacity-60'}`}>
                                    {locType === 'online' ? <Video size={14} /> : locType === 'phone' ? <Phone size={14} /> : <MapPin size={14} />}
                                    {locType === 'online' ? 'Online' : locType === 'phone' ? 'Phone' : 'In-Person'}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
