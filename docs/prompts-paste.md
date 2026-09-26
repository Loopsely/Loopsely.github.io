# Paste-ready prompts

One image per pose, at full resolution. The reasoning behind this choice is in
`character-prompts.md`; this file is just the text to paste.

**Two rules that decide whether this works:**

1. **Attach the same reference image every single time** — the Step A result, not the
   logo, once you have it.
2. **Keep the BASE text below byte-identical in every prompt.** Only the last line
   changes. Re-typing it differently is what makes the character drift.

---

## BASE — goes at the top of every pose prompt

> Using the attached image as the character reference, draw this exact same character.
>
> Keep these identical to the reference: the face, the messy black curly hair, the round
> glasses, the short dark beard, the black hoodie, and the glowing purple flame emblem.
> Same cel-shaded anime art style, same purple rim lighting, same colours.
>
> Framing, identical in every image: **full body, head to feet, nothing cropped**. The
> character is centred, standing on the same invisible ground line, at the **same camera
> distance and same eye level**, filling the same proportion of the frame. Flat solid
> pure green background (#00FF00), no shadow on the background, no floor, no scenery, no
> text or watermark. Tall portrait image.
>
> Pose:

Then add **one** line from below.

---

## Step A — the master reference (do this first)

Attach `assets/img/logo.jpg`. Use the BASE above, then:

> Standing relaxed, facing the viewer, holding a katana in his right hand pointed down
> and slightly out at his side. Invent only what the reference crops out: legs, boots and
> a full standing pose.

Regenerate until the face genuinely matches the logo. **Everything else is built from
this image**, so do not settle. From here on, attach *this* image as the reference.

---

## Step B — the drift test (3 images, do before the other 9)

Same BASE, attached Step A image, one of these lines each:

> **1.** Standing relaxed, facing the viewer, katana held down at his side.

> **6.** Turned to a side profile, katana raised to shoulder height.

> **12.** Facing the viewer, katana raised high overhead in a confident finishing pose.

Send all three over, or run it yourself:

```bash
python scripts/preview-frames.py pose1.png pose6.png pose12.png
```

Under ~12% drift and a GIF that looks like one person → carry on with the other nine.
Higher → we switch to sheets instead, and nothing is wasted because these three are
frames 1, 6 and 12 either way.

---

## Step C — the remaining nine

Same BASE, same attached reference, one line each:

> **2.** Facing the viewer, grip tightening on the katana, a slight crouch beginning.

> **3.** Turned 45 degrees to his right, katana beginning to lift away from his side.

> **4.** Turned 45 degrees to his right, katana raised to waist height.

> **5.** Turned to a side profile, katana raised to chest height.

> **7.** Turned 135 degrees away from the viewer, katana rising past his shoulder.

> **8.** Seen from behind, katana held high above him.

> **9.** Turning back toward the viewer, katana overhead.

> **10.** Turned 45 degrees to his left, katana overhead with the blade angled across.

> **11.** Almost facing the viewer, katana held high and diagonal across his body.

Save them as `pose1.png` … `pose12.png`. Order is what the scroll plays, so pose 1 is
what people see at the top of the page and pose 12 is where they land at the bottom.

---

## Step D — the hero close-up (one extra image)

At the top of the page the figure is drawn about 1989 CSS px tall. A full-body image
blown up that far goes soft, so the close-up gets its own picture, already framed on the
face. Attach the Step A image and paste this **instead of** the BASE:

> Using the attached image as the character reference, draw this exact same character as
> a **close-up portrait**: head, shoulders and upper chest only, facing the viewer and
> looking directly at the camera.
>
> Keep the face, messy black curly hair, round glasses, short dark beard, black hoodie
> and glowing purple flame emblem identical to the reference. Same cel-shaded anime art
> style, same purple rim lighting.
>
> The top of his head sits near the top edge and the crop ends at mid-chest. Flat solid
> pure green background (#00FF00), no shadow on the background, no text or watermark.
> Tall portrait image.

Save it as `hero.png`.

---

## Step E — hand them over

Drop everything in one folder and either send it to me, or run **one** command with all
twelve listed in order:

```bash
python scripts/slice-sprite.py pose1.png pose2.png pose3.png pose4.png \
    pose5.png pose6.png pose7.png pose8.png pose9.png pose10.png \
    pose11.png pose12.png --cols 1 --rows 1 --height 1400
```

It must be one command, not twelve. The script trims all the poses to a **single shared
crop box** so the character stays put between frames; run separately, each image would
get its own box and he would jump around. It prints the shared box and the frame count —
then set `frames: 12` in `assets/js/config.js`.

**If a pose comes back off-model**, regenerate only that one. That is the real advantage
of separate images over a sheet — one bad pose costs one regeneration, not twelve.


---

# Higgsfield video route (smoothest option)

Twelve stills scrubbed over a page will always read as steps. Real smoothness needs
real in-between motion, which is what an image-to-video model gives you.

**Do not ask for 30 seconds.** Higgsfield caps around 10-15s per generation depending on
model, and 30s at 24fps is 720 frames when the site only needs about 60. One 10-second
clip is plenty.

## Settings

| Setting | Value |
|---|---|
| Model | Kling 3.0 (3-15s, best character consistency) |
| Mode | Image to video, **start frame + end frame** |
| Start frame | `frame-00` (calm, blade down) |
| End frame | `frame-11` (blade at full height) |
| Duration | 10s |
| Resolution | 720p preferred. **If only 480p is offered, that is survivable - see below** |
| Aspect | **Vertical / 9:16.** This matters more than the resolution label |
| Camera | Locked off / static. **No camera movement preset.** |

## The prompt

> A locked-off static camera films a single character against a flat, solid pure green
> background that completely fills the frame at all times.
>
> The character slowly turns on the spot while raising his katana: he begins facing the
> viewer with the blade lowered, rotates gradually through a side profile, continues
> until his back is to the viewer with the blade lifting, then turns back around to face
> the viewer and finishes with the katana raised high in a confident finishing pose.
>
> One single continuous shot. The motion is slow, smooth and deliberate from start to
> finish, with no pauses and no sudden moves. His feet stay planted on the same spot and
> his full body, head to boots, stays completely inside the frame the entire time.
>
> The camera never moves, never zooms and never pans. The background stays flat pure
> green everywhere, with no shadows cast on it, no floor, no horizon, no scenery, no
> particles and no text. Lighting stays constant. Cel-shaded anime style, exactly
> matching the reference frames. No other characters.

## If you are stuck at 480p

Aspect ratio matters more than the number. Measured against a real frame:

| Output | Height the character actually gets |
|---|---|
| 480p landscape (854x480) | ~480 px - mostly empty green either side |
| 480p **vertical** (480x854) | ~854 px - **78% more detail, same file** |

So always choose vertical. Then slice with sharpening to recover edges after upscaling:

```bash
python scripts/slice-sprite.py art-source/vid/f-*.png --cols 1 --rows 1     --height 1200 --sharpen 0.8
```

And mix sources: keep the sharp stills at the two ends, where he is full opacity and
large, and use video frames through the middle, where he sits at 30% opacity behind the
cards and softness is invisible.

| Where | Opacity | Source |
|---|---|---|
| Hero close-up | 100%, zoomed 2.4x | sharp still |
| Middle transit | 30% | video frames |
| Final pose | 100% | sharp still |

## What usually goes wrong

- **The camera drifts or zooms.** Pick a static/locked camera preset and regenerate if it
  moves - a moving camera makes the figure change size and the page will look wobbly.
- **The background stops being flat green.** If the model adds a floor, shadow or
  gradient the cutout gets messy. Regenerate rather than fight it.
- **His feet leave the frame** when the blade goes up. Regenerate; we need the whole body
  throughout.

## When you have the clip

Drop the mp4 in `art-source/` and I will run:

```bash
# ~60 evenly spaced frames from a 10s clip
ffmpeg -i art-source/clip.mp4 -vf "fps=6,scale=-1:1400" art-source/vid/f-%03d.png

# then the usual: key the green, align the body, shared crop, number them
python scripts/slice-sprite.py art-source/vid/f-*.png --cols 1 --rows 1 --height 1200
```

Then `frames: 60` in config and the scrub has real motion instead of twelve steps.

**Budget note:** 60 frames at 1200 px is roughly 4-6 MB. If that is too heavy I will drop
to 40 frames or 1000 px. The current 12 frames are 1.9 MB.
