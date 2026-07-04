import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Passkey from "next-auth/providers/passkey";
import { prisma } from "@/lib/prisma";

// Auth.js (NextAuth v5) configured for passkey / WebAuthn login — i.e. login
// with the device's fingerprint / Face ID / Windows Hello. The passkey provider
// is experimental and requires a database adapter (see prisma/schema.prisma).
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Passkey],
  experimental: { enableWebAuthn: true },
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
});
