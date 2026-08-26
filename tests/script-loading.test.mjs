import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(
  "/Users/kikyo/Documents/vibe coding-test/personal-portfolio-site/index.html",
  "utf8"
);
const appJs = readFileSync(
  "/Users/kikyo/Documents/vibe coding-test/personal-portfolio-site/app.js",
  "utf8"
);

test("index loads app.js as a classic script", () => {
  assert.match(indexHtml, /<script\s+src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(indexHtml, /<script\s+type="module"\s+src="\.\/app\.js"><\/script>/);
});

test("app.js does not depend on module imports", () => {
  assert.doesNotMatch(appJs, /^\s*import\s/m);
});
