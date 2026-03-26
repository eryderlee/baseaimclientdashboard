import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const returnTo = searchParams.get('returnTo') || '/admin'

  if (!clientId) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  })
  if (!client) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/admin'

  const response = NextResponse.redirect(new URL('/dashboard', request.url))
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
