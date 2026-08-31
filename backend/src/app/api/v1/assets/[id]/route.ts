import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { assetService } from "@/modules/assets/service";
import { UpdateAssetSchema } from "@/lib/validation/asset";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import { withRole } from "@/lib/auth";

/**
 * GET /api/v1/assets/:id
 *
 * Fetch asset details and associated issues.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await assetService.getAssetById(id);

    if (!asset) {
      return sendJSON(errorResponse("Asset not found", 404));
    }

    return sendJSON(successResponse(asset, 200));
  } catch (error: unknown) {
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to fetch asset"), 500));
  }
}

/**
 * PATCH /api/v1/assets/:id
 *
 * Update an asset. Requires OFFICIAL, MODERATOR, or ADMIN role.
 */
export const PATCH = withRole("OFFICIAL", "MODERATOR", "ADMIN")(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const validated = UpdateAssetSchema.parse(body);

      const existing = await assetService.getAssetById(id);
      if (!existing) {
        return sendJSON(errorResponse("Asset not found", 404));
      }

      if (validated.assetTag && validated.assetTag !== existing.assetTag) {
        const tagExists = await assetService.getAssetByTag(validated.assetTag);
        if (tagExists && tagExists.id !== id) {
          return sendJSON(errorResponse(`Asset tag '${validated.assetTag}' is already taken`, 409));
        }
      }

      const updated = await assetService.updateAsset(id, validated);
      return sendJSON(successResponse(updated, 200));
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
      }
      return sendJSON(errorResponse(getErrorMessage(error, "Failed to update asset"), 500));
    }
  }
);

/**
 * DELETE /api/v1/assets/:id
 *
 * Delete an asset. Requires ADMIN role.
 */
export const DELETE = withRole("ADMIN")(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      const existing = await assetService.getAssetById(id);
      if (!existing) {
        return sendJSON(errorResponse("Asset not found", 404));
      }

      await assetService.deleteAsset(id);
      return sendJSON(successResponse({ message: "Asset deleted successfully" }, 200));
    } catch (error: unknown) {
      return sendJSON(errorResponse(getErrorMessage(error, "Failed to delete asset"), 500));
    }
  }
);
