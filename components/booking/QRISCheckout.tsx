'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle, Clock, RefreshCw, ExternalLink, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

interface Props {
  bookingId: string
  merchantSlug: string
  amountIdr: number
  serviceName: string
  businessName: string
  localDate: string
  localTime: string
  onPaid: () => void
  onCancel: () => void
}

type CheckoutState = 'loading' | 'qris' | 'paid' | 'expired' | 'error'

interface PaymentData {
  qr_string: string | null
  qr_image_url: string | null
  invoice_url: string
  expires_at: string
  available_banks: Array<{ bank_code: string; account_holder_name: string; transfer_amount: number; bank_account_number: string }>
}

export default function QRISCheckout({
  bookingId, merchantSlug, amountIdr, serviceName, businessName, localDate, localTime, onPaid, onCancel
}: Props) {
  const [state, setState] = useState<CheckoutState>('loading')
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(3600) // seconds
  const [showVA, setShowVA] = useState(false)
  const [copiedVA, setCopiedVA] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout>()
  const timerRef = useRef<NodeJS.Timeout>()

  // Create invoice and get QR
  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setState('error'); return }
      if (data.free) { onPaid(); return }
      setPaymentData(data)
      setState('qris')
      // Set countdown from expires_at
      if (data.expires_at) {
        const secs = Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)
        setTimeLeft(Math.max(0, secs))
      }
    }
    init()
  }, [bookingId])

  // Countdown timer
  useEffect(() => {
    if (state !== 'qris') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setState('expired'); clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [state])

  // Poll for payment status every 3 seconds
  useEffect(() => {
    if (state !== 'qris') return
    const poll = async () => {
      const res = await fetch(`/api/payment-status?booking_id=${bookingId}`)
      const data = await res.json()
      if (data.is_paid) {
        setState('paid')
        clearInterval(pollRef.current)
        setTimeout(onPaid, 1500) // brief success flash before redirect
      } else if (data.is_expired) {
        setState('expired')
        clearInterval(pollRef.current)
      }
    }
    poll() // immediate first check
    pollRef.current = setInterval(poll, 3000)
    return () => clearInterval(pollRef.current)
  }, [state, bookingId, onPaid])

  const copyVA = (number: string) => {
    navigator.clipboard.writeText(number)
    setCopiedVA(number)
    setTimeout(() => setCopiedVA(null), 2000)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ── PAID ──
  if (state === 'paid') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-teal-600" />
        </div>
        <h3 className="font-display text-xl text-stone-900 mb-1">Pembayaran Berhasil!</h3>
        <p className="text-sm text-stone-400">Mengalihkan ke halaman konfirmasi...</p>
      </div>
    )
  }

  // ── EXPIRED ──
  if (state === 'expired') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
          <Clock size={28} className="text-stone-400" />
        </div>
        <h3 className="font-display text-xl text-stone-800 mb-2">QR Code Kedaluwarsa</h3>
        <p className="text-sm text-stone-400 mb-6">Kode pembayaran sudah tidak berlaku.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { setState('loading'); window.location.reload() }}
            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-800"
          >
            <RefreshCw size={15} />
            Buat QR Baru
          </button>
          <button onClick={onCancel} className="text-sm text-stone-400 hover:text-stone-600 py-2">
            Batalkan Booking
          </button>
        </div>
      </div>
    )
  }

  // ── ERROR ──
  if (state === 'error') {
    return (
      <div className="text-center py-8">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <h3 className="font-medium text-stone-800 mb-2">Gagal membuat pembayaran</h3>
        <p className="text-sm text-stone-400 mb-4">Terjadi kesalahan. Coba lagi.</p>
        <button onClick={onCancel} className="text-sm text-teal-600 hover:underline">Kembali</button>
      </div>
    )
  }

  // ── LOADING ──
  if (state === 'loading' || !paymentData) {
    return (
      <div className="text-center py-10">
        <div className="w-48 h-48 bg-stone-100 rounded-2xl mx-auto mb-4 animate-pulse" />
        <p className="text-sm text-stone-400 animate-pulse-soft">Membuat kode pembayaran...</p>
      </div>
    )
  }

  // ── QRIS DISPLAY ──
  const isLowTime = timeLeft < 300 // last 5 mins

  return (
    <div>
      {/* Order summary */}
      <div className="bg-stone-50 rounded-xl p-4 mb-5 text-sm">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium text-stone-700">{serviceName}</div>
            <div className="text-xs text-stone-400 mt-0.5">{businessName} · {localDate} · {localTime}</div>
          </div>
          <div className="font-display text-lg text-stone-900 font-medium shrink-0 ml-4">
            {formatRupiah(amountIdr)}
          </div>
        </div>
      </div>

      {/* QRIS Code */}
      <div className="text-center mb-4">
        <p className="text-xs text-stone-400 mb-3 flex items-center justify-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isLowTime ? 'bg-red-400 animate-pulse' : 'bg-teal-400'}`} />
          {isLowTime ? (
            <span className="text-red-400 font-medium">Segera bayar! Berlaku {formatTime(timeLeft)}</span>
          ) : (
            <span>Berlaku selama {formatTime(timeLeft)}</span>
          )}
        </p>

        <div className="inline-block p-3 bg-white border-2 border-stone-200 rounded-2xl shadow-sm">
          {paymentData.qr_string ? (
            <QRCodeSVG
              value={paymentData.qr_string}
              size={200}
              level="M"
              includeMargin={false}
              className="rounded-lg"
            />
          ) : (
            // Fallback: show QR image from Xendit if qr_string unavailable
            paymentData.qr_image_url ? (
              <img src={paymentData.qr_image_url} alt="QRIS Code" className="w-48 h-48 rounded-lg" />
            ) : null
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="h-px w-12 bg-stone-200" />
          <span className="text-xs text-stone-400 font-medium">QRIS</span>
          <div className="h-px w-12 bg-stone-200" />
        </div>
        <p className="text-xs text-stone-400 mt-2">
          Scan dengan aplikasi mobile banking atau e-wallet manapun
        </p>
      </div>

      {/* VA Alternative */}
      {paymentData.available_banks && paymentData.available_banks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowVA(!showVA)}
            className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <span className="font-medium">Bayar via Transfer Bank</span>
            {showVA ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showVA && (
            <div className="mt-2 space-y-2">
              {paymentData.available_banks.map(bank => (
                <div key={bank.bank_code} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-stone-200">
                  <div>
                    <div className="text-xs font-semibold text-stone-700">{bank.bank_code}</div>
                    <div className="text-sm font-mono text-stone-800 mt-0.5 tracking-wide">{bank.bank_account_number}</div>
                    <div className="text-xs text-stone-400 mt-0.5">a.n. {bank.account_holder_name}</div>
                  </div>
                  <button
                    onClick={() => copyVA(bank.bank_account_number)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      copiedVA === bank.bank_account_number
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {copiedVA === bank.bank_account_number ? 'Disalin!' : 'Salin'}
                  </button>
                </div>
              ))}
              <p className="text-xs text-stone-400 text-center pt-1">
                Transfer tepat {formatRupiah(amountIdr)} — berbeda nominal tidak diproses
              </p>
            </div>
          )}
        </div>
      )}

      {/* Fallback: open Xendit page */}
      <a
        href={paymentData.invoice_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-400 hover:text-teal-600 transition-colors w-full py-2"
      >
        <ExternalLink size={12} />
        Buka halaman pembayaran lengkap
      </a>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="mt-2 w-full text-sm text-stone-300 hover:text-stone-500 py-2 transition-colors"
      >
        Batalkan booking ini
      </button>
    </div>
  )
}
