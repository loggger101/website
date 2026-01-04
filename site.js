// site.js — tiny UX enhancements (external-link indicator + copy-to-clipboard)
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
    // Prefer modern clipboard API when available
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for non-secure contexts
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "-1000px";
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

  function wireCopyButtons() {
    const buttons = document.querySelectorAll("[data-copy]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = btn.getAttribute("data-copy") || "";
        const status = btn.parentElement?.querySelector(".copy-status");

        btn.disabled = true;
        const oldLabel = btn.textContent;
        try {
          const ok = await copyText(text);
          if (status) status.textContent = ok ? "Copied!" : "Copy failed";
          btn.textContent = ok ? "Copied" : "Copy";
          setTimeout(() => {
            if (status) status.textContent = "";
            btn.textContent = oldLabel || "Copy email";
          }, 1200);
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  function markExternalLinks() {
    const links = document.querySelectorAll("a[href]");
    links.forEach((a) => {
      if (!isExternalLink(a)) return;

      a.classList.add("external-link");
      // Ensure new-tab behavior + security
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");

      // Helpful tooltip (keeps words; icon is supplemental)
      if (!a.getAttribute("title")) a.setAttribute("title", "Opens in a new tab");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    markExternalLinks();
    wireCopyButtons();
  });
})();
