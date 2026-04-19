import { cookies } from 'next/headers'
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { AdminPreviewBanner } from "@/components/dashboard/admin-preview-banner"
import { exitPreview } from "@/lib/actions/preview"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSetupComplete } from "@/lib/dal"

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

  const rawNotifications = session?.user?.id
    ? await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    : []

  const notifications = rawNotifications.map(n => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }))

  // Preview mode: check for preview cookie when user is ADMIN
  const cookieStore = await cookies()
  const previewClientId = cookieStore.get('admin_preview_clientId')?.value

  const previewClient =
    previewClientId && session?.user?.role === 'ADMIN'
      ? await prisma.client.findUnique({
          where: { id: previewClientId },
          select: { companyName: true },
        })
      : null

  // Show locks even for admins in preview mode (so they see the client's actual state)
  const setupComplete =
    (user.role === 'ADMIN' && !previewClientId) || (await isSetupComplete())

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,195,247,0.25),_transparent_60%)] blur-3xl opacity-70" />
      {previewClient && (
        <AdminPreviewBanner clientName={previewClient.companyName} exitAction={exitPreview} />
      )}
      <DashboardNav user={user} notifications={notifications} setupComplete={setupComplete} />
      <main className="relative z-10 w-full px-4 py-8 md:px-8 lg:px-12 lg:py-12">
        {children}
      </main>
    </div>
  )
}
