/* site.js — small UX helpers (no link arrows)
   - External links open in a new tab (except opt-outs / downloads)
   - Copy-to-clipboard buttons via [data-copy]
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
    if (a.dataset && a.dataset.noNewtab === "true") return true;
    if (a.hasAttribute("download")) return true;

    var target = (a.getAttribute("target") || "").toLowerCase();
    if (target === "_self") return true;

    return false;
  }

  function ensureRel(a) {
    var rel = (a.getAttribute("rel") || "")
      .split(/\s+/)
      .filter(Boolean);

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

  async function copyText(text) {
    // Prefer modern clipboard on secure contexts
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function setUpCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      if (!(btn instanceof HTMLElement)) return;
      if (!btn.dataset.copyLabel) btn.dataset.copyLabel = btn.textContent || "Copy";

      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy") || "";
        var status = btn.parentElement ? btn.parentElement.querySelector(".copy-status") : null;

        function setStatus(msg) {
          if (status) status.textContent = msg;
        }

        copyText(text)
          .then(function () {
            btn.textContent = "Copied";
            setStatus("Copied!");
            window.setTimeout(function () {
              btn.textContent = btn.dataset.copyLabel || "Copy";
              setStatus("");
            }, 1500);
          })
          .catch(function () {
            setStatus("Copy failed");
            window.setTimeout(function () {
              setStatus("");
            }, 2000);
          });
      });
    });
  }

  function formatCompactNumber(n) {
    if (typeof n !== "number" || !isFinite(n)) return null;
    try {
      return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
    } catch (e) {
      if (n >= 1e6) return (Math.round((n / 1e6) * 10) / 10) + "M";
      if (n >= 1e3) return (Math.round((n / 1e3) * 10) / 10) + "k";
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
        var datasets = (payload && payload.datasets) ? payload.datasets : {};
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
          el.setAttribute(
            "title",
            "Kaggle: " + (isFinite(views) ? views : 0) + " views, " + (isFinite(downloads) ? downloads : 0) + " downloads"
          );
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

    function setStatus(msg) {
      if (status) status.textContent = msg || "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var action = form.getAttribute("action") || "";
      if (!action) {
        setStatus("Form not configured (missing action URL).");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      setStatus("Sending…");

      fetch(action, {
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
          window.setTimeout(function () { setStatus(""); }, 6000);
        });
    });
  }

  function wireBand(card, bandSelector) {
    var link = card.querySelector(".project-icon-link[href]");
    var band = card.querySelector(bandSelector);
    if (!link || !band) return;

    var href = link.getAttribute("href");
    if (!href) return;

    // Avoid double-wiring if this function is invoked twice
    if (band.dataset.pageHref) return;

    band.setAttribute("data-page-href", href);
    band.setAttribute("role", "link");
    band.setAttribute("tabindex", "0");

    var label = link.getAttribute("aria-label") || "Open project page";
    band.setAttribute("aria-label", label);

    function navigate() { window.location.href = href; }

    band.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("a")) return;
      navigate();
    });

    band.addEventListener("keydown", function (e) {
      var key = e.key || e.code;
      if (key === "Enter" || key === " " || key === "Spacebar") {
        e.preventDefault();
        navigate();
      }
    });
  }

  function setUpProjectBandLinks() {
    document.querySelectorAll(".project-card--enhanced").forEach(function (card) {
      wireBand(card, ".project-card__media");
    });
    document.querySelectorAll(".mini-project-card").forEach(function (card) {
      wireBand(card, ".mini-project-card__media");
    });
  }


  document.addEventListener("DOMContentLoaded", function () {
    setUpExternalLinks();
    setUpCopyButtons();

    function safeCall(fn) {
      try { if (typeof fn === "function") fn(); }
      catch (e) { console.error(e); }
    }
    safeCall(setUpKaggleStats);
    safeCall(setUpContactForm);
    safeCall(setUpProjectBandLinks);
});
})();
