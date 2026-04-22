import { redirect } from 'next/navigation'

export default async function ClientIntakePage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  redirect(`/admin/clients/${clientId}/onboarding`)
}
