'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClientSchema, updateClientSchema, type CreateClientInput, type UpdateClientInput } from '@/lib/schemas/client'
import { createClient, updateClient } from '@/app/admin/actions'
import { generateSecurePassword } from '@/lib/utils/password'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Wand2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ClientFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<CreateClientInput>
  clientId?: string // required for edit mode
}

export function ClientForm({ mode, defaultValues, clientId }: ClientFormProps) {
  const router = useRouter()

  // Determine schema and types based on mode
  const schema = mode === 'create' ? createClientSchema : updateClientSchema

  // Set up form with appropriate type based on mode
  const form = useForm<CreateClientInput | UpdateClientInput>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: defaultValues || {},
  })

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = form

  // Handle password generation (create mode only)
  const handleGeneratePassword = () => {
    const password = generateSecurePassword()
    setValue('password' as any, password)
    setValue('confirmPassword' as any, password)
    toast.success('Secure password generated')
  }

  // Submit handler
  const onSubmit = async (data: CreateClientInput | UpdateClientInput) => {
    // Build FormData from validated data
    const formData = new FormData()

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value.toString())
      }
    })

    if (mode === 'create') {
      // Create mode: call createClient and handle client-side redirect
      const result = await createClient(formData)

      if (result?.error) {
        toast.error(result.error)
      } else if (result?.success) {
        toast.success('Client created successfully')
        router.push('/admin')
      }
    } else {
      // Edit mode: call updateClient with error handling
      if (!clientId) {
        toast.error('Client ID is required for update')
        return
      }

      try {
        const result = await updateClient(clientId, formData)

        if (result?.error) {
          toast.error(result.error)
        } else {
          toast.success('Client updated successfully')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
        console.error('Form submission error:', error)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Contact Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Primary contact details for the client</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Contact Name *</Label>
            <Input
              id="name"
              {...register('name')}
              aria-invalid={!!errors.name}
              className="mt-1"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email - Create mode only */}
          {mode === 'create' && (
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email' as any)}
                aria-invalid={!!(errors as any).email}
                className="mt-1"
              />
              {(errors as any).email && (
                <p className="text-sm text-destructive mt-1">{(errors as any).email.message}</p>
              )}
            </div>
          )}

          {/* Password - Create mode only */}
          {mode === 'create' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="password"
                    type="text"
                    {...register('password' as any)}
                    aria-invalid={!!(errors as any).password}
                    className="flex-1"
                  />
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
                {(errors as any).password && (
                  <p className="text-sm text-destructive mt-1">{(errors as any).password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="text"
                  {...register('confirmPassword' as any)}
                  aria-invalid={!!(errors as any).confirmPassword}
                  className="mt-1"
                />
                {(errors as any).confirmPassword && (
                  <p className="text-sm text-destructive mt-1">{(errors as any).confirmPassword.message}</p>
                )}
              </div>

              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Make sure you remember this password - you'll need it to share with the client for their login.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>Business information and contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Name */}
          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              {...register('companyName')}
              aria-invalid={!!errors.companyName}
              className="mt-1"
            />
            {errors.companyName && (
              <p className="text-sm text-destructive mt-1">{errors.companyName.message}</p>
            )}
          </div>

          {/* Industry and Website - Side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                {...register('industry')}
                aria-invalid={!!errors.industry}
                className="mt-1"
              />
              {errors.industry && (
                <p className="text-sm text-destructive mt-1">{errors.industry.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                {...register('website')}
                aria-invalid={!!errors.website}
                className="mt-1"
              />
              {errors.website && (
                <p className="text-sm text-destructive mt-1">{errors.website.message}</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                aria-invalid={!!errors.phone}
                className="mt-1"
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              {...register('address')}
              aria-invalid={!!errors.address}
              className="mt-1"
              rows={3}
            />
            {errors.address && (
              <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            mode === 'create' ? 'Creating...' : 'Saving...'
          ) : (
            mode === 'create' ? 'Create Client' : 'Save Changes'
          )}
        </Button>
      </div>
    </form>
  )
}
