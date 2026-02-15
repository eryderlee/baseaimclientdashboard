'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ClientFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentStatus = searchParams.get('status') || 'all'
  const currentSort = searchParams.get('sort') || 'name'

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    // Remove param if it's the default value
    if ((key === 'status' && value === 'all') || (key === 'sort' && value === 'name')) {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)
  }

  return (
    <div className="flex items-center gap-4">
      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-neutral-700">Filter:</label>
        <Select value={currentStatus} onValueChange={(value) => updateParams('status', value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="at-risk">At Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-neutral-700">Sort by:</label>
        <Select value={currentSort} onValueChange={(value) => updateParams('sort', value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="due-date">Next Due Date</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
