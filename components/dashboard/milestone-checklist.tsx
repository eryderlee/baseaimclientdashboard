"use client";

import { Milestone } from "@/lib/types/milestone";
import {
  calculateOverallProgress,
  getActiveMilestone,
} from "@/lib/milestone-utils";
import { MilestoneItem } from "./milestone-item";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "lucide-react";

interface MilestoneChecklistProps {
  milestones: Milestone[];
}

export function MilestoneChecklist({ milestones }: MilestoneChecklistProps) {
  const overallProgress = calculateOverallProgress(milestones);
  const activeMilestone = getActiveMilestone(milestones);

  const completedCount = milestones.filter(
    (m) => m.status === "COMPLETED"
  ).length;
  const totalCount = milestones.length;

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>
            {completedCount} of {totalCount} milestones completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="space-y-4"
            role="status"
            aria-live="polite"
            aria-label={`Overall progress: ${overallProgress}% complete`}
          >
            <Progress value={overallProgress} className="h-4" />
            <p className="text-3xl font-bold text-foreground">
              {overallProgress}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Milestones Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle>Project Milestones</CardTitle>
          <CardDescription>
            Track your project progress step by step
          </CardDescription>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar
                className="h-12 w-12 text-muted-foreground mb-4"
                aria-hidden="true"
              />
              <p className="text-muted-foreground max-w-md">
                No milestones yet. Your project manager will set them up soon.
              </p>
            </div>
          ) : (
            // Milestone list
            <div className="space-y-2">
              {milestones.map((milestone, index) => (
                <MilestoneItem
                  key={milestone.id}
                  milestone={milestone}
                  isActive={milestone.id === activeMilestone?.id}
                  isLast={index === milestones.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
