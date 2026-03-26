import { redirect } from 'next/navigation'

// Entry point is now /api/admin/preview?clientId=...&returnTo=...
// This page redirects for backwards compatibility
export default async function AdminPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { clientId } = await params
  const { returnTo } = await searchParams
  const returnToParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''
  redirect(`/api/admin/preview?clientId=${clientId}${returnToParam}`)
}
