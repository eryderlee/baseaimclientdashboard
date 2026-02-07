import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { put } from "@vercel/blob"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload to Vercel Blob (or use local storage for development)
    let fileUrl: string

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(file.name, file, {
        access: "public",
      })
      fileUrl = blob.url
    } else {
      // For development without Blob storage
      fileUrl = `/uploads/${file.name}`
    }

    // Get user's client profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { clientProfile: true },
    })

    if (!user?.clientProfile) {
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 }
      )
    }

    // Save document metadata to database
    const document = await prisma.document.create({
      data: {
        clientId: user.clientProfile.id,
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl,
        uploadedBy: session.user.id,
        status: "PENDING",
      },
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "uploaded a document",
        entity: "document",
        entityId: document.id,
        metadata: {
          documentTitle: file.name,
        },
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
