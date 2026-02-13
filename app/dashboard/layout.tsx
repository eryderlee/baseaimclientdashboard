import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { auth } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: null,
        role: session.user.role
      }
    : {
        name: "Guest",
        email: "",
        image: null,
        role: "CLIENT"
      }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,195,247,0.25),_transparent_60%)] blur-3xl opacity-70" />
      <DashboardNav user={user} />
      <main className="relative z-10 w-full px-4 py-8 md:px-8 lg:px-12 lg:py-12">
        {children}
      </main>
    </div>
  )
}
