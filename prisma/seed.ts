import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import { seedStandardMilestones } from "./seed-milestones"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // 1. Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@baseaim.com" },
    update: {},
    create: {
      email: "admin@baseaim.com",
      name: "BaseAim Admin",
      password: adminPassword,
      role: "ADMIN",
    },
  })
  console.log(`Admin user: ${admin.email}`)

  // 2. Create client user 1 (with Client profile and milestones)
  const client1Password = await bcrypt.hash("client123", 10)
  const client1User = await prisma.user.upsert({
    where: { email: "client1@example.com" },
    update: {},
    create: {
      email: "client1@example.com",
      name: "Acme Accounting",
      password: client1Password,
      role: "CLIENT",
      clientProfile: {
        create: {
          companyName: "Acme Accounting LLC",
          industry: "Accounting",
        },
      },
    },
    include: { clientProfile: true },
  })
  console.log(`Client 1: ${client1User.email}`)

  // Seed milestones for client 1 (only if none exist)
  if (client1User.clientProfile) {
    const existingMilestones = await prisma.milestone.count({
      where: { clientId: client1User.clientProfile.id },
    })
    if (existingMilestones === 0) {
      await seedStandardMilestones(client1User.clientProfile.id)
      console.log(`Milestones seeded for ${client1User.clientProfile.companyName}`)

      // Update some milestones to show progress for testing
      const milestones = await prisma.milestone.findMany({
        where: { clientId: client1User.clientProfile.id },
        orderBy: { order: "asc" },
      })

      if (milestones.length >= 3) {
        // Mark first milestone as completed
        await prisma.milestone.update({
          where: { id: milestones[0].id },
          data: {
            status: "COMPLETED",
            progress: 100,
            completedAt: new Date("2026-01-15"),
            startDate: new Date("2026-01-05"),
            dueDate: new Date("2026-01-15"),
            notes: [
              {
                id: "note-1",
                content: "Kickoff call completed. Goals and timelines aligned.",
                createdAt: new Date().toISOString(),
                createdBy: "BaseAim Admin",
              },
            ],
          },
        })

        // Mark second milestone as in progress
        await prisma.milestone.update({
          where: { id: milestones[1].id },
          data: {
            status: "IN_PROGRESS",
            progress: 60,
            startDate: new Date("2026-01-16"),
            dueDate: new Date("2026-02-01"),
            notes: [
              {
                id: "note-2",
                content: "Ad accounts connected. Configuring tracking pixels.",
                createdAt: new Date().toISOString(),
                createdBy: "BaseAim Admin",
              },
            ],
          },
        })
      }
    }
  }

  // 3. Create client user 2 (different client to test isolation)
  const client2Password = await bcrypt.hash("client123", 10)
  const client2User = await prisma.user.upsert({
    where: { email: "client2@example.com" },
    update: {},
    create: {
      email: "client2@example.com",
      name: "Smith & Partners",
      password: client2Password,
      role: "CLIENT",
      clientProfile: {
        create: {
          companyName: "Smith & Partners CPA",
          industry: "Accounting",
        },
      },
    },
    include: { clientProfile: true },
  })
  console.log(`Client 2: ${client2User.email}`)

  // Seed milestones for client 2 (different progress state)
  if (client2User.clientProfile) {
    const existingMilestones = await prisma.milestone.count({
      where: { clientId: client2User.clientProfile.id },
    })
    if (existingMilestones === 0) {
      await seedStandardMilestones(client2User.clientProfile.id)
      console.log(`Milestones seeded for ${client2User.clientProfile.companyName}`)
    }
  }

  console.log("\nSeed complete!")
  console.log("\nTest credentials:")
  console.log("  Admin:    admin@baseaim.com / admin123")
  console.log("  Client 1: client1@example.com / client123")
  console.log("  Client 2: client2@example.com / client123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
