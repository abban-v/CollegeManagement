import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/db";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";

export const GET = withRole("ADMIN")(async () => {
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
      },
    });

    return sendJSON(successResponse({ user }, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to update user role"), 500));
  }
});
