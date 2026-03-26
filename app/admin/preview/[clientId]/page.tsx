import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

export default async function AdminPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') redirect('/dashboard')

  const { clientId } = await params
  const { returnTo } = await searchParams

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  })
  if (!client) redirect('/admin')

  // Validate returnTo is a safe relative path only (prevent open redirect)
  const safeReturnTo = returnTo && returnTo.startsWith('/') ? returnTo : '/admin'

  const cookieStore = await cookies()
  cookieStore.set('admin_preview_clientId', clientId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  cookieStore.set('admin_preview_return_to', safeReturnTo, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  redirect('/dashboard')
}
