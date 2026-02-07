import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChatInterface } from "@/components/dashboard/chat-interface"
import { NotificationCenter } from "@/components/dashboard/notification-center"

async function getChatData(userId: string) {
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  })

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return { messages, notifications }
}

export default async function ChatPage() {
  const session = await auth()
  const { messages, notifications } = await getChatData(session!.user!.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Communication Center</h1>
        <p className="text-neutral-500 mt-1">
          Chat with your team and view notifications
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>
              Send and receive messages with your partnership manager
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChatInterface
              messages={messages}
              currentUserId={session!.user!.id}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Stay updated on important events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationCenter notifications={notifications} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
