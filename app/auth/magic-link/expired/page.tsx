'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { resendMagicLink } from '@/app/actions/auth'

function ExpiredPageInner() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleResend() {
    setLoading(true)
    await resendMagicLink(email)
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Link expired</CardTitle>
          <CardDescription>
            This login link has expired. Choose how you'd like to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sent ? (
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              A new login link has been sent to{' '}
              <strong>{email || 'your email'}</strong>. Check your inbox.
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleResend}
              disabled={loading || !email}
            >
              {loading ? 'Sending…' : 'Send me a new link'}
            </Button>
          )}
          <Link href="/reset-password">
            <Button variant="outline" className="w-full">
              Set a password instead
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="w-full text-slate-500">
              Back to login
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ExpiredPage() {
  return (
    <Suspense>
      <ExpiredPageInner />
    </Suspense>
  )
}
