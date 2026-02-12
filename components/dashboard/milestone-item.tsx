"use client";

import { Milestone } from "@/lib/types/milestone";
import { formatWeekLevel, getStatusConfig } from "@/lib/milestone-utils";
import { MilestoneStatusBadge } from "./milestone-status-badge";
import { MilestoneNotes } from "./milestone-notes";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MilestoneItemProps {
  milestone: Milestone;
  isActive: boolean;
  isLast: boolean;
}

const iconMap = {
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
};

export function MilestoneItem({
  milestone,
  isActive,
  isLast,
}: MilestoneItemProps) {
  const config = getStatusConfig(milestone.status);
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];

  return (
    <div
      className={cn(
        "relative flex gap-4 transition-all",
        isActive && "ring-2 ring-primary rounded-lg p-4 bg-primary/5"
      )}
    >
      {/* Left side: Status icon with connector line */}
      <div className="relative flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2",
            config.borderColor,
            config.bgColor
          )}
          aria-label={config.label}
        >
          <IconComponent
            className={cn("h-4 w-4", config.color)}
            aria-hidden="true"
          />
        </div>
        {/* Connector line to next milestone */}
        {!isLast && (
          <div
            className="w-0.5 flex-1 bg-border mt-2"
            style={{ minHeight: "2rem" }}
          />
        )}
      </div>

      {/* Right side: Content */}
      <div className="flex-1 pb-8">
        {/* Title and status badge */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-foreground">{milestone.title}</h3>
          <MilestoneStatusBadge status={milestone.status} />
        </div>

        {/* Description */}
        {milestone.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {milestone.description}
          </p>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">{milestone.progress}%</span>
          </div>
          <Progress value={milestone.progress} className="h-2" />
        </div>

        {/* Dates */}
        <div className="text-sm text-muted-foreground space-y-1 mb-3">
          {milestone.dueDate && (
            <p>
              <span className="font-medium">Due:</span>{" "}
              {formatWeekLevel(milestone.dueDate)}
            </p>
          )}
          {milestone.completedAt && (
            <p>
              <span className="font-medium">Completed:</span>{" "}
              {formatWeekLevel(milestone.completedAt)}
            </p>
          )}
        </div>

        {/* Progress notes */}
        <MilestoneNotes notes={milestone.notes} />
      </div>
    </div>
  );
}
