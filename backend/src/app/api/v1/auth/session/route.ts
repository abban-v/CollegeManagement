import { successResponse, errorResponse, sendJSON } from "@/lib/api";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { UserRole } from "@prisma/client";

/**
 * GET /api/v1/auth/session
 *
 * Returns the currently authenticated user with live role resolution.
 * Automatically elevates users listed in ADMIN_EMAILS.
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return sendJSON(errorResponse("Unauthorized", 401));
    }

    const email = (session.email || "").toLowerCase().trim();
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
      .toLowerCase()
      .replace(/[{}"']/g, "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const shouldBeAdmin = ADMIN_EMAILS.includes(email);

    // Fetch live user from database
    let dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!dbUser && email) {
      dbUser = await prisma.user.findUnique({
        where: { email },
      });
    }

    let activeRole = dbUser?.role || session.role;

    // Auto-promote if in ADMIN_EMAILS
    if (shouldBeAdmin && dbUser && dbUser.role !== UserRole.ADMIN) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: UserRole.ADMIN },
      });
      activeRole = UserRole.ADMIN;
    } else if (shouldBeAdmin) {
      activeRole = UserRole.ADMIN;
    }

    return sendJSON(
      successResponse(
        {
          user: {
            id: dbUser?.id || session.userId,
            email: dbUser?.email || session.email,
            name: dbUser?.name || session.name,
            role: activeRole,
          },
          isAuthenticated: true,
        },
        200
      )
    );
  } catch (error: unknown) {
    console.error("Session error:", error);
    return sendJSON(errorResponse(error instanceof Error ? error.message : "Failed to get session", 500));
  }
}
