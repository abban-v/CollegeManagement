import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/db";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";

export const GET = withRole("ADMIN", "OFFICIAL", "MODERATOR")(async () => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return sendJSON(successResponse({ users }, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to load users"), 500));
  }
});

export const POST = withRole("ADMIN")(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { email, name, role = UserRole.MODERATOR } = body ?? {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return sendJSON(errorResponse("A valid email address is required", 400));
    }
    if (!Object.values(UserRole).includes(role)) {
      return sendJSON(errorResponse("Invalid role specified", 400));
    }

    const cleanEmail = email.trim().toLowerCase();
    const displayName = (name && typeof name === "string" && name.trim()) ? name.trim() : cleanEmail.split("@")[0];

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role, ...(name ? { name: displayName } : {}) },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });
      return sendJSON(successResponse({ user: updated, message: `Updated user role to ${role}` }, 200));
    }

    // Hash default initial password
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.default.hash("Welcome@12345", 10);

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: displayName,
        password: hashedPassword,
        role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return sendJSON(successResponse({ user: newUser, message: `User added with role ${role}` }, 201));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to add user"), 500));
  }
});

export const PATCH = withRole("ADMIN")(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { userId, role } = body ?? {};

    if (!userId || !role || !Object.values(UserRole).includes(role)) {
      return sendJSON(errorResponse("Valid userId and role are required", 400));
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return sendJSON(successResponse({ user }, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to update user role"), 500));
  }
});
