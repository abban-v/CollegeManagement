import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("..", import.meta.url);

function read(relPath) {
  return readFileSync(new URL(relPath, root), "utf8");
}

test("analyzer includes enhanced prompt with spamScore and confidence rubrics", () => {
  const analyzer = read("src/modules/ai/analyzer.ts");
  assert.match(analyzer, /spamScore/);
  assert.match(analyzer, /confidence/);
  assert.match(analyzer, /CRITICAL EVALUATION RUBRIC/);
  assert.match(analyzer, /0\.81 to 1\.00/);
  assert.match(analyzer, /0\.51 to 0\.80/);
  assert.match(analyzer, /isGibberish/);
  assert.match(analyzer, /GIBBERISH_PATTERNS/);
});

test("issue service enforces rule 3 (spam > 80% and confidence < 30% rejection)", () => {
  const service = read("src/modules/issues/service.ts");
  assert.match(service, /FabricatedSpamError/);
  assert.match(service, /analysis\.spamScore > 0\.8 && analysis\.confidence < 0\.3/);
  assert.match(service, /likely fabricated or spam/);
});

test("issue service enforces rule 1 (spam > 50% and confidence < 60% review hold)", () => {
  const service = read("src/modules/issues/service.ts");
  assert.match(service, /analysis\.spamScore > 0\.5 && analysis\.confidence < 0\.6/);
  assert.match(service, /ModerationStatus\.UNDER_REVIEW/);
  assert.match(service, /Issue Kept for Review/);
});

test("issues list route excludes UNDER_REVIEW from public listing", () => {
  const service = read("src/modules/issues/service.ts");
  assert.match(service, /"UNDER_REVIEW"/);
  assert.match(service, /notIn:\s*includeRemoved\s*\?\s*\["UNDER_REVIEW"\]\s*:\s*\["REMOVED",\s*"UNDER_REVIEW"\]/);
});

test("issues POST route catches FabricatedSpamError with 422 status", () => {
  const route = read("src/app/api/v1/issues/route.ts");
  assert.match(route, /FabricatedSpamError/);
  assert.match(route, /422/);
});

test("admin moderation route includes analysis and reporter and supports DELETE", () => {
  const moderationRoute = read("src/app/api/v1/admin/moderation/route.ts");
  const moderationItemRoute = read("src/app/api/v1/admin/moderation/[id]/route.ts");
  assert.match(moderationRoute, /analysis:\s*true/);
  assert.match(moderationRoute, /reporter:\s*\{/);
  assert.match(moderationItemRoute, /export const DELETE = withRole\("MODERATOR", "ADMIN"\)/);
});

test("analyzer prompt includes currently reported & active platform issues for duplicate detection", () => {
  const analyzer = read("src/modules/ai/analyzer.ts");
  assert.match(analyzer, /CURRENTLY REPORTED & ACTIVE PLATFORM ISSUES/);
  assert.match(analyzer, /DUPLICATE DETECTION/);
  assert.match(analyzer, /isDuplicate/);
  assert.match(analyzer, /duplicateOfIssueId/);
});

test("issue service rejects duplicates with exact user message", () => {
  const service = read("src/modules/issues/service.ts");
  assert.match(service, /DuplicateIssueError/);
  assert.match(service, /Issue already exists, instead of creating new one, upvote the previous issue/);
});

test("issues POST route catches DuplicateIssueError with 409 status", () => {
  const route = read("src/app/api/v1/issues/route.ts");
  assert.match(route, /DuplicateIssueError/);
  assert.match(route, /409/);
});
