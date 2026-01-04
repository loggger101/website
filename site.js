// site.js — tiny UX enhancements (open external links in new tab + copy-to-clipboard)
(() => {
  function isExternalLink(a) {
    try {
      const url = new URL(a.href, window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return false;
      return url.hostname !== window.location.hostname;
    } catch {
      return false;
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      document.body.removeChild(ta);
      return false;
    }
  }

  function markExternalLinks() {
    const links = document.querySelectorAll("a[href]");
    links.forEach((a) => {
      if (!isExternalLink(a)) return;

      // Allow opt-out (e.g., direct-download buttons)
      if (a.hasAttribute("download")) return;
      if (a.dataset && a.dataset.noNewtab === "true") return;
      if (a.classList.contains("no-newtab")) return;

      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");

      if (!a.getAttribute("title")) a.setAttribute("title", "Opens in a new tab");
    });
  }

  function wireCopyButtons() {
    const buttons = document.querySelectorAll("[data-copy]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = btn.getAttribute("data-copy") || "";
        const status = btn.parentElement?.querySelector(".copy-status");
        try {
          const ok = await copyText(text);
          if (status) {
            status.textContent = ok ? "Copied!" : "Copy failed";
            setTimeout(() => (status.textContent = ""), 1200);
          }
        } catch {
          if (status) {
            status.textContent = "Copy failed";
            setTimeout(() => (status.textContent = ""), 1200);
          }
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    markExternalLinks();
    wireCopyButtons();
  });
})();
