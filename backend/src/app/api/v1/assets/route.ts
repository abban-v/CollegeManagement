import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { assetService } from "@/modules/assets/service";
import { CreateAssetSchema } from "@/lib/validation/asset";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";
import { AssetStatus } from "@prisma/client";

/**
 * GET /api/v1/assets
 *
 * List all assets with optional filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId") || undefined;
    const category = searchParams.get("category") || undefined;
    const status = (searchParams.get("status") as AssetStatus) || undefined;
    const search = searchParams.get("search") || undefined;
    const skip = searchParams.get("skip") ? parseInt(searchParams.get("skip")!, 10) : undefined;
    const take = searchParams.get("take") ? parseInt(searchParams.get("take")!, 10) : undefined;

    const result = await assetService.listAssets({
      departmentId,
      category,
      status,
      search,
      skip,
      take,
    });

    return sendJSON(successResponse(result, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to fetch assets"), 500));
  }
}

/**
 * POST /api/v1/assets
 *
 * Create a new asset. Requires OFFICIAL, MODERATOR, or ADMIN role.
 */
export const POST = withRole("OFFICIAL", "MODERATOR", "ADMIN")(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validated = CreateAssetSchema.parse(body);

    const existing = await assetService.getAssetByTag(validated.assetTag);
    if (existing) {
      return sendJSON(errorResponse(`Asset with tag '${validated.assetTag}' already exists`, 409));
    }

    const asset = await assetService.createAsset(validated);
    return sendJSON(successResponse(asset, 201));
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to create asset"), 500));
  }
});
