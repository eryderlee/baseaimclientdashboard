import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { ClientForm } from "@/components/admin/client-form"
import { Button } from "@/components/ui/button"

export default async function NewClientPage() {
  // Verify admin access
  const { userRole } = await verifySession()
  if (userRole !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Client</h1>
        <p className="text-neutral-500 mt-1">
          Create a new client account with company details and login credentials
        </p>
      </div>

      <ClientForm mode="create" />
    </div>
  )
}
