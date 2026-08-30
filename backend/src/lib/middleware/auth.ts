import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { withAuth, withRole } from "@/lib/auth";
import type { AuthSession } from "@/types/auth";

export type AuthRequest = NextRequest & {
  user?: AuthSession;
};

export { withAuth, withRole };

export function requireRole(...roles: UserRole[]) {
  return withRole(...roles);
}

export function getUser(request: AuthRequest): AuthSession | null {
  return request.user || null;
}
