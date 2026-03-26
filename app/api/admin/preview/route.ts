import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST-only preview route. POST prevents browser prefetch/duplicate requests
 * that caused race conditions with GET.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const clientId = body.clientId as string | undefined
  const returnTo = (body.returnTo as string) || '/admin'
  console.log('[preview] POST clientId:', clientId, 'returnTo:', returnTo)

  const session = await auth()
  console.log('[preview] role:', session?.user?.role ?? 'no session')
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  })
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/admin'

  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_preview_clientId', clientId, cookieOptions)
  response.cookies.set('admin_preview_return_to', safeReturnTo, cookieOptions)
  console.log('[preview] cookies set, responding ok')
  return response
}
