import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";

/**
 * Google Cloud Storage client using Application Default Credentials (ADC)
 *
 * This implementation uses ADC for authentication, which means:
 * - In development: Uses gcloud auth application-default login
 * - In production: Uses service account attached to compute resources
 * - No hardcoded credentials or service account JSON files in source control
 */

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
});

const bucketName = process.env.GCS_BUCKET_NAME || "slashforge-bucket";
const bucket = storage.bucket(bucketName);

export interface UploadResult {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadOptions {
  filename: string;
  mimeType: string;
  data: Buffer;
}

/**
 * Allowed file types for evidence uploads.
 * Only image formats are supported.
 */
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/**
 * Magic byte signatures for allowed file types.
 * Used to verify actual file content, not just the client-provided MIME type.
 */
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
};

/**
 * Map MIME types to file extensions.
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Validate that the actual file content matches the claimed MIME type
 * by inspecting magic bytes.
 */
export function validateFileContent(
  data: Buffer,
  mimeType: string
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { valid: false, error: `MIME type ${mimeType} is not allowed` };
  }

  // WebP has 'RIFF' at bytes 0-3 and 'WEBP' at bytes 8-11
  if (mimeType === "image/webp") {
    if (data.length < 12) {
      return { valid: false, error: "File too small to be valid WebP" };
    }
    const isRiff = data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46;
    const isWebp = data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50;
    if (!isRiff || !isWebp) {
      return {
        valid: false,
        error: `File content does not match declared MIME type ${mimeType}`,
      };
    }
    return { valid: true };
  }

  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) {
    return { valid: false, error: `No magic byte signature for ${mimeType}` };
  }

  const matches = signatures.some((sig) => {
    if (data.length < sig.length) return false;
    return sig.every((byte, i) => data[i] === byte);
  });

  if (!matches) {
    return {
      valid: false,
      error: `File content does not match declared MIME type ${mimeType}`,
    };
  }

  return { valid: true };
}

/**
 * Generate a safe, server-controlled storage key.
 * Never uses client-provided filename in the path.
 */
function generateStorageKey(mimeType: string): string {
  const ext = MIME_TO_EXTENSION[mimeType] || "bin";
  const uuid = randomUUID();
  return `evidence/${uuid}.${ext}`;
}

import fs from "fs/promises";
import path from "path";

/**
 * Upload a file to Google Cloud Storage (with local disk fallback for development)
 *
 * Security:
 * - Storage key is server-generated (UUID-based), not client-controlled
 * - File content is validated via magic bytes before upload
 * - Original filename is stored only as metadata, never in the path
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { filename, mimeType, data } = options;

  // Validate actual file content via magic bytes
  const contentValidation = validateFileContent(data, mimeType);
  if (!contentValidation.valid) {
    throw new Error(contentValidation.error || "File content validation failed");
  }

  // Generate a safe, server-controlled storage key
  const storageKey = generateStorageKey(mimeType);

  try {
    const file = bucket.file(storageKey);

    await file.save(data, {
      contentType: mimeType,
      metadata: {
        originalFilename: filename,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Make the file publicly readable (for evidence images)
    await file.makePublic().catch(() => {});

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${storageKey}`;

    return {
      storageKey,
      publicUrl,
      mimeType,
      fileSize: data.length,
    };
  } catch (gcsError) {
    console.warn("GCS upload failed, saving to local/tmp storage:", gcsError);

    const baseFilename = path.basename(storageKey);
    const baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
    let publicUrl = `${baseUrl}/uploads/evidence/${baseFilename}`;

    try {
      const localDir = path.join(process.cwd(), "public", "uploads", "evidence");
      await fs.mkdir(localDir, { recursive: true });
      const localFilePath = path.join(localDir, baseFilename);
      await fs.writeFile(localFilePath, data);
    } catch {
      try {
        const tmpDir = path.join("/tmp", "uploads", "evidence");
        await fs.mkdir(tmpDir, { recursive: true });
        const tmpFilePath = path.join(tmpDir, baseFilename);
        await fs.writeFile(tmpFilePath, data);
      } catch {
        publicUrl = `data:${mimeType};base64,${data.toString("base64")}`;
      }
    }

    return {
      storageKey,
      publicUrl,
      mimeType,
      fileSize: data.length,
    };
  }
}

/**
 * Delete a file from Google Cloud Storage
 */
export async function deleteFile(storageKey: string): Promise<void> {
  const file = bucket.file(storageKey);
  await file.delete().catch((error) => {
    console.warn(`Failed to delete file ${storageKey}:`, error);
  });
}

/**
 * Get a signed URL for temporary access (optional)
 */
export async function getSignedUrl(storageKey: string, expiresIn: number = 3600): Promise<string> {
  const file = bucket.file(storageKey);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresIn * 1000,
  });
  return url;
}

/**
 * Check if a file exists in Google Cloud Storage or local fallback directory
 */
export async function fileExists(storageKey: string): Promise<boolean> {
  try {
    const file = bucket.file(storageKey);
    const [exists] = await file.exists();
    if (exists) return true;
  } catch {}

  try {
    const baseFilename = path.basename(storageKey);
    const localFilePath = path.join(process.cwd(), "public", "uploads", "evidence", baseFilename);
    await fs.access(localFilePath);
    return true;
  } catch {}

  try {
    const baseFilename = path.basename(storageKey);
    const tmpFilePath = path.join("/tmp", "uploads", "evidence", baseFilename);
    await fs.access(tmpFilePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate file type and size before upload
 */
export function validateFileUpload(
  file: File,
  maxSize: number = 5 * 1024 * 1024 // 5MB default
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
    };
  }

  // Check MIME type (only allow images for evidence)
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Only images are accepted.`,
    };
  }

  return { valid: true };
}

export { bucket, storage };
