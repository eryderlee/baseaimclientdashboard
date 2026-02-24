import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFileToDrive } from "@/lib/google-drive"

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

    const isVideo = file.type.startsWith("video/")
    const MAX_FILE_SIZE = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds ${isVideo ? "500MB" : "50MB"} limit` },
        { status: 413 }
      )
    }

    // Get user's client profile, including their Drive folder ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        clientProfile: {
          select: {
            id: true,
            driveFolderId: true,
          },
        },
      },
    })

    if (!user?.clientProfile) {
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 }
      )
    }

    const { clientProfile } = user

    // Require Drive folder to be configured before accepting uploads
    if (!clientProfile.driveFolderId) {
      return NextResponse.json(
        {
          error:
            "Drive folder not configured for this client. Contact admin.",
        },
        { status: 400 }
      )
    }

    // Upload to Google Drive
    const driveFile = await uploadFileToDrive(file, clientProfile.driveFolderId)

    // Store the Drive file ID in the fileUrl column
    const fileUrl = driveFile.id

    // Save document metadata to database
    const document = await prisma.document.create({
      data: {
        clientId: clientProfile.id,
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

    // Fire and forget: notify admin of pending document review
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    })
    if (adminUser) {
      prisma.notification.create({
        data: {
          userId: adminUser.id,
          title: "Document Pending Review",
          message: `${session.user.name || "A client"} uploaded "${file.name}" and it is awaiting review.`,
          type: "document_review",
          link: `/admin/clients/${clientProfile.id}/documents`,
        },
      }).catch((err) => console.error("Failed to create document review notification:", err))
    }

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
