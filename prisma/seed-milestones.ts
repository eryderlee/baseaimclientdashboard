/**
 * Standard milestone template for all BaseAim clients
 * Reflects the standard service process: intake → kickoff → ad account → landing page → campaign → launch → optimisation
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Standard 7-milestone template for all BaseAim clients
 * Every client follows this same service process
 */
export const STANDARD_MILESTONES = [
  {
    title: "Complete intake",
    description:
      "Initial intake form completed. We have everything we need to design your kickoff call.",
    order: 1,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Kickoff call",
    description:
      "Walk through the first 30 days, confirm strategy, and make sure it's a fit both ways.",
    order: 2,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Ad Account Setup",
    description:
      "Connect Meta Ads account, grant BaseAim access, and configure tracking pixels.",
    order: 3,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Landing Page Development",
    description:
      "Design and build conversion-optimised landing pages tailored to your campaigns and target audience.",
    order: 4,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Campaign Build",
    description:
      "Create ad campaigns, define audiences, develop ad creatives, and set up conversion tracking.",
    order: 5,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Launch",
    description:
      "Go live with your ad campaigns, monitor initial performance, and make early optimisations.",
    order: 6,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Ongoing Optimisation",
    description:
      "Continuous improvement of ad performance, regular reporting, scaling successful campaigns, and testing new strategies.",
    order: 7,
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
          milestoneType: 'SETUP',
          progress: milestone.progress,
          dueDate: milestone.dueDate,
          notes: milestone.notes,
        },
      })
    )
  );

  return createdMilestones;
}
