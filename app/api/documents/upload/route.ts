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

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
