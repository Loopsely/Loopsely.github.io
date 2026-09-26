#!/usr/bin/env python3
"""
Judge whether a set of character frames actually belong to the same character.

    python scripts/preview-frames.py a.png b.png c.png
    python scripts/preview-frames.py assets/img/char/frame-*.webp

Produces, next to the first input:
  _preview-sheet.png  - all frames side by side at matched height
  _preview-flip.gif   - the frames looping, which is where drift becomes obvious

and prints measurements: size, palette distance, and how much the head region
moves between frames. Identity drift shows up as a large palette distance or a
head that jumps around.

Needs Pillow and numpy.
"""

import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("frames", nargs="+", help="image files, or a glob")
    p.add_argument("--height", type=int, default=520, help="height to compare at")
    p.add_argument("--ms", type=int, default=450, help="GIF frame duration")
    p.add_argument("--key", action="store_true",
                   help="frames still have a flat background; key it out before comparing")
    return p.parse_args()


def expand(patterns):
    out = []
    for pat in patterns:
        hits = sorted(glob.glob(pat))
        out.extend(hits if hits else [pat])
    return [f for f in out if os.path.exists(f)]


def key_flat_bg(im, tolerance=100.0):
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    k = max(2, min(h, w) // 100)
    bg = np.median(np.concatenate([
        a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3),
        a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3)]), axis=0)
    dist = np.sqrt(((a - bg[None, None, :]) ** 2).sum(axis=2))
    alpha = np.clip((dist - tolerance) / max(1.0, tolerance * 0.45), 0, 1)
    return Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8), "RGBA")


def trim(im):
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 8)
    if len(xs) == 0:
        return im
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def palette(im, bins=4):
    """Coarse colour histogram of the opaque pixels."""
    a = np.asarray(im.convert("RGBA"))
    op = a[..., 3] > 128
    if op.sum() == 0:
        return np.zeros(bins ** 3)
    rgb = a[..., :3][op] // (256 // bins)
    idx = rgb[:, 0] * bins * bins + rgb[:, 1] * bins + rgb[:, 2]
    h = np.bincount(idx, minlength=bins ** 3).astype(np.float64)
    return h / h.sum()


def head_centre(im):
    """Horizontal centre of the topmost 15% of the figure - the head."""
    a = np.asarray(im.convert("RGBA"))[..., 3] > 128
    ys, xs = np.nonzero(a)
    if len(ys) == 0:
        return 0.5
    top = ys.min()
    band = ys <= top + max(1, int(0.15 * (ys.max() - top)))
    return float(xs[band].mean() / im.width)


def main():
    args = parse_args()
    files = expand(args.frames)
    if len(files) < 2:
        sys.exit("Give me at least two frames to compare.")

    print(f"Comparing {len(files)} frames\n")
    ims, rows = [], []
    for f in files:
        im = Image.open(f)
        raw = f"{im.width}x{im.height}"
        im = im.convert("RGBA")
        if args.key or im.getchannel("A").getextrema()[0] == 255:
            im = key_flat_bg(im)
        im = trim(im)
        scale = args.height / im.height
        im = im.resize((max(1, round(im.width * scale)), args.height), Image.LANCZOS)
        ims.append(im)
        rows.append((os.path.basename(f), raw, im.width))

    pals = [palette(im) for im in ims]
    heads = [head_centre(im) for im in ims]
    base = pals[0]

    print(f"{'frame':<28}{'source':>12}{'width':>8}{'palette drift':>15}{'head x':>9}")
    for (name, raw, w), p, hc in zip(rows, pals, heads):
        drift = 0.5 * np.abs(p - base).sum()      # 0 = identical, 1 = nothing shared
        print(f"{name:<28}{raw:>12}{w:>8}{drift:>14.1%}{hc:>9.2f}")

    drifts = [0.5 * np.abs(p - base).sum() for p in pals[1:]]
    widths = [w for _, _, w in rows]
    print()
    print(f"  worst palette drift : {max(drifts):.1%}")
    print(f"  width spread        : {min(widths)}-{max(widths)} px at matched height")
    print(f"  head x spread       : {max(heads) - min(heads):.2f} of frame width")
    print()
    # Identity lives in the COLOURS. Width and head position move for honest
    # reasons - a raised sword is a wider silhouette, a turned body is a
    # narrower one - so they are reported as context, never as a verdict.
    worst = max(drifts)
    if worst < 0.12:
        print("  Same character. Colours hold across the frames - separate")
        print("  generations are working.")
    elif worst < 0.25:
        print("  Borderline. Some colour drift between frames; check the GIF for")
        print("  a face or outfit that changes as it loops.")
    else:
        print(f"  Not one character: {worst:.0%} colour drift. The hoodie, hair or")
        print("  lighting changed between generations. Use a single sprite sheet.")
    print("  Then look at the GIF, which is the real test.\n")

    out_dir = os.path.dirname(os.path.abspath(files[0]))
    pad = 24
    sheet = Image.new("RGBA", (sum(i.width for i in ims) + pad * (len(ims) + 1), args.height + pad * 2), (14, 14, 16, 255))
    x = pad
    for im in ims:
        sheet.alpha_composite(im, (x, pad))
        x += im.width + pad
    sheet_path = os.path.join(out_dir, "_preview-sheet.png")
    sheet.convert("RGB").save(sheet_path)

    w = max(i.width for i in ims)
    gif = []
    for im in ims:
        canvas = Image.new("RGBA", (w, args.height), (14, 14, 16, 255))
        canvas.alpha_composite(im, ((w - im.width) // 2, 0))
        gif.append(canvas.convert("P", palette=Image.ADAPTIVE))
    gif_path = os.path.join(out_dir, "_preview-flip.gif")
    gif[0].save(gif_path, save_all=True, append_images=gif[1:], duration=args.ms, loop=0)

    print(f"  {sheet_path}")
    print(f"  {gif_path}")


if __name__ == "__main__":
    main()
