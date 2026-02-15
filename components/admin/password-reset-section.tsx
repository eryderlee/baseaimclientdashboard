'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetClientPassword } from '@/app/admin/actions'
import { generateSecurePassword } from '@/lib/utils/password'
import { toast } from 'sonner'
import { Wand2, Eye, EyeOff } from 'lucide-react'

interface PasswordResetSectionProps {
  clientId: string
  currentPassword?: string
}

export function PasswordResetSection({ clientId, currentPassword }: PasswordResetSectionProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword()
    setPassword(newPassword)
    setShowPassword(true)
    toast.success('Secure password generated')
  }

  const handleResetPassword = async () => {
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await resetClientPassword(clientId, password)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Password updated successfully')
        setPassword('')
        setShowPassword(false)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Password reset error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {currentPassword && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardHeader>
            <CardTitle>Current Password</CardTitle>
            <CardDescription>
              Hash of the current password for admin reference
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password Hash</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    readOnly
                    className="pr-10 bg-slate-100"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-neutral-500" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Generate a new password for this client. Make sure to share it securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
          <Label htmlFor="new-password">New Password</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-neutral-500" />
                ) : (
                  <Eye className="h-4 w-4 text-neutral-500" />
                )}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePassword}
              className="shrink-0"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleResetPassword}
            disabled={isSubmitting || !password}
            variant="default"
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
