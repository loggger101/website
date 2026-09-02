/* Regenerates the three tiling star layers in assets/.
 *
 *   node scripts/generate-starfield.mjs
 *
 * These used to be hand-placed circles, which capped them at a few dozen
 * stars per tile and made the brightness distribution flat: every star came
 * out roughly the same size, so the field read as noise rather than sky. A
 * real star field is mostly faint pinpricks with a handful of genuinely
 * bright anchors, and its colors spread across the blackbody range instead
 * of sitting on white. Both are easy to generate and tedious to hand-author,
 * hence this script.
 *
 * The RNG is seeded, so re-running reproduces the committed SVGs byte for
 * byte. Change SEED (or any layer's knobs) and re-run to reroll the sky.
 *
 * Tiling: the layers repeat via background-repeat, so a star whose glow
 * crosses a tile edge is redrawn on the opposite side. Without that, bright
 * stars get sliced in half along a visible grid.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SEED = 20260901;
const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

/* mulberry32 — small, fast, and stable across Node versions, which matters
   because the committed SVGs are supposed to be reproducible. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Stellar colors, roughly ordered hot to cool, with weights chosen so the
   field skews white-and-blue like the reference photography while still
   carrying enough amber to keep it from looking sterile. */
const PALETTE = [
  { hex: "#cfe0ff", weight: 14 }, // hot blue-white (O/B)
  { hex: "#e8f0ff", weight: 18 }, // blue-white (A)
  { hex: "#ffffff", weight: 30 }, // white (F)
  { hex: "#fff6e6", weight: 16 }, // warm white (G)
  { hex: "#ffe0b4", weight: 13 }, // amber (K)
  { hex: "#ffc49a", weight: 9 }, // orange (early M)
];
const TOTAL_WEIGHT = PALETTE.reduce((sum, c) => sum + c.weight, 0);

function pickColor(rand) {
  let roll = rand() * TOTAL_WEIGHT;
  for (const color of PALETTE) {
    roll -= color.weight;
    if (roll <= 0) return color.hex;
  }
  return PALETTE[PALETTE.length - 1].hex;
}

/* Coordinates only ever need a tenth of a pixel; radii are sub-pixel, so they
   keep two places. Trimming precision is most of why these files stay small
   even at a couple of thousand stars. */
const round = (n, places = 1) => Number(n.toFixed(places));

/* One layer's worth of stars.
 *
 * `gamma` shapes the magnitude distribution: brightness is rand()^gamma, so
 * a gamma above 1 pushes most stars toward the faint end and leaves only a
 * few near the top. 3 gives roughly the "many faint, few bright" falloff a
 * real field has.
 *
 * `glowFrom` is the brightness above which a star also gets a soft halo.
 * Set it above 1 to disable halos for the layer entirely.
 *
 * Bright stars get a round halo and nothing else. Diffraction spikes were
 * tried and dropped: the reference is wide-field photography, where bright
 * stars are round, and at any believable threshold a tile carries only one or
 * two flared stars — which then repeat in a regular grid across the viewport
 * and give the tiling away. */
function buildLayer({ width, height, count, radius, alpha, gamma, glowFrom, glowScale, seed }) {
  const rand = rng(seed);
  const body = [];
  const glow = [];
  const usedHalo = new Set();

  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const brightness = Math.pow(rand(), gamma);
    const r = radius[0] + brightness * (radius[1] - radius[0]);
    const o = alpha[0] + brightness * (alpha[1] - alpha[0]);
    const hex = pickColor(rand);
    const hasGlow = brightness >= glowFrom;
    const halo = hasGlow ? r * glowScale : 0;
    if (hasGlow) usedHalo.add(hex);

    /* Redraw anything whose ink crosses a tile edge on the far side, so the
       repeat is seamless. Reach is the larger of the halo and the disc. */
    const reach = Math.max(halo, r) + 1;
    const dxs = x < reach ? [0, width] : x > width - reach ? [0, -width] : [0];
    const dys = y < reach ? [0, height] : y > height - reach ? [0, -height] : [0];

    for (const dx of dxs) {
      for (const dy of dys) {
        const cx = round(x + dx);
        const cy = round(y + dy);
        if (hasGlow) {
          glow.push(
            `<circle cx='${cx}' cy='${cy}' r='${round(halo, 2)}' fill='url(#h${hex.slice(1)})'/>`,
          );
        }
        body.push(
          `<circle cx='${cx}' cy='${cy}' r='${round(r, 2)}' fill='${hex}' fill-opacity='${round(o, 2)}'/>`,
        );
      }
    }
  }

  /* One halo gradient per color actually used, so the defs block stays small. */
  const defs = [...usedHalo]
    .sort()
    .map(
      (hex) =>
        `<radialGradient id='h${hex.slice(1)}'>` +
        `<stop offset='0' stop-color='${hex}' stop-opacity='0.5'/>` +
        `<stop offset='0.45' stop-color='${hex}' stop-opacity='0.12'/>` +
        `<stop offset='1' stop-color='${hex}' stop-opacity='0'/>` +
        `</radialGradient>`,
    )
    .join("");

  /* Halos first so no star sits under another star's glow. */
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>` +
    (defs ? `<defs>${defs}</defs>` : "") +
    glow.join("") +
    body.join("") +
    `</svg>\n`
  );
}

/* Three depths. Far is dense and dim, near is sparse and bright; the size and
   opacity ranges are what sell the parallax as depth rather than as three
   copies of the same field sliding at different speeds.

   The counts are high because the reference photography is: a real field is
   thousands of faint points, and a sparse one reads as scattered dots on a
   gradient. They are affordable because these files gzip to a few KB. */
const LAYERS = [
  {
    file: "stars-far.svg",
    width: 1400,
    height: 900,
    count: 1250,
    radius: [0.3, 0.8],
    alpha: [0.2, 0.66],
    gamma: 3.2,
    glowFrom: 2, // no halos this far out
    glowScale: 0,
    seed: SEED,
  },
  {
    file: "stars-mid.svg",
    width: 1200,
    height: 800,
    count: 480,
    radius: [0.4, 1.15],
    alpha: [0.26, 0.82],
    gamma: 2.8,
    glowFrom: 0.91,
    glowScale: 4,
    seed: SEED + 1,
  },
  {
    /* Biggest tile of the three despite being the sparsest. Its stars are
       the brightest and most individually recognisable, so this is the layer
       whose repeat the eye catches first, and a longer period buys more here
       than more stars would. */
    file: "stars-near.svg",
    width: 1500,
    height: 1000,
    count: 390,
    radius: [0.5, 1.7],
    alpha: [0.34, 1],
    gamma: 2.4,
    glowFrom: 0.82,
    glowScale: 4.5,
    seed: SEED + 2,
  },
];

for (const layer of LAYERS) {
  writeFileSync(join(ASSETS, layer.file), buildLayer(layer));
  console.log(`wrote assets/${layer.file} (${layer.count} stars)`);
}
