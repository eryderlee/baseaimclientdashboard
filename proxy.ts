// CSRF Audit (PROD-04): All mutations use Server Actions with built-in Origin/Host verification.
// Route handlers with mutations (upload, documents, messages, notifications, user/settings, webhooks/stripe)
// all require session auth or Stripe signature verification. /api/auth/register is intentionally public
// (account creation). No unprotected mutation route handlers. Verified 2026-02-22.

import { auth } from '@/lib/auth'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '60 s'),
})

const AUTH_ROUTES_TO_RATE_LIMIT = ['/login', '/reset-password', '/api/auth']

const proxyHandler = auth(async (req) => {
  const { pathname } = req.nextUrl

  // Rate limit auth routes before auth routing logic
  const isAuthRoute = AUTH_ROUTES_TO_RATE_LIMIT.some((route) =>
    pathname.startsWith(route)
  )

  if (isAuthRoute) {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'

    try {
      const { success } = await ratelimit.limit(`auth:${ip}`)
      if (!success) {
        return new NextResponse('Too many requests. Please try again later.', {
          status: 429,
          headers: { 'Retry-After': '60' },
        })
      }
    } catch (e) {
      console.error('Rate limit check failed:', e)
      // Fall through on rate limiter failure -- don't block on infrastructure issues
    }
  }

  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role
  const isOnDashboard = pathname.startsWith('/dashboard')
  const isOnAdmin = pathname.startsWith('/admin')
  const isOnLogin = pathname === '/login'
  const isOnRegister = pathname === '/register'
  const isAuthPage = isOnLogin || isOnRegister

  // Redirect authenticated users away from auth pages to their appropriate dashboard
  if (isAuthPage && isLoggedIn) {
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Redirect unauthenticated users to login
  if ((isOnDashboard || isOnAdmin) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Block admins from accessing client dashboard (unless in preview mode)
  const isPreviewMode = req.cookies.get('admin_preview_clientId')?.value
  if (isOnDashboard && userRole === 'ADMIN' && !isPreviewMode) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  // Block clients from accessing admin routes
  if (isOnAdmin && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export default proxyHandler
export { proxyHandler as proxy }

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.ico$).*)',
    '/api/auth/:path*',
  ],
}
