import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("..", import.meta.url);

function read(relPath) {
  return readFileSync(new URL(relPath, root), "utf8");
}

test("api docs list the implemented auth endpoints", () => {
  const docs = read("docs/api.md");
  assert.match(docs, /POST \/auth\/register/);
  assert.match(docs, /POST \/auth\/login/);
  assert.match(docs, /POST \/auth\/logout/);
  assert.match(docs, /GET \/auth\/session/);
});

test("root layout no longer depends on Google Fonts at build time", () => {
  const layout = read("src/app/layout.tsx");
  assert.doesNotMatch(layout, /next\/font\/google/);
  assert.match(layout, /title: "Slashforge"/);
});

test("issue API exposes the current core routes", () => {
  const routes = read("docs/api.md");
  assert.match(routes, /GET \/issues/);
  assert.match(routes, /POST \/issues/);
  assert.match(routes, /PATCH \/issues\/:id/);
  assert.match(routes, /POST \/issues\/:id\/status/);
  assert.match(routes, /DELETE \/issues\/:id/);
  assert.match(routes, /GET \/issues\/:id\/comments/);
  assert.match(routes, /POST \/issues\/:id\/comments/);
  assert.match(routes, /POST \/issues\/:id\/followers/);
  assert.match(routes, /DELETE \/issues\/:id\/followers/);
  assert.match(routes, /POST \/issues\/:id\/affected/);
  assert.match(routes, /DELETE \/issues\/:id\/affected/);
  assert.match(routes, /GET \/issues\/:id\/resolutions/);
  assert.match(routes, /POST \/issues\/:id\/resolutions/);
  assert.match(routes, /POST \/issues\/:id\/dispute/);
  assert.match(routes, /POST \/issues\/:id\/report/);
  assert.match(routes, /GET \/admin\/moderation/);
  assert.match(routes, /PATCH \/admin\/moderation\/:id/);
  assert.match(routes, /POST \/admin\/issues\/:id\/resolve/);
  assert.match(routes, /POST \/admin\/issues\/:id\/status/);
  assert.match(routes, /GET \/notifications/);
  assert.match(routes, /PATCH \/notifications/);
  assert.match(routes, /POST \/notifications\/:id\/read/);
});

test("issue service includes participant user details for affected member listings", () => {
  const serviceCode = read("src/modules/issues/service.ts");
  assert.match(
    serviceCode,
    /participants:\s*\{\s*include:\s*\{\s*user:\s*\{\s*select:\s*\{\s*id:\s*true,\s*name:\s*true,\s*role:\s*true/
  );
});
