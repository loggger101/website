# loganmedwardsastrophy.com

Personal portfolio site for Logan M Edwards, astronomy & astrophysics undergraduate at Florida Tech. Showcases coursework, deep-learning research projects, mini-projects, and contact info.

**Live:** <https://www.loganmedwardsastrophy.com/>

## Stack

- Static HTML + CSS + vanilla JS: no framework, no build step
- Hosted on GitHub Pages via the `CNAME` file
- Contact form: [Formspree](https://formspree.io/)
- Visitor analytics: [GoatCounter](https://www.goatcounter.com/) (privacy-respecting, no cookies)
- Kaggle dataset stats: pulled every 6 hours by `.github/workflows/kaggle-stats.yml` and written to `data/kaggle_stats.json`, which the homepage reads via `fetch()`

## Layout

| Path | Purpose |
|---|---|
| `index.html` | Homepage (about, coursework, projects, resume, contact) |
| `drone-target.html`, `star-catalog.html`, `aspire-cures.html` | Main project detail pages |
| `ortega-exposure.html`, `blackjack-game.html`, `portfolio-website.html` | Mini-project detail pages |
| `blackjack.py` | Canonical Python source for the blackjack mini-project; downloadable from the page and inlined for SEO in `blackjack-game.html` (keep them in sync) |
| `blackjack.js` | Vanilla-JS port of `blackjack.py` that powers the in-browser game on `blackjack-game.html` |
| `ortega-exposure.py` | Canonical Python source for the Ortega exposure-time calculator; downloadable and inlined for SEO in `ortega-exposure.html` (keep in sync) |
| `ortega-exposure.js` | Vanilla-JS port of `ortega-exposure.py` that powers the in-browser calculator on `ortega-exposure.html` |
| `Logan_Edwards_Resume_ATS.pdf` | Public résumé served directly from the homepage's Resume & CV section (replaces the prior Google Drive link) |
| `Logan_Edwards_CV.pdf` | Public CV, served from the same section. Deliberately undated in the filename so the URL stays stable across updates: replace the file in place and the displayed date follows from git |
| `style.css` | Thin entry point: `@import`s the seven modules under `css/` |
| `css/_base.css` | Reset, `:root` CSS vars + per-card accent palette, honeypot, html/body base backdrop |
| `css/_motion.css` | The four fixed sky layers (galaxy, far stars, mid + near stars, dither overlay), their z-order, their drift keyframes, and the scroll-linked parallax layered on top of the drift. The z-index range 4-7 is load-bearing: `body` has an opaque `background-color` and is a positioned sibling, so a layer below 4 paints behind it and is never seen, while content sits at 10. The drift animates `transform` and the scroll parallax animates `translate`, deliberately: two animations on the same property do not blend, the later one just wins |
| `css/_layout.css` | Container, site header, footer, sections, buttons |
| `css/_nav.css` | Skip link, sticky primary nav, About skills chip row |
| `css/_homepage-cards.css` | Project icon link + twinkle, flagship and mini cards, homepage expansions, Kaggle stats + contact form |
| `css/_minis.css` | Blackjack and Ortega in-page playable widgets |
| `css/_project-pages.css` | Metric grid, results table, sticky section nav, TL;DR, next-project card, figures |
| `site.js` | Small UX helpers (external-link handling, Formspree submit, Kaggle-stats render, project icon visited-state, section-nav scroll-spy, keyboard access for overflowing scroll boxes) |
| `assets/` | Parallax SVGs (stars-far/mid/near, galaxy, noise) and per-project media under `assets/projects/{drone,star}/` (confusion matrices, training curves, demo videos + the poster frame the drone demo shows before playback). The inline drone demo ships as both WebM/VP9 and MP4; the `<source>` order hands most browsers the smaller WebM and leaves MP4 as the fallback |
| `data/kaggle_stats.json` | Auto-updated dataset stats |
| `sitemap.xml`, `robots.txt` | SEO basics |
| `404.html` | Themed fallback page served by GitHub Pages for unknown URLs |
| `.nojekyll` | Empty marker that disables Jekyll on GitHub Pages. **Required**: without it Jekyll strips every underscore-prefixed file from the build, which would 404 all of `css/_*.css` and leave the site unstyled. Do not delete |
| `scripts/generate-starfield.mjs` | Regenerates `assets/stars-{far,mid,near}.svg`. Run with `node scripts/generate-starfield.mjs`. Seeded, so a re-run reproduces the committed files byte for byte; change `SEED` or a layer's knobs to reroll the sky. Stars near a tile edge are redrawn on the opposite side so the repeat stays seamless |
| `scripts/generate-og-card.ps1` | Regenerates the 1200×630 social-share cards (`og.jpg`, `og-drone.jpg`, `og-star.jpg`, `og-aspire.jpg`). Takes `-Variant default\|drone\|star\|aspire\|all`. Outputs JPEG at quality 88 (~50 KB each). The homepage and mini-project pages use `og.jpg`; the flagship project pages use their per-project variant |
| `.prettierrc.json`, `.prettierignore` | Prettier config: 2-space indent, 100-col (120 for HTML); ignores the auto-generated `data/kaggle_stats.json` and binary assets |
| `.github/workflows/` | Kaggle stats refresh, sitemap-lastmod & resume/CV-date auto-update, JS port tests + inlined-source sync check, and Prettier auto-formatting |

## Conventions

A few non-obvious patterns scattered across the codebase, documented here so they survive future edits:

### Per-card accent colors

Project and mini-project cards each carry one accent class. The class sets `--accent-rgb`, which `style.css` then consumes via `rgba(var(--accent-rgb), ...)` for icon glows, hover halos, and media-band gradients. Available classes:

| Class | Used by | Color |
|---|---|---|
| `.project-card--teal` / `.project-page--teal` | Drone target identification | `34,211,238` |
| `.project-card--blue` / `.project-page--blue` | Star cataloguing | `99,179,237` |
| `.project-card--green` / `.project-page--green` | AspireCURES website | `30,158,150` |
| `.mini-project-card--amber` / `.project-page--amber` | Ortega exposure | `246,173,85` |
| `.mini-project-card--red` / `.project-page--red` | Blackjack | `252,129,129` |
| `.mini-project-card--purple` / `.project-page--purple` | Portfolio website | `183,148,244` |

`project-card--*` / `mini-project-card--*` is for the homepage card; `project-page--*` is for the detail page's `<body>` and propagates the same accent through the in-page nav and TL;DR card. The two families live in different files: the card modifiers in `css/_base.css`, the page modifiers in `css/_project-pages.css`. When adding a new project, define a new modifier class (or reuse one) and apply both variants.

Every detail page's `<body>` also carries the plain `project-page` class alongside its color modifier. That one is not about color: it flags "this page has a sticky in-page `.section-nav`", which is what the taller anchor `scroll-margin-top` in `css/_project-pages.css` keys off. Omit it and anchor jumps will tuck headings under the sticky bar.

### Type scale

`css/_base.css` defines eight font-size tokens on `:root`, and every rem-valued `font-size` in the other modules resolves to one of them. There are no loose rem font sizes left, so a typography change is a one-line edit rather than a hunt across seven files.

| Token | Size | Typical use |
|---|---|---|
| `--fs-2xs` | `0.78rem` | Uppercase eyebrow labels: `.tag`, `.tl-dr__label`, `.overlay-label` |
| `--fs-xs` | `0.84rem` | Fine print: metric labels/hints, footer, `.section-nav` pills, form labels |
| `--fs-sm` | `0.92rem` | The workhorse. Most body and UI text, tables, chips, small buttons |
| `--fs-md` | `1rem` | Buttons, section intros, card headings, tagline |
| `--fs-lg` | `1.1rem` | Sub-headings, `.contact-formTitle`, `.next-project__title` |
| `--fs-xl` | `1.4rem` | `.section h2`, compact metric values |
| `--fs-2xl` | `1.6rem` | `.metric__value`, the project icon glyph |
| `--fs-3xl` | `2rem` | `.etc-result__value` |

The steps are tight at the bottom (about 1.09x apart) because nearly all UI text lives between `0.78rem` and `1rem` and needs fine gradations there; the display end is sparse because only a couple of things use it.

Four declarations deliberately stay outside the scale, and should be left that way. `.site-title` keeps a fluid `clamp()`. Three are in `em` because they size against whatever they sit inside rather than against the page: `.site-nav__brand::before`, `.source-viewer > summary::before`, and inline `.section code`. Converting those to tokens would decouple them from the text they belong to.

### Sticky nav offsets

`--site-nav-h` (in `css/_base.css`) is the height of the sticky primary nav, and `.site-nav` sets `height` from it rather than deriving height from padding. The project pages' `.section-nav` pins at `top: var(--site-nav-h)` so the two bars stack flush. If the primary nav ever grows a row, change the variable, not the padding.

### Section-nav pinned state

`.section-nav` styles the **pinned** look by default (frosted tray, same tint and blur as `.site-nav` so the pair reads as one bar). `setUpSectionNavSpy()` in `site.js` adds `.is-unpinned` whenever the bar is still travelling with the page, which strips the tray back to a bare chip row, and adds `.has-spy` one frame after the first state settles so the cross-fade never runs on page load. That default direction is deliberate: with JS off the tray stays on, and body copy never scrolls visibly behind the pills.

### Keyboard access for scrolling boxes

A box that scrolls only answers to a pointer unless something focuses it, which leaves keyboard users unable to reach the off-screen part (WCAG 2.1.1 Keyboard). Two kinds of box here scroll, and they are handled differently on purpose:

- The inlined `.py` source viewers overflow by thousands of pixels at every viewport, so their `<pre>` carries a static `tabindex="0"` / `role="region"` / `aria-label` in the markup. Being static, it still works with JS off.
- The results tables are `width: 100%` and only spill below roughly 280px, so a static tab stop would be an empty one almost everywhere. `setUpScrollableRegions()` in `site.js` grants `tabindex`, `role`, and `aria-label` only while a `.results-tableWrap` actually overflows, and withdraws them when it stops, re-checking on resize.

The name is authored in the HTML beside its table either way, but the tables hold it as `data-region-label` rather than `aria-label`: on a bare `<div>` (implicit `role=generic`) browsers drop `aria-label`, the same trap noted for the Kaggle glyphs in `site.js`. So the label is only promoted to a real `aria-label` at the moment the box gains the role that can carry it, and all three attributes come and go together. Both boxes get a `:focus-visible` ring: a focusable element with no visible focus state is worse than one that was never focusable.

### Resume and CV dates

The homepage's `#resume` section offers two PDFs, and neither "Updated <Month Year>" line is written by hand. `.github/workflows/update-resume-date.yml` rewrites each one from the git mtime of the PDF it describes, so a date cannot drift from the file it claims to describe.

The pairing is by `data-doc`: `<p class="resume-updated" data-doc="cv">` is matched to `Logan_Edwards_CV.pdf` through the `DOCS` map in that workflow. Matching on the attribute rather than on the whole tag is what keeps the two lines from being rewritten to each other's date, and it survives any future attribute reordering.

To add a third document: drop the PDF in the root, add a `data-doc` line beside its buttons, then add one row to `DOCS` and one path to the workflow's `paths:` filter. The workflow fails loudly if a `data-doc` key has no matching tag, or if a key matches more than one, so a half-finished addition cannot ship silently.

Both filenames are intentionally undated. Replacing a PDF in place keeps every existing link working, and the displayed date updates itself from the commit.

### Visited-icon localStorage hook

Each project icon on the homepage twinkles until the user has visited that project's page. Two mechanisms write the "visited" flag:

1. **Click on the homepage**: `site.js` `setUpProjectIconVisitedState()` writes `projectIconUsed:<slug>=1` when a project icon link is clicked.
2. **Direct subpage visit**: each subpage declares `<body data-mark-visited="<slug>">`; `site.js` `markSubpageVisited()` reads that attribute on load and writes the same key.

When adding a new project page, set `data-mark-visited="<slug>"` on `<body>` and `data-project="<slug>"` on the homepage icon link: same slug. The icon will pick up `.is-visited` styling automatically on the next homepage visit.

## Local development

The site is fully static; any static file server will do. From the repo root:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Tests

`tests/` smoke-tests the vanilla-JS ports (`blackjack.js`, `ortega-exposure.js`) with Node's built-in runner — no npm install, no dev dependencies:

```sh
node --test tests/*.test.js
```

Pass the files rather than the `tests/` directory: a bare directory argument resolves as a module on Node 22+ and fails with `MODULE_NOT_FOUND`. The `JS port tests` workflow runs the same command, plus a check that the Python sources inlined into `blackjack-game.html` / `ortega-exposure.html` still match `blackjack.py` / `ortega-exposure.py`.

## Formatting

The repo is auto-formatted with [Prettier](https://prettier.io/). See `.prettierrc.json`. The `Format with Prettier` GitHub Action reformats every pull request (committing the result back to the branch) and self-heals `main` on push, so there's no manual step. To format locally before pushing:

```sh
npx prettier@3 --write "**/*.{html,css,js,json}"
```

## License

MIT. See [LICENSE](LICENSE). The code is freely reusable; the page content (project descriptions, resume, photos, etc.) belongs to Logan M Edwards.
