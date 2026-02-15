import { redirect } from "next/navigation"
import { verifySession, getChatSettings } from "@/lib/dal"
import { ChatSettingsForm } from "./chat-settings-form"

export default async function AdminSettingsPage() {
  // Verify admin access
  const { userRole } = await verifySession()
  if (userRole !== "ADMIN") {
    redirect("/dashboard")
  }

  // Fetch current settings
  const settings = await getChatSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-neutral-500 mt-1">
          Configure application settings
        </p>
      </div>

      <ChatSettingsForm
        defaultValues={{
          whatsappNumber: settings?.whatsappNumber || '',
          telegramUsername: settings?.telegramUsername || '',
        }}
      />
    </div>
  )
}
