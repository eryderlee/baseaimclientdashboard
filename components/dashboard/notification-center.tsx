"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check } from "lucide-react"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  link: string | null
  createdAt: Date
}

interface NotificationCenterProps {
  notifications: Notification[]
}

export function NotificationCenter({ notifications }: NotificationCenterProps) {
  const router = useRouter()

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      router.refresh()
    } catch (error) {
      console.error("Mark as read error:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      })
      router.refresh()
    } catch (error) {
      console.error("Mark all as read error:", error)
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="mx-auto h-12 w-12 text-neutral-400" />
        <p className="mt-4 text-sm text-neutral-500">No notifications</p>
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{unreadCount} unread</Badge>
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              !notification.isRead
                ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900"
                : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
            }`}
            onClick={() => {
              if (!notification.isRead) {
                markAsRead(notification.id)
              }
              if (notification.link) {
                router.push(notification.link)
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-sm">{notification.title}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-neutral-400 mt-2">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              {!notification.isRead && (
                <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
