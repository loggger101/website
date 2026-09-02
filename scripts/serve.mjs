/* Static file server for local preview.
 *
 *   node scripts/serve.mjs [--port 8000]
 *
 * No dependencies, to match the rest of the repo: there is no package.json,
 * and a preview server should not be the thing that introduces one.
 *
 * It exists because the previous preview config shelled out to
 * `python -m http.server`, which fails outright on a machine without Python.
 *
 * Two behaviours here deliberately mirror GitHub Pages rather than a generic
 * static server, because the differences are exactly where local testing
 * gives false confidence:
 *
 *   - Unknown paths serve 404.html with a real 404 status. That page links
 *     its CSS with root-absolute paths (/style.css) precisely because Pages
 *     serves it for arbitrarily deep URLs, and a server that 404s with a bare
 *     "not found" never exercises it.
 *   - Directory requests resolve to index.html.
 *
 * Files are read per request with no caching headers, so an edit is visible
 * on reload without a hard refresh.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname, sep } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const portFlag = process.argv.indexOf("--port");
const PORT = portFlag !== -1 ? Number(process.argv[portFlag + 1]) : 8000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".woff2": "font/woff2",
};

/* Resolve a URL path to a file inside ROOT, or null if it escapes.
   normalize() collapses any ../ before the prefix check, so a crafted path
   cannot walk out of the repo. */
function resolve(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const full = normalize(join(ROOT, decoded));
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

async function readIfFile(path) {
  try {
    const info = await stat(path);
    if (info.isDirectory()) return null;
    return await readFile(path);
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  let target = resolve(req.url);
  if (!target) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Forbidden");
  }

  let body = await readIfFile(target);

  // Directory (or bare "/") -> its index.html
  if (body === null) {
    const index = join(target, "index.html");
    body = await readIfFile(index);
    if (body !== null) target = index;
  }

  if (body === null) {
    const notFound = await readIfFile(join(ROOT, "404.html"));
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(notFound ?? "Not found");
  }

  res.writeHead(200, {
    "Content-Type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(body);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Try: node scripts/serve.mjs --port 8001`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}/`);
  console.log("Press Ctrl+C to stop.");
});
