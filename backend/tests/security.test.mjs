import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("..", import.meta.url);

function read(relPath) {
  return readFileSync(new URL(relPath, root), "utf8");
}

test("password policy requires complexity", () => {
  const register = read("src/app/api/v1/auth/register/route.ts");
  assert.match(register, /min\(8/);
  assert.match(register, /[A-Z]/);
  assert.match(register, /[a-z]/);
  assert.match(register, /[0-9]/);
  assert.match(register, /[^A-Za-z0-9]/);
});

test("middleware implements CORS headers", () => {
  const middleware = read("src/middleware.ts");
  assert.match(middleware, /Access-Control-Allow-Origin/);
  assert.match(middleware, /Access-Control-Allow-Methods/);
  assert.match(middleware, /Access-Control-Allow-Headers/);
  assert.match(middleware, /Access-Control-Allow-Credentials/);
});

test("middleware implements rate limiting", () => {
  const middleware = read("src/middleware.ts");
  const rateLimit = read("src/lib/middleware/rateLimit.ts");
  assert.match(middleware, /checkRateLimit/);
  assert.match(middleware, /getRateLimitHeaders/);
  assert.match(middleware, /429/);
  assert.match(rateLimit, /X-RateLimit/);
});

test("storage uses Application Default Credentials", () => {
  const storage = read("src/lib/storage.ts");
  assert.match(storage, /Application Default Credentials/);
  assert.doesNotMatch(storage, /service-account/);
  assert.doesNotMatch(storage, /JSON key/);
});

test("AI integration uses Gemini instead of Grok", () => {
  const analyzer = read("src/modules/ai/analyzer.ts");
  assert.match(analyzer, /GoogleGenerativeAI/);
  assert.match(analyzer, /gemini/);
  assert.doesNotMatch(analyzer, /grok/i);
  assert.doesNotMatch(analyzer, /x\.ai/i);
});

test("file upload validates MIME types", () => {
  const storage = read("src/lib/storage.ts");
  assert.match(storage, /validateFileUpload/);
  assert.match(storage, /image\/jpeg/);
  assert.match(storage, /image\/png/);
  assert.match(storage, /maxSize/);
});

test("file upload endpoint requires authentication", () => {
  const upload = read("src/app/api/v1/upload/route.ts");
  assert.match(upload, /withAuth/);
});

test("environment variables configured for Supabase", () => {
  const envExample = read(".env.example");
  assert.match(envExample, /DATABASE_URL/);
  assert.match(envExample, /DIRECT_URL/);
  assert.match(envExample, /supabase/);
});

test("environment variables configured for Gemini AI", () => {
  const envExample = read(".env.example");
  assert.match(envExample, /GEMINI_API_KEY/);
  assert.match(envExample, /GEMINI_MODEL/);
  assert.doesNotMatch(envExample, /XAI_API_KEY/);
  assert.doesNotMatch(envExample, /grok/i);
});

test("environment variables configured for Google Cloud Storage", () => {
  const envExample = read(".env.example");
  assert.match(envExample, /GCS_BUCKET_NAME/);
  assert.match(envExample, /GCS_PROJECT_ID/);
  assert.doesNotMatch(envExample, /S3_ACCESS_KEY/);
  assert.doesNotMatch(envExample, /S3_SECRET_KEY/);
});
