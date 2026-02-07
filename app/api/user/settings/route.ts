import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, email, companyName, phone, website, address } = await req.json()

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email,
        clientProfile: {
          update: {
            companyName,
            phone,
            website,
            address,
          },
        },
      },
      include: {
        clientProfile: true,
      },
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: "updated profile settings",
        entity: "user",
        entityId: session.user.id,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
