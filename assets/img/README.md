# Images

Any of these extensions work — the site probes `.png`, `.jpg`, `.jpeg`, `.webp`
in that order and uses whichever exists. Just keep the **base name** right.

| Base name | Ideal | Currently | Used for |
|---|---|---|---|
| `logo`   | 512x512 transparent PNG | `logo.jpg` 600x600   | Nav mark, footer, favicon |
| `banner` | 2560x1440               | `banner.png` 1280x211 | Dimmed hero backdrop |
| `og`     | 1200x630                | not added             | Social share preview card |

## Notes on the current files

- **`logo.jpg` is a JPEG**, so it has no transparency. It renders as a rounded
  square tile. Swap in a transparent `logo.png` if you want the mark to float
  against the dark background instead.
- **`banner.png` is 1280x211** — that's the cropped YouTube "safe area", not the
  full banner. It's blurred and scaled in the hero so the upscaling reads as an
  intentional atmospheric wash. Dropping in the full 2560x1440 export would let
  the hero show actual detail.
