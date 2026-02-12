/**
 * Milestone utility functions for calculations and formatting
 */

import { Milestone, MilestoneStatus } from "./types/milestone";

/**
 * Calculate overall progress as percentage of completed milestones
 * @param milestones Array of milestones
 * @returns Percentage (0-100) of completed milestones
 */
export function calculateOverallProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;

  const completedCount = milestones.filter(
    (m) => m.status === MilestoneStatus.COMPLETED
  ).length;

  return Math.round((completedCount / milestones.length) * 100);
}

/**
 * Get the currently active milestone
 * @param milestones Array of milestones sorted by order
 * @returns First IN_PROGRESS milestone, or first NOT_STARTED if none in progress, or null
 */
export function getActiveMilestone(milestones: Milestone[]): Milestone | null {
  // First, look for IN_PROGRESS milestone
  const inProgress = milestones.find(
    (m) => m.status === MilestoneStatus.IN_PROGRESS
  );
  if (inProgress) return inProgress;

  // If none in progress, return first NOT_STARTED
  const notStarted = milestones.find(
    (m) => m.status === MilestoneStatus.NOT_STARTED
  );
  if (notStarted) return notStarted;

  // All complete or blocked
  return null;
}

/**
 * Format date as week-level precision (e.g., "Week of Jan 15, 2026")
 * @param date Date object, ISO string, or null
 * @returns Formatted string or empty string if null
 */
export function formatWeekLevel(date: Date | string | null): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Format: "Week of Jan 15, 2026"
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `Week of ${formatter.format(dateObj)}`;
}

/**
 * Configuration for milestone status display
 */
export interface StatusConfig {
  icon: string; // Lucide icon name
  color: string; // Text color
  bgColor: string; // Background color
  borderColor: string; // Border color
  label: string; // Screen reader label
}

/**
 * Get display configuration for milestone status
 * Color-blind safe with distinct icons and text labels
 * @param status Milestone status
 * @returns Configuration object with icon, colors, and label
 */
export function getStatusConfig(status: MilestoneStatus): StatusConfig {
  switch (status) {
    case MilestoneStatus.COMPLETED:
      return {
        icon: "CheckCircle2",
        color: "text-emerald-700 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-950",
        borderColor: "border-emerald-200 dark:border-emerald-800",
        label: "Completed",
      };
    case MilestoneStatus.IN_PROGRESS:
      return {
        icon: "Clock",
        color: "text-blue-700 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950",
        borderColor: "border-blue-200 dark:border-blue-800",
        label: "In Progress",
      };
    case MilestoneStatus.BLOCKED:
      return {
        icon: "AlertCircle",
        color: "text-red-700 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950",
        borderColor: "border-red-200 dark:border-red-800",
        label: "Blocked",
      };
    case MilestoneStatus.NOT_STARTED:
    default:
      return {
        icon: "Circle",
        color: "text-slate-700 dark:text-slate-400",
        bgColor: "bg-slate-50 dark:bg-slate-950",
        borderColor: "border-slate-200 dark:border-slate-800",
        label: "Not Started",
      };
  }
}
