"use client"

import { useActionState } from "react"
import Link from "next/link"
import Image from "next/image"

import { requestPasswordReset } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import GradientBG from "@/components/GradientBG"

export default function RequestResetPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, {})

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
                <CardTitle className="font-heading text-3xl text-slate-900">Forgot Password</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Enter your work email and we&apos;ll send a secure reset link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-8 pt-0">
                {state.success ? (
                  <div className="space-y-6 text-center">
                    <p className="rounded-2xl bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-700 shadow-inner shadow-white/60">
                      {state.message}
                    </p>
                    <Link href="/login" className="block">
                      <Button
                        variant="outline"
                        className="h-12 w-full rounded-2xl border-slate-200 text-base font-semibold"
                      >
                        Back to login
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <form action={formAction} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                        Work email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="cpa@firm.com"
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
                      {isPending ? "Sending..." : "Send reset link"}
                    </Button>
                    <Link href="/login" className="block">
                      <Button
                        variant="outline"
                        className="h-12 w-full rounded-2xl border-slate-200 text-base font-semibold"
                      >
                        Back to login
                      </Button>
                    </Link>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
