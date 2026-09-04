import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/db";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";
import { SAFE_USER_SELECT } from "@/lib/user-sanitizer";

export const GET = withRole("ADMIN", "OFFICIAL", "MODERATOR")(async () => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: SAFE_USER_SELECT,
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
        select: SAFE_USER_SELECT,
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
      select: SAFE_USER_SELECT,
    });

    return sendJSON(successResponse({ user: newUser, message: `User added with role ${role}` }, 201));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to add user"), 500));
  }
});

export const PATCH = withRole("ADMIN")(async (request: NextRequest, _context, session) => {
  try {
    const body = await request.json();
    const { userId, role } = body ?? {};

    if (!userId || !role || !Object.values(UserRole).includes(role)) {
      return sendJSON(errorResponse("Valid userId and role are required", 400));
    }

    // Safety guard: prevent administrator from demoting themselves
    if (userId === session.userId && role !== UserRole.ADMIN) {
      return sendJSON(errorResponse("You cannot remove your own administrator privileges", 400));
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: SAFE_USER_SELECT,
    });

    return sendJSON(successResponse({ user }, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to update user role"), 500));
  }
});

export const DELETE = withRole("ADMIN")(async (request: NextRequest, _context, session) => {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");

    if (!userId) {
      try {
        const body = await request.json();
        userId = body?.userId;
      } catch {}
    }

    if (!userId) {
      return sendJSON(errorResponse("User ID is required to remove user", 400));
    }

    // Safety guard: prevent administrator from deleting themselves
    if (userId === session.userId) {
      return sendJSON(errorResponse("You cannot delete your own administrator account", 400));
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return sendJSON(errorResponse("User not found", 404));
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return sendJSON(successResponse({ message: `User ${existing.email} removed successfully`, id: userId }, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to remove user"), 500));
  }
});
