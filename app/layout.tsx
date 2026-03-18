import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Njadwal — Booking Appointment untuk Bisnis Kamu',
  description: 'Platform booking otomatis untuk UMKM Indonesia. Terima janji, kelola jadwal, bayar via QRIS.',
  keywords: 'booking appointment, jadwal online, barbershop, klinik, studio, Indonesia',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '10px', border: '1px solid #e7e5e4' },
            success: { iconTheme: { primary: '#0f766e', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
