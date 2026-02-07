import { DashboardNav } from "@/components/dashboard/dashboard-nav"

// Mock user for demo purposes
const mockUser = {
  name: "Demo User",
  email: "demo@clienthub.com",
  image: null,
  role: "CLIENT"
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <DashboardNav user={mockUser} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
