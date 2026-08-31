import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const relativePath = segments.join("/");
    
    // Security: sanitize path against directory traversal
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    // 1. Try public uploads directory
    try {
      const localFilePath = path.join(process.cwd(), "public", "uploads", safePath);
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
      const tmpFilePath = path.join("/tmp", "uploads", safePath);
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

    return new NextResponse("File not found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new NextResponse("File not found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
