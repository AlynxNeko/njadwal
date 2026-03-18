import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export function formatPhoneForDisplay(phone: string): string {
  // 628xxx → 08xxx for display
  if (phone.startsWith('62')) return '0' + phone.slice(2)
  return phone
}

export function normalizePhone(input: string): string {
  let phone = input.replace(/\D/g, '')
  if (phone.startsWith('0')) phone = '62' + phone.slice(1)
  if (!phone.startsWith('62')) phone = '62' + phone
  return phone
}
