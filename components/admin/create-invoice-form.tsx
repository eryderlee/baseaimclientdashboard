'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createInvoice } from '@/app/actions/billing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// ─── Schema ───────────────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
})

const CreateInvoiceFormSchema = z.object({
  description: z.string().min(1, 'Invoice description is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.string().min(1),
  items: z.array(LineItemSchema).min(1, 'At least one line item is required'),
})

type CreateInvoiceFormValues = z.infer<typeof CreateInvoiceFormSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().split('T')[0]
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CreateInvoiceFormProps {
  clientId: string
}

export function CreateInvoiceForm({ clientId }: CreateInvoiceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(CreateInvoiceFormSchema),
    defaultValues: {
      description: '',
      dueDate: getDefaultDueDate(),
      currency: 'usd',
      items: [{ description: '', amount: 0 }],
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    control,
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedItems = watch('items')

  // Calculate total from line items
  const total = watchedItems.reduce((sum, item) => {
    const amt = Number(item.amount) || 0
    return sum + amt
  }, 0)

  const currency = watch('currency')

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'usd',
    }).format(amount)
  }

  const onSubmit = (data: CreateInvoiceFormValues) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('clientId', clientId)
      formData.set('description', data.description)
      formData.set('dueDate', data.dueDate)
      formData.set('currency', data.currency)
      formData.set('items', JSON.stringify(data.items))

      const result = await createInvoice(formData)

      if (result.success) {
        toast.success('Invoice created and sent')
        router.push(`/admin/clients/${clientId}/invoices`)
      } else {
        toast.error(result.error || 'Failed to create invoice')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Basic information about this invoice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="e.g. Monthly retainer — March 2026"
              className="mt-1"
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
                className="mt-1"
                aria-invalid={!!errors.dueDate}
              />
              {errors.dueDate && (
                <p className="text-sm text-destructive mt-1">{errors.dueDate.message}</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                defaultValue="usd"
                onValueChange={(val) => setValue('currency', val)}
              >
                <SelectTrigger className="mt-1 w-full" id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD — US Dollar</SelectItem>
                  <SelectItem value="eur">EUR — Euro</SelectItem>
                  <SelectItem value="gbp">GBP — British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
          <CardDescription>Add the services or products to invoice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.items && !Array.isArray(errors.items) && (
            <p className="text-sm text-destructive">{errors.items.message}</p>
          )}

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              {/* Line item description */}
              <div className="flex-1">
                {index === 0 && (
                  <Label className="mb-1 block">Description</Label>
                )}
                <Input
                  {...register(`items.${index}.description`)}
                  placeholder="Service description"
                  aria-invalid={!!errors.items?.[index]?.description}
                />
                {errors.items?.[index]?.description && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.items[index].description?.message}
                  </p>
                )}
              </div>

              {/* Line item amount */}
              <div className="w-36">
                {index === 0 && (
                  <Label className="mb-1 block">Amount ({currency.toUpperCase()})</Label>
                )}
                <Input
                  {...register(`items.${index}.amount`)}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  aria-invalid={!!errors.items?.[index]?.amount}
                />
                {errors.items?.[index]?.amount && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.items[index].amount?.message}
                  </p>
                )}
              </div>

              {/* Remove button */}
              <div className={index === 0 ? 'mt-6' : ''}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="text-neutral-400 hover:text-destructive"
                  aria-label="Remove line item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: '', amount: 0 })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Line Item
          </Button>

          {/* Total */}
          <div className="flex justify-end pt-2 border-t">
            <div className="text-right">
              <p className="text-sm text-neutral-500">Total</p>
              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/admin/clients/${clientId}/invoices`)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create & Send Invoice'}
        </Button>
      </div>
    </form>
  )
}
