/**
 * Milestone and progress tracking types
 * Mirrors Prisma schema with additional TypeScript structure for JSON fields
 */

/**
 * Milestone status enum
 * Matches MilestoneStatus in Prisma schema
 */
export enum MilestoneStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  BLOCKED = "BLOCKED",
}

/**
 * Individual note entry in a milestone's progress changelog
 * Stored in the notes Json field as an array
 */
export interface MilestoneNote {
  /** Unique identifier for this note */
  id: string;
  /** Note content - what changed, what was completed, what's blocking */
  content: string;
  /** ISO 8601 timestamp when note was created */
  createdAt: string;
  /** User who created this note (user ID or name) */
  createdBy: string;
}

/**
 * Milestone data structure
 * Mirrors Prisma Milestone model with typed notes field
 */
export interface Milestone {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  startDate: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Display order (1-6 for standard milestones) */
  order: number;
  /** Array of progress notes/changelog entries */
  notes: MilestoneNote[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Milestone with client relation included
 * Used in queries that need client context
 */
export interface MilestoneWithClient extends Milestone {
  client: {
    id: string;
    companyName: string;
    userId: string;
  };
}
