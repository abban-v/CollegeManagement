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
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
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
  const isProd = process.env.NODE_ENV === "production";
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
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
    token,
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: session.expiresAt,
  };
}

export async function getSession(request?: NextRequest): Promise<AuthSession | null> {
  try {
    let sessionToken: string | undefined;

    // 1. Check Authorization Bearer header first (works across cross-domain Vercel deployments)
    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.substring(7).trim();
      }
    }

    // 2. Check HTTP-only cookie
    if (!sessionToken) {
      const cookieStore = await cookies();
      sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    }

    if (!sessionToken) {
      return null;
    }

    const tokenHash = hashSessionToken(sessionToken);
    let session = await prisma.session.findUnique({
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

    // Also support lookup by sessionId if raw token was passed as sessionId
    if (!session) {
      session = await prisma.session.findUnique({
        where: { id: sessionToken },
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
    }

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      await clearSessionCookie().catch(() => {});
      return null;
    }

    // Non-blocking background touch of session timestamp
    prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      sessionId: session.id,
      token: sessionToken,
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

export async function logoutCurrentSession(request?: NextRequest) {
  try {
    let sessionToken: string | undefined;
    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.substring(7).trim();
      }
    }

    const cookieStore = await cookies();
    if (!sessionToken) {
      sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    }

    if (sessionToken) {
      const tokenHash = hashSessionToken(sessionToken);
      await prisma.session.deleteMany({
        where: {
          OR: [
            { tokenHash },
            { id: sessionToken },
          ],
        },
      }).catch(() => {});
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
    const session = await getSession(request);

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
