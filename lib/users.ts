import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { store, type User } from "@/lib/store";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateCredentialsInput(
  email: unknown,
  password: unknown
): string | null {
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email)) {
    return "A valid email is required.";
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function createUser(email: string, password: string): User | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (store.usersByEmail.has(normalizedEmail)) {
    return null;
  }
  const user: User = {
    id: randomUUID(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };
  store.usersByEmail.set(normalizedEmail, user);
  return user;
}

export function verifyUserCredentials(
  email: string,
  password: string
): User | null {
  const user = store.usersByEmail.get(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }
  return user;
}
