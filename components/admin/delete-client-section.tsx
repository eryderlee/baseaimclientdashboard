'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { deleteClient } from '@/app/admin/clients/[clientId]/actions'

interface DeleteClientSectionProps {
  clientId: string
  companyName: string
}

export function DeleteClientSection({ clientId, companyName }: DeleteClientSectionProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteClient(clientId)
      if (result.error) {
        toast.error(result.error)
        setIsDeleting(false)
        setConfirming(false)
      } else {
        toast.success(`${companyName} deleted`)
        router.push('/admin')
      }
    } catch {
      toast.error('An unexpected error occurred')
      setIsDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader>
        <CardTitle className="text-red-700">Delete Client</CardTitle>
        <CardDescription>
          Permanently delete {companyName} and all their data — milestones, documents, invoices, and login access. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-end gap-2">
        {confirming ? (
          <>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Yes, delete client'}
            </Button>
          </>
        ) : (
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Client
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
