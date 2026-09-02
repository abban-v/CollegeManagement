import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { bucket } from "@/lib/storage";
import { getSession } from "@/lib/auth";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { key: segments } = await params;
    const storageKey = segments.join("/");
    
    // Security: sanitize path against directory traversal
    const safeKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, "");

    const ext = path.extname(safeKey).toLowerCase();
    const contentType = MIME_MAP[ext] || "image/jpeg";

    // 1. Try public uploads directory
    try {
      const localFilePath = path.join(process.cwd(), "public", "uploads", safeKey);
      const data = await fs.readFile(localFilePath);
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {}

    // 2. Try /tmp uploads directory (for Vercel serverless functions)
    try {
      const tmpFilePath = path.join("/tmp", "uploads", safeKey);
      const data = await fs.readFile(tmpFilePath);
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {}

    // 3. Try GCS if configured
    try {
      const file = bucket.file(storageKey);
      const [data] = await file.download();
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {}

    return new NextResponse("File not found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("File not found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
