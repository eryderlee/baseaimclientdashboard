"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, LineChart, Timer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import GradientBG from "@/components/GradientBG"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setIsLoading(false)
      return
    }

    // Fetch session to determine user role
    const response = await fetch("/api/auth/session")
    const session = await response.json()

    // Redirect based on role
    if (session?.user?.role === "ADMIN") {
      router.push("/admin")
    } else {
      router.push("/dashboard")
    }
    router.refresh()
  }
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fcff]">
      <GradientBG />
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-[#e1f5fe]/70 to-[#dbeafe]/60" />

      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <section className="space-y-8 text-slate-900">
              <Badge className="bg-white/60 text-primary shadow-sm backdrop-blur">
                Client acquisition control room
              </Badge>
              <div className="space-y-4">
                <h1 className="font-heading text-4xl leading-tight text-slate-900 md:text-5xl">
                  Login to orchestrate every BaseAim engagement from one secure hub.
                </h1>
                <p className="text-lg text-slate-600 md:max-w-2xl">
                  Track onboarding, billing, deliverables, and pipeline metrics for each accounting
                  partner without digging through email threads. Purpose-built for firms who expect
                  transparent performance.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/40 bg-white/80 p-5 shadow-xl shadow-sky-100/60 backdrop-blur">
                  <div className="flex items-center gap-3 text-primary">
                    <ShieldCheck className="size-5" />
                    <span className="text-sm font-semibold uppercase tracking-wide">Security first</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Encrypted credential flow with role-based routing for admins and client accounts.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/40 bg-white/80 p-5 shadow-xl shadow-sky-100/60 backdrop-blur">
                  <div className="flex items-center gap-3 text-primary">
                    <LineChart className="size-5" />
                    <span className="text-sm font-semibold uppercase tracking-wide">Live KPIs</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Surface booked calls, campaign pacing, and documents the moment you sign in.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
                  <Timer className="size-4 text-primary" />
                  24/7 concierge support
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
                  <ShieldCheck className="size-4 text-primary" />
                  SOC2-ready controls
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
                  <LineChart className="size-4 text-primary" />
                  Pipeline clarity guaranteed
                </div>
              </div>
            </section>

            <Card className="border-white/60 bg-white/90 shadow-[0_35px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
              <CardHeader className="space-y-3 text-center">
                <CardTitle className="font-heading text-3xl text-slate-900">BaseAim ClientHub</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Enter your credentials to sync up with your firm&apos;s live dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-5">
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
                      disabled={isLoading}
                      className="h-12 rounded-2xl border border-slate-200 bg-white/80 text-base shadow-inner shadow-white/60 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/reset-password"
                        className="text-primary transition hover:text-primary/80"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      disabled={isLoading}
                      className="h-12 rounded-2xl border border-slate-200 bg-white/80 text-base shadow-inner shadow-white/60 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                  </div>

                  {error && (
                    <p className="rounded-2xl bg-red-50/90 px-4 py-3 text-sm font-medium text-red-600" role="status">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-primary text-base font-semibold tracking-tight shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:ring-primary/40"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Secure sign in"}
                  </Button>

                  <p className="text-center text-sm text-slate-500">
                    Need an account? Contact your BaseAim engagement lead to provision access.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
