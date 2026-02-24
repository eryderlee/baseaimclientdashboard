import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(5000).trim(),
  receiverId: z.string().cuid().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100)
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1)
    const skip = (page - 1) * limit

    const where = {
      OR: [
        { senderId: session.user.id },
        { receiverId: session.user.id },
      ],
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: limit,
        skip,
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
      }),
      prisma.message.count({ where }),
    ])

    return NextResponse.json({
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
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

    const body = await req.json()
    const parsed = createMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    const { content, receiverId } = parsed.data

    const message = await prisma.message.create({
      data: {
        content: content,
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
