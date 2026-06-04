# loganmedwardsastrophy.com

Personal portfolio site for Logan M Edwards — astronomy & astrophysics undergraduate at Florida Tech. Showcases coursework, deep-learning research projects, mini-projects, and contact info.

**Live:** <https://www.loganmedwardsastrophy.com/>

## Stack

- Static HTML + CSS + vanilla JS — no framework, no build step
- Hosted on GitHub Pages via the `CNAME` file
- Contact form: [Formspree](https://formspree.io/)
- Visitor analytics: [GoatCounter](https://www.goatcounter.com/) (privacy-respecting, no cookies)
- Kaggle dataset stats: pulled every 6 hours by `.github/workflows/kaggle-stats.yml` and written to `data/kaggle_stats.json`, which the homepage reads via `fetch()`

## Layout

| Path | Purpose |
|---|---|
| `index.html` | Homepage (about, coursework, projects, resume, contact) |
| `drone-target.html`, `star-catalog.html` | Main project detail pages |
| `ortega-exposure.html`, `blackjack-game.html`, `portfolio-website.html` | Mini-project detail pages |
| `blackjack.py` | Canonical Python source for the blackjack mini-project; downloadable from the page and inlined for SEO in `blackjack-game.html` (keep them in sync) |
| `blackjack.js` | Vanilla-JS port of `blackjack.py` that powers the in-browser game on `blackjack-game.html` |
| `ortega-exposure.py` | Canonical Python source for the Ortega exposure-time calculator; downloadable and inlined for SEO in `ortega-exposure.html` (keep in sync) |
| `ortega-exposure.js` | Vanilla-JS port of `ortega-exposure.py` that powers the in-browser calculator on `ortega-exposure.html` |
| `Logan_Edwards_Resume_ATS.pdf` | Public résumé served directly from the homepage's Resume section (replaces the prior Google Drive link) |
| `style.css` | All styles (dark space theme with parallax star layers) |
| `site.js` | Small UX helpers (external-link handling, Formspree submit, Kaggle-stats render, project icon visited-state) |
| `assets/` | Parallax SVGs (stars-far/mid/near, milky-way, noise) and per-project media under `assets/projects/{drone,star}/` (confusion matrices, training curves, demo videos) |
| `data/kaggle_stats.json` | Auto-updated dataset stats |
| `sitemap.xml`, `robots.txt` | SEO basics |
| `404.html` | Themed fallback page served by GitHub Pages for unknown URLs |
| `scripts/generate-og-card.ps1` | Regenerates `og.jpg` (the 1200×630 social-share card referenced by every page's `og:image` / `twitter:image` meta tags). Outputs JPEG at quality 88 — ~50 KB vs the prior PNG's ~170 KB |
| `.github/workflows/` | Kaggle stats refresh job and sitemap-lastmod auto-update |

## Conventions

A few non-obvious patterns scattered across the codebase, documented here so they survive future edits:

### Per-card accent colors

Project and mini-project cards each carry one accent class. The class sets `--accent-rgb`, which `style.css` then consumes via `rgba(var(--accent-rgb), ...)` for icon glows, hover halos, and media-band gradients. Available classes:

| Class | Used by | Color |
|---|---|---|
| `.project-card--teal` / `.project-page--teal` | Drone target identification | `79,209,197` |
| `.project-card--blue` / `.project-page--blue` | Star cataloguing | `99,179,237` |
| `.mini-project-card--amber` | Ortega exposure | `246,173,85` |
| `.mini-project-card--red` | Blackjack | `252,129,129` |
| `.mini-project-card--purple` | Portfolio website | `183,148,244` |

`project-card--*` is for the homepage card; `project-page--*` is for the detail page's `<body>` and propagates the same accent through the in-page nav and TL;DR card. When adding a new project, define a new modifier class (or reuse one) and apply both variants.

### Visited-icon localStorage hook

Each project icon on the homepage twinkles until the user has visited that project's page. Two mechanisms write the "visited" flag:

1. **Click on the homepage** — `site.js` `setUpProjectIconVisitedState()` writes `projectIconUsed:<slug>=1` when a project icon link is clicked.
2. **Direct subpage visit** — each subpage declares `<body data-mark-visited="<slug>">`; `site.js` `markSubpageVisited()` reads that attribute on load and writes the same key.

When adding a new project page, set `data-mark-visited="<slug>"` on `<body>` and `data-project="<slug>"` on the homepage icon link — same slug. The icon will pick up `.is-visited` styling automatically on the next homepage visit.

## Local development

The site is fully static; any static file server will do. From the repo root:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>.

## License

MIT — see [LICENSE](LICENSE). The code is freely reusable; the page content (project descriptions, resume, photos, etc.) belongs to Logan M Edwards.
