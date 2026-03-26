'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ClientFbRow {
  clientId: string
  clientName: string
  spend: number
  leads: number
  cpl: number
  impressions: number
  ctr: number
  cpc: number
}

interface Props {
  rows: ClientFbRow[]
}

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function AdminClientFbTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
        <p className="text-sm font-medium text-slate-600">No Facebook accounts configured</p>
        <p className="text-xs text-slate-400 mt-1">
          No Facebook accounts configured for any clients
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
            <TableHead className="text-right">Spend (30d)</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">CPL</TableHead>
            <TableHead className="text-right hidden md:table-cell">Impressions</TableHead>
            <TableHead className="text-right hidden md:table-cell">CTR</TableHead>
            <TableHead className="text-right hidden md:table-cell">CPC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.clientId}>
              <TableCell className="font-medium">{row.clientName}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt$(row.spend)}</TableCell>
              <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.leads > 0 ? fmt$(row.cpl) : <span className="text-slate-400">—</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">
                {fmtInt(row.impressions)}
              </TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">
                {row.ctr.toFixed(2)}%
              </TableCell>
              <TableCell className="text-right tabular-nums hidden md:table-cell">
                {fmt$(row.cpc)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
