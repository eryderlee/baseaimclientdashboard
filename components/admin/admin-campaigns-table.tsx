'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CampaignRow {
  clientId: string
  clientName: string
  campaign_id: string
  campaign_name: string
  spend: number
  leads: number
  cpl: number
  impressions: number
  clicks: number
  ctr: number
}

interface Props {
  rows: CampaignRow[]
}

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function ClientBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
      {name}
    </span>
  )
}

export function AdminCampaignsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
        <p className="text-sm font-medium text-slate-600">No campaign data available</p>
        <p className="text-xs text-slate-400 mt-1">
          No campaign data available — configure Facebook ad accounts for clients
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">CPL</TableHead>
            <TableHead className="text-right hidden md:table-cell">Impressions</TableHead>
            <TableHead className="text-right hidden md:table-cell">Clicks</TableHead>
            <TableHead className="text-right hidden md:table-cell">CTR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.campaign_id}>
              <TableCell>
                <ClientBadge name={row.clientName} />
              </TableCell>
              <TableCell className="font-medium max-w-[200px] truncate" title={row.campaign_name}>
                {row.campaign_name}
              </TableCell>
              <TableCell className="text-right tabular-nums">{fmt$(row.spend)}</TableCell>
              <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.leads > 0 ? fmt$(row.cpl) : <span className="text-slate-400">—</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">
                {fmtInt(row.impressions)}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">
                {fmtInt(row.clicks)}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">
                {row.ctr.toFixed(2)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
