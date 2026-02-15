"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  FileText,
  MessageSquare,
  BarChart3,
  CreditCard,
  Settings,
  Bell,
  TrendingUp,
  LogOut,
} from "lucide-react"

interface DashboardNavProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
  }
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-white/70 bg-white/80 shadow-[0_10px_60px_rgba(37,99,235,0.15)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex h-20 w-full items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img
              src="/BASEAIM BLACK.png"
              alt="Baseaim logo"
              width={52}
              height={52}
              className="h-12 w-auto object-contain drop-shadow-[0_12px_30px_rgba(15,23,42,0.25)]"
            />
            <div className="text-sm leading-tight text-slate-600">
              <p className="font-heading text-lg text-slate-900 dark:text-white">
                Baseaim Client Hub
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Engagement Workspace
              </p>
            </div>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-6">
          <div className="hidden md:flex items-center gap-1 rounded-full border border-white/60 bg-white/70 p-1 shadow-inner shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/70">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-primary to-cyan-400 text-white shadow-md shadow-sky-200"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full border border-white/70 bg-white/70 text-slate-600 shadow-sm shadow-sky-100 hover:bg-white/90 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
            >
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#e11d48] via-[#f97316] to-[#eab308] p-0 text-[10px] text-white shadow-sm">
                3
              </Badge>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-12 rounded-full border border-white/70 bg-white/90 p-0 shadow-sm shadow-sky-100 dark:border-slate-700 dark:bg-slate-900/80">
                  <Avatar>
                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                    <AvatarFallback className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      {user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                    {user.role && (
                      <Badge variant="secondary" className="w-fit text-xs">
                        {user.role}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
