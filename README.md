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
| `style.css` | All styles (dark space theme with parallax star layers) |
| `site.js` | Small UX helpers (external-link handling, Formspree submit, Kaggle-stats render, project icon visited-state) |
| `assets/` | Extracted parallax SVGs (stars-far/mid/near, milky-way, noise) |
| `data/kaggle_stats.json` | Auto-updated dataset stats |
| `sitemap.xml`, `robots.txt` | SEO basics |
| `.github/workflows/` | Kaggle stats refresh job |

## Local development

The site is fully static; any static file server will do. From the repo root:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>.

## License

MIT — see [LICENSE](LICENSE). The code is freely reusable; the page content (project descriptions, resume, photos, etc.) belongs to Logan M Edwards.
