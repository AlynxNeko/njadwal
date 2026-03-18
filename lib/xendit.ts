import Xendit from 'xendit-node'

export const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY!,
})

export function formatExternalId(bookingId: string) {
  return `NJADWAL-${bookingId}`
}

export function parseBookingIdFromExternal(externalId: string) {
  return externalId.replace('NJADWAL-', '')
}
