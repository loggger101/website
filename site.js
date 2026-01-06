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

    function setUpProjectBandLinks() {
    // Make the top media band of each enhanced project card act as a big link target.
    var cards = document.querySelectorAll(".project-card--enhanced");
    if (!cards.length) return;

    cards.forEach(function (card) {
      var link = card.querySelector(".project-icon-link[href]");
      var band = card.querySelector(".project-card__media");
      if (!link || !band) return;

      var href = link.getAttribute("href");
      if (!href) return;

      // Mark for CSS + accessibility
      band.setAttribute("data-page-href", href);
      band.setAttribute("role", "link");
      band.setAttribute("tabindex", "0");

      var label = link.getAttribute("aria-label") || "Open project page";
      band.setAttribute("aria-label", label);

      function navigate() {
        window.location.href = href;
      }

      band.addEventListener("click", function (e) {
        // If user clicks a real link inside the band (emblem, etc.), let the browser handle it.
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
    });
  }

document.addEventListener("DOMContentLoaded", function () {
    setUpExternalLinks();
    setUpCopyButtons();
    setUpProjectBandLinks();
});
})();
