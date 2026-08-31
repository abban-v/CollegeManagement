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
  accessToken: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
});

/**
 * Verify Google ID token or Access token with Google's verification endpoints
 */
async function verifyGoogleToken(params: { credential?: string; accessToken?: string }): Promise<{ email: string; name?: string; emailVerified: boolean } | null> {
  // 1. If ID Token (JWT) is provided, verify with Google tokeninfo endpoint
  if (params.credential) {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(params.credential)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.email && (data.email_verified === "true" || data.email_verified === true)) {
          return {
            email: data.email,
            name: data.name || data.given_name,
            emailVerified: true,
          };
        }
      }
    } catch (err) {
      console.warn("Google ID token verification error:", err);
    }
  }

  // 2. If Access Token is provided, verify with Google userinfo endpoint
  if (params.accessToken) {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${params.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.email && (data.email_verified === true || data.email_verified === "true")) {
          return {
            email: data.email,
            name: data.name || data.given_name,
            emailVerified: true,
          };
        }
      }
    } catch (err) {
      console.warn("Google access token verification error:", err);
    }
  }

  return null;
}

/**
 * POST /api/v1/auth/google
 *
 * Authenticates a user with Google OAuth (Google Identity Services).
 * STRICT ENFORCEMENT: Cryptographically verifies Google token and enforces @cet.ac.in domain.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GoogleAuthSchema.parse(body);

    let email = parsed.email;
    let name = parsed.name;

    // Verify Google token cryptographically
    if (parsed.credential || parsed.accessToken) {
      const verified = await verifyGoogleToken({
        credential: parsed.credential,
        accessToken: parsed.accessToken,
      });

      if (!verified) {
        return sendJSON(errorResponse("Invalid or unverified Google credentials", 401));
      }

      email = verified.email;
      name = verified.name || name;
    } else {
      return sendJSON(errorResponse("Google authentication token (ID token or access token) is strictly required", 400));
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
      .replace(/[{}"']/g, "")
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
