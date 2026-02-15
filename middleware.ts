import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
  const isOnAdmin = req.nextUrl.pathname.startsWith('/admin')
  const isOnLogin = req.nextUrl.pathname === '/login'
  const isOnRegister = req.nextUrl.pathname === '/register'
  const isAuthRoute = isOnLogin || isOnRegister

  // Redirect authenticated users away from auth pages to their appropriate dashboard
  if (isAuthRoute && isLoggedIn) {
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Redirect unauthenticated users to login
  if ((isOnDashboard || isOnAdmin) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Block admins from accessing client dashboard
  if (isOnDashboard && userRole === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  // Block clients from accessing admin routes
  if (isOnAdmin && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.ico$).*)'],
}
