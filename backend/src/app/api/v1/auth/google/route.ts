import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { getErrorMessage, successResponse, errorResponse, sendJSON } from "@/lib/api";
import { createSession } from "@/lib/auth";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "cet.ac.in";

const GoogleAuthSchema = z.object({
  credential: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
});

/**
 * Decode base64url encoded string from JWT
 */
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(payloadBase64, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

/**
 * POST /api/v1/auth/google
 *
 * Authenticates a user with Google OAuth (Google Identity Services).
 * STRICT ENFORCEMENT: Only allows accounts belonging to @cet.ac.in domain.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GoogleAuthSchema.parse(body);

    let email = parsed.email;
    let name = parsed.name;

    // If Google JWT credential was provided, extract payload
    if (parsed.credential) {
      const decoded = decodeJwtPayload(parsed.credential);
      if (decoded && decoded.email) {
        email = decoded.email;
        name = decoded.name || decoded.given_name || name;
      }
    }

    if (!email) {
      return sendJSON(errorResponse("Could not retrieve email from Google Sign-In", 400));
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Domain Restriction: Enforce @cet.ac.in only
    if (!normalizedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return sendJSON(
        errorResponse(
          `Access Restricted: Only college accounts (@${ALLOWED_DOMAIN}) are permitted to sign in. Received: ${normalizedEmail}`,
          403
        )
      );
    }

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const shouldBeAdmin = ADMIN_EMAILS.includes(normalizedEmail);

    // Find existing user or create a new user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Create random secure password for OAuth user
      const randomPassword = await bcrypt.hash(`google-oauth-${Date.now()}-${Math.random()}`, 10);
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name || normalizedEmail.split("@")[0],
          password: randomPassword,
          role: shouldBeAdmin ? UserRole.ADMIN : UserRole.STUDENT,
        },
      });
    } else if (shouldBeAdmin && user.role !== UserRole.ADMIN) {
      // Upgrade existing user to ADMIN if added to ADMIN_EMAILS
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.ADMIN },
      });
    }

    // Create session & set HTTP-only cookie
    const session = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return sendJSON(
      successResponse(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          session,
          message: "Authenticated with College Google Account successfully",
        },
        200
      )
    );
  } catch (error: unknown) {
    console.error("Google Auth error:", error);
    return sendJSON(errorResponse(getErrorMessage(error, "Google authentication failed"), 500));
  }
}
