"use client";

import { MilestoneStatus } from "@/lib/types/milestone";
import { getStatusConfig } from "@/lib/milestone-utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Circle, AlertCircle } from "lucide-react";

interface MilestoneStatusBadgeProps {
  status: MilestoneStatus;
}

const iconMap = {
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
};

export function MilestoneStatusBadge({ status }: MilestoneStatusBadgeProps) {
  const config = getStatusConfig(status);
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];

  return (
    <Badge
      variant="outline"
      className={`${config.color} ${config.bgColor} ${config.borderColor} gap-1.5`}
      aria-label={config.label}
    >
      <IconComponent className="h-3 w-3" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  );
}
