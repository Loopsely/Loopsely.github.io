# loopsely.github.io

Personal site for the [Loopsely](https://www.youtube.com/@Loopsely) YouTube channel.
Plain HTML, CSS and JavaScript &mdash; no framework, no build step. GitHub Pages serves the
repo root as-is.

---

## Setup

### 1. Fill in the copy

Everything editable lives in **`assets/js/config.js`**. Anything marked `TODO` is a
placeholder. The site renders fine with them in place, but replace them before going live:

| Field | What it is |
|---|---|
| `tagline` | One line under the wordmark |
| `blurb` | 2&ndash;3 sentence intro on the home page |
| `story` | Array of paragraphs for `about.html` |
| `games` | Tags in the "What gets played" panel (pre-filled from his real uploads) |
| `links.discord` | A Discord **server invite** (`discord.gg/xxxx`) &mdash; not the username |
| `businessEmail` | Address for the business enquiries block |

`links.discord` and `businessEmail` are `null` by default. While they are null, the
Discord buttons and the entire business section **hide themselves automatically** &mdash;
nothing broken is ever shown.

### 2. Add the images

Drop these into `assets/img/`. The base name matters; any of .png/.jpg/.jpeg/.webp works:

| File | Size | Used for |
|---|---|---|
| `logo.png` | 512&times;512 transparent PNG | Nav mark, footer, favicon |
| `banner.jpg` | 2560&times;1440 | Dimmed hero backdrop |
| `og.jpg` | 1200&times;630 (optional) | Social share preview |

Each is probed before use. If a file is missing the site falls back to a solid purple
mark and a plain dark hero &mdash; no broken image icons.

### 3. The video feed

The site reads `data/videos.json`: every upload, Short and stream, each tagged
`video` / `short` / `live`. A GitHub Action refreshes it daily at 06:00 UTC and commits
only when something changed. **No setup is required.**

`scripts/fetch-videos.mjs` picks its source automatically:

| `YOUTUBE_API_KEY` secret | Source |
|---|---|
| not set | Public channel pages (`scripts/scrape-videos.mjs`). Works today, no key, but unofficial &mdash; YouTube can change its page structure and break it |
| set | YouTube Data API v3. Official and stable. The API has no Shorts flag, so anything &le;3 min that isn't a stream counts as a Short |

Adding a key is optional insurance: [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
&rarr; create an API key &rarr; repo **Settings &rarr; Secrets and variables &rarr; Actions** &rarr; `YOUTUBE_API_KEY`.

Safety rails: a fetch that returns nothing, or less than half of what's already in the file,
is treated as a failure and **never overwrites** existing data.

Run it locally:

```bash
node scripts/fetch-videos.mjs                        # no key
YOUTUBE_API_KEY=your_key node scripts/fetch-videos.mjs      API or scrape -> data/videos.json
scripts/scrape-videos.mjs     No-key fallback
```

### 4. Turn on Pages

**Settings &rarr; Pages &rarr; Source: Deploy from a branch &rarr; `main` / `(root)`.**

Live at `https://loopsely.github.io`.

---

## Local preview

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. A server is required &mdash; opening `index.html` as a
`file://` URL blocks the `fetch()` for `videos.json`.

---

## Moving to a custom domain

All paths are relative, so it is a two-step change:

1. Add a `CNAME` file at the repo root containing just the domain (e.g. `loopsely.com`).
2. Point DNS at GitHub &mdash; four `A` records for the apex
   (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`), or a `CNAME` to
   `loopsely.github.io` for a `www` subdomain.

Then update the `og:image` / canonical URLs in the three HTML files if you want absolute
social previews.

---

## Structure

```
index.html              Hero link hub, ticker, Videos / Streams / Shorts shelves, about, community, business
videos.html             Full archive: type tabs (#videos / #streams / #shorts) + title search
about.html              Long-form story, game tags, socials, business
assets/css/style.css    Structure + design tokens at the top under :root
assets/css/motion.css   Motion layer - safe to delete
assets/js/config.js     >>> ALL EDITABLE COPY LIVES HERE <<<
assets/js/main.js       Config injection, video rendering, nav
assets/js/motion.js     Motion layer - safe to delete
assets/img/             logo, banner, og (any common extension)
data/videos.json        Generated - do not edit by hand
scripts/fetch-videos.mjs
.github/workflows/update-videos.yml
```

## Motion

`motion.css` + `motion.js` are a self-contained layer. Remove both `<link>`/`<script>`
tags and the site still works &mdash; just static. Nothing in them is load-bearing.

| Effect | How |
|---|---|
| Page transitions | `@view-transition` &mdash; native, no JS. Nav and footer are named so they hold still while the body swaps |
| Two-way scroll | Blocks rise in from below going down, drift out the top as they leave, and reverse exactly going back up. Two `view()` animations (entry + exit). Fallback: an IntersectionObserver that knows which edge an element left from |
| Hero parallax-out | Content drifts slower than the page, shrinks, blurs and fades as the hero scrolls away; reassembles on the way back |
| Nav hide / show | Slides away scrolling down, returns the moment you scroll up. Stays put when the mobile menu is open or the keyboard is in it |
| Scroll progress rail | `animation-timeline: scroll()`; rAF fallback |
| Nav condense | Scroll-driven, `animation-range: 0 180px` |
| Wordmark | Split per letter, staggered rise + unblur |
| Magnetic buttons | Pointer pull capped at 7px |
| Card tilt + specular | 6&deg; max, delegated so async-rendered cards get it |
| Hero glow | Lerped pointer follow, rAF that stops itself when settled |
| Boot intro | Terminal "PRESS START" screen, once per browser session, ~1.3s, click or any key skips. Hero letters play as the curtain lifts. `intro: false` in config turns it off |
| Text scramble | Section labels decode every time they scroll in; nav links decode on hover. Screen readers get the real text |
| Orbiting border | `@property` angle + conic gradient on panels and thumbnails, hover only |
| Panel spotlight | Glow tracks the pointer inside panels; registered custom properties so it trails smoothly |
| Grid spotlight | Background grid lights up purple around the cursor |
| Cursor ring | Trails the pointer, swells over anything clickable. Native cursor is kept |
| Nav pill | Slides between links on hover / focus, rests on the current page |
| Pixel burst | Arcade particles on button clicks, touch included |
| Wordmark glitch | RGB split + slice jitter on hover, plus a rare idle twitch while the hero is on screen |
| Back to top | Appears past 600px; its ring fills with scroll progress via `scroll()` timeline |
| Ticker | Follows scroll direction: runs left going down, flips right going up. Fast scrolling boosts speed and leans the letters, then it settles. Loop only runs while on screen |

Guard rails, deliberately:

- Only `transform`, `opacity` and `filter` animate &mdash; no layout thrash.
- Pointer effects are gated behind `(hover:hover) and (pointer:fine)`, so touch devices
  never pay for them.
- Content is hidden for animation **only** under `html.js`. With JavaScript off,
  everything is visible immediately.
- `prefers-reduced-motion: reduce` kills the entire layer, including the scroll-driven
  timelines and view transitions.
- The scanline overlay is static. An animated `mix-blend-mode` layer at viewport size
  re-composites the whole page every frame, which is a real battery cost for an effect
  nobody consciously notices.

## Design notes

Base `#0a0a0b`, brand `#9744d0`.

The brand purple measures **4.05:1** against the black background &mdash; enough for WCAG AA
at large sizes, not enough for body text. So it runs as a two-step ramp:

| Token | Value | Contrast | Use |
|---|---|---|---|
| `--accent` | `#9744d0` | 4.05:1 | Button fills, borders, glow, display type 24px+ |
| `--accent-lt` | `#b47ae0` | 6.8:1 | Links, small labels, any text under 24px |

White on a `#9744d0` fill is 5.18:1, so filled buttons pass. Keep small text on
`--accent-lt` and contrast stays compliant throughout.

Type is Space Grotesk 700 for display and JetBrains Mono for nav, labels and metadata.
`prefers-reduced-motion` is honoured &mdash; all animation and smooth scrolling drop out.
