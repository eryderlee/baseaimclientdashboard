"use client"

import { MilestoneChecklist } from "@/components/dashboard/milestone-checklist"
import { Milestone, MilestoneStatus } from "@/lib/types/milestone"

const mockMilestones: Milestone[] = [
  {
    id: "kickoff",
    clientId: "demo-client",
    title: "Discovery + Kickoff",
    description: "Project intake, success metrics, and tech stack alignment.",
    status: MilestoneStatus.COMPLETED,
    startDate: new Date("2026-01-05"),
    dueDate: new Date("2026-01-10"),
    completedAt: new Date("2026-01-10"),
    progress: 100,
    order: 1,
    notes: [
      {
        id: "kickoff-note-1",
        content: "Kickoff call recorded and summary shared.",
        createdAt: "2026-01-09T15:00:00.000Z",
        createdBy: "Project Manager",
      },
    ],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-10"),
  },
  {
    id: "funnels",
    clientId: "demo-client",
    title: "Acquisition Funnel Architecture",
    description: "Landing page copy, wireframes, and CRM routing.",
    status: MilestoneStatus.COMPLETED,
    startDate: new Date("2026-01-11"),
    dueDate: new Date("2026-01-22"),
    completedAt: new Date("2026-01-22"),
    progress: 100,
    order: 2,
    notes: [
      {
        id: "funnels-note-1",
        content: "Copy approved and design locked for dev handoff.",
        createdAt: "2026-01-20T13:00:00.000Z",
        createdBy: "Creative Lead",
      },
    ],
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-22"),
  },
  {
    id: "build",
    clientId: "demo-client",
    title: "Client Acquisition System Build",
    description: "Deploy landing pages, automations, and call booking workflows.",
    status: MilestoneStatus.IN_PROGRESS,
    startDate: new Date("2026-01-23"),
    dueDate: new Date("2026-02-05"),
    completedAt: null,
    progress: 65,
    order: 3,
    notes: [
      {
        id: "build-note-1",
        content: "Calendly + CRM integration complete; awaiting legal review.",
        createdAt: "2026-01-28T18:30:00.000Z",
        createdBy: "Growth Engineer",
      },
    ],
    createdAt: new Date("2026-01-05"),
    updatedAt: new Date("2026-02-01"),
  },
  {
    id: "qa",
    clientId: "demo-client",
    title: "QA, Compliance, and Launch Prep",
    description: "Testing tracking events, compliance review, and launch list.",
    status: MilestoneStatus.NOT_STARTED,
    startDate: new Date("2026-02-06"),
    dueDate: new Date("2026-02-15"),
    completedAt: null,
    progress: 0,
    order: 4,
    notes: [],
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-01-20"),
  },
  {
    id: "scale",
    clientId: "demo-client",
    title: "Paid Media Launch + Optimization",
    description: "Launch ads, monitor CPL, and iterate on creative weekly.",
    status: MilestoneStatus.NOT_STARTED,
    startDate: new Date("2026-02-16"),
    dueDate: new Date("2026-03-05"),
    completedAt: null,
    progress: 0,
    order: 5,
    notes: [],
    createdAt: new Date("2026-01-25"),
    updatedAt: new Date("2026-01-25"),
  },
]

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracking</h1>
        <p className="text-neutral-500 mt-1">
          Monitor your project milestones and track progress
        </p>
      </div>

      {/* Milestone Checklist Component */}
      <MilestoneChecklist milestones={mockMilestones} />
    </div>
  )
}
