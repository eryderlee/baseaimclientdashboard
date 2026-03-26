'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
}

/**
 * Enter preview mode for a specific client.
 * Sets two httpOnly cookies:
 *   - admin_preview_clientId: the client being previewed
 *   - admin_preview_return_to: the admin page to return to on exit
 * Then redirects to /dashboard so the admin sees the client's view.
 *
 * ADMIN role only.
 */
export async function enterPreview(clientId: string, returnTo?: string) {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  // Validate client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  })
  if (!client) {
    redirect('/admin')
  }

  // Validate returnTo is a safe relative path only
  const safeReturnTo = returnTo && returnTo.startsWith('/') ? returnTo : '/admin'

  const cookieStore = await cookies()
  cookieStore.set('admin_preview_clientId', clientId, COOKIE_OPTS)
  cookieStore.set('admin_preview_return_to', safeReturnTo, COOKIE_OPTS)

  redirect('/dashboard')
}

/**
 * Exit preview mode.
 * Reads the stored returnTo cookie, clears both preview cookies,
 * then redirects admin back to where they came from.
 *
 * Safe: validates returnTo starts with '/' to prevent open redirect.
 */
export async function exitPreview() {
  const cookieStore = await cookies()
  const returnTo = cookieStore.get('admin_preview_return_to')?.value

  // Clear both preview cookies
  cookieStore.set('admin_preview_clientId', '', { ...COOKIE_OPTS, maxAge: 0 })
  cookieStore.set('admin_preview_return_to', '', { ...COOKIE_OPTS, maxAge: 0 })

  // Validate returnTo is a safe relative path
  const safeReturnTo = returnTo && returnTo.startsWith('/') ? returnTo : '/admin'

  redirect(safeReturnTo)
}
