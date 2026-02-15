'use client'

import { useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, ListChecks } from 'lucide-react'
import { RiskBadge } from '@/components/admin/at-risk-indicator'
import { StatusToggleButton } from '@/components/admin/status-toggle-button'

interface ClientData {
  id: string
  companyName: string
  isActive: boolean
  overallProgress: number
  completedMilestones: number
  totalMilestones: number
  riskLevel: 'none' | 'low' | 'medium' | 'high'
  riskReasons: string[]
  nextDueDate: string | null
  user: {
    name: string
    email: string
  }
  createdAt: string
}

interface ClientAnalyticsTableProps {
  clients: ClientData[]
}

export function ClientAnalyticsTable({ clients }: ClientAnalyticsTableProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const status = searchParams.get('status') || 'all'
  const sort = searchParams.get('sort') || 'name'
  const search = searchParams.get('search') || ''

  const filteredAndSortedClients = useMemo(() => {
    // Filter by status
    let filtered = clients
    if (status === 'active') {
      filtered = clients.filter((c) => c.isActive === true)
    } else if (status === 'inactive') {
      filtered = clients.filter((c) => c.isActive === false)
    } else if (status === 'at-risk') {
      filtered = clients.filter((c) => c.riskLevel !== 'none')
    }

    // Filter by search term (case-insensitive)
    if (search) {
      filtered = filtered.filter((c) =>
        c.companyName.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Sort
    const sorted = [...filtered]
    if (sort === 'name') {
      sorted.sort((a, b) => a.companyName.localeCompare(b.companyName))
    } else if (sort === 'progress') {
      sorted.sort((a, b) => b.overallProgress - a.overallProgress)
    } else if (sort === 'due-date') {
      sorted.sort((a, b) => {
        // Clients with null due dates go last
        if (!a.nextDueDate && !b.nextDueDate) return 0
        if (!a.nextDueDate) return 1
        if (!b.nextDueDate) return -1
        return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
      })
    }

    return sorted
  }, [clients, status, sort, search])

  const handleClearFilters = () => {
    router.push('/admin')
  }

  if (filteredAndSortedClients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500 mb-4">No clients match the current filters</p>
        <Button variant="outline" onClick={handleClearFilters}>
          Clear Filters
        </Button>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Milestones</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Next Due Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredAndSortedClients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">{client.companyName}</TableCell>
            <TableCell>
              <div>
                <p className="text-sm">{client.user.name}</p>
                <p className="text-xs text-neutral-500">{client.user.email}</p>
              </div>
            </TableCell>
            <TableCell>
              {client.completedMilestones}/{client.totalMilestones}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 rounded-full bg-neutral-200">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${client.overallProgress}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{client.overallProgress}%</span>
              </div>
            </TableCell>
            <TableCell>
              <RiskBadge level={client.riskLevel} />
            </TableCell>
            <TableCell>
              <Badge variant={client.isActive ? 'default' : 'secondary'}>
                {client.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              {client.nextDueDate
                ? new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(new Date(client.nextDueDate))
                : '-'}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/clients/${client.id}/edit`}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/clients/${client.id}`}>
                    <ListChecks className="h-3 w-3 mr-1" />
                    Milestones
                  </Link>
                </Button>
                <StatusToggleButton clientId={client.id} isActive={client.isActive} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
