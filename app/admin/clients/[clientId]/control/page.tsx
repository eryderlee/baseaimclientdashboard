'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LayoutDashboard, FolderUp, KeyRound, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { sendClientActionLink } from '@/app/admin/actions'

type ActionState = 'idle' | 'sending' | 'sent'

export default function ControlCentrePage() {
  const params = useParams()
  const clientId = params.clientId as string

  const [dashboardState, setDashboardState] = useState<ActionState>('idle')
  const [documentsState, setDocumentsState] = useState<ActionState>('idle')
  const [passwordState, setPasswordState] = useState<ActionState>('idle')
  const [documentRequest, setDocumentRequest] = useState('')

  async function handleSend(
    action: 'dashboard' | 'documents' | 'password',
    setState: (s: ActionState) => void
  ) {
    if (action === 'documents' && !documentRequest.trim()) {
      toast.error('Please describe what you need the client to upload.')
      return
    }
    setState('sending')
    const result = await sendClientActionLink(
      clientId,
      action,
      action === 'documents' ? documentRequest.trim() : undefined
    )
    if (result.success) {
      setState('sent')
      toast.success('Email sent successfully')
    } else {
      setState('idle')
      toast.error(result.error ?? 'Failed to send')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Control Centre</h1>
        <p className="text-neutral-500 mt-1">Send magic link emails to this client</p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-2xl">

        {/* Dashboard Access */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
            <div className="mt-0.5 rounded-md bg-neutral-100 p-2">
              <LayoutDashboard className="h-4 w-4 text-neutral-600" />
            </div>
            <div>
              <CardTitle className="text-base">Dashboard Access</CardTitle>
              <CardDescription className="mt-0.5">
                Send the client a magic link to log straight into their dashboard. Expires in 24 hours.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ActionButton
              state={dashboardState}
              label="Send dashboard link"
              onClick={() => handleSend('dashboard', setDashboardState)}
            />
          </CardContent>
        </Card>

        {/* Document Request */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
            <div className="mt-0.5 rounded-md bg-neutral-100 p-2">
              <FolderUp className="h-4 w-4 text-neutral-600" />
            </div>
            <div>
              <CardTitle className="text-base">Document Request</CardTitle>
              <CardDescription className="mt-0.5">
                Ask the client to upload specific documents. Include what you need and the email will explain where to upload.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="docRequest" className="text-sm">What do you need them to upload?</Label>
              <Textarea
                id="docRequest"
                className="mt-1.5 resize-none"
                rows={3}
                placeholder="e.g. Last 2 years of tax returns and most recent bank statements"
                value={documentRequest}
                onChange={(e) => setDocumentRequest(e.target.value)}
                disabled={documentsState === 'sent'}
              />
            </div>
            <ActionButton
              state={documentsState}
              label="Send document request"
              onClick={() => handleSend('documents', setDocumentsState)}
            />
          </CardContent>
        </Card>

        {/* Password Setup */}
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
            <div className="mt-0.5 rounded-md bg-neutral-100 p-2">
              <KeyRound className="h-4 w-4 text-neutral-600" />
            </div>
            <div>
              <CardTitle className="text-base">Password Setup / Reset</CardTitle>
              <CardDescription className="mt-0.5">
                Send the client a magic link that takes them straight to a password setup page. Works for first-time setup or resetting a forgotten password.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ActionButton
              state={passwordState}
              label="Send password setup link"
              onClick={() => handleSend('password', setPasswordState)}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

function ActionButton({
  state,
  label,
  onClick,
}: {
  state: ActionState
  label: string
  onClick: () => void
}) {
  if (state === 'sent') {
    return (
      <p className="text-sm text-emerald-600 flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4" />
        Email sent
      </p>
    )
  }

  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={state === 'sending'}
    >
      {state === 'sending' && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
      {state === 'sending' ? 'Sending…' : label}
    </Button>
  )
}
