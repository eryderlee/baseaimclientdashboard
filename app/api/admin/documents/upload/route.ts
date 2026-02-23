import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadFileToDrive, createClientDriveFolder } from "@/lib/google-drive"
import { sendDocumentUploadedEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    // Verify ADMIN session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const clientId = formData.get("clientId") as string

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      )
    }

    // Fetch client from DB including driveFolderId and user info for email notification
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Lazy initialization: create Drive folder if client doesn't have one yet
    // (handles existing clients who were onboarded before Drive integration)
    let driveFolderId = client.driveFolderId
    if (!driveFolderId) {
      driveFolderId = await createClientDriveFolder(
        client.companyName,
        client.id
      )
      await prisma.client.update({
        where: { id: client.id },
        data: { driveFolderId },
      })
    }

    // Upload file to Google Drive
    const driveFile = await uploadFileToDrive(file, driveFolderId)

    // Create Document record in DB
    // status: APPROVED because admin-uploaded docs don't need approval
    const document = await prisma.document.create({
      data: {
        clientId: client.id,
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl: driveFile.id,
        uploadedBy: session.user.id,
        status: "APPROVED",
      },
    })

    // Create activity log entry
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "uploaded a document",
        entity: "document",
        entityId: document.id,
        metadata: {
          documentTitle: file.name,
          clientId: client.id,
          clientName: client.companyName,
        },
      },
    })

    // Fire and forget: send document uploaded email notification to client
    const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/documents`
    sendDocumentUploadedEmail({
      clientName: client.user.name || client.companyName,
      email: client.user.email,
      documentName: file.name,
      uploadedBy: session.user.name || "BaseAim Admin",
      viewUrl,
    }).catch((err) =>
      console.error("Document uploaded email failed:", err)
    )

    // Fire and forget: in-app notification for new document
    prisma.notification.create({
      data: {
        userId: client.user.id,
        title: "New Document Available",
        message: `"${file.name}" has been uploaded to your account.`,
        type: "document",
        link: "/dashboard/documents",
      },
    }).catch((err) => console.error("Failed to create document notification:", err))

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("Admin document upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
