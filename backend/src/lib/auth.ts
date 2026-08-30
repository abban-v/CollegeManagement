import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/db";
import { errorResponse, sendJSON } from "@/lib/api";
import type { AuthSession, AuthUserSnapshot } from "@/types/auth";

export const SESSION_COOKIE_NAME = "slashforge_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

function buildSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_TTL_SECONDS,
  };
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions(expiresAt));
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function createSession(user: AuthUserSnapshot): Promise<AuthSession> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  await setSessionCookie(token, expiresAt);

  return {
    sessionId: session.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: session.expiresAt,
  };
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return null;
    }

    const tokenHash = hashSessionToken(sessionToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      await clearSessionCookie().catch(() => {});
      return null;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      sessionId: session.id,
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function logoutCurrentSession() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      const tokenHash = hashSessionToken(sessionToken);
      await prisma.session.deleteMany({
        where: { tokenHash },
      });
    }
  } finally {
    await clearSessionCookie().catch(() => {});
  }
}

export type AuthedRouteHandler<TContext = Record<string, unknown>> = (
  request: NextRequest,
  context: TContext,
  session: AuthSession
) => Promise<Response>;

export function withAuth<TContext = Record<string, unknown>>(
  handler: AuthedRouteHandler<TContext>
) {
  return async (request: NextRequest, context: TContext) => {
    const session = await getSession();

    if (!session) {
      return sendJSON(errorResponse("Unauthorized", 401));
    }

    return handler(request, context, session);
  };
}

export function withRole(...allowedRoles: UserRole[]) {
  return <TContext = Record<string, unknown>>(handler: AuthedRouteHandler<TContext>) => {
    return withAuth<TContext>(async (request, context, session) => {
      if (!allowedRoles.includes(session.role)) {
        return sendJSON(errorResponse("Forbidden", 403));
      }

      return handler(request, context, session);
    });
  };
}
