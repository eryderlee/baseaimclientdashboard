import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        magicToken: { label: "Magic Token", type: "text" },
      },
      async authorize(credentials) {
        // --- Magic link path ---
        if (credentials?.magicToken) {
          const magicToken = credentials.magicToken as string

          // Atomically validate + consume the token
          const user = await prisma.$transaction(async (tx) => {
            const tokenRecord = await tx.passwordResetToken.findUnique({
              where: { token: magicToken },
            })

            if (!tokenRecord || tokenRecord.expiresAt < new Date()) return null

            const foundUser = await tx.user.findUnique({
              where: { email: tokenRecord.email },
            })

            if (!foundUser) return null

            // Delete token — one-use only
            await tx.passwordResetToken.delete({
              where: { token: magicToken },
            })

            return foundUser
          })

          if (!user) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          }
        }

        // --- Email + password path (unchanged) ---
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { clientProfile: true },
        })

        if (!user) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
