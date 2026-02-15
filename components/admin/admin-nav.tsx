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
  Users,
  BarChart3,
  Settings,
  LogOut,
  Shield,
} from "lucide-react"

interface AdminNavProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
  }
}

const adminNavItems = [
  { href: "/admin", label: "Clients", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white shadow-sm">
      <div className="flex h-16 w-full items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-neutral-900" />
            <div className="text-sm leading-tight">
              <p className="font-heading text-lg font-bold text-neutral-900">
                BaseAim Admin
              </p>
              <p className="text-xs text-neutral-500">
                Client Management Console
              </p>
            </div>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-6">
          <div className="hidden md:flex items-center gap-2">
              {adminNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                    <AvatarFallback className="bg-neutral-900 text-white">
                      {user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "A"}
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
                      <Badge variant="default" className="w-fit text-xs bg-neutral-900">
                        {user.role}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">
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
