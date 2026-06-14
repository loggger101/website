/* tests/ortega.test.js — smoke tests for the Python→JS port in
   ortega-exposure.js. Verifies that the same inputs the in-browser
   calculator surfaces by default produce the same exposure-time output
   the Python source documents (rounded to the nearest second), plus a
   few invariants on the duration formatter.

   Run with: `node --test tests/`
   No npm install needed — this uses Node's built-in test runner. */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { calculate, formatDuration } = require("../ortega-exposure.js");

test("ortega: default inputs reproduce the Python output (2044 s, rounded)", () => {
  // Same parameter set the page ships with by default, producing the same
  // exposure time the Python source prints at its final line (~78): 2044 s.
  const r = calculate({
    seeing: 1.25,
    lunarAge: "7",
    filter: "I",
    snr: 125,
    mag: 19.7,
  });
  assert.ok(r, "calculate() should return a result");
  assert.equal(Math.round(r.expTime), 2044);
});

test("ortega: result fields are finite and physically plausible", () => {
  const r = calculate({
    seeing: 1.25,
    lunarAge: "7",
    filter: "I",
    snr: 125,
    mag: 19.7,
  });
  for (const k of ["expTime", "seeingPix", "skyCount", "starCount", "magObs", "skyMag"]) {
    assert.ok(Number.isFinite(r[k]), `${k} should be finite`);
  }
  assert.ok(r.seeingPix > 0, "seeingPix > 0");
  assert.ok(r.skyCount > 0, "skyCount > 0");
  assert.ok(r.starCount > 0, "starCount > 0");
  // I-band lookup at lunar age 7 is 19.7 mag/arcsec^2.
  assert.equal(r.skyMag, 19.7);
  // magObs = mag + k_lam[I] = 19.7 + 0.08 = 19.78.
  assert.ok(Math.abs(r.magObs - 19.78) < 1e-9);
});

test("ortega: bogus filter returns null", () => {
  const r = calculate({ seeing: 1.25, lunarAge: "7", filter: "Z", snr: 125, mag: 19.7 });
  assert.equal(r, null);
});

test("ortega: bogus lunar age returns null", () => {
  const r = calculate({ seeing: 1.25, lunarAge: "99", filter: "I", snr: 125, mag: 19.7 });
  assert.equal(r, null);
});

test("ortega: brighter star ⇒ shorter exposure", () => {
  const base = { seeing: 1.25, lunarAge: "7", filter: "I", snr: 125, mag: 19.7 };
  const dim = calculate(base);
  const bright = calculate(Object.assign({}, base, { mag: 15.0 }));
  assert.ok(bright.expTime < dim.expTime, "mag 15 should expose faster than mag 19.7");
});

test("ortega: higher target SNR ⇒ longer exposure", () => {
  const base = { seeing: 1.25, lunarAge: "7", filter: "I", snr: 125, mag: 19.7 };
  const lo = calculate(base);
  const hi = calculate(Object.assign({}, base, { snr: 250 }));
  assert.ok(hi.expTime > lo.expTime, "higher SNR should require longer exposure");
});

test("ortega: formatDuration formats sub-minute, minutes, and hours", () => {
  assert.equal(formatDuration(45), "45 sec");
  assert.equal(formatDuration(2044), "34 min 4 sec");
  assert.equal(formatDuration(7261), "2 h 1 min 1 sec");
});

test("ortega: formatDuration rounds its input to the nearest second", () => {
  assert.equal(formatDuration(45.4), "45 sec");
  assert.equal(formatDuration(45.6), "46 sec");
});
