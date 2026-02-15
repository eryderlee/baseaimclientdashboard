import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getChatSettings } from '@/lib/dal'
import { ChatButtons } from '@/components/client/chat-buttons'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'

export default async function ChatPage() {
  const session = await auth()
  const settings = await getChatSettings()

  // Fetch client profile for company name
  const client = await prisma.client.findUnique({
    where: { userId: session!.user!.id },
    select: { companyName: true }
  })

  const clientName = session?.user?.name || 'Client'
  const companyName = client?.companyName || 'Company'

  const hasSettings = settings?.whatsappNumber || settings?.telegramUsername

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="text-neutral-500 mt-1">
          Get in touch with your BaseAim team
        </p>
      </div>

      <Card className="glass-card rounded-3xl border border-white/60 shadow-xl shadow-sky-100 dark:border-slate-800/70">
        <CardHeader>
          <CardTitle className="font-heading text-2xl flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Direct Contact
          </CardTitle>
          <CardDescription>
            {hasSettings
              ? 'Choose your preferred messaging platform to start a conversation'
              : 'Contact details are being set up'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasSettings ? (
            <>
              <ChatButtons
                whatsappNumber={settings?.whatsappNumber}
                telegramUsername={settings?.telegramUsername}
                clientName={clientName}
                companyName={companyName}
                layout="column"
              />
              <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                <p className="font-semibold mb-2">Quick Start:</p>
                <p>
                  Click a button above to open a conversation. Your name and company will be
                  included automatically so we know who you are.
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/70 bg-white/70 p-6 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <p className="font-semibold">Contact details are being set up.</p>
              <p className="text-sm mt-1">Please check back soon.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
