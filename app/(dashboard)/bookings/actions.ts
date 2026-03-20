'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cancelBooking(id: string) {
    const supabase = createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Check if booking belongs to merchant
    const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!merchant) return { error: 'Merchant not found' }

    // Verify booking belongs to merchant
    const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('id', id)
        .eq('merchant_id', merchant.id)
        .single()

    if (!booking) return { error: 'Booking not found or access denied' }

    const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id)

    if (error) {
        console.error('Error cancelling booking:', error)
        return { error: 'Gagal membatalkan booking' }
    }

    revalidatePath(`/bookings/${id}`)
    revalidatePath('/bookings')

    return { success: true }
}
