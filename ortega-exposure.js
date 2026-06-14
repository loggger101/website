/* ortega-exposure.js — port of ortega-exposure.py to vanilla JS for the
   mini-project page. Mirrors the original quadratic-SNR exposure-time
   formula, Johnson–Cousins extinction, lunar-age sky brightness lookup,
   and pixel-scale derivation exactly. Re-runs on every input change so
   the result panel updates live.

   The pure math (calculate, formatDuration) is also exported via
   module.exports when loaded under Node so tests/ortega.test.js can
   reach it without a DOM. */

(function () {
  // ---------------------------------------------------------------
  // Constants (from the Python source)
  // ---------------------------------------------------------------
  var PLATE_SCALE = 0.00015625; // rad / mm
  var PIXEL_DIAMETER = 0.0267; // mm / pixel
  var READNOISE = 2.9; // e- / pix / second
  var FILTER_NAMES = ["U", "B", "V", "R", "I"];
  var N15_COUNT = [400, 2600, 2400, 2300, 1600]; // counts/s for a mag-15 star per filter
  var K_LAM = [0.6, 0.4, 0.2, 0.1, 0.08]; // airmass-1 extinction per filter
  var LUNAR_AGE_DATA = {
    0: [22.0, 22.7, 21.8, 20.9, 19.9],
    3: [21.5, 22.4, 21.7, 20.8, 19.9],
    7: [19.9, 21.6, 21.4, 20.6, 19.7],
    10: [18.5, 20.7, 20.7, 20.3, 19.5],
    14: [17.0, 19.5, 20.0, 19.9, 19.2],
  };

  // ---------------------------------------------------------------
  // Math
  // ---------------------------------------------------------------
  function calculate(inputs) {
    var idx = FILTER_NAMES.indexOf(inputs.filter);
    if (idx < 0) return null;
    var chosenAge = LUNAR_AGE_DATA[inputs.lunarAge];
    if (!chosenAge) return null;

    // seeing arcsec → degrees → radians → pixels (same chain as the Python)
    var seeingPix = inputs.seeing / 60 / 60 / 57.3 / (PLATE_SCALE * PIXEL_DIAMETER);

    var skyMag = chosenAge[idx];
    var skyCount = Math.pow(10, (skyMag - 15) / -2.5) * N15_COUNT[idx];
    var refCount = N15_COUNT[idx];
    var magObs = inputs.mag + K_LAM[idx];
    var starCount = refCount * Math.pow(10, (magObs - 15) / -2.5);

    var a = starCount * starCount;
    var b = -inputs.snr * inputs.snr * (starCount + seeingPix * skyCount);
    var c = -inputs.snr * inputs.snr * seeingPix * READNOISE;

    var disc = b * b - 4 * a * c;
    if (a === 0 || disc < 0) return null;
    var expTime = (-b + Math.sqrt(disc)) / (2 * a);
    if (!isFinite(expTime) || expTime <= 0) return null;

    return {
      expTime: expTime,
      seeingPix: seeingPix,
      skyCount: skyCount,
      starCount: starCount,
      magObs: magObs,
      skyMag: skyMag,
    };
  }

  function formatDuration(s) {
    s = Math.round(s);
    if (s < 60) return s + " sec";
    if (s < 3600) {
      var m = Math.floor(s / 60);
      return m + " min " + (s - m * 60) + " sec";
    }
    var h = Math.floor(s / 3600);
    var rem = s - h * 3600;
    var m2 = Math.floor(rem / 60);
    return h + " h " + m2 + " min " + (rem - m2 * 60) + " sec";
  }

  // Expose pure logic for Node tests. Browser builds skip this and continue
  // to the DOM bindings below.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculate: calculate, formatDuration: formatDuration };
    return;
  }

  // ---------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------
  var form = document.getElementById("etc-form");
  if (!form) return;

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function fmt(n, digits) {
    if (!isFinite(n)) return "—";
    return n.toFixed(digits == null ? 2 : digits);
  }

  function readInputs() {
    return {
      seeing: parseFloat(form.elements.seeing.value),
      lunarAge: form.elements.lunarAge.value,
      filter: form.elements.filter.value,
      snr: parseFloat(form.elements.snr.value),
      mag: parseFloat(form.elements.mag.value),
    };
  }

  function clearResult(msg) {
    setText("etc-result-time", "—");
    setText("etc-result-friendly", msg || "");
    setText("etc-result-sky", "—");
    setText("etc-result-star", "—");
    setText("etc-result-magobs", "—");
    setText("etc-result-skymag", "—");
    setText("etc-result-seeingpix", "—");
  }

  function update() {
    var inputs = readInputs();
    if (
      !isFinite(inputs.seeing) ||
      !isFinite(inputs.snr) ||
      !isFinite(inputs.mag) ||
      inputs.seeing <= 0 ||
      inputs.snr <= 0
    ) {
      clearResult("Enter positive numbers for seeing, SNR, and magnitude.");
      return;
    }
    var r = calculate(inputs);
    if (!r) {
      clearResult("No solution for this combination of inputs.");
      return;
    }
    setText("etc-result-time", Math.round(r.expTime).toLocaleString() + " s");
    setText("etc-result-friendly", "(" + formatDuration(r.expTime) + ")");
    setText("etc-result-sky", fmt(r.skyCount, 2));
    setText("etc-result-star", fmt(r.starCount, 2));
    setText("etc-result-magobs", fmt(r.magObs, 2));
    setText("etc-result-skymag", fmt(r.skyMag, 2));
    setText("etc-result-seeingpix", fmt(r.seeingPix, 2));
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  // No submit endpoint — keep Enter from reloading the page with input
  // values appended as a query string (which would wipe the result panel).
  form.addEventListener("submit", function (e) {
    e.preventDefault();
  });
  update();
})();
