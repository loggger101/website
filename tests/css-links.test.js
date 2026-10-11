/* tests/css-links.test.js — every page links the full stylesheet, in order.

   There is no style.css entry point any more. It used to @import the css/
   modules, which cost a whole extra round trip before first paint: the
   browser could not discover the eight imports until style.css itself had
   arrived and been parsed. Each page now links the modules directly, so the
   preload scanner finds all eight in the HTML and fetches them in parallel.

   The price is that the same eight <link> tags live in every page, and this
   test is what keeps those copies honest. It fails when a page drops,
   reorders or adds a module, and when a css/_*.css file exists that ORDER
   does not mention (a new module that was never linked anywhere).

   Run with: `node --test tests/*.test.js` */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

/* Order matters at both ends: _base.css first so its custom properties are
   in scope for everything after it, _print.css last so its resets win
   specificity ties. */
const ORDER = [
  "_base.css",
  "_motion.css",
  "_layout.css",
  "_nav.css",
  "_homepage-cards.css",
  "_minis.css",
  "_project-pages.css",
  "_print.css",
];

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

test("css: ORDER lists every module in css/", () => {
  const onDisk = fs
    .readdirSync(path.join(ROOT, "css"))
    .filter((f) => f.endsWith(".css"))
    .sort();
  assert.deepEqual(onDisk, [...ORDER].sort());
});

for (const page of pages) {
  test(`css: ${page} links every module in order`, () => {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    const linked = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)].map(
      (m) => m[0].match(/\bhref="([^"]+)"/)[1],
    );
    // 404.html is served for arbitrarily deep URLs, so it links root-absolutely.
    const prefix = page === "404.html" ? "/css/" : "css/";
    assert.deepEqual(
      linked,
      ORDER.map((f) => prefix + f),
    );
  });
}
