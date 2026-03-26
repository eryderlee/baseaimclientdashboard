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
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', base))
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const returnTo = searchParams.get('returnTo') || '/admin'

  if (!clientId) {
    return NextResponse.redirect(new URL('/admin', base))
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  })
  if (!client) {
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
