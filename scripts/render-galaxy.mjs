/* Rasterises assets/galaxy.svg to assets/galaxy.webp.
 *
 *   node scripts/render-galaxy.mjs
 *
 * The SVG is the source of truth and stays hand-editable; the WebP is what
 * the site actually loads. Edit the SVG, re-run this, commit both.
 *
 * Why bake it at all: galaxy.svg leans on large Gaussian blurs plus a
 * turbulence displacement, and measured in a software rasteriser it costs
 * about 2.3 seconds to rasterise at the size `background-size: cover` asks
 * for on a 1440x900 screen — against 55ms for a trivial gradient SVG. That
 * cost is paid per visitor, scales with device pixel ratio (a 3x phone asks
 * for MORE pixels than a desktop), and buys nothing dynamic: the image never
 * changes. Baking moves it here, to a thing that runs when the art changes.
 *
 * It also removes a portability risk. feTurbulence and feDisplacementMap are
 * specified loosely enough that engines disagree on the exact noise, so the
 * live SVG would have rendered a subtly different galaxy in every browser.
 * A raster is a raster everywhere.
 *
 * Rendering goes through Chrome because it is the only SVG filter
 * implementation on hand; the canvas round-trip is there because Chrome's
 * own WebP encoder is reachable from canvas.toDataURL and nothing else here
 * can write WebP. The page is served over HTTP rather than file:// because a
 * file:// SVG taints the canvas and toDataURL then throws.
 */

import { writeFileSync, readFileSync, existsSync, mkdtempSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "galaxy.webp");

/* 2400x1500 keeps the same 1.6 aspect as the SVG. It is generous for a 1440px
   screen and soft enough that even a 2560px one upscales invisibly — every
   feature in the image is a blur, so there is no detail for upscaling to
   lose. Quality 0.92 because the gradients are the whole picture and WebP
   banding would undo the dither work in css/_motion.css. */
const WIDTH = 2400;
const HEIGHT = 1500;
const QUALITY = 0.92;
const PORT = 8123;
const DEBUG_PORT = 9333;

const CHROME_CANDIDATES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error("No Chrome found. Set CHROME=/path/to/chrome and re-run.");
  process.exit(1);
}

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__done = false;
(async function () {
  try {
    var img = new Image();
    img.src = "/assets/galaxy.svg";
    await img.decode();
    var c = document.createElement("canvas");
    c.width = ${WIDTH}; c.height = ${HEIGHT};
    // Flatten onto black and ship no alpha channel. This is not an
    // approximation. The layer is composited with mix-blend-mode: screen,
    // and screening a source premultiplied over black is algebraically
    // identical to alpha-compositing the transparent original:
    //   screen(b, a*c)     = 1-(1-b)(1-a*c)              = b + a*c - a*b*c
    //   over(b, c, alpha)  = (1-a)*b + a*(1-(1-b)(1-c))  = b + a*c - a*b*c
    // Keeping the alpha channel cost 820KB, because WebP stores alpha
    // losslessly and a full-frame gradient alpha does not compress.
    var g2 = c.getContext("2d");
    g2.fillStyle = "#000";
    g2.fillRect(0, 0, ${WIDTH}, ${HEIGHT});
    g2.drawImage(img, 0, 0, ${WIDTH}, ${HEIGHT});
    window.__out = c.toDataURL("image/webp", ${QUALITY});
  } catch (e) {
    window.__err = String(e);
  }
  window.__done = true;
})();
</script></body>`;

const TYPES = { ".svg": "image/svg+xml", ".html": "text/html" };
const server = createServer((req, res) => {
  const path = req.url.split("?")[0];
  if (path === "/render.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(PAGE);
  }
  try {
    const body = readFileSync(join(ROOT, path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => server.listen(PORT, r));

const profile = mkdtempSync(join(tmpdir(), "galaxy-render-"));
const proc = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome never exposed a debugging target");
}

let dataUrl;
try {
  const ws = new WebSocket(await cdp());
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value;

  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/render.html` });

  // The filters are slow by design here; give the raster real time.
  let ready = false;
  for (let i = 0; i < 240 && !ready; i++) {
    await sleep(500);
    ready = await evaluate("window.__done === true");
  }
  if (!ready) throw new Error("timed out waiting for the canvas render");

  const err = await evaluate("window.__err || ''");
  if (err) throw new Error("in-page failure: " + err);

  dataUrl = await evaluate("window.__out");
  ws.close();
} finally {
  proc.kill();
  server.close();
}

if (!dataUrl || !dataUrl.startsWith("data:image/webp")) {
  throw new Error(
    "Chrome did not return a WebP data URL (got: " + String(dataUrl).slice(0, 40) + ")",
  );
}
const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
writeFileSync(OUT, bytes);
console.log(
  `wrote assets/galaxy.webp — ${WIDTH}x${HEIGHT}, ${(bytes.length / 1024).toFixed(1)} KB`,
);
