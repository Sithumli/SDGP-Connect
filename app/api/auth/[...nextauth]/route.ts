// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/prisma/prismaClient";
import { Role } from "@/types/prisma-types";
import { verifyAppNativeTicket } from "@/lib/auth/appNativeFlow";
import { isAllowedEmail } from "@/lib/auth/emailDomain";

interface AppUser extends NextAuthUser {
  role: Role;
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    // App-native Asgardeo sign-in. The browser never leaves our own login page: the flow is driven
    // by /api/auth/app-native/*, which hands back a server-signed ticket once Asgardeo has issued
    // and we have exchanged an authorization code.
    CredentialsProvider({
      id: "asgardeo",
      name: "Asgardeo",
      credentials: {
        ticket: { label: "Ticket", type: "text" },
      },
      async authorize(credentials): Promise<AppUser | null> {
        if (!credentials?.ticket) return null;

        const identity = verifyAppNativeTicket(credentials.ticket);
        if (!identity) return null;

        const user = await prisma.user.upsert({
          where: { email: identity.email },
          update: {
            name: identity.name ?? undefined,
            // image is set on create only: overwriting it here would undo a picture the user chose
            // on their account page every time they signed in again.
            // The role is only written when Asgardeo actually sent one, otherwise every sign-in
            // would reset an administrator back to the STUDENT default.
            ...(identity.role ? { role: identity.role } : {}),
          },
          create: {
            email: identity.email,
            name: identity.name,
            image: identity.image,
            role: identity.role ?? Role.STUDENT,
          },
          select: { id: true, name: true, email: true, image: true, role: true },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role as unknown as Role,
        };
      },
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<AppUser | null> {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              password: true,
              role: true,
            },
          });

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role as unknown as Role,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    // Applies to every provider, so no entry point can bypass the domain rule.
    async signIn({ user, profile }) {
      const email = ((profile as Record<string, unknown>)?.email as string | undefined) ?? user.email ?? "";
      return isAllowedEmail(email);
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        const email = token.email ?? user.email;
        if (!email) return token;

        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true },
        });

        token.id = dbUser?.id ?? user.id;
        token.role = (dbUser?.role as Role | undefined) ?? (user as AppUser).role ?? Role.STUDENT;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
