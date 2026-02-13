"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface AnalyticsChartsProps {
  documentsData: any[]
  activityData: any[]
  milestoneData: any[]
}

const COLORS = {
  COMPLETED: "#22c55e",
  IN_PROGRESS: "#3b82f6",
  NOT_STARTED: "#94a3b8",
  BLOCKED: "#ef4444",
}

export function AnalyticsCharts({
  documentsData,
  activityData,
  milestoneData,
}: AnalyticsChartsProps) {
  const milestoneStatusData = milestoneData.reduce((acc: any[], m) => {
    const existing = acc.find(item => item.status === m.status)
    if (existing) {
      existing.count++
    } else {
      acc.push({ status: m.status, count: 1 })
    }
    return acc
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Documents Over Time */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Documents Uploaded Over Time</CardTitle>
          <CardDescription>
            Track your document upload activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={documentsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Documents" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-sm text-neutral-500">No document data yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your activity over the last 14 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  name="Actions"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-sm text-neutral-500">No activity data yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestone Status Distribution */}
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Milestone Status</CardTitle>
          <CardDescription>
            Distribution of milestone completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {milestoneStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={milestoneStatusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${entry.status}: ${entry.count}`}
                >
                  {milestoneStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.status as keyof typeof COLORS] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-sm text-neutral-500">No milestone data yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestone Progress Details */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Milestone Progress Breakdown</CardTitle>
          <CardDescription>
            Individual progress for each milestone
          </CardDescription>
        </CardHeader>
        <CardContent>
          {milestoneData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={milestoneData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="progress" fill="#22c55e" name="Progress %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-sm text-neutral-500">No milestones yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
