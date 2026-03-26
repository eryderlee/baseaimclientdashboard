'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AdRow {
  clientId: string
  clientName: string
  ad_id: string
  ad_name: string
  campaign_name: string
  spend: number
  leads: number
  cpl: number
  impressions: number
  clicks: number
  ctr: number
}

interface Props {
  rows: AdRow[]
}

export function AdminAdsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
        <p className="text-sm font-medium text-neutral-600">No ad data available</p>
        <p className="text-xs text-neutral-400 mt-1">
          Configure Facebook ad accounts for clients to see individual ad performance
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
            <TableHead>Ad</TableHead>
            <TableHead className="hidden lg:table-cell">Campaign</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">CPL</TableHead>
            <TableHead className="text-right hidden md:table-cell">Impressions</TableHead>
            <TableHead className="text-right hidden md:table-cell">CTR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.ad_id}>
              <TableCell className="font-medium whitespace-nowrap">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {row.clientName}
                </span>
              </TableCell>
              <TableCell className="max-w-[180px] truncate" title={row.ad_name}>
                {row.ad_name}
              </TableCell>
              <TableCell className="hidden lg:table-cell max-w-[160px] truncate text-neutral-500 text-sm" title={row.campaign_name}>
                {row.campaign_name}
              </TableCell>
              <TableCell className="text-right font-medium">
                ${row.spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right">{row.leads}</TableCell>
              <TableCell className="text-right">
                {row.cpl > 0
                  ? '$' + row.cpl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '—'}
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                {row.impressions.toLocaleString('en-US')}
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                {row.ctr.toFixed(2)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
