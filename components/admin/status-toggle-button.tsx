'use client'

import { useState, useTransition } from 'react'
import { toggleClientStatus } from '@/app/admin/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface StatusToggleButtonProps {
  clientId: string
  isActive: boolean
}

export function StatusToggleButton({ clientId, isActive }: StatusToggleButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState(isActive)

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleClientStatus(clientId)

      if (result?.error) {
        toast.error(result.error)
      } else if (result?.success) {
        setCurrentStatus(result.isActive)
        toast.success(
          result.isActive
            ? 'Client account activated'
            : 'Client account deactivated'
        )
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className={currentStatus ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
    >
      {isPending ? 'Updating...' : currentStatus ? 'Deactivate' : 'Activate'}
    </Button>
  )
}
