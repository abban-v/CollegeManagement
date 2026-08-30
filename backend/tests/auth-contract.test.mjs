import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("..", import.meta.url);

function read(relPath) {
  return readFileSync(new URL(relPath, root), "utf8");
}

test("prisma schema defines session storage", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model Session \{/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(schema, /expiresAt\s+DateTime/);
});

test("login route creates a session after verifying credentials", () => {
  const route = read("src/app/api/v1/auth/login/route.ts");
  assert.match(route, /bcrypt\.compare\(password, user\.password\)/);
  assert.match(route, /createSession\(/);
  assert.match(route, /Invalid email or password/);
});

test("register route creates a user and starts a session", () => {
  const route = read("src/app/api/v1/auth/register/route.ts");
  assert.match(route, /prisma\.user\.create\(/);
  assert.match(route, /bcrypt\.hash\(password, 10\)/);
  assert.match(route, /createSession\(/);
});

test("issue mutation routes enforce ownership and role checks", () => {
  const route = read("src/app/api/v1/issues/[id]/route.ts");
  assert.match(route, /issue\.reporterId !== session\.userId/);
  assert.match(route, /session\.role !== "ADMIN"/);
  assert.match(route, /withRole\("MODERATOR", "ADMIN"\)/);
});

test("comments and followers routes are implemented", () => {
  const comments = read("src/app/api/v1/issues/[id]/comments/route.ts");
  const followers = read("src/app/api/v1/issues/[id]/followers/route.ts");
  assert.match(comments, /CreateCommentSchema/);
  assert.match(comments, /issueService\.addComment\(/);
  assert.match(followers, /issueService\.followIssue\(/);
  assert.match(followers, /issueService\.unfollowIssue\(/);
});
