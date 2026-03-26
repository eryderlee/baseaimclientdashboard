import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function baseUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost'
  return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
  const base = baseUrl(request)
  console.log('[preview] GET', request.url, 'base:', base)
  const session = await auth()
  console.log('[preview] role:', session?.user?.role ?? 'no session', 'cookies:', request.headers.get('cookie')?.includes('next-auth') ? 'has next-auth cookie' : 'no next-auth cookie')
  if (session?.user?.role !== 'ADMIN') {
    console.log('[preview] not admin, redirecting to /dashboard')
    return NextResponse.redirect(new URL('/dashboard', base))
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const returnTo = searchParams.get('returnTo') || '/admin'
  console.log('[preview] clientId:', clientId, 'returnTo:', returnTo)

  if (!clientId) {
    console.log('[preview] no clientId, redirecting to /admin')
    return NextResponse.redirect(new URL('/admin', base))
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  })
  console.log('[preview] client found:', !!client)
  if (!client) {
    console.log('[preview] client not found, redirecting to /admin')
    return NextResponse.redirect(new URL('/admin', base))
  }

  const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/admin'

  const response = NextResponse.redirect(new URL('/dashboard', base))
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }
  response.cookies.set('admin_preview_clientId', clientId, cookieOptions)
  response.cookies.set('admin_preview_return_to', safeReturnTo, cookieOptions)
  return response
}
