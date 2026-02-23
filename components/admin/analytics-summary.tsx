import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, AlertTriangle, Calendar, DollarSign, Megaphone } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface AnalyticsSummaryProps {
  totalClients: number
  activeClients: number
  averageProgress: number
  atRiskClients: number
  upcomingDueDates: Array<{
    clientName: string
    milestoneTitle: string
    dueDate: string // ISO string for server-to-client transport
  }>
  // Revenue data
  totalRevenue: number
  mrr: number
  payingClientCount: number
  activeSubscriptionCount: number
  // Facebook Ads data
  totalFbSpend: number
  totalFbLeads: number
  fbConfiguredClients: number
}

export function AnalyticsSummary({
  totalClients,
  activeClients,
  averageProgress,
  atRiskClients,
  upcomingDueDates,
  totalRevenue,
  mrr,
  payingClientCount,
  activeSubscriptionCount,
  totalFbSpend,
  totalFbLeads,
  fbConfiguredClients,
}: AnalyticsSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Clients Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-neutral-500 mt-1">
              {activeClients} active
            </p>
          </CardContent>
        </Card>

        {/* Average Progress Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProgress}%</div>
            <Progress value={averageProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* At Risk Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                atRiskClients > 0 ? 'text-destructive' : ''
              }`}
            >
              {atRiskClients}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {atRiskClients === 0
                ? 'All on track'
                : `${atRiskClients} client${atRiskClients === 1 ? '' : 's'} need attention`}
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Due Dates Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Due Dates</CardTitle>
            <Calendar className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDueDates.length}</div>
            <p className="text-xs text-neutral-500 mt-1">
              Next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Marketing Section */}
      <div>
        <h3 className="text-sm font-medium text-neutral-500 mb-3">Revenue & Marketing</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Revenue Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                From {payingClientCount} paying client{payingClientCount === 1 ? '' : 's'}
              </p>
            </CardContent>
          </Card>

          {/* MRR Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
              <TrendingUp className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${mrr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {activeSubscriptionCount} active subscription{activeSubscriptionCount === 1 ? '' : 's'}
              </p>
            </CardContent>
          </Card>

          {/* FB Ad Spend Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ad Spend (30d)</CardTitle>
              <Megaphone className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalFbSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Across {fbConfiguredClients} client{fbConfiguredClients === 1 ? '' : 's'}
              </p>
            </CardContent>
          </Card>

          {/* FB Leads Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads (30d)</CardTitle>
              <Users className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFbLeads}</div>
              <p className="text-xs text-neutral-500 mt-1">
                {fbConfiguredClients > 0
                  ? `${(totalFbLeads / fbConfiguredClients).toFixed(1)} avg per client`
                  : 'No FB accounts configured'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Due Dates List */}
      {upcomingDueDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDueDates.map((item, index) => {
                const date = new Date(item.dueDate)
                const formattedDate = new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).format(date)

                return (
                  <div
                    key={index}
                    className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.milestoneTitle}</p>
                      <p className="text-xs text-neutral-500">{item.clientName}</p>
                    </div>
                    <div className="text-sm text-neutral-500">{formattedDate}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
