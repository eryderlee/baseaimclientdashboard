"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="baseaim-login-frame">
            <Card className="rounded-[30px] border-0 bg-white shadow-none">
              <CardHeader className="space-y-4 text-center">
                <CardTitle className="font-heading text-3xl text-slate-900">BaseAim ClientHub</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Enter your credentials to sync up with your firm&apos;s live dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-8 pt-0">
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

                  <div className="space-y-3 text-center text-sm text-slate-500">
                    <div className="space-y-1">
                      <p>Need an account? Contact our BaseAim support team to provision access.</p>
                      <p>
                        Or email{" "}
                        <a
                          href="mailto:support@baseaim.co"
                          className="font-semibold text-primary hover:text-primary/80"
                        >
                          support@baseaim.co
                        </a>
                      </p>
                    </div>
                    <div className="flex justify-center pt-2">
                      <Image
                        src="/BASEAIM BLACK.png"
                        alt="BaseAim logo"
                        width={130}
                        height={40}
                        className="h-8 w-auto"
                        priority
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
