'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import GradientBG from '@/components/GradientBG'
import { setPassword } from '@/app/actions/auth'

export default function SetPasswordPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(setPassword, {})

  useEffect(() => {
    if (state.success && state.message) {
      const email = encodeURIComponent(state.message)
      router.push(`/login?email=${email}`)
    }
  }, [state.success, state.message, router])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fcff]">
      <GradientBG />
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-[#e1f5fe]/70 to-[#dbeafe]/60" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="baseaim-login-frame">
            <Card className="rounded-[30px] border-0 bg-white shadow-none">
              <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">
                  <Image
                    src="/BASEAIM BLACK.png"
                    alt="BaseAim logo"
                    width={140}
                    height={40}
                    className="h-10 w-auto"
                    priority
                  />
                </div>
                <CardTitle className="font-heading text-3xl text-slate-900">Set your password</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Choose a password so you can log in any time without a magic link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-8 pt-0">
                <form action={formAction} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-semibold text-slate-700">
                      New password
                    </Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="Min. 8 characters"
                      required
                      disabled={isPending}
                      className="h-12 rounded-2xl border border-slate-200 bg-white/80 text-base shadow-inner shadow-white/60 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
                      Confirm password
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      disabled={isPending}
                      className="h-12 rounded-2xl border border-slate-200 bg-white/80 text-base shadow-inner shadow-white/60 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                  </div>

                  {state.error && (
                    <p className="rounded-2xl bg-red-50/90 px-4 py-3 text-sm font-medium text-red-600" role="status">
                      {state.error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-primary text-base font-semibold tracking-tight shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:ring-primary/40"
                    disabled={isPending}
                  >
                    {isPending ? 'Setting password…' : 'Set password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
