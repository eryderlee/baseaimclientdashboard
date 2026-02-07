import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  FileText,
  MessageSquare,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react"
import Link from "next/link"

async function getDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      clientProfile: {
        include: {
          documents: {
            take: 5,
            orderBy: { createdAt: "desc" },
          },
          milestones: {
            orderBy: { order: "asc" },
          },
          invoices: {
            take: 3,
            orderBy: { createdAt: "desc" },
          },
        },
      },
      notifications: {
        where: { isRead: false },
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  })

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      isRead: false,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  })

  const activities = await prisma.activity.findMany({
    where: { userId },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  })

  return { user, messages, activities }
}

export default async function DashboardPage() {
  const session = await auth()
  const { user, messages, activities } = await getDashboardData(session!.user!.id)

  const totalDocuments = user?.clientProfile?.documents.length || 0
  const totalMilestones = user?.clientProfile?.milestones.length || 0
  const completedMilestones = user?.clientProfile?.milestones.filter(
    (m) => m.status === "COMPLETED"
  ).length || 0
  const overallProgress = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0

  const pendingInvoices = user?.clientProfile?.invoices.filter(
    (inv) => inv.status === "SENT" || inv.status === "OVERDUE"
  ) || []

  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-neutral-500 mt-1">
          Here's what's happening with your partnership
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <Link href="/dashboard/documents">
              <Button variant="link" className="px-0 text-xs">
                View all documents <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.length}</div>
            <Link href="/dashboard/chat">
              <Button variant="link" className="px-0 text-xs">
                Open chat <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress}%</div>
            <Progress value={overallProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalPending.toFixed(2)}
            </div>
            <Link href="/dashboard/billing">
              <Button variant="link" className="px-0 text-xs">
                View invoices <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Progress Tracking */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Project Milestones</CardTitle>
            <CardDescription>
              Track your partnership progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.clientProfile?.milestones.slice(0, 5).map((milestone) => (
              <div key={milestone.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {milestone.status === "COMPLETED" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : milestone.status === "IN_PROGRESS" ? (
                      <Clock className="h-5 w-5 text-blue-500" />
                    ) : milestone.status === "BLOCKED" ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-neutral-300" />
                    )}
                    <div>
                      <p className="font-medium">{milestone.title}</p>
                      {milestone.description && (
                        <p className="text-sm text-neutral-500">{milestone.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      milestone.status === "COMPLETED"
                        ? "default"
                        : milestone.status === "IN_PROGRESS"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {milestone.status.replace("_", " ")}
                  </Badge>
                </div>
                <Progress value={milestone.progress} className="h-2" />
              </div>
            ))}
            {totalMilestones === 0 && (
              <p className="text-sm text-neutral-500 text-center py-8">
                No milestones yet. Your partnership manager will set them up soon.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.user.image || ""} />
                    <AvatarFallback>
                      {activity.user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{" "}
                      {activity.action}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-sm text-neutral-500 text-center py-8">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents and Notifications */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Latest uploads and shared files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user?.clientProfile?.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-neutral-500" />
                    <div>
                      <p className="font-medium text-sm">{doc.title}</p>
                      <p className="text-xs text-neutral-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={doc.status === "APPROVED" ? "default" : "secondary"}>
                    {doc.status}
                  </Badge>
                </div>
              ))}
              {totalDocuments === 0 && (
                <p className="text-sm text-neutral-500 text-center py-8">
                  No documents yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Important updates and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user?.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {user?.notifications.length === 0 && (
                <p className="text-sm text-neutral-500 text-center py-8">
                  No new notifications
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
