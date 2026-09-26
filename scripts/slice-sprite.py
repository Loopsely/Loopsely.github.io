#!/usr/bin/env python3
"""
Turn an AI-generated sprite sheet into web-ready character frames.

    python scripts/slice-sprite.py sheet.png --cols 4 --rows 3

Slices the grid, keys out the flat background colour, trims every frame to one
shared bounding box (so the character does not jitter between frames), and
writes assets/img/char/frame-00.webp ...

Needs Pillow and numpy, both already present in this environment.
"""

import argparse
import os
import sys

import numpy as np
from PIL import Image, ImageFilter


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("sheet", nargs="+",
                   help="the sprite sheet image, or several separate pose images "
                        "(use --cols 1 --rows 1 for one-pose-per-file)")
    p.add_argument("--cols", type=int, required=True, help="grid columns")
    p.add_argument("--rows", type=int, required=True, help="grid rows")
    p.add_argument("--out", default="assets/img/char", help="output directory")
    p.add_argument("--height", type=int, default=900, help="output frame height in px (default 900)")
    p.add_argument("--tolerance", type=float, default=100.0,
                   help="background colour match distance, 0-441 (default 100)")
    p.add_argument("--margin", type=int, default=0,
                   help="pixels to shave off each cell edge, for sheets with gutters")
    p.add_argument("--no-key", action="store_true", help="input is already transparent; only slice and trim")
    p.add_argument("--format", default="webp", choices=["webp", "png"], help="output format")
    p.add_argument("--limit", type=int, default=0, help="only write the first N frames")
    p.add_argument("--sharpen", type=float, default=0.0,
                   help="unsharp amount after resizing, 0-2. Use ~0.8 for frames pulled "
                        "from a low-resolution video that get upscaled")
    p.add_argument("--no-align", action="store_true",
                   help="skip body alignment (see align_frames); use when every source "
                        "image already frames the character identically")
    p.add_argument("--start", type=int, default=0,
                   help="number the first frame from here, for combining several sheets "
                        "(e.g. --start 4 writes frame-04 onward)")
    return p.parse_args()


def background_colour(img):
    """Average the four corners - on a flat sheet they are all background."""
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    k = max(2, min(h, w) // 100)
    corners = np.concatenate([
        a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3),
        a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)


def key_out(cell, bg, tolerance):
    """Distance-based colour key with a soft edge, so it does not alias."""
    rgb = np.asarray(cell.convert("RGB"), dtype=np.float32)
    dist = np.sqrt(((rgb - bg[None, None, :]) ** 2).sum(axis=2))

    # fully transparent under the tolerance, fully opaque well past it,
    # smooth in between -> no hard jaggies along the silhouette
    soft = max(1.0, tolerance * 0.45)
    alpha = np.clip((dist - tolerance) / soft, 0.0, 1.0)

    out = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)

    # Any pixel that is part background bleeds the key colour into the edge.
    # Pull those pixels away from the background colour to kill the fringe.
    edge = (alpha > 0.0) & (alpha < 1.0)
    if edge.any():
        px = out[..., :3].astype(np.float32)
        a3 = alpha[..., None]
        px[edge] = np.clip((px[edge] - bg[None, :] * (1.0 - a3[edge])) / np.maximum(a3[edge], 0.15), 0, 255)
        out[..., :3] = px.astype(np.uint8)

    return Image.fromarray(out, "RGBA")


def body_metrics(im):
    """Feet line, shoulder line and horizontal centre of the standing body.

    The sword is thin and sticks out, so the top of the content box is a
    useless reference. The first row that is reasonably WIDE is the head and
    shoulders, and the widest lower rows are the legs. Both are stable no
    matter where the blade is pointing.
    """
    a = np.asarray(im)[..., 3] > 8
    rows = a.sum(axis=1)
    filled = np.nonzero(rows)[0]
    if len(filled) == 0:
        return None
    top, bottom = filled[0], filled[-1]
    wide = max(1, int(0.22 * rows.max()))
    shoulder_candidates = np.nonzero(rows >= wide)[0]
    shoulder = shoulder_candidates[0] if len(shoulder_candidates) else top

    # centre on the lower body - feet stay put even when the arms swing
    lower = a[int(bottom - 0.25 * (bottom - shoulder)):bottom + 1]
    cols = np.nonzero(lower.any(axis=0))[0]
    centre = float(cols.mean()) if len(cols) else im.width / 2.0
    return {"bottom": float(bottom), "shoulder": float(shoulder),
            "height": float(bottom - shoulder), "centre": centre}


def align_frames(frames, log):
    """Scale and position every frame so the BODY matches across them.

    Source images from different generations frame the character at
    different sizes. Without this the figure visibly grows and shrinks as
    the animation plays.
    """
    metrics = [body_metrics(f) for f in frames]
    good = [m for m in metrics if m and m["height"] > 10]
    if len(good) < 2:
        return frames

    target = float(np.median([m["height"] for m in good]))
    scales = [target / m["height"] if m and m["height"] > 10 else 1.0 for m in metrics]
    log(f"Body alignment: matching torso height {target:.0f}px "
        f"(scale {min(scales):.2f}-{max(scales):.2f} across frames)")

    # canvas big enough for the largest scaled frame, feet on a common line
    W = int(max(f.width * s for f, s in zip(frames, scales)) * 1.15)
    H = int(max(f.height * s for f, s in zip(frames, scales)) * 1.05)
    foot_y = int(H * 0.97)

    out = []
    for f, m, s in zip(frames, metrics, scales):
        scaled = f.resize((max(1, round(f.width * s)), max(1, round(f.height * s))), Image.LANCZOS)
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        if m:
            x = int(W / 2 - m["centre"] * s)
            y = int(foot_y - m["bottom"] * s)
        else:
            x, y = (W - scaled.width) // 2, H - scaled.height
        canvas.alpha_composite(scaled, (x, y))
        out.append(canvas)
    return out


def content_box(im):
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 8)
    if len(xs) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def main():
    args = parse_args()

    missing = [f for f in args.sheet if not os.path.exists(f)]
    if missing:
        sys.exit("No such file: " + ", ".join(missing))

    # pass 1: slice + key every input, and find one box that fits them all.
    # Separate pose images MUST share a crop box too, or the character
    # jumps around between frames.
    frames, union, cw, ch = [], None, None, None

    for path in args.sheet:
        sheet = Image.open(path).convert("RGBA")
        W, H = sheet.size
        cw, ch = W / args.cols, H / args.rows
        label = os.path.basename(path)
        if len(args.sheet) > 1 or args.cols * args.rows > 1:
            print(f"{label}: {W}x{H} -> {args.cols}x{args.rows}, cell {cw:.0f}x{ch:.0f}")

        bg = None
        if not args.no_key:
            bg = background_colour(sheet)
            if bg[1] < 100 or bg[1] < bg[0] or bg[1] < bg[2]:
                print(f"  {label}: background rgb({bg[0]:.0f},{bg[1]:.0f},{bg[2]:.0f}) does not look")
                print("      green. If the cutout is wrong, regenerate on flat #00FF00.")

        for r in range(args.rows):
            for c in range(args.cols):
                box = (round(c * cw) + args.margin, round(r * ch) + args.margin,
                       round((c + 1) * cw) - args.margin, round((r + 1) * ch) - args.margin)
                cell = sheet.crop(box)
                cell = cell if args.no_key else key_out(cell, bg, args.tolerance)
                frames.append(cell)

                b = content_box(cell)
                if b is None:
                    print(f"  frame {len(frames)-1:02d} ({label}): empty - check --cols/--rows or --tolerance")
                    continue
                union = b if union is None else (min(union[0], b[0]), min(union[1], b[1]),
                                                 max(union[2], b[2]), max(union[3], b[3]))

    if union is None:
        sys.exit("Every frame came out empty. Check --cols/--rows, or raise --tolerance.")

    # Match the body across frames before choosing the shared crop.
    if not args.no_align and len(frames) > 1:
        frames = align_frames(frames, print)
        union = None
        for f in frames:
            b = content_box(f)
            if b is None:
                continue
            union = b if union is None else (min(union[0], b[0]), min(union[1], b[1]),
                                             max(union[2], b[2]), max(union[3], b[3]))

    # a little breathing room, clamped to the cell
    pad = max(2, int(0.01 * (union[3] - union[1])))
    maxw = max(f.width for f in frames)
    maxh = max(f.height for f in frames)
    union = (max(0, union[0] - pad), max(0, union[1] - pad),
             min(maxw, union[2] + pad), min(maxh, union[3] + pad))
    print(f"Shared crop box: {union[2]-union[0]}x{union[3]-union[1]} (identical for every frame - no jitter)")

    os.makedirs(args.out, exist_ok=True)
    count = len(frames) if not args.limit else min(args.limit, len(frames))
    written = []

    for i, f in enumerate(frames[:count]):
        f = f.crop(union)
        scale = args.height / f.height
        f = f.resize((max(1, round(f.width * scale)), args.height), Image.LANCZOS)
        if args.sharpen > 0:
            # Upscaled video frames go mushy; a little unsharp buys back
            # the edges without the crunchy halos of a bigger radius.
            rgb = f.convert("RGB").filter(
                ImageFilter.UnsharpMask(radius=2, percent=int(args.sharpen * 100), threshold=3))
            rgb.putalpha(f.getchannel("A"))
            f = rgb
        name = os.path.join(args.out, f"frame-{i + args.start:02d}.{args.format}")
        if args.format == "webp":
            f.save(name, "WEBP", quality=88, method=6)
        else:
            f.save(name, "PNG", optimize=True)
        written.append((name, os.path.getsize(name)))

    total = sum(s for _, s in written)
    print(f"\nWrote {len(written)} frames to {args.out}/  ({total/1024:.0f} KB total, "
          f"{total/len(written)/1024:.0f} KB each)")
    if total > 3 * 1024 * 1024:
        print("  heads up: over 3 MB total. Lower --height or use fewer frames.")

    total_frames = args.start + len(written)
    print(f"\nNow set this in assets/js/config.js:\n"
          f"    character: {{ frames: {total_frames}, path: \"{args.out}/frame-%02d.{args.format}\", ... }}")
    if args.start:
        print(f"  (this sheet filled frame-{args.start:02d} to frame-{total_frames - 1:02d})")


if __name__ == "__main__":
    main()
