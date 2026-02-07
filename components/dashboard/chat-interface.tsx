"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send } from "lucide-react"

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: Date
  sender: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

interface ChatInterfaceProps {
  messages: Message[]
  currentUserId: string
}

export function ChatInterface({ messages: initialMessages, currentUserId }: ChatInterfaceProps) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      fetch("/api/messages")
        .then((res) => res.json())
        .then((data) => {
          setMessages(data.messages)
          router.refresh()
        })
        .catch(console.error)
    }, 5000)

    return () => clearInterval(interval)
  }, [router])

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      const data = await response.json()
      setMessages([...messages, data.message])
      setNewMessage("")
      router.refresh()
    } catch (error) {
      console.error("Send error:", error)
      alert("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="space-y-4">
      <div className="h-[400px] overflow-y-auto space-y-4 p-4 border rounded-lg bg-neutral-50 dark:bg-neutral-900">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-neutral-500">
              No messages yet. Start a conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender.image || ""} />
                  <AvatarFallback>
                    {message.sender.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex-1 max-w-[70%] ${isOwn ? "items-end" : ""}`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-white dark:bg-neutral-800"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 px-1">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sending}
          rows={2}
        />
        <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
