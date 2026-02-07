import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Calendar,
  TrendingUp,
} from "lucide-react"

// Mock milestones data
const mockMilestones = [
  {
    id: "1",
    title: "Project Kickoff & Planning",
    description: "Initial project setup, requirements gathering, and strategy alignment",
    status: "COMPLETED",
    progress: 100,
    startDate: new Date("2026-01-08"),
    dueDate: new Date("2026-01-15"),
    completedAt: new Date("2026-01-14"),
    order: 1,
  },
  {
    id: "2",
    title: "Design & Prototyping",
    description: "Create wireframes, design mockups, and interactive prototypes",
    status: "COMPLETED",
    progress: 100,
    startDate: new Date("2026-01-16"),
    dueDate: new Date("2026-01-28"),
    completedAt: new Date("2026-01-27"),
    order: 2,
  },
  {
    id: "3",
    title: "Development Phase 1",
    description: "Build core features, implement functionality, and integrate APIs",
    status: "IN_PROGRESS",
    progress: 75,
    startDate: new Date("2026-01-29"),
    dueDate: new Date("2026-02-20"),
    completedAt: null,
    order: 3,
  },
  {
    id: "4",
    title: "Testing & QA",
    description: "Comprehensive testing, bug fixes, and quality assurance",
    status: "NOT_STARTED",
    progress: 0,
    startDate: new Date("2026-02-21"),
    dueDate: new Date("2026-03-05"),
    completedAt: null,
    order: 4,
  },
  {
    id: "5",
    title: "Launch & Deployment",
    description: "Final deployment, monitoring, and post-launch support",
    status: "NOT_STARTED",
    progress: 0,
    startDate: new Date("2026-03-06"),
    dueDate: new Date("2026-03-15"),
    completedAt: null,
    order: 5,
  },
]

export default function ProgressPage() {
  const milestones = mockMilestones

  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(
    (m) => m.status === "COMPLETED"
  ).length
  const inProgressMilestones = milestones.filter(
    (m) => m.status === "IN_PROGRESS"
  ).length
  const notStartedMilestones = milestones.filter(
    (m) => m.status === "NOT_STARTED"
  ).length
  const blockedMilestones = milestones.filter(
    (m) => m.status === "BLOCKED"
  ).length

  const overallProgress = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-6 w-6 text-green-500" />
      case "IN_PROGRESS":
        return <Clock className="h-6 w-6 text-blue-500" />
      case "BLOCKED":
        return <AlertCircle className="h-6 w-6 text-red-500" />
      default:
        return <Circle className="h-6 w-6 text-neutral-300" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default"
      case "IN_PROGRESS":
        return "secondary"
      case "BLOCKED":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracking</h1>
        <p className="text-neutral-500 mt-1">
          Monitor your project milestones and track progress
        </p>
      </div>

      {/* Overall Progress Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Overall Progress</CardTitle>
              <CardDescription className="mt-1">
                {completedMilestones} of {totalMilestones} milestones completed
              </CardDescription>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={overallProgress} className="h-4" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                You're making great progress!
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {overallProgress}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedMilestones}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Milestones done
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {inProgressMilestones}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-neutral-200 dark:border-neutral-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
            <Circle className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
              {notStartedMilestones}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Upcoming tasks
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {blockedMilestones}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Milestones Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Milestones Timeline</CardTitle>
          <CardDescription>
            Track your project milestones and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-neutral-400" />
              <p className="mt-4 text-sm text-neutral-500">
                No milestones yet. Your project manager will set them up soon.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {milestones.map((milestone, index) => (
                <div key={milestone.id} className="relative">
                  {index !== milestones.length - 1 && (
                    <div className="absolute left-3 top-12 bottom-0 w-0.5 bg-neutral-200 dark:bg-neutral-800" />
                  )}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1 relative z-10">
                      {getStatusIcon(milestone.status)}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {milestone.title}
                          </h3>
                          {milestone.description && (
                            <p className="text-sm text-neutral-500 mt-1">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                        <Badge variant={getStatusColor(milestone.status) as any}>
                          {milestone.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="space-y-3 mt-3">
                        <div className="flex items-center gap-4 text-sm text-neutral-500">
                          {milestone.startDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs">
                                Start: {milestone.startDate.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {milestone.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span className="text-xs">
                                Due: {milestone.dueDate.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500">Progress</span>
                            <span className="font-medium">
                              {milestone.progress}%
                            </span>
                          </div>
                          <Progress value={milestone.progress} className="h-2" />
                        </div>

                        {milestone.completedAt && (
                          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Completed on {milestone.completedAt.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
