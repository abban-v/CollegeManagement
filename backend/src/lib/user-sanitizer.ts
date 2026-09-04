/**
 * User data sanitization utilities
 *
 * This module provides helpers to safely return user data without exposing
 * sensitive information like passwords, tokens, or other confidential fields.
 *
 * Always use these utilities when returning user data in API responses.
 */

import { User } from "@prisma/client";

/**
 * Safe user fields that can be publicly exposed
 */
export type SafeUser = Pick<User, "id" | "email" | "name" | "role" | "createdAt" | "updatedAt">;

/**
 * Sanitize a single user - remove sensitive fields
 */
export function sanitizeUser(user: User | null | undefined): SafeUser | null {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser as SafeUser;
}

/**
 * Sanitize multiple users
 */
export function sanitizeUsers(users: User[]): SafeUser[] {
  return users.map(sanitizeUser) as SafeUser[];
}

/**
 * Prisma select object for safe user fields
 * Use this in Prisma queries to avoid fetching sensitive fields
 *
 * Example:
 * ```typescript
 * const user = await prisma.user.findUnique({
 *   where: { id: userId },
 *   select: SAFE_USER_SELECT
 * });
 * ```
 */
export const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Type helper for safe user data
 */
export type UserResponse = Awaited<ReturnType<typeof Promise.resolve<SafeUser>>>;
