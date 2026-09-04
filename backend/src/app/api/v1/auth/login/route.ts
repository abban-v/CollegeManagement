import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { getErrorMessage, successResponse, errorResponse, sendJSON, formatZodError } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { checkRateLimit, getLoginRateLimitIdentifier } from "@/lib/middleware/rateLimit";

/**
 * POST /api/v1/auth/login
 *
 * Authenticate user and create session
 *
 * Security:
 * - Per-email rate limiting (5 attempts per 10 seconds)
 * - Per-IP rate limiting (10 attempts per 10 seconds)
 * - Generic error messages to prevent email enumeration
 * - HTTP-only, Secure, SameSite cookies
 */

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

// Stricter limits for login attempts
const LOGIN_RATE_LIMIT = 5; // 5 login attempts per 10 seconds per email+IP
const LOGIN_RATE_WINDOW = "10 s";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    // Per-email + per-IP rate limiting for login attempts
    const loginIdentifier = getLoginRateLimitIdentifier(email, request);
    const loginRateResult = await checkRateLimit(loginIdentifier, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW);

    if (!loginRateResult.success) {
      return sendJSON(
        errorResponse("Too many login attempts. Please try again later.", 429)
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // User not found: respond generically to prevent email enumeration
    if (!user) {
      // Don't say "user not found" - attackers use this to enumerate emails
      return sendJSON(
        errorResponse("Invalid email or password", 401)
      );
    }

    // Compare password with bcrypt
    // bcrypt.compare() is the secure way to verify passwords
    // It handles timing attacks properly
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Same generic error message
      return sendJSON(
        errorResponse("Invalid email or password", 401)
      );
    }

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
          message: "Logged in successfully",
        },
        200
      )
    );
  } catch (error: unknown) {
    console.error("Login error:", error);

    if (error instanceof ZodError) {
      return sendJSON(errorResponse(formatZodError(error), 400));
    }

    return sendJSON(errorResponse(getErrorMessage(error, "Login failed"), 500));
  }
}
