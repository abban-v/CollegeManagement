import { UserRole } from "@prisma/client";

export interface AuthUserSnapshot {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface AuthSession {
  sessionId: string;
  token?: string;
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
  expiresAt: Date;
}

export interface AuthRequestContext<TParams = Record<string, string>> {
  params: Promise<TParams>;
}
