import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth";
import { uploadFile, validateFileUpload, validateFileContent } from "@/lib/storage";
import { errorResponse, getErrorMessage, sendJSON, successResponse } from "@/lib/api";
import prisma from "@/lib/db";

/**
 * POST /api/v1/upload
 *
 * Upload a file to Google Cloud Storage
 *
 * This endpoint handles multipart/form-data uploads for evidence images.
 * Files are validated for type and size before upload.
 *
 * Security:
 * - File content is validated via magic bytes (not just client-provided MIME type)
 * - Storage key is server-generated (UUID-based), not client-controlled
 * - An UploadReference record is created to track ownership
 * - The upload reference ID must be used when submitting resolutions
 *
 * Authentication: Required
 *
 * Request: multipart/form-data with 'file' field
 * Response: { uploadId, storageKey, publicUrl, mimeType, fileSize }
 */
export const POST = withAuth(async (request: NextRequest, _context, session) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return sendJSON(errorResponse("No file provided", 400));
    }

    // Validate file type and size (client-provided MIME check)
    const validation = validateFileUpload(file);
    if (!validation.valid) {
      return sendJSON(errorResponse(validation.error || "Invalid file", 400));
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate actual file content via magic bytes (defense in depth)
    const contentValidation = validateFileContent(buffer, file.type);
    if (!contentValidation.valid) {
      return sendJSON(errorResponse(contentValidation.error || "File content validation failed", 400));
    }

    // Upload to GCS with server-generated storage key
    const result = await uploadFile({
      filename: file.name,
      mimeType: file.type,
      data: buffer,
    });

    // Create an upload reference record to track ownership
    const uploadRef = await prisma.uploadReference.create({
      data: {
        userId: session.userId,
        storageKey: result.storageKey,
        mimeType: result.mimeType,
        fileSize: result.fileSize,
        originalFilename: file.name,
      },
    });

    return sendJSON(
      successResponse(
        {
          uploadId: uploadRef.id,
          storageKey: result.storageKey,
          publicUrl: result.publicUrl,
          mimeType: result.mimeType,
          fileSize: result.fileSize,
        },
        201
      )
    );
  } catch (error: unknown) {
    console.error("File upload error:", error);
    return sendJSON(errorResponse(getErrorMessage(error, "Failed to upload file"), 500));
  }
});
