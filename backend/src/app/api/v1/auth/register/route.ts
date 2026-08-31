import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { getErrorMessage, successResponse, errorResponse, sendJSON } from "@/lib/api";
import { createSession } from "@/lib/auth";

/**
 * POST /api/v1/auth/register
 * 
 * Create a new user account
 * 
 * Learning: This is the first step in authentication.
 * 
 * We:
 * 1. Validate email + password (with complexity requirements)
 * 2. Check if user exists (prevent duplicates)
 * 3. Hash password with bcrypt (never store plaintext!)
 * 4. Create user in database
 * 5. Return user (without password)
 * 
 * Password requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */

const RegisterSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = RegisterSchema.parse(body);

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return sendJSON(errorResponse("User with this email already exists", 409));
    }

    // Determine role based on ADMIN_EMAILS allowlist (prevent privilege escalation)
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
      .toLowerCase()
      .replace(/[{}"']/g, "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const assignedRole = ADMIN_EMAILS.includes(normalizedEmail)
      ? UserRole.ADMIN
      : UserRole.STUDENT;

    // Hash password with bcrypt
    // bcrypt: one-way hashing algorithm
    // Cost factor 10: balances speed vs security
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
        password: hashedPassword, // Store hashed password
        role: assignedRole,
      },
    });

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
          message: "Account created successfully",
        },
        201
      )
    );
  } catch (error: unknown) {
    console.error("Register error:", error);

    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to create account"), 500)
    );
  }
}
