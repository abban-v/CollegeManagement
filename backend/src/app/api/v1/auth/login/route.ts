import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { getErrorMessage, successResponse, errorResponse, sendJSON } from "@/lib/api";
import { createSession } from "@/lib/auth";

/**
 * POST /api/v1/auth/login
 * 
 * Authenticate user and create session
 * 
 * Learning: This is where we verify credentials.
 * 
 * We:
 * 1. Accept email + password
 * 2. Look up user by email
 * 3. Compare password with bcrypt (secure comparison)
 * 4. Create a session token
 * 5. Set HTTP-only cookie
 * 6. Return user info (never password!)
 * 
 * Security notes:
 * - Always hash comparisons (never use ===)
 * - Always use HTTP-only cookies for sessions
 * - Always use Secure + SameSite flags in production
 * - Always log authentication events
 */

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // User not found: respond generically to prevent email enumeration
    if (!user) {
      // ⚠️ Don't say "user not found" - attackers use this to enumerate emails
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
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    return sendJSON(errorResponse(getErrorMessage(error, "Login failed"), 500));
  }
}
