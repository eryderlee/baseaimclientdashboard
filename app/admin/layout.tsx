import { AdminNav } from "@/components/admin/admin-nav"
import { auth } from "@/lib/auth"

export default async function AdminLayout({
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
    <div className="relative min-h-screen overflow-hidden bg-neutral-50">
      <AdminNav user={user} />
      <main className="relative z-10 w-full px-4 py-8 md:px-8 lg:px-12 lg:py-12">
        {children}
      </main>
    </div>
  )
}
