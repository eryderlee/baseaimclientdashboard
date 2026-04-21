import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { MagicLinkConsumer } from './magic-link-consumer'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function MagicLinkPage({ params }: PageProps) {
  const { token } = await params

  // Look up token — expired tokens still exist in DB until consumed or replaced
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  const isValid = tokenRecord && tokenRecord.expiresAt > new Date()

  if (!isValid) {
    // Pass email to expired page so it can resend without asking for email
    const email = tokenRecord?.email
    redirect(
      email
        ? `/auth/magic-link/expired?email=${encodeURIComponent(email)}`
        : '/auth/magic-link/expired'
    )
  }

  // Token is valid — client component handles the actual sign-in
  return <MagicLinkConsumer token={token} />
}
