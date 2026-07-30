/* site.js — small UX helpers
   - External links open in a new tab (except opt-outs / downloads)
   - Contact form Formspree submission
   - Kaggle dataset stats from data/kaggle_stats.json
   - Project icon "visited" twinkle state via localStorage
*/

(function () {
  function isExternal(href) {
    try {
      var u = new URL(href, window.location.href);
      return u.origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function shouldSkipNewTab(a) {
    if (a.hasAttribute("download")) return true;

    var target = (a.getAttribute("target") || "").toLowerCase();
    if (target === "_self") return true;

    return false;
  }

  function ensureRel(a) {
    var rel = (a.getAttribute("rel") || "").split(/\s+/).filter(Boolean);

    if (!rel.includes("noopener")) rel.push("noopener");
    if (!rel.includes("noreferrer")) rel.push("noreferrer");

    a.setAttribute("rel", rel.join(" "));
  }

  function setUpExternalLinks() {
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href) return;

      // ignore anchors + special schemes
      if (href.startsWith("#")) return;
      if (href.startsWith("mailto:")) return;
      if (href.startsWith("tel:")) return;
      if (href.startsWith("javascript:")) return;

      if (!isExternal(href)) return;
      if (shouldSkipNewTab(a)) return;

      a.setAttribute("target", "_blank");
      ensureRel(a);
    });
  }

  function formatCompactNumber(n) {
    if (typeof n !== "number" || !isFinite(n)) return null;
    try {
      return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
        n,
      );
    } catch (e) {
      if (n >= 1e6) return Math.round((n / 1e6) * 10) / 10 + "M";
      if (n >= 1e3) return Math.round((n / 1e3) * 10) / 10 + "k";
      return String(n);
    }
  }

  function setUpKaggleStats() {
    var els = document.querySelectorAll(".kaggle-stats[data-kaggle-dataset]");
    if (!els.length) return;

    fetch("data/kaggle_stats.json?ts=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("stats fetch failed");
        return r.json();
      })
      .then(function (payload) {
        var datasets = payload && payload.datasets ? payload.datasets : {};
        els.forEach(function (el) {
          var slug = el.getAttribute("data-kaggle-dataset") || "";
          var item = datasets[slug];
          if (!item) {
            el.textContent = "Stats unavailable";
            return;
          }

          var views = Number(item.totalViews);
          var downloads = Number(item.totalDownloads);

          var vTxt = formatCompactNumber(views);
          var dTxt = formatCompactNumber(downloads);

          if (!vTxt && !dTxt) {
            el.textContent = "Stats unavailable";
            return;
          }

          var parts = [];
          if (vTxt) parts.push("👁 " + vTxt);
          if (dTxt) parts.push("⬇ " + dTxt);

          el.textContent = parts.join(" • ");

          // The visible string is glyph shorthand ("👁 911 • ⬇ 142"), which
          // reads as noise aloud — spell it out for assistive tech and as the
          // hover tooltip.
          var spelled =
            "Kaggle: " +
            (isFinite(views) ? views : 0) +
            " views, " +
            (isFinite(downloads) ? downloads : 0) +
            " downloads";
          el.setAttribute("title", spelled);
          el.setAttribute("aria-label", spelled);
        });
      })
      .catch(function () {
        els.forEach(function (el) {
          el.textContent = "Stats unavailable";
        });
      });
  }

  function setUpContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var status = form.querySelector(".form-status");
    var submitBtn = form.querySelector('button[type="submit"]');

    // Formspree endpoint kept out of the HTML (see contact form comment) so
    // scraper bots can't harvest it. Base64 of the form id → "mnjnwonl".
    var ENDPOINT = "https://formspree.io/f/" + atob("bW5qbndvbmw=");

    // Time-trap: bots submit near-instantly. Require a few seconds of dwell
    // between page load and send — trivial for a human filling four fields.
    var loadedAt = Date.now();
    var MIN_FILL_MS = 3000;

    function setStatus(msg) {
      if (status) status.textContent = msg || "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot #2: hidden "url" field. Real users never see it; bots that
      // fill every field trip it. Feign success so the bot doesn't learn.
      var trap = form.querySelector('[name="url"]');
      if (trap && trap.value) {
        setStatus("Sent! I’ll reply soon.");
        form.reset();
        return;
      }

      // Time-trap: drop implausibly fast submissions.
      if (Date.now() - loadedAt < MIN_FILL_MS) {
        setStatus("Please take a moment, then send again.");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      setStatus("Sending…");

      fetch(ENDPOINT, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then(function (r) {
          if (!r.ok) throw new Error("send failed");
          setStatus("Sent! I’ll reply soon.");
          form.reset();
        })
        .catch(function () {
          setStatus("Send failed. Please try again.");
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
          window.setTimeout(function () {
            setStatus("");
          }, 6000);
        });
    });
  }

  // Project subpages carry a sticky .section-nav pill row. Highlight the pill
  // for whichever section is currently under the reading line, and keep that
  // pill scrolled into view inside the (horizontally scrolling) bar.
  //
  // Deliberately position-based rather than IntersectionObserver: sections here
  // vary wildly in height and several are shorter than the viewport, so "last
  // section whose top has passed the line" gives a stable answer where an
  // observer band would leave gaps.
  function setUpSectionNavSpy() {
    var nav = document.querySelector(".section-nav");
    if (!nav) return;

    var items = [];
    nav.querySelectorAll('a[href^="#"]').forEach(function (link) {
      var target = document.getElementById(link.getAttribute("href").slice(1));
      if (target) items.push({ link: link, target: target });
    });
    if (items.length < 2) return;

    var smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var current = null;
    var queued = false;

    function centerPill(link) {
      if (nav.scrollWidth <= nav.clientWidth) return;
      var left = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
      nav.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "auto" });
    }

    function refresh() {
      queued = false;

      // The reading line sits just under the sticky bar itself.
      var line = nav.getBoundingClientRect().bottom + 8;
      var active = items[0];
      items.forEach(function (item) {
        if (item.target.getBoundingClientRect().top <= line) active = item;
      });

      // The last section is often too short to ever reach the line, so claim it
      // once the page is scrolled to the bottom.
      var scroller = document.scrollingElement || document.documentElement;
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        active = items[items.length - 1];
      }

      if (active === current) return;
      if (current) {
        current.link.classList.remove("is-current");
        current.link.removeAttribute("aria-current");
      }
      active.link.classList.add("is-current");
      // "location" rather than "page": these anchors point within this page.
      active.link.setAttribute("aria-current", "location");
      current = active;
      centerPill(active.link);
    }

    function schedule() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(refresh);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    // html carries overflow-x: hidden, which in some engines makes the root
    // element its own scroll box instead of propagating to the viewport — in
    // that case window never sees the event. A capture-phase listener on
    // document catches it from whichever element actually scrolled. Both paths
    // funnel through the same rAF gate, so double delivery costs nothing.
    document.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule, { passive: true });
    refresh();
  }

  // On a project subpage, mark this project as visited so the matching icon on
  // the homepage stops twinkling on next visit. The subpage declares the slug
  // via <body data-mark-visited="...">; site.js handles the localStorage write
  // (replaces the per-subpage inline <script> blocks).
  function markSubpageVisited() {
    var key = document.body && document.body.dataset && document.body.dataset.markVisited;
    if (!key) return;
    try {
      localStorage.setItem("projectIconUsed:" + key, "1");
    } catch (e) {}
  }

  // Track which project icons the user has already opened so the twinkle
  // animation stops being noise. markSubpageVisited() (called below) writes
  // the same localStorage keys when a user lands on a subpage directly.
  function setUpProjectIconVisitedState() {
    function applyVisitedState(link) {
      var id = link.dataset.project || "unknown";
      var key = "projectIconUsed:" + id;
      var used = false;
      try {
        used = localStorage.getItem(key) === "1";
      } catch (e) {}
      link.classList.toggle("is-unvisited", !used);
      link.classList.toggle("is-visited", used);
    }

    document.querySelectorAll(".project-icon-link").forEach(function (link) {
      if (!link.dataset.project) return;
      applyVisitedState(link);
      link.addEventListener(
        "click",
        function () {
          var id = link.dataset.project || "unknown";
          try {
            localStorage.setItem("projectIconUsed:" + id, "1");
          } catch (e) {}
          applyVisitedState(link);
        },
        { passive: true },
      );
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setUpExternalLinks();

    function safeCall(fn) {
      try {
        if (typeof fn === "function") fn();
      } catch (e) {
        console.error(e);
      }
    }
    safeCall(setUpKaggleStats);
    safeCall(setUpContactForm);
    safeCall(setUpProjectIconVisitedState);
    safeCall(markSubpageVisited);
    safeCall(setUpSectionNavSpy);
  });
})();
