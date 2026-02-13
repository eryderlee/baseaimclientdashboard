import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { del } from "@vercel/blob"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if user owns this document
    if (document.client.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete from Vercel Blob if applicable
    if (process.env.BLOB_READ_WRITE_TOKEN && document.fileUrl.includes("vercel")) {
      try {
        await del(document.fileUrl)
      } catch (error) {
        console.error("Failed to delete blob:", error)
      }
    }

    // Delete from database
    await prisma.document.delete({
      where: { id },
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "deleted a document",
        entity: "document",
        entityId: id,
        metadata: {
          documentTitle: document.title,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
