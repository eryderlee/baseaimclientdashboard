import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
        ],
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

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Get messages error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, receiverId } = await req.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      )
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: session.user.id,
        receiverId: receiverId || null,
      },
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

    // Create activity log
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "sent a message",
        entity: "message",
        entityId: message.id,
      },
    })

    // Create notification for receiver if specified
    if (receiverId) {
      await prisma.notification.create({
        data: {
          userId: receiverId,
          title: "New Message",
          message: `${session.user.name} sent you a message`,
          type: "message",
          link: "/dashboard/chat",
        },
      })
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error("Send message error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
