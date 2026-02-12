/**
 * Standard milestone template for all BaseAim clients
 * Reflects the standard service process: onboarding → ad account → landing page → campaign → launch → optimization
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Standard 6-milestone template for all BaseAim clients
 * Every client follows this same service process
 */
export const STANDARD_MILESTONES = [
  {
    title: "Client Onboarding",
    description:
      "Initial setup, requirements gathering, and strategy alignment. We learn about your business, goals, and target audience.",
    order: 1,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Ad Account Setup",
    description:
      "Connect Google Ads and Meta Ads accounts, grant BaseAim access, and configure tracking pixels.",
    order: 2,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Landing Page Development",
    description:
      "Design and build conversion-optimized landing pages tailored to your campaigns and target audience.",
    order: 3,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Campaign Build",
    description:
      "Create ad campaigns, define audiences, develop ad creatives, and set up conversion tracking.",
    order: 4,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Launch",
    description:
      "Go live with your ad campaigns, monitor initial performance, and make early optimizations.",
    order: 5,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Ongoing Optimization",
    description:
      "Continuous improvement of ad performance, regular reporting, scaling successful campaigns, and testing new strategies.",
    order: 6,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
];

/**
 * Seed standard milestones for a client
 * Called during client onboarding to create the initial milestone structure
 *
 * @param clientId - The client ID to create milestones for
 * @returns Array of created milestones
 */
export async function seedStandardMilestones(clientId: string) {
  const createdMilestones = await Promise.all(
    STANDARD_MILESTONES.map((milestone) =>
      prisma.milestone.create({
        data: {
          clientId,
          title: milestone.title,
          description: milestone.description,
          order: milestone.order,
          status: milestone.status,
          progress: milestone.progress,
          dueDate: milestone.dueDate,
          notes: milestone.notes,
        },
      })
    )
  );

  return createdMilestones;
}
